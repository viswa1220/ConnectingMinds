const express = require("express");
const requestRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");
// Fetch people feed with only unconnected users based on interests
requestRouter.get("/people/feed", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const { interests } = await User.findById(loggedUser._id).select("interests");

    // Fetch existing connections and pending requests
    const existingConnections = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedUser._id, type: "people" },
        { toUserId: loggedUser._id, type: "people" }
      ],
      status: { $in: ["pending", "accepted"] }
    }).select("fromUserId toUserId");

    // Extract user IDs to exclude
    const excludedUserIds = new Set([
      loggedUser._id.toString(),
      ...existingConnections.flatMap(conn => [
        conn.fromUserId.toString(),
        conn.toUserId.toString()
      ])
    ]);

    // Fetch users based on interests excluding connected/pending users
    const people = await User.find({
      _id: { $nin: Array.from(excludedUserIds) },
      interests: { $in: interests }
    }).select("firstName lastName skills experience interests about photoUrl");

    if (people.length === 0) {
      return res.json({ message: "No unconnected users found", data: [] });
    }

    res.json({
      message: "Unconnected users fetched successfully!",
      data: people,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a people connection request
requestRouter.post(
  "/people/request/send/:toUserId",
  userAuth,
  async (req, res) => {
    try {
      const fromUserId = req.user._id;
      const toUserId = req.params.toUserId;

      // Only allowed status for sending request is 'pending'
      const status = "pending";

      if (fromUserId.toString() === toUserId.toString()) {
        return res.status(400).json({ message: "Cannot send request to yourself!" });
      }

      const toUser = await User.findById(toUserId);
      if (!toUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if an existing people connection request is in the same direction
      const existingRequest = await ConnectionRequest.findOne({
        fromUserId,
        toUserId,
        type: "people",
      });

      if (existingRequest) {
        return res.status(400).json({ message: "Connection request already exists!" });
      }

      // Check if a connection request exists in the reverse direction
      const reverseRequest = await ConnectionRequest.findOne({
        fromUserId: toUserId,
        toUserId: fromUserId,
        type: "people",
      });

      if (reverseRequest) {
        // If a request exists in the opposite direction, accept it automatically
        reverseRequest.status = "accepted";
        await reverseRequest.save();

        return res.json({
          message: `${req.user.firstName} and ${toUser.firstName} are now connected!`,
          data: reverseRequest,
        });
      }

      // Create a new connection request if no existing or reverse request exists
      const newConnectionRequest = new ConnectionRequest({
        fromUserId,
        toUserId,
        status,
        type: "people",
      });

      const data = await newConnectionRequest.save();
      res.json({
        message: `${req.user.firstName} sent a connection request to ${toUser.firstName}`,
        data,
      });
    } catch (err) {
      res.status(400).send("Error: " + err.message);
    }
  }
);

requestRouter.post(
  "/people/request/review/:status/:requestId",
  userAuth,
  async (req, res) => {
    try {
      const loggedUser = req.user;
      const { status, requestId } = req.params;

      const allowedStatus = ["accepted", "rejected"];
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({ message: "Invalid status type: " + status });
      }

      // Find the connection request where the logged-in user is the receiver
      const connectionRequest = await ConnectionRequest.findOne({
        _id: requestId,
        toUserId: loggedUser._id,
        type: "people",
        status: "pending",
      });

      if (!connectionRequest) {
        return res.status(400).json({ message: "Connection request not found" });
      }

      // Update status
      connectionRequest.status = status;
      const data = await connectionRequest.save();

      res.send({ message: `Connection request ${status}`, data });
    } catch (err) {
      res.status(400).send("Error: " + err.message);
    }
  }
);
requestRouter.get("/people/requests", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;

    const connectionRequests = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedUser._id, type: "people" },
        { toUserId: loggedUser._id, type: "people" }
      ]
    })
      .populate("fromUserId", "firstName lastName emailId photoUrl")
      .populate("toUserId", "firstName lastName emailId photoUrl");

    if (connectionRequests.length === 0) {
      return res.json({ message: "No connection requests found", data: [] });
    }

    res.json({
      message: "Fetched all connection requests successfully",
      data: connectionRequests,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

requestRouter.get("/people/suggestions", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { interests } = await User.findById(loggedUser._id).select("interests");
    const existingConnections = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedUser._id },
        { toUserId: loggedUser._id }
      ],
      status: { $in: ["pending", "accepted"] },
      type: "people"
    }).select("fromUserId toUserId");

    const excludedUserIds = new Set([
      loggedUser._id.toString(),
      ...existingConnections.flatMap(conn => [conn.fromUserId.toString(), conn.toUserId.toString()])
    ]);
    const suggestions = await User.find({
      _id: { $nin: Array.from(excludedUserIds) },
      interests: { $in: interests }
    })
      .select("firstName lastName interests photoUrl about")
      .skip(skip)
      .limit(limit);

    if (suggestions.length === 0) {
      return res.json({ message: "No suggestions available", data: [] });
    }

    res.json({
      message: "Suggested people fetched successfully!",
      data: suggestions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
requestRouter.get("/people/requests/pending", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;

    const pendingRequests = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedUser._id, status: "pending", type: "people" },
        { toUserId: loggedUser._id, status: "pending", type: "people" }
      ]
    })
      .populate("fromUserId", "firstName lastName photoUrl")
      .populate("toUserId", "firstName lastName photoUrl");

    if (pendingRequests.length === 0) {
      return res.json({ message: "No pending requests found", data: [] });
    }

    res.json({
      message: "Pending requests fetched successfully!",
      data: pendingRequests,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

requestRouter.get("/api/people/connections", userAuth, async (req, res) => {
  try {
    const loggedUser = req.user;

    const connections = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedUser._id, status: "accepted", type: "people" },
        { toUserId: loggedUser._id, status: "accepted", type: "people" }
      ]
    })
      .populate("fromUserId", "firstName lastName photoUrl about")
      .populate("toUserId", "firstName lastName photoUrl about");

    const connectedUsers = connections.map(conn =>
      conn.fromUserId._id.toString() === loggedUser._id.toString() ? conn.toUserId : conn.fromUserId
    );

    if (connectedUsers.length === 0) {
      return res.json({ message: "No connections found", data: [] });
    }

    res.json({
      message: "Connected users fetched successfully!",
      data: connectedUsers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = requestRouter;
