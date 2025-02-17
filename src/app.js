const express = require("express");
const { adminAuth } = require("./middlewares/auth");
const connectDb = require("./config/database");
const app = express();
const User = require("./models/user");
app.use(express.json());

app.post("/signup", async (req, res) => {
  //creating a new instance of user model
  const user = new User(req.body);
  try {
    await user.save();
    res.send("user added");
  } catch (err) {
    res.status(401).send("Error in User Adding" + err.message);
  }
});
app.get("/feed", async (req, res) => {
  try {
    const user = await User.find({});
    if (user.length === 0) {
      res.status(404).send("user not found");
    }
    res.send(user);
  } catch {
    res.status(400).send("Something went wrong");
  }
});

//Get user by email
app.get("/getuser", async (req, res) => {
  const userEmail = req.body.emailId;
  try {
    const user = await User.findOne({ emailId: userEmail });
    if (user.length === 0) {
      res.status(404).send("user not found");
    }
    res.send(user);
  } catch {
    res.status(400).send("Something went wrong");
  }
});

app.delete("/getuser", async (req, res) => {
  const userId = req.body.userId;
  try {
    const user = await User.findByIdAndDelete(userId);
    res.send("user Deleted successfully");
  } catch {
    res.status(400).send("Something went wrong");
  }
});

//update
app.patch("/getuser", async (req, res) => {
   const userId = req.body.userId;
  const data = req.body;
  console.log(data);
  try {
    const user = await User.findByIdAndUpdate({ _id: userId },data);
    res.send("user Updated successfully");
  } catch {
    res.status(400).send("Something went wrong");
  }
});

connectDb()
  .then(() => {
    console.log("Connected to mongo Db");
    //listen port
    app.listen(3000, () => {
      console.log("running in 3000");
    });
  })
  .catch((err) => {
    console.log("error to connect mongo Db");
  });
