// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware"); // ✅ protects routes

const {
  getUserProfile,
  getDashboard,
  getActiveSessions,
  logoutSession,
  logoutAllOtherSessions,
} = require("../controllers/userController");

// -----------------------------
// USER PROFILE
// -----------------------------
router.get("/profile", protect, getUserProfile);

// -----------------------------
// DASHBOARD
// -----------------------------
router.get("/dashboard", protect, getDashboard);

// -----------------------------
// SESSIONS MANAGEMENT
// -----------------------------
router.get("/sessions", protect, getActiveSessions);
router.post("/sessions/logout", protect, logoutSession);
router.post("/sessions/logout-others", protect, logoutAllOtherSessions);

module.exports = router;
