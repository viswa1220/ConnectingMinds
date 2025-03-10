const express = require("express");
const chatRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Project = require("../models/project");  // ✅ Import the Project model
const mongoose = require("mongoose");

// ✅ 1. Create or Get a Direct Chat between Two Users
chatRouter.post("/direct", userAuth, async (req, res) => {
  const loggedUser = req.user;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required!" });
  }

  try {
    // Check if a direct chat already exists
    let chat = await Chat.findOne({
      isGroupChat: false,
      members: { $all: [loggedUser._id, userId] },
    });

    // If no chat exists, create a new one
    if (!chat) {
      chat = new Chat({
        isGroupChat: false,
        members: [loggedUser._id, userId],
      });
      await chat.save();
    }

    res.json({ message: "Direct chat ready", data: chat });
  } catch (err) {
    console.error("Error in /direct:", err.message);
    res.status(500).json({ error: err.message });
  }
});
// ✅ 2. Create or Get a Group Chat for a Project
chatRouter.post("/group", userAuth, async (req, res) => {
    const loggedUser = req.user;
    const { projectId, members } = req.body;
  
    if (!projectId || !members || members.length < 2) {
      return res.status(400).json({ message: "Invalid data for group chat!" });
    }
  
    try {
      // Check if a group chat already exists for the project
      let chat = await Chat.findOne({ isGroupChat: true, projectId });
  
      if (!chat) {
        chat = new Chat({
          isGroupChat: true,
          projectId,
          members,
        });
        await chat.save();
      }
  
      res.json({ message: "Group chat ready", data: chat });
    } catch (err) {
      console.error("Error in /group:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
// ✅ 3. Send a Message to a Chat
chatRouter.post("/:chatId/message", userAuth, async (req, res) => {
    const loggedUser = req.user;
    const { chatId } = req.params;
    const { text, fileUrl, fileType } = req.body;
  
    if (!text && !fileUrl) {
      return res.status(400).json({ message: "Message text or file is required!" });
    }
  
    try {
      // Create a new message
      const message = new Message({
        chatId,
        sender: loggedUser._id,
        text,
        fileUrl,
        fileType,
      });
  
      await message.save();
  
      // Update latest message in chat
      await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });
  
      res.status(201).json({ message: "Message sent!", data: message });
    } catch (err) {
      console.error("Error in /:chatId/message:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ✅ 4. Fetch Messages for a Chat
chatRouter.get("/:chatId/messages", userAuth, async (req, res) => {
    const { chatId } = req.params;
  
    try {
      // Fetch messages, sort by timestamp, and populate sender details
      const messages = await Message.find({ chatId })
        .populate("sender", "firstName lastName photoUrl")
        .sort({ createdAt: 1 });  // Sort by createdAt in ascending order
  
      if (messages.length === 0) {
        return res.json({ message: "No messages found", data: [] });
      }
  
      res.json({ message: "Messages fetched successfully!", data: messages });
    } catch (err) {
      console.error("Error in /:chatId/messages:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  
    // ✅ 5. Mark Messages as Read
chatRouter.patch("/:chatId/read", userAuth, async (req, res) => {
    const loggedUser = req.user;
    const { chatId } = req.params;
  
    try {
      // Mark messages as read by adding the user to the 'readBy' array if not already present
      const result = await Message.updateMany(
        { chatId, readBy: { $ne: loggedUser._id } },  // Only unread messages
        { $push: { readBy: loggedUser._id } }
      );
  
      if (result.nModified === 0) {
        return res.json({ message: "All messages are already read." });
      }
  
      res.json({ message: "Messages marked as read" });
    } catch (err) {
      console.error("Error in /:chatId/read:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  

chatRouter.get("/unread-count", userAuth, async (req, res) => {
  const loggedUser = req.user._id;

  try {
    // Find all chats involving the logged-in user
    const chats = await Chat.find({ members: loggedUser }).select("_id");

    const unreadCounts = {};
    for (const chat of chats) {
      const count = await Message.countDocuments({
        chatId: chat._id,
        readBy: { $ne: loggedUser },  // Not read by logged-in user
        sender: { $ne: loggedUser },  // Exclude messages sent by the user
      });
      if (count > 0) {
        unreadCounts[chat._id] = count;
      }
    }

    res.json({ data: unreadCounts });
  } catch (err) {
    console.error("Error fetching unread message count:", err.message);
    res.status(500).json({ error: err.message });
  }
});
// ✅ Create or Get a Group Chat for a Project (Simplified)
chatRouter.post("/group-simple", userAuth, async (req, res) => {
  const { projectId } = req.body;

  if (!projectId) {
    return res.status(400).json({ message: "Project ID is required!" });
  }

  try {
    // ✅ Fetch collaborators directly on the server side
    const project = await Project.findById(projectId).populate("collaborators", "_id");
    if (!project) {
      return res.status(404).json({ message: "Project not found!" });
    }

    const members = project.collaborators.map((user) => user._id);

    // Check if a group chat already exists for the project
    let chat = await Chat.findOne({ isGroupChat: true, projectId });

    if (!chat) {
      chat = new Chat({
        isGroupChat: true,
        projectId,
        members,
      });
      await chat.save();
    }

    res.json({ message: "Group chat ready", data: chat });
  } catch (err) {
    console.error("Error in /group-simple:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = chatRouter;