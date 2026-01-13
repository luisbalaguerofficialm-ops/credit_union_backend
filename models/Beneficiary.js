const mongoose = require("mongoose");

const BeneficiarySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    bank: { type: String, required: true },
    account: { type: String, required: true },
    userId: { type: String, required: true }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model("Beneficiary", BeneficiarySchema);
