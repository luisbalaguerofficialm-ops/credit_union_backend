const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema(
  {
    chatSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatSession", // optional: a session/room model
      required: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: String,
      enum: ["user", "support"], // explicitly user or support
      required: true,
    },
    content: { type: String, required: true }, // renamed for consistency
    read: { type: Boolean, default: false }, // track if message was read by support/admin
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);
