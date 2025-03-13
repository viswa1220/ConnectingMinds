const jwt = require("jsonwebtoken");
const User = require("../models/user");

const userAuth = async (req, res, next) => {
  try {
    // Extract token from cookies
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: Please log in!" });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded._id) {
      return res.status(401).json({ message: "Invalid token. Please log in again!" });
    }

    // Find user by ID
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(401).json({ message: "User not found. Please sign up!" });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Authentication error: " + err.message });
  }
};

module.exports = { userAuth };
