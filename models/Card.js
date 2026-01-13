const mongoose = require("mongoose");

const CardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    number: {
      type: String,
      required: true, // store masked like **** **** **** 1234
    },
    type: {
      type: String,
      required: true, // e.g., "Visa", "MasterCard", or generic "Card"
    },
    name: {
      type: String, // Cardholder name
      required: false,
    },
    expiry: {
      type: String, // MM/YY
      required: false,
    },
    cvv: {
      type: String, // optional, avoid storing real CVV in production
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Card", CardSchema);
