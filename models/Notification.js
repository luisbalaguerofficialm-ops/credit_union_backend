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
      enum: ["transaction", "security", "kyc", "system"],
      required: true,
      index: true,
    },

    //Type (kept for compatibility if already used elsewhere)
    type: {
      type: String,
      enum: ["transaction", "security", "kyc", "system"],
      required: true,
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
