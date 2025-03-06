const express = require("express");
const authRouter = express.Router();
const { validateSignUpData } = require("../utils/validation");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const { userAuth } = require("../middlewares/auth");
const safe_data = "firstName lastName about age gender skills experience";

authRouter.post("/signup", async (req, res) => {
  try {
    const { firstName, lastName, emailId, password, age, gender, photoUrl, about, experience, skills, techStack, interests } = req.body;
    if (!interests || interests.length === 0) {
      throw new Error("At least one interest is required.");
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
      age: age || null,
      gender: gender || "others",
      photoUrl: photoUrl || "https://whiteklay.com/prod-dummy-image-1/",
      about: about || "This is a default about",
      experience: experience || 0,
      skills: Array.isArray(skills) ? skills : [],
      techStack: Array.isArray(techStack) ? techStack : [],
      interests: Array.isArray(interests) ? interests : []
    });

    await newUser.save();

    res.status(201).json({ message: "User added successfully!", user: newUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;
    const user = await User.findOne({ emailId: emailId });
    if (!user) {
      throw new Error("User Not Found");
    }
    const isPasswordvalid = await user.validatePassword(password);
    if (isPasswordvalid) {
      const token = await user.getJWT();
      res.cookie("token", token);

      res.send(user);
    } else {
      throw new Error("Password doesn't match");
    }
  } catch (err) {
    res.status(401).send("Error :" + err.message);
  }
});

authRouter.post("/logout", async (req, res) => {
  try {
    res
      .cookie("token", null, {
        expires: new Date(Date.now()),
      })
      .send("Logout Success");
  } catch (err) {
    res.status(401).send("Error  :" + err.message);
  }
});

module.exports = authRouter;
