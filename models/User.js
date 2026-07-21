const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // =============================
    // BASIC INFO
    // =============================
    role: {
      type: String,
      enum: ["user", "manager", "admin", "superadmin"],
      default: "user",
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    username: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
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
      required: true,
      trim: true,
    },

    phone: {
      type: Number,
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
      index: true,
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

    address: {
      type: String,
      trim: true,
    },

    transactionPin: String,

    pushNotifications: {
      type: Boolean,
      default: true,
    },

    emailNotifications: {
      type: Boolean,
      default: true,
    },

    smsNotifications: {
      type: Boolean,
      default: true,
    },
    passwordChangedAt: Date,

    pinChangedAt: Date,

    status: {
      type: String,
      enum: ["Pending", "Active", "Suspended", "Flagged"],
      default: "Pending",
      index: true,
    },

    flagReason: String,

    suspensionReason: String,

    lastLogin: {
      type: Date,
      index: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
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
      default: null,
    },

    otpPurpose: {
      type: String,
      enum: [
        "login",
        "password_reset",
        "email_verify",
        "reset_transaction_pin",
      ],
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

    transactionPinResetVerified: {
      type: Boolean,
      default: false,
    },

    createdAt: {
      type: Date,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    registrationMethod: {
      type: String,
      enum: ["self", "admin", "superadmin"],
      default: "self",
    },

    
    createdByRole: {
      type: String,
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
