const express = require("express");
const { adminAuth } = require("./middlewares/auth");
const connectDb = require("./config/database");
const app = express();
const User = require("./models/user");
const { validateSignUpData } = require("./utils/validation");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { userAuth } = require("./middlewares/auth");
app.use(express.json());
app.use(cookieParser());

app.post("/signup", async (req, res) => {
  try {
    //validate
    validateSignUpData(req);
    //encrypt
    const { firstName, lastName, emailId, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
    });
    await user.save();
    res.send("user added");
  } catch (err) {
    res.status(401).send("Error :" + err.message);
  }
});
app.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;
    const user = await User.findOne({ emailId: emailId });
    if (!user) {
      throw new Error("User Not Found");
    }
    const isPasswordvalid = await bcrypt.compare(password, user.password);
    if (isPasswordvalid) {
      const token = await jwt.sign({ _id: user._id }, "Dev@cm$12052000");
      console.log(token);
      res.cookie("token", token);
      res.send("Login Success!!!");
    } else {
      throw new Error("Password doesn't match");
    }
  } catch (err) {
    res.status(401).send("Error :" + err.message);
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
app.patch("/getuser/:userId", async (req, res) => {
  const userId = req.params?.userId;
  const data = req.body;

  try {
    const allowedUpdates = [
      "userId",
      "skills",
      "photoUrl",
      "about",
      "gender",
      "age",
      "firstName",
      "LastName",
      "experience",
    ];
    console.log(data);
    const isUpdateAllowed = Object.keys(data).every((k) =>
      allowedUpdates.includes(k)
    );
    if (!isUpdateAllowed) {
      throw new Error("Update not allowed");
    }
    if (data?.skills.length > 20) {
      throw new Error("more than 20 skills not allowed");
    }
    const user = await User.findByIdAndUpdate({ _id: userId }, data, {
      runValidators: true,
    });
    res.send("user Updated successfully");
  } catch {
    res.status(400).send("Something went wrong");
  }
});

app.get("/profile", userAuth, async (req, res) => {
  try {
    const user = req.user;
    res.send(user);
  } catch (err) {
    res.status(400).send("ERROR :" + err.message);
  }
});
app.post("/sendConnectionRequest", userAuth, async (req, res) => {
  try {
    const user=req.user
    res.send(user.firstName + "   sent the connect request!");
  } catch {}
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
