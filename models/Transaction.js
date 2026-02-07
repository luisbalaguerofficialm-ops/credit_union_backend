const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    type: {
      type: String,
      enum: ["Transfer", "Deposit", "Withdrawal"],
      required: true,
    },

    recipientName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    bankName: { type: String, required: true },
    email: { type: String, required: true },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    amount: { type: Number, required: true },

    status: {
      type: String,
      enum: ["Pending", "Successful", "Failed"],
      default: "Pending",
    },

    description: { type: String },
    metadata: { type: Object },
    transactionId: { type: String, unique: true, required: true },

    date: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Transaction", TransactionSchema);
