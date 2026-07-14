const mongoose = require("mongoose");

const SystemSettingsSchema = new mongoose.Schema(
  {
    branchName: {
      type: String,
      default: "Trust & Growth Regional Branch 04",
    },

    regionalCode: {
      type: String,
      default: "RG-04-NORTH",
    },

    entityId: {
      type: String,
      default: "CU-88294-X",
    },

    contactEmail: {
      type: String,
      default: "admin@bank.com",
    },

    supportPhone: {
      type: String,
      default: "",
    },

    // Communication

    systemAlertEmail: {
      type: String,
    },

    smsGateway: {
      type: String,
      enum: ["Twilio Global API", "MessageBird Regional", "Internal Relay"],
      default: "Twilio Global API",
    },

    weeklyPerformanceSummary: {
      type: Boolean,
      default: true,
    },

    transactionPushAlerts: {
      type: Boolean,
      default: true,
    },

    // Notification Channels

    systemMaintenanceAlerts: {
      type: Boolean,
      default: true,
    },

    securityBreachNotifications: {
      type: Boolean,
      default: true,
    },

    newAdminAccountAlerts: {
      type: Boolean,
      default: false,
    },

    // Security

    twoFactorRequired: {
      type: Boolean,
      default: true,
    },

    sessionTimeout: {
      type: Number,
      default: 15,
    },

    passwordPolicy: {
      minLength: {
        type: Number,
        default: 14,
      },

      specialCharacters: {
        type: Boolean,
        default: true,
      },

      passwordRotationDays: {
        type: Number,
        default: 60,
      },

      preventReuseCount: {
        type: Number,
        default: 10,
      },
    },

    loggingLevel: {
      type: String,
      default: "Full Verbose Forensic Logging",
    },

    dataRetentionYears: {
      type: Number,
      default: 7,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("SystemSettings", SystemSettingsSchema);
