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

    socialSecurityNumber: {
      type: Number,
      required: true,
      trim: true,
      unique: true,
    },

    choosedAccount: {
      type: String,
      enum: ["Essential Checking", "High-Yield Savings"],
      trim: true,
    },

    phone: {
      type: String,
      default: false,
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
      select: false,
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
      trim: true,
    },

    kycSelfie: {
      type: String,
      default: "",
    },
    state: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      trim: true,
      required: true,
    },
    zipcode: {
      type: Number,
    },

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
    // PASSWORD RESET
    // =============================

    resetPasswordToken: {
      type: String,
      select: false,
    },

    resetPasswordExpires: {
      type: Date,
      select: false,
    },

    // =============================
    // NOTIFICATIONS
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

    // =============================
    // MESSAGES
    // =============================
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
  },
);

module.exports = mongoose.model("User", UserSchema);
