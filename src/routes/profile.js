const express = require("express");
const profileRouter = express.Router();
const { userAuth } = require("../middlewares/auth");

const validateProfileEditData = (req) => {
  const allowedUpdates = [
    "skills",
    "photoUrl",
    "about",
    "gender",
    "age",
    "firstName",
    "lastName",
    "experience",
    "interests"
  ];
  const isUpdateAllowed = Object.keys(req.body).every((k) =>
    allowedUpdates.includes(k)
  );
  return isUpdateAllowed;
};

profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const user = req.user.toObject();
    delete user.password;
    res.send(user);
  } catch (err) {
    res.status(400).send("ERROR: " + err.message);
  }
});


profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try {
    if (!validateProfileEditData(req)) {
      throw new Error("Invalid Edit Request");
    }
    const loggeduser = req.user;
    Object.keys(req.body).forEach((key) => (loggeduser[key] = req.body[key]));
    await loggeduser.save();
    res.send("Details updated Successfully");
  } catch (err) {
    res.status(400).send("ERROR :" + err.message);
  }
});

module.exports = profileRouter;
