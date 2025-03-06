const express = require("express");
const userRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const User = require("../models/user");
const ConnectionRequest = require("../models/connectionRequest");
const safe_data = "firstName lastName about age gender skills experience";

// ✅ API to Fetch Received Connection Requests
userRouter.get("/user/requests/received", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const newConnectionRequest = await ConnectionRequest.find({
      toUserId: loggedUser._id,
      status: "interested",
    }).populate("fromUserId", safe_data);

    res.json({ message: "Data fetched successfully", newConnectionRequest });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ API to Fetch User Connections
userRouter.get("/user/connections", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const myConnections = await ConnectionRequest.find({
      $or: [
        { toUserId: loggedUser._id, status: "accepted" },
        { fromUserId: loggedUser._id, status: "accepted" },
      ],
    })
      .populate("fromUserId", safe_data)
      .populate("toUserId", safe_data);

    const data = myConnections.map((row) => {
      return row.fromUserId._id.toString() === loggedUser._id.toString()
        ? row.toUserId
        : row.fromUserId;
    });

    res.json({ message: "Fetched connections successfully", data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

userRouter.get("/feed", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    limit = limit > 50 ? 50 : limit;
    const skip = (page - 1) * limit;

    // Fetch user connections
    const connections = await ConnectionRequest.find({
      $or: [{ fromUserId: loggedUser._id }, { toUserId: loggedUser._id }],
    }).select("fromUserId toUserId");

    const connectionUserIds = new Set();
    connections.forEach((req) => {
      connectionUserIds.add(req.fromUserId.toString());
      connectionUserIds.add(req.toUserId.toString());
    });

    // Fetch users excluding the logged-in user
    const users = await User.find({
      _id: { $nin: Array.from(connectionUserIds), $ne: loggedUser._id },
    }).select("_id firstName lastName photoUrl projectIdeas");

    // Extract projects from connections
    let connectionProjects = [];
    const connectedUsers = await User.find({
      _id: { $in: Array.from(connectionUserIds) },
    }).select("_id firstName lastName photoUrl projectIdeas");

    connectedUsers.forEach((user) => {
      user.projectIdeas.forEach((project) => {
        connectionProjects.push({
          ...project.toObject(),
          userId: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            photoUrl: user.photoUrl,
          },
        });
      });
    });

    // Extract projects matching logged user's interests from non-connected users (CASE-INSENSITIVE)
    let interestProjects = [];
    users.forEach((user) => {
      user.projectIdeas.forEach((project) => {
        if (
          loggedUser.interests?.some((interest) =>
            project.techStack.some(
              (tech) => tech.toLowerCase() === interest.toLowerCase()
            )
          )
        ) {
          interestProjects.push({
            ...project.toObject(),
            userId: {
              _id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              photoUrl: user.photoUrl,
            },
          });
        }
      });
    });

    const feed = [...connectionProjects, ...interestProjects]
      .filter(
        (project) => project.userId._id.toString() !== loggedUser._id.toString()
      )
      .slice(skip, skip + limit);

    if (feed.length === 0) {
      return res.json({
        feed: [],
        message: "No projects available yet. Start by connecting with others!",
      });
    }

    res.json({ feed, page, limit, total: feed.length });
  } catch (err) {
    console.error("❌ Error fetching feed:", err.message);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: err.message });
  }
});

module.exports = userRouter;
