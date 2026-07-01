const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["Transfer", "Deposit", "Withdrawal", "Purchase", "Subscription"],
      required: true,
    },

    // Recipient Details
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },

    recipientEmail: {
      type: String,
      lowercase: true,
      trim: true,
      required: true,
    },

    recipientCountry: {
      type: String,
      required: true,
    },

    bankName: {
      type: String,
      required: true,
    },

    // Domestic Transfers
    accountNumber: {
      type: String,
      default: null,
    },

    // International Transfers
    iban: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
    },

    swiftCode: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
    },

    amount: {
      type: String,
      required: true,
      min: 1,
    },

    bankCode: String,

    active: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Processing", "Successful", "Failed"],
      default: "Pending",
    },

    description: String,

    metadata: Object,

    transactionId: {
      type: String,
      unique: true,
      required: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Transaction", TransactionSchema);
