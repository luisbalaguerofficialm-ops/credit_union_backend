const mongoose = require("mongoose");

const SupportTicketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: { type: String, required: true },
    category: {
      type: String,
      enum: ["Account", "Transfer", "Deposit", "Security", "Other"],
      required: true,
    },
    message: { type: String, required: true, maxlength: 500 },
    attachment: { type: String }, // file path
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved"],
      default: "Open",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SupportTicket", SupportTicketSchema);
