const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    isGroupChat: { type: Boolean, default: false },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "project",
      required: function () {
        return this.isGroupChat;
      },
    },
    members: [
      { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    ],
    latestMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);
