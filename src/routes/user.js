const express = require("express");
const userRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const user = require("../models/user");
const connectionRequest = require("../models/connectionRequest");
const safe_data = "firstName lastName about age gender skills experience";
userRouter.get("/user/requests/received", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const newconnectionRequest = await connectionRequest
      .find({
        toUserId: loggedUser._id,
        status: "interested",
      })
      .populate("fromUserId", safe_data);
    res.json({ message: "Data fetched successfully", newconnectionRequest });
  } catch (err) {
    res.status(400).send("Error:" + err.message);
  }
});

userRouter.get("/user/connections", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const myConnections = await connectionRequest
      .find({
        $or: [
          { toUserId: loggedUser._id, status: "accepted" },
          { fromUserId: loggedUser._id, status: "accepted" },
        ],
      })
      .populate("fromUserId", safe_data)
      .populate("toUserId", safe_data);

    const data = myConnections.map((row) => {
      if (row.fromUserId._id.toString() === loggedUser._id.toString()) {
        return row.toUserId;
      }
      return row.fromUserId;
    });
    res.json({
      message: "Fetched connections succesfully",
      data,
    });
  } catch (err) {
    res.status(400).send("Error:" + err.message);
  }
});
userRouter.get("/feed", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;

    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    limit = limit > 50 ? 50 : limit;
    const skip = (page - 1) * limit;

    const ConnectionsReqAll = await connectionRequest
      .find({
        $or: [
          {
            fromUserId: loggedUser._id,
          },
          { toUserId: loggedUser._id },
        ],
      })
      .select("fromUserId toUserId");
    const hideUsersFromFeed = new Set();
    ConnectionsReqAll.forEach((req) => {
      hideUsersFromFeed.add(req.fromUserId.toString());
      hideUsersFromFeed.add(req.toUserId.toString());
    });
    const users = await user
      .find({
        $and: [
          { _id: { $nin: Array.from(hideUsersFromFeed) } },
          { _id: { $ne: loggedUser._id } },
        ],
      })
      .select(safe_data)
      .skip(skip)
      .limit(limit);

    res.json({ data: users });
  } catch (err) {
    res.status(400).send("Error:" + err.message);
  }
});
module.exports = userRouter;
