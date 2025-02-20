const express = require("express");
const profileRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const { vaidateProfileEditData } = require("../utils/validation");

profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const user = req.user;
    res.send(user);
  } catch (err) {
    res.status(400).send("ERROR :" + err.message);
  }
});
profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try {
    if (!vaidateProfileEditData(req)) {
      throw new Error("Invalid Edit Request");
    }

    const loggeduser = req.user;
    /*  "skills",
    "photoUrl",
    "about",
    "gender",
    "age",
    "firstName",
    "LastName",
    "experience" */

    Object.keys(req.body).forEach((key) => (loggeduser[key] = req.body[key]));
    await loggeduser.save();
    res.send("Details updated Successfully");
  } catch (err) {
    res.status(400).send("ERROR :" + err.message);
  }
});
module.exports = profileRouter;
