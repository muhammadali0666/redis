import express from "express";
import { createClient } from "redis";
import * as uuid from "uuid";
import { read_file, write_file } from "./fs/api.js";

const app = express();

app.use(express.json());

const redClient = createClient({ url: "redis://127.0.0.1:6379" });

app.get("/users", async (req, res) => {
  try {
    redClient.connect().then(() => console.log("redis connect!"));

    const cachedUser = await redClient.get("users");

    if (!cachedUser) {
      const users = read_file("data.json");
      await redClient.set("users", JSON.stringify(users));
      res.json(users);
      return;
    }
    res.json(JSON.parse(cachedUser));
  } finally {
    console.log("quit");
    redClient.quit();
  }
});

app.post("/user", async (req, res) => {
  try {
    redClient.connect().then(() => console.log("redis connect!"));
    const { name, age } = req.body;
    const cachedUser = await redClient.get("users");

    const userId = uuid.v4();

    const new_user = {
      id: userId,
      name,
      age,
    };
    if (!cachedUser) {
      let users = read_file("data.json");
      users.push(new_user);
      write_file("data.json", JSON.stringify(users))
      await redClient.set("users", JSON.stringify(users))
      return res.json("created")
    }
    let parseUser = JSON.parse(cachedUser)
    parseUser.push(new_user)

    await redClient.set("users", JSON.stringify(parseUser))
    write_file("data.json", parseUser)
    res.json("created")
  } finally {
    console.log("quit");
    redClient.quit();
  }
});

app.post("/delete_user", async (req, res) => {
  try{
    redClient.connect().then(() => console.log("redis connect!"));
    const { user_id } = req.body;
    let users = read_file("data.json");
    let cacheUser = JSON.parse(await redClient.get("users"))
    users.forEach((u, idx) => {
      if(u.id === user_id){
        users.splice(idx, 1)
      }
    })
    write_file("data.json", users)
    if(!cacheUser) {
      await redClient.set("users", JSON.stringify(users))
      return res.send("deleted user!")
    }

    cacheUser.forEach((u, idx) => {
      if(u.id === user_id){
        cacheUser.splice(idx, 1)
      }
    })

    await redClient.set("users", JSON.stringify(cacheUser))
    res.json("user deleted!")

  }
  finally{
    console.log("quit");
    redClient.quit();
  }
})

app.listen(4000, () => {
  console.log(4000);
});
