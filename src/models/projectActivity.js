const mongoose = require("mongoose");

const projectActivitySchema = new mongoose.Schema({
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    }
  });
  
  module.exports = mongoose.model("ProjectActivity", projectActivitySchema);
  