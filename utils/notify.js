/**
 * utils/notify.js
 * --------------------------------------
 * Centralized Email + SMS Notification Utility
 * - Uses Resend for Email & SMS
 * - Uses branded HTML templates
 * - Non-blocking (safe for production)
 */

const { Resend } = require("resend");
const {
  transactionAlertTemplate,
  transferFeeTemplate,
  recipientIncomingTransferTemplate,
} = require("./transactionTemplates");

// ======================================
// RESEND CLIENT
// ======================================
if (!process.env.RESEND_API_KEY) {
  console.warn("⚠️  RESEND_API_KEY not set in environment variables");
}
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.MAIL_FROM || "Credixa <support@credixa.co>";

// ======================================
// INTERNAL HELPERS (SAFE SENDERS)
// ======================================
const safeSend = async (fn, label) => {
  try {
    await fn();
  } catch (err) {
    console.error(`❌ ${label} failed:`, err.message);
    console.error(`   Full error:`, err);
  }
};

// ======================================
// SEND EMAIL
// ======================================
const sendEmail = async ({ to, subject, html }) => {
  return safeSend(async () => {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    console.log("📧 Email sent to:", to);
  }, "Email");
};

// ======================================
// SEND SMS
// ======================================
const sendSMS = async ({ to, message }) => {
  return safeSend(async () => {
    await resend.messages.send({
      from: process.env.SMS_FROM,
      to,
      text: message,
    });
    console.log("📱 SMS sent to:", to);
  }, "SMS");
};

// ======================================
// OTP (EMAIL + SMS)
// ======================================
const sendOTP = async ({ email, phone, otp }) => {
  const html = `
    <h2>Verification Code</h2>
    <p>Your OTP is <b>${otp}</b></p>
    <p>This code expires in 10 minutes.</p>
  `;

  if (email) await sendEmail({ to: email, subject: "Your OTP Code", html });
  if (phone)
    await sendSMS({
      to: phone,
      message: `Your OTP is ${otp}. Expires in 10 minutes.`,
    });
};

// ======================================
// TRANSACTION ALERT (SUCCESS)
// ======================================
const sendTransactionAlert = async ({
  email,
  phone,
  type,
  amount,
  balance,
  currency = "$",
}) => {
  const html = transactionAlertTemplate({ type, amount, balance, currency });

  if (email)
    await sendEmail({
      to: email,
      subject: `Transaction Alert${type ? " - " + type : ""}`,
      html,
    });

  if (phone)
    await sendSMS({
      to: phone,
      message: `${type}: ${currency}${amount.toLocaleString()} | Bal: ${currency}${balance.toLocaleString()}`,
    });
};

// ======================================
// TRANSFER FEE ALERT
// ======================================
const sendTransferFeeAlert = async ({
  email,
  phone,
  amount,
  recipientName,
  currency = "$",
}) => {
  const html = transferFeeTemplate({ amount, recipientName, currency });

  if (email)
    await sendEmail({ to: email, subject: "Transfer Fee Required", html });
  if (phone)
    await sendSMS({
      to: phone,
      message: `Transfer to ${recipientName} requires a ${currency}${amount.toLocaleString()} fee.`,
    });
};

// ======================================
// RECIPIENT INCOMING TRANSFER ALERT
// ======================================
const sendRecipientTransferAlert = async ({
  email,
  recipientName,
  senderName,
  amount,
  currency = "$",
  transactionId,
}) => {
  const html = recipientIncomingTransferTemplate({
    recipientName,
    senderName,
    amount,
    currency,
    transactionId,
  });

  if (email)
    await sendEmail({ to: email, subject: "Incoming Transfer Pending", html });
};

// ======================================
// 3-STEP TRANSFER SEQUENCE (5-MIN GAP)
// ======================================
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendTransferSequence = async ({
  userEmail,
  recipientEmail,
  senderName,
  recipientName,
  amount,
  balance,
  currency = "$",
  transactionId,
  transferFeeAmount,
}) => {
  try {
    // 1️⃣ Transaction alert (IMMEDIATE)
    await sendTransactionAlert({
      email: userEmail,
      amount,
      balance,
      currency,
      type: "Transfer",
    });
    await delay(5 * 60 * 1000);

    // 2️⃣ Transfer fee alert (5 min delay)
    await sendTransferFeeAlert({
      email: userEmail,
      amount: transferFeeAmount,
      recipientName,
      currency,
    });
    await delay(5 * 60 * 1000);

    // 3️⃣ Recipient incoming transfer notification (5 min delay)
    await sendRecipientTransferAlert({
      email: recipientEmail,
      recipientName,
      senderName,
      amount,
      currency,
      transactionId,
    });

    console.log("✅ Transfer email sequence completed");
  } catch (err) {
    console.error("❌ Transfer email sequence failed:", err);
  }
};

// ======================================
// KYC STATUS UPDATE
// ======================================
const sendKycStatusUpdate = async (email, status) => {
  const templates = {
    approved: {
      subject: "KYC Approved",
      html: "<p>Your KYC verification has been approved.</p>",
    },
    rejected: {
      subject: "KYC Rejected",
      html: "<p>Your KYC was rejected. Please re-submit your documents.</p>",
    },
    pending: {
      subject: "KYC Under Review",
      html: "<p>Your KYC is currently under review.</p>",
    },
  };

  if (!templates[status] || !email) return;

  await sendEmail({
    to: email,
    subject: templates[status].subject,
    html: templates[status].html,
  });
};

// ======================================
// EXPORTS
// ======================================
module.exports = {
  sendEmail,
  sendSMS,
  sendOTP,
  sendTransactionAlert,
  sendTransferFeeAlert,
  sendRecipientTransferAlert,
  sendTransferSequence,
  sendKycStatusUpdate,
};
