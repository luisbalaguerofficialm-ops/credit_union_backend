const mongoose = require("mongoose");

const KycSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    idType: {
      type: String,
      required: true,
    },

    idNumber: {
      type: String,
      required: true,
    },

    country: {
      type: String,
      required: true,
    },

    docs: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],

    note: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Kyc", KycSchema);
