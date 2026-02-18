// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

const {
  getUserProfile,
  getDashboard,
  getActiveSessions,
  logoutSession,
  logoutAllOtherSessions,
  updateProfileImage,
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

// -----------------------------
// PROFILE IMAGE UPDATE
// -----------------------------
router.put(
  "/update-profile-image",
  protect,
  upload.single("profileImage"),
  updateProfileImage,
);

module.exports = router;
