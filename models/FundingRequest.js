const mongoose = require("mongoose");

const fundingRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    userName: {
      type: String,
      required: true,
    },

    userEmail: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

  
    reviewedAt: {
      type: Date,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedRole: {
      type: String,
      enum: ["admin", "superadmin"],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("FundingRequest", fundingRequestSchema);
