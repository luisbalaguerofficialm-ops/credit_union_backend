// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist"); // <- add this

// Protect middleware
async function protect(req, res, next) {
  // Allow public auth routes
  if (
    req.originalUrl.startsWith("/api/auth/register") ||
    req.originalUrl.startsWith("/api/auth/login")
  ) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    // ----------------------------
    // Check if token is blacklisted
    // ----------------------------
    const blacklisted = await TokenBlacklist.findOne({ token });
    if (blacklisted) {
      return res.status(401).json({
        success: false,
        message: "Token has been invalidated (logged out)",
      });
    }

    // ----------------------------
    // Verify JWT and get user
    // ----------------------------
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

// 🔹 Export as object
module.exports = {
  protect,
};
