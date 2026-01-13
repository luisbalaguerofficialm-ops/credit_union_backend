const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");

const {
  sendMessage,
  getMessages,
  markMessagesRead,
} = require("../controllers/chatMessageController");

// SEND MESSAGE
router.post("/", protect, sendMessage);

// GET CHAT HISTORY
router.get("/", protect, getMessages);

// MARK MESSAGES AS READ
router.put("/read", protect, markMessagesRead);

module.exports = router;
