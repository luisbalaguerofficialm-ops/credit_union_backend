const mongoose = require("mongoose");

const SupportConversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    status: {
      type: String,
      enum: ["Open", "Pending", "Closed"],
      default: "Open",
      index: true,
    },

    lastMessage: String,

    lastMessageAt: Date,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "SupportConversation",
  SupportConversationSchema,
);
