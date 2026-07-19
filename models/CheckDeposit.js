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
      trim: true,
    },

    accountNumber: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
      index: true,
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

    // Admin can manually flag suspicious checks
    flagged: {
      type: Boolean,
      default: false,
      index: true,
    },

    flagReason: {
      type: String,
      default: "",
      trim: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: {
      type: Date,
    },

    rejectionReason: {
      type: String,
      default: "",
    },

    depositedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

CheckDepositSchema.index({ user: 1, createdAt: -1 });
CheckDepositSchema.index({ status: 1, createdAt: -1 });
CheckDepositSchema.index({ amount: -1 });

module.exports = mongoose.model("CheckDeposit", CheckDepositSchema);
