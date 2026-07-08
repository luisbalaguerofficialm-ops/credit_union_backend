const mongoose = require("mongoose");

const SupportMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportConversation",
      required: true,
      index: true,
    },

    sender: {
      type: String,
      enum: ["User", "Support"],
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

SupportMessageSchema.index({
  conversation: 1,
  createdAt: 1,
});

module.exports = mongoose.model("SupportMessage", SupportMessageSchema);
