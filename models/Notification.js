const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    //  Category (used by frontend filtering)
    category: {
      type: String,
      enum: ["transaction", "security", "system", "activity", "all"],
      required: true,
      index: true,
    },

    //Type (kept for compatibility if already used elsewhere)
    type: {
      type: String,
      enum: ["transaction", "security", "system", "all", "activity"],
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

    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Target audience
    target: {
      type: String,
      enum: ["All Users", "Verified Users", "Inactive Users", "Specific User"],
      default: "All Users",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    channels: [
      {
        type: String,
        enum: ["InApp", "SMS", "Email"],
      },
    ],

    specificUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Delivery status
    status: {
      type: String,
      enum: ["Pending", "Delivered", "Failed"],
      default: "Pending",
    },

    sentToCount: {
      type: Number,
      default: 0,
    },

    deliveryTime: {
      type: Date,
      default: null,
    },

    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },

    // Optional extra data
    metadata: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true },
);

// Keep type and category synchronized automatically
NotificationSchema.pre("save", function () {
  if (!this.type && this.category) {
    this.type = this.category;
  }

  if (!this.category && this.type) {
    this.category = this.type;
  }
});

module.exports = mongoose.model("Notification", NotificationSchema);
