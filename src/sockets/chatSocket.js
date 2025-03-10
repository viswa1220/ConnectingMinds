const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/user");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🔥 New client connected:", socket.id);

    // ✅ Join chat room
    socket.on("joinRoom", ({ chatId }) => {
      socket.join(chatId);
      console.log(`User joined room: ${chatId}`);
    });

    // ✅ Send message event
    socket.on("sendMessage", async ({ chatId, senderId, text, fileUrl, fileType }) => {
      if (!text && !fileUrl) return;

      try {
        // Save message to database
        const message = await new Message({
          chatId,
          sender: senderId,
          text,
          fileUrl,
          fileType,
        }).save();

        // Update latest message in chat
        await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

        // Populate sender details
        const populatedMessage = await Message.findById(message._id).populate("sender", "firstName lastName photoUrl");

        // Broadcast message to the chat room
        io.to(chatId).emit("receiveMessage", populatedMessage);
      } catch (err) {
        console.error("Error in sendMessage:", err.message);
      }
    });

    // ✅ Typing indicator
    socket.on("typing", ({ chatId, senderName }) => {
      socket.to(chatId).emit("displayTyping", { senderName });
    });

    // ✅ Stop typing indicator
    socket.on("stopTyping", ({ chatId }) => {
      socket.to(chatId).emit("removeTyping");
    });

    // ✅ Handle disconnect
    socket.on("disconnect", () => {
      console.log("🔥 Client disconnected:", socket.id);
    });
  });
};
