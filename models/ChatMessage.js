const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    subject: {
      type: String,
      required: true,
      enum: [
        "General Inquiry",
        "Loans",
        "Fraud Report",
        "Technical Support",
        "Cards",
        "Mortgage",
      ],
    },

    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved"],
      default: "Pending",
    },

    adminReply: {
      type: String,
      default: "",
    },
    repliedAt: Date,
  },
  {
    timestamps: true,
  },
);
module.exports = mongoose.model("Contact, ContactSchema");
