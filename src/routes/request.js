const express = require("express");
const requestRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");

requestRouter.post(
  "/request/send/:status/:toUserId",
  userAuth,
  async (req, res) => {
    try {
      const fromUserId = req.user._id;
      const toUserId = req.params.toUserId;
      const status = req.params.status;

      const allowedStatus = ["ignored", "interested"];
      if (!allowedStatus.includes(status)) {
        return res
          .status(400)
          .json({ message: "Invalid status type: " + status });
      }

      const toUser = await User.findById(toUserId);
      if (!toUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if an existing connection request is in the same direction
      const existingRequest = await ConnectionRequest.findOne({
        fromUserId,
        toUserId,
      });

      if (existingRequest) {
        return res
          .status(400)
          .json({ message: "Connection request already exists!" });
      }

      // Check if a connection request exists in the **reverse direction**
      const reverseRequest = await ConnectionRequest.findOne({
        fromUserId: toUserId,
        toUserId: fromUserId,
      });

      if (reverseRequest) {
        // If a request exists in the opposite direction, **update its status**
        reverseRequest.status = status;
        await reverseRequest.save();

        return res.json({
          message: `${req.user.firstName} updated status to '${status}' for ${toUser.firstName}`,
          data: reverseRequest,
        });
      }

      // Create a new connection request if no existing or reverse request exists
      const newConnectionRequest = new ConnectionRequest({
        fromUserId,
        toUserId,
        status,
      });

      const data = await newConnectionRequest.save();
      res.json({
        message: `${req.user.firstName} sent '${status}' request to ${toUser.firstName}`,
        data,
      });
    } catch (err) {
      res.status(400).send("Error: " + err.message);
    }
  }
);

module.exports = requestRouter;
