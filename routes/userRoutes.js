const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware"); // ✅ destructured

const {
  getProfile,
  getDashboard,
  getActiveSessions,
  logoutSession,
  logoutAllOtherSessions,
} = require("../controllers/userController");

// Use protect middleware
router.get("/profile", protect, getProfile);
router.get("/dashboard", protect, getDashboard);
router.get("/sessions", protect, getActiveSessions);
router.post("/sessions/logout", protect, logoutSession);
router.post("/sessions/logout-others", protect, logoutAllOtherSessions);

module.exports = router;
