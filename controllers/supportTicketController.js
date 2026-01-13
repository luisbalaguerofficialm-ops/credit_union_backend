const SupportTicket = require("../models/SupportTicket");

// ===============================
// CREATE SUPPORT TICKET
// ===============================
exports.createTicket = async (req, res) => {
  try {
    const { subject, category, message } = req.body;

    if (!subject || !category || !message) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      });
    }

    const ticket = await SupportTicket.create({
      user: req.user._id,
      subject,
      category,
      message,
      attachment: req.file ? req.file.path : null,
    });

    res.status(201).json({ success: true, ticket });
  } catch (err) {
    console.error("Create Ticket Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// GET USER TICKETS
// ===============================
exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
