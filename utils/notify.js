// utils/notify.js
/**
 * Full Email + SMS Notification Utility
 * - Uses Resend API for both emails and SMS
 * - Supports dynamic currency symbols
 */

const { Resend } = require("resend");

// ======================================
//  RESEND CLIENT
// ======================================
const resend = new Resend(process.env.RESEND_API_KEY);

// ======================================
//  SEND EMAIL FUNCTION
// ======================================
const sendEmail = async ({ to, subject, html }) => {
  try {
    await resend.emails.send({
      from: process.env.MAIL_FROM,
      to,
      subject,
      html,
    });
    console.log("📧 Email sent to:", to);
    return true;
  } catch (err) {
    console.error("❌ Email Error:", err.message);
    return false;
  }
};

// ======================================
//  SEND SMS FUNCTION (Resend)
// ======================================
const sendSMS = async ({ to, message }) => {
  try {
    await resend.messages.send({
      from: process.env.SMS_FROM, // verified sender number
      to,
      text: message,
    });
    console.log("📱 SMS sent to:", to);
    return true;
  } catch (err) {
    console.error("❌ SMS Error:", err.message);
    return false;
  }
};

// ======================================
//  SEND OTP (EMAIL + SMS)
// ======================================
const sendOTP = async ({ email, phone, otp }) => {
  const emailHTML = `
    <h2>Your Verification Code</h2>
    <p>Your OTP is: <b>${otp}</b></p>
    <p>This code expires in 10 minutes.</p>
  `;

  if (email) {
    await sendEmail({
      to: email,
      subject: "Your OTP Code",
      html: emailHTML,
    });
  }

  if (phone) {
    await sendSMS({
      to: phone,
      message: `Your OTP Code is ${otp}. It expires in 10 minutes.`,
    });
  }

  return true;
};

// ======================================
//  TRANSACTION ALERTS
// ======================================
const sendTransactionAlert = async ({
  email,
  phone,
  type,
  amount,
  balance,
  currency = "$",
}) => {
  const html = `
    <h2>Transaction Notification</h2>
    <p><b>Type:</b> ${type}</p>
    <p><b>Amount:</b> ${currency}${amount.toLocaleString()}</p>
    <p><b>Available Balance:</b> ${currency}${balance.toLocaleString()}</p>
  `;

  if (email)
    await sendEmail({
      to: email,
      subject: `Transaction Alert - ${type}`,
      html,
    });

  if (phone)
    await sendSMS({
      to: phone,
      message: `${type} of ${currency}${amount.toLocaleString()} | Balance: ${currency}${balance.toLocaleString()}`,
    });
};

// ======================================
//  TRANSFER FEE ALERT
// ======================================
const sendTransferFeeAlert = async ({
  email,
  phone,
  amount,
  recipientName,
  currency = "$",
}) => {
  const html = `
    <h2>Transfer Fee Required</h2>
    <p>You initiated a transfer of <b>${currency}${amount.toLocaleString()}</b> to <b>${recipientName}</b>.</p>
    <p>A transfer fee of <b>${currency}${amount.toLocaleString()}</b> is required for this transaction.</p>
    <p><b>Note:</b> This fee cannot be deducted from your available balance. Please kindly contact the bank and request an account information to make a payment. Thank you.</p>
  `;
  const smsMessage = `Transfer of ${currency}${amount.toLocaleString()} to ${recipientName} requires a ${currency}${amount.toLocaleString()} fee. Fee cannot be deducted from your balance.`;

  if (email)
    await sendEmail({ to: email, subject: "Transfer Fee Required", html });
  if (phone) await sendSMS({ to: phone, message: smsMessage });
};

// ======================================
//  KYC STATUS ALERT
// ======================================
const sendKycStatusUpdate = async (email, status) => {
  const template = {
    approved: {
      subject: "KYC Approved",
      msg: "Congratulations! Your KYC has been approved.",
    },
    rejected: {
      subject: "KYC Rejected",
      msg: "Your KYC was rejected. Please re-submit your documents.",
    },
    pending: {
      subject: "KYC Under Review",
      msg: "Your KYC is currently being reviewed.",
    },
  };

  if (!template[status]) return;

  await sendEmail({
    to: email,
    subject: template[status].subject,
    html: `<p>${template[status].msg}</p>`,
  });
};

// ======================================
//  EXPORTS
// ======================================
module.exports = {
  sendEmail,
  sendSMS,
  sendOTP,
  sendTransactionAlert,
  sendTransferFeeAlert,
  sendKycStatusUpdate,
};
