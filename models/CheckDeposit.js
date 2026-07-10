const mongoose = require("mongoose");

const CheckDepositSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    accountType: {
      type: String,
      required: true,
    },

    accountNumber: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    frontImage: {
      type: String,
      required: true,
    },

    backImage: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Under Review", "Approved", "Rejected", "Cleared"],
      default: "Pending",
      index: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: Date,

    rejectionReason: String,

    depositedAt: Date,
  },
  {
    timestamps: true,
  },
);

CheckDepositSchema.index({ user: 1, createdAt: -1 });
module.exports = mongoose.model("CheckDeposit", CheckDepositSchema);
