const mongoose = require("mongoose");

const connectionRequestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    type: {
      type: String,
      enum: ["people"],  // Only 'people' type allowed
      default: "people",
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ["pending", "accepted", "rejected"],  // Simplified status options
        message: `{VALUE} is incorrect Status Type`,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate requests between the same users
connectionRequestSchema.index({ fromUserId: 1, toUserId: 1, type: 1 }, { unique: true });

connectionRequestSchema.pre("save", function (next) {
  const connectionRequest = this;
  if (connectionRequest.fromUserId.equals(connectionRequest.toUserId)) {
    throw new Error("Cannot send request to yourself!");
  }
  next();
});

const connectionRequestModel = mongoose.model("connectionRequest", connectionRequestSchema);
module.exports = connectionRequestModel;
