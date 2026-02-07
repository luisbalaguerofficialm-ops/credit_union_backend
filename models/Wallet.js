const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, 
    },
    balance: {
      type: Number,
      default: 500000000,
      min: 0,
    },
    currency: {
      type: String,
      default: "$",
      required: true, 
      trim: true,
    },
    lastUpdatedBy: {
      type: String,
      enum: ["user", "superadmin", "admin", "system"],
      default: "system", // tracks who updated the wallet last
    },
  },
  { timestamps: true },
);

// Helper method to safely add funds
WalletSchema.methods.addFunds = async function (amount, by = "system") {
  if (amount <= 0) throw new Error("Amount must be greater than zero");
  this.balance += amount;
  this.lastUpdatedBy = by;
  await this.save();
  return this.balance;
};

// Helper method to safely deduct funds
WalletSchema.methods.deductFunds = async function (amount, by = "user") {
  if (amount <= 0) throw new Error("Amount must be greater than zero");
  if (this.balance < amount) throw new Error("Insufficient balance");
  this.balance -= amount;
  this.lastUpdatedBy = by;
  await this.save();
  return this.balance;
};

module.exports = mongoose.model("Wallet", WalletSchema);
