const express = require("express");
const router = express.Router();
const Session = require("../models/Session");
const { protect } = require("../middlewares/authMiddleware");

// Get all active sessions for the current user
router.get("/active-sessions", protect, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user._id });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
});

// Logout a specific session
router.post("/logout-session", protect, async (req, res) => {
  try {
    const { token } = req.body;
    await Session.deleteOne({ userId: req.user._id, token });
    res.json({ message: "Session logged out" });
  } catch (err) {
    res.status(500).json({ message: "Failed to logout session" });
  }
});

// Logout all other sessions
router.post("/logout-all-others", protect, async (req, res) => {
  try {
    await Session.deleteMany({
      userId: req.user._id,
      token: { $ne: req.token },
    });
    res.json({ message: "Other sessions logged out" });
  } catch (err) {
    res.status(500).json({ message: "Failed to logout other sessions" });
  }
});

module.exports = router;
