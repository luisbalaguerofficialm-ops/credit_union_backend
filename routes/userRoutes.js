// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware"); // ✅ protects routes

const {
  getProfile,
  getDashboard,
  getActiveSessions,
  logoutSession,
  logoutAllOtherSessions,
  completeProfile, // new endpoint
} = require("../controllers/userController");

// -----------------------------
// USER PROFILE
// -----------------------------
router.get("/profile", protect, getProfile);

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

// -----------------------------
// COMPLETE PROFILE
// -----------------------------
router.post("/complete-profile", protect, completeProfile);

module.exports = router;
