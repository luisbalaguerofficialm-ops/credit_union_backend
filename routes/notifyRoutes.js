/**
 * routes/notifyRoutes.js
 * Email, SMS, OTP, Transaction Alerts, KYC Notifications
 */

const express = require("express");
const router = express.Router();
const {
  sendEmail,
  sendSMS,
  sendOTP,
  sendTransactionAlert,
  sendKycStatusUpdate,
} = require("../utils/notify");

// ------------------------------
// SEND EMAIL
// ------------------------------
router.post("/send-email", async (req, res) => {
  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const ok = await sendEmail({ to, subject, html });

  ok
    ? res.json({ success: true, message: "Email sent" })
    : res.status(500).json({ success: false, message: "Failed to send email" });
});

// ------------------------------
// SEND SMS
// ------------------------------
router.post("/send-sms", async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const ok = await sendSMS({ to, message });

  ok
    ? res.json({ success: true, message: "SMS sent" })
    : res.status(500).json({ success: false, message: "Failed to send SMS" });
});

// ------------------------------
// SEND OTP (EMAIL + SMS)
// ------------------------------
router.post("/send-otp", async (req, res) => {
  const { email, phone } = req.body;

  if (!email && !phone) {
    return res
      .status(400)
      .json({ message: "Provide at least email or phone number" });
  }

  // generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  await sendOTP({ email, phone, otp });

  res.json({
    success: true,
    otp, // you can remove this in production
    message: "OTP sent",
  });
});

// ------------------------------
// TRANSACTION ALERT
// ------------------------------
router.post("/transaction-alert", async (req, res) => {
  const { email, phone, type, amount, balance } = req.body;

  if (!type || !amount || !balance) {
    return res.status(400).json({ message: "Missing transaction fields" });
  }

  await sendTransactionAlert({
    email,
    phone,
    type,
    amount,
    balance,
  });

  res.json({ success: true, message: "Transaction alert sent" });
});

// ------------------------------
// KYC STATUS UPDATE
// ------------------------------
router.post("/kyc-status", async (req, res) => {
  const { email, status } = req.body;

  if (!email || !status) {
    return res.status(400).json({ message: "Email & Status are required" });
  }

  await sendKycStatusUpdate(email, status);

  res.json({
    success: true,
    message: `KYC status email sent — ${status}`,
  });
});

module.exports = router;
