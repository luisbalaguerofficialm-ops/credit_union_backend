const mongoose = require("mongoose");

const FAQSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      enum: ["Account", "Transfer", "Deposit"],
      required: true,
    },
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FAQ", FAQSchema);
