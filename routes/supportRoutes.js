const express = require("express");
const router = express.Router();

const {
  createSupportConversation,
  getSupportConversation,
  getSupportMessages,
  sendSupportMessage,
  markSupportMessagesRead,
  contactUs,
} = require("../controllers/supportMessage");

const { protect } = require("../middlewares/authMiddleware");

router.post("/contact", contactUs);

// Create conversation (optional)
router.post("/conversation", protect, createSupportConversation);

// Get conversation + messages
router.get("/conversation", protect, getSupportConversation);

// Send message
router.post("/message", protect, sendSupportMessage);

// Get all messages
router.get("/messages/:conversationId", protect, getSupportMessages);

// Mark messages as read
router.patch("/messages/read", protect, markSupportMessagesRead);

module.exports = router;
