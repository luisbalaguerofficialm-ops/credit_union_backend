const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // =============================
    // BASIC INFO
    // =============================
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    username: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: true,
    },

    // =============================
    // ACCOUNT INFO
    // =============================
    accountType: {
      type: String,
      enum: ["Savings", "Current", "Fixed Deposit"],
      required: true,
    },

    refreshToken: {
      type: String,
      default: null,
    },

    firstTransferCompleted: {
      type: Boolean,
      default: false,
    },

    accountNumber: {
      type: Number,
      unique: true,
      index: true,
    },

    pinHash: {
      type: String,
      required: true,
      select: false,
    },

    // =============================
    // PERSONAL / ADDRESS INFO
    // =============================
    dateOfBirth: {
      type: Date,
    },

    profileImage: {
      type: String,
      default: "",
    },

    country: {
      type: String,
    },

    kycSelfie: String,

    // =============================
    // KYC STATUS
    // =============================
    kycStatus: {
      type: String,
      enum: ["not_submitted", "pending", "approved", "rejected"],
      default: "not_submitted",
    },

    // =============================
    // OTP / VERIFICATION
    // =============================
    otpHash: {
      type: String,
      select: false,
    },

    otpExpiresAt: {
      type: Date,
      select: false,
    },

    otpPurpose: {
      type: String,
      enum: ["login", "password_reset", "kyc", "email_verify"],
    },

    // =============================
    // NOTIFICATIONS & MESSAGES
    // =============================
    notifications: [
      {
        title: String,
        message: String,
        type: {
          type: String,
          enum: ["Success", "Warning", "Info"],
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    messages: [
      {
        sender: String,
        message: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // include virtuals in JSON
    toObject: { virtuals: true }, // include virtuals in objects
  },
);

// =============================
// VIRTUAL FIELDS
// =============================
UserSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model("User", UserSchema);
