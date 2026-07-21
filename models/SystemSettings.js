const mongoose = require("mongoose");

const SystemSettingsSchema = new mongoose.Schema(
  {
    branchName: {
      type: String,
      enum: [
        "Trust & Growth Regional Branch 01",
        "Trust & Growth Regional Branch 02",
        "Trust & Growth Regional Branch 03",
        "Trust & Growth Regional Branch 04",
      ],
      default: "Trust & Growth Regional Branch 04",
    },

    regionalCode: {
      type: String,
      enum: ["RG-04-NORTH", "RG-02-WEST", "RG-03-SOUTH", "RG-04-NORTH"],
      default: "RG-04-NORTH",
    },

    entityId: {
      type: String,
      enum: ["CU-88291-A", "CU-88292-B", "CU-88293-C", "CU-88294-X"],
      default: "CU-88294-X",
    },

    contactEmail: {
      type: String,
      enum: [
        "admin@bank.com",
        "operations@bank.com",
        "support@bank.com",
        "compliance@bank.com",
      ],
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
