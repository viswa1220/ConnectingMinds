const mongoose = require("mongoose");

const projectJoinRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "project",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "invited"],
      default: "pending",
    },
    message: {
      type: String,
      default: "",
    },
    role: {  // New field to store the role
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate join requests for the same project
projectJoinRequestSchema.index({ userId: 1, projectId: 1 }, { unique: true });

module.exports = mongoose.model("projectJoinRequest", projectJoinRequestSchema);
