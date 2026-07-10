const crypto = require("crypto");

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Hash OTP (SHA256)
const hashOTP = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

// Verify OTP
const verifyOTP = (otp, hashedOTP) => {
  const hashedInput = hashOTP(otp);
  return hashedInput === hashedOTP;
};

// Generate OTP expiry time (10 minutes)
const getOTPExpiry = () => {
  return new Date(Date.now() + 10 * 60 * 1000);
};

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTP,
  getOTPExpiry,
};
