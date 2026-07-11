const SupportConversation = require("../models/SupportConversation");
const SupportMessage = require("../models/SupportMessage");
const Contact = require("../models/Contact");
const { sendEmail } = require("../utils/notify");

exports.contactUs = async (req, res) => {
  try {
    const { fullName, email, subject, message } = req.body;

    if (!fullName || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const contact = await Contact.create({
      fullName,
      email: email.toLowerCase(),
      subject,
      message,
    });

    // Email to Admin
    await sendEmail({
      to: process.env.MAIL_FROM,
      subject: `New Contact Message - ${subject}`,
      html: `
        <h2>New Contact Message</h2>

        <p><strong>Name:</strong> ${fullName}</p>

        <p><strong>Email:</strong> ${email}</p>

        <p><strong>Subject:</strong> ${subject}</p>

        <hr>

        <p>${message}</p>
      `,
    });

    // Auto Reply
    await sendEmail({
      to: email,
      subject: "We've received your message",
      html: `
      <div style="font-family:Arial;padding:30px">

        <h2>Hello ${fullName},</h2>

        <p>
        Thank you for contacting Credit Union.
        </p>

        <p>
        We've received your message regarding
        <strong>${subject}</strong>.
        </p>

        <p>
        Our support team will respond within
        24 hours.
        </p>

        <br>

        <p>
        Thank you for banking with us.
        </p>

        <br>

        <strong>
        America Bank Support
        </strong>

      </div>
      `,
    });

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      contact,
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};

// ========================================
// POST /api/support/conversation
// Create/Get Conversation
// ========================================
exports.createSupportConversation = async (req, res) => {
  try {
    let conversation = await SupportConversation.findOne({
      user: req.user._id,
    });

    if (!conversation) {
      conversation = await SupportConversation.create({
        user: req.user._id,
        status: "Open",
      });

      // Welcome message
      await SupportMessage.create({
        conversation: conversation._id,
        sender: "Support",
        message:
          "Hello! I'm Sarah. Welcome to Credit Bank Support. How may I assist you today?",
      });
    }

    res.status(201).json({
      success: true,
      conversation,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Unable to create conversation.",
    });
  }
};

// ========================================
// GET /api/support/conversation
// Get User Conversation + Messages
// ========================================
exports.getSupportConversation = async (req, res) => {
  try {
    let conversation = await SupportConversation.findOne({
      user: req.user._id,
    });

    if (!conversation) {
      conversation = await SupportConversation.create({
        user: req.user._id,
        status: "Open",
      });

      await SupportMessage.create({
        conversation: conversation._id,
        sender: "Support",
        message:
          "Hello! I'm Sarah. Welcome to Credit Bank Support. How may I assist you today?",
      });
    }

    const messages = await SupportMessage.find({
      conversation: conversation._id,
    }).sort({
      createdAt: 1,
    });

    res.json({
      success: true,
      conversation,
      messages,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Unable to load conversation.",
    });
  }
};

// ========================================
// POST /api/support/message
// Send User Message
// ========================================
exports.sendSupportMessage = async (req, res) => {
  try {
    const { conversationId, message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    let conversation;

    if (conversationId) {
      conversation = await SupportConversation.findOne({
        _id: conversationId,
        user: req.user._id,
      });
    } else {
      conversation = await SupportConversation.findOne({
        user: req.user._id,
      });
    }

    if (!conversation) {
      conversation = await SupportConversation.create({
        user: req.user._id,
        status: "Open",
      });
    }

    const chat = await SupportMessage.create({
      conversation: conversation._id,
      sender: "User",
      message,
    });

    conversation.lastMessage = message;
    conversation.lastMessageAt = new Date();

    await conversation.save();

    const io = req.app.get("io");

    if (io) {
      io.to("admin-room").emit("support:new-message", {
        conversationId: conversation._id,
        message: chat,
      });

      io.to(req.user._id.toString()).emit("support:message", chat);
    }

    res.status(201).json({
      success: true,
      message: chat,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Unable to send message.",
    });
  }
};

// ========================================
// GET /api/support/messages/:conversationId
// ========================================
exports.getSupportMessages = async (req, res) => {
  try {
    const conversation = await SupportConversation.findOne({
      _id: req.params.conversationId,
      user: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    const messages = await SupportMessage.find({
      conversation: conversation._id,
    }).sort({
      createdAt: 1,
    });

    res.json({
      success: true,
      messages,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Unable to fetch messages.",
    });
  }
};

// ========================================
// PATCH /api/support/messages/read
// ========================================
exports.markSupportMessagesRead = async (req, res) => {
  try {
    const conversation = await SupportConversation.findOne({
      user: req.user._id,
    });

    if (!conversation) {
      return res.json({
        success: true,
      });
    }

    await SupportMessage.updateMany(
      {
        conversation: conversation._id,
        sender: "Support",
        read: false,
      },
      {
        read: true,
      },
    );

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Unable to mark messages as read.",
    });
  }
};
