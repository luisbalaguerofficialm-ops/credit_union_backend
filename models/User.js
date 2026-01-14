const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // -----------------------------
    // Basic Info
    // -----------------------------
    firstName: { type: String },
    lastName: { type: String },
    gender: { type: String },
    maritalStatus: { type: String },
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    phone: { type: String },
    countryCode: { type: String },
    password: { type: String, required: true },

    // -----------------------------
    // Address Info
    // -----------------------------
    country: { type: String },
    state: { type: String },
    city: { type: String },
    zip: { type: String },
    streetAddress: { type: String },

    kycStatus: {
      type: String,
      enum: ["not_submitted", "pending", "approved", "rejected"],
      default: "not_submitted",
    },

    // -----------------------------
    // Financial Info
    // -----------------------------
    accountNumber: { type: String, unique: true, index: true },
    pinHash: { type: String, required: true, select: false }, // transaction PIN hash
    accountType: { type: String },
    balance: { type: Number, default: 0 },
    currency: { type: String },
    annualIncome: { type: String },
    occupation: { type: String },
    companyName: { type: String },
    ssn: { type: String },

    // -----------------------------
    // OTP / Verification
    // -----------------------------
    otpHash: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    otpPurpose: { type: String }, // login | password_reset | kyc | email_verify

    // -----------------------------
    // Notifications & Messages
    // -----------------------------
    notifications: [
      {
        title: { type: String },
        message: { type: String },
        type: { type: String }, // Success, Warning, Info
        date: { type: Date, default: Date.now },
      },
    ],
    messages: [
      {
        sender: { type: String },
        message: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
