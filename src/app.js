const express = require("express");
const http = require("http");  // ✅ For creating HTTP server
const socketIo = require("socket.io");  // ✅ Socket.IO integration
const { adminAuth, userAuth } = require("./middlewares/auth");
const connectDb = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const User = require("./models/user");

const app = express();

// Middleware setup
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Import Routers
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");
const userRouter = require("./routes/user");
const projectRouter = require("./routes/projectRouter");
const taskRouter = require("./routes/taskRouter");
const chatRouter = require("./routes/chatRouter");

app.use("/api/chat", chatRouter);
app.use("/api", projectRouter);
app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/api", requestRouter);
app.use("/", userRouter);
app.use("/api", taskRouter);

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Import chatSocket and pass the Socket.IO instance
require("./sockets/chatSocket")(io);

// Connect to MongoDB and start the server
connectDb()
  .then(() => {
    console.log("Connected to MongoDB");
    server.listen(3000, () => {
      console.log("Server running on http://localhost:3000");
    });
  })
  .catch((err) => console.log("MongoDB connection error:", err.message));
