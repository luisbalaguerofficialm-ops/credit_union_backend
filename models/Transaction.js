const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["Transfer", "Deposit", "Withdrawal", "Purchase", "Subscription"],
      required: true,
      index: true,
    },

    transferType: {
      type: String,
      enum: ["Domestic", "International", "Wire"],
      required: function () {
        return this.type === "Transfer";
      },
      index: true,
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
      index: true,
    },

    // Domestic Transfers
    accountNumber: {
      type: String,
      default: null,
      index: true,
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
      type: Number,
      required: true,
      min: 1,
    },

    bankCode: String,

    deleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: Date,

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    active: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "Funds Authorized",
        "Successful",
        "Failed",
        "Initiated from Web Portal",
      ],
      default: "Pending",
    },

    statusHistory: [
      {
        status: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    description: String,

    metadata: Object,

    transactionId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

TransactionSchema.index({ user: 1, createdAt: -1 });
TransactionSchema.index({ user: 1, status: 1 });
TransactionSchema.index({ user: 1, type: 1 });

TransactionSchema.index({
  recipientName: "text",
  recipientEmail: "text",
  bankName: "text",
  transactionId: "text",
});

module.exports = mongoose.model("Transaction", TransactionSchema);
