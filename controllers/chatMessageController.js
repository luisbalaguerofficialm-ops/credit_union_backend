const ChatMessage = require("../models/ChatMessage");

// ===============================
// SEND MESSAGE
// ===============================
exports.sendMessage = async (req, res) => {
  try {
    const { content } = req.body; // updated field name

    if (!content) {
      return res
        .status(400)
        .json({ success: false, message: "Message cannot be empty" });
    }

    const chat = await ChatMessage.create({
      user: req.user._id,
      sender: "user",
      content,
      read: false,
    });

    // Emit to Socket.IO if needed (real-time admin)
    const io = req.app.get("io");
    if (io) {
      io.to("admin-room").emit("chat:update", {
        chatId: chat._id,
        lastMessage: chat,
      });
    }

    res.status(201).json({ success: true, chat });
  } catch (err) {
    console.error("Send message error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// GET CHAT HISTORY
// ===============================
exports.getMessages = async (req, res) => {
  try {
    const messages = await ChatMessage.find({ user: req.user._id }).sort({
      createdAt: 1,
    }); // oldest to newest

    res.json({ success: true, messages });
  } catch (err) {
    console.error("Get messages error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// MARK MESSAGES AS READ (OPTIONAL)
// ===============================
exports.markMessagesRead = async (req, res) => {
  try {
    await ChatMessage.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, message: "Messages marked as read" });
  } catch (err) {
    console.error("Mark messages read error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
