const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    // Personal notification owner.
    // Null when this is a broadcast notification.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Distinguishes personal vs broadcast notifications
    isBroadcast: {
      type: Boolean,
      default: false,
      index: true,
    },

    category: {
      type: String,
      enum: ["transaction", "security", "system", "activity"],
      index: true,
    },

    // Kept for backward compatibility
    type: {
      type: String,
      enum: ["transaction", "security", "system", "activity"],
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    // PERSONAL notifications only
    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    // BROADCAST notifications only
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    target: {
      type: String,
      enum: ["All Users", "Verified Users", "Inactive Users", "Specific User"],
      default: "Specific User",
      index: true,
    },

    specificUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    channels: [
      {
        type: String,
        enum: ["InApp", "SMS", "Email"],
      },
    ],

    status: {
      type: String,
      enum: ["Pending", "Delivered", "Failed"],
      default: "Pending",
      index: true,
    },

    // Number of recipients
    sentToCount: {
      type: Number,
      default: 0,
    },

    deliveryTime: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdByType: {
      type: String,
      enum: ["system", "admin", "manager", "superadmin"],
      default: "system",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

/* -----------------------------
   Indexes
------------------------------*/

NotificationSchema.index({
  title: "text",
  message: "text",
});

NotificationSchema.index({
  createdAt: -1,
});

NotificationSchema.index({
  status: 1,
  category: 1,
});

NotificationSchema.index({
  user: 1,
  read: 1,
});

NotificationSchema.index({
  isBroadcast: 1,
  target: 1,
});

/* -----------------------------
   Sync type/category
------------------------------*/

NotificationSchema.pre("save", function (next) {
  if (!this.type && this.category) {
    this.type = this.category;
  }

  if (!this.category && this.type) {
    this.category = this.type;
  }

  next();
});

module.exports = mongoose.model("Notification", NotificationSchema);
