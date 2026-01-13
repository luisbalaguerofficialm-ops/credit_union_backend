const express = require("express");
const multer = require("multer");
const {
  createTicket,
  getMyTickets,
} = require("../controllers/supportTicketController");
const { sendMessage, getMessages } = require("../controllers/chatController");
const { getFAQs } = require("../controllers/faqController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// FILE UPLOAD
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ["image/png", "image/jpeg", "application/pdf"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("File type not supported"));
    }
    cb(null, true);
  },
});

// TICKETS
router.post("/tickets", protect, upload.single("attachment"), createTicket);
router.get("/tickets", protect, getMyTickets);

// CHAT
router.post("/chat", protect, sendMessage);
router.get("/chat", protect, getMessages);

// FAQ
router.get("/faqs", getFAQs);

module.exports = router;
