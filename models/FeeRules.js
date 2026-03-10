const mongoose = require("mongoose");

const FeeTierSchema = new mongoose.Schema(
  {
    min: {
      type: Number,
      required: true,
      min: 0,
    },
    max: {
      type: Number,
      required: true,
      min: 0,
    },
    fee: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }, // prevents extra _id for each tier
);

const FeeRuleSchema = new mongoose.Schema(
  {
    ruleName: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["Transfer", "Withdrawal", "Service"],
      required: true,
      index: true,
    },

    structure: {
      type: String,
      enum: ["Tiered", "Fixed", "Percentage"],
      required: true,
    },

    // Used only when structure === "Tiered"
    tiers: {
      type: [FeeTierSchema],
      default: [],
    },

    // Used when structure === "Fixed"
    fixedFee: {
      type: Number,
      min: 0,
    },

    // Used when structure === "Percentage"
    percentage: {
      type: Number,
      min: 0,
      max: 100,
    },

    status: {
      type: String,
      enum: ["Active", "Disabled"],
      default: "Active",
      index: true,
    },
  },
  { timestamps: true },
);

FeeRuleSchema.pre("save", async function () {
  if (this.structure === "Tiered") {
    if (!this.tiers || this.tiers.length === 0) {
      throw new Error("Tiered structure requires tiers");
    }

    // Sort tiers by min value
    this.tiers.sort((a, b) => a.min - b.min);

    for (let i = 0; i < this.tiers.length; i++) {
      const tier = this.tiers[i];

      if (tier.min >= tier.max) {
        throw new Error("Tier min must be less than max");
      }

      if (i > 0) {
        const prev = this.tiers[i - 1];
        if (tier.min < prev.max) {
          throw new Error("Fee tiers cannot overlap");
        }
      }
    }
  }
});

module.exports = mongoose.model("FeeRule", FeeRuleSchema);
