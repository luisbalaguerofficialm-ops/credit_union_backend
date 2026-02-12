const mongoose = require("mongoose");
const KycSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // prevent multiple submissions
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    idFront: { type: String, required: true },
    idBack: { type: String, required: true },
    selfie: { type: String, required: true },

    idType: {
      type: String,
      enum: ["passport", "drivers_license", "national_id"],
      required: true,
    },

    idNumber: {
      type: Number,
      required: true,
    },

    country: {
      type: String,
      required: true,
    },

    docs: [
      {
        name: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],

    note: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Kyc", KycSchema);
