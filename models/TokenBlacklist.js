// models/TokenBlacklist.js
const mongoose = require("mongoose");

const tokenBlacklistSchema = new mongoose.Schema({
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true }, // optional, auto-remove after JWT expiry
});

module.exports = mongoose.model("TokenBlacklist", tokenBlacklistSchema);
