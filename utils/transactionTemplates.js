// utils/transactionTemplates.js

const BANK_NAME = "Credit Union Bank";

const LOGO_URL =
  process.env.BANK_LOGO_URL ||
  "https://res.cloudinary.com/dvthnscx7/image/upload/v1768231460/images_p4tgmy.png";

/* ============================
   BASE EMAIL LAYOUT
============================ */
const baseLayout = ({ title, body }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:30px;">
        <table width="600" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          
          <tr>
            <td style="background:#0a6cf1;padding:25px;text-align:center;">
              <img src="${LOGO_URL}" width="120" alt="Bank Logo" />
              <h2 style="color:#fff;margin:10px 0 0;">${BANK_NAME}</h2>
            </td>
          </tr>

          <tr>
            <td style="padding:30px;color:#333;font-size:14px;line-height:1.6;">
              ${body}
            </td>
          </tr>

          <tr>
            <td style="background:#f0f0f0;padding:15px;text-align:center;font-size:12px;color:#777;">
              © ${new Date().getFullYear()} ${BANK_NAME}. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/* ============================
   1️⃣ TRANSACTION ALERT - DYNAMIC
============================ */
const transactionAlertTemplate = ({
  amount,
  balance,
  currency,
  transferFee = 10000,
  status = "Pending", // "Pending", "Completed", "Failed"
}) => {
  // Status colors
  const statusColors = {
    Pending: "#f0ad4e", // orange
    Completed: "#28a745", // green
    Failed: "#dc3545", // red
  };

  return baseLayout({
    title: "Transaction Alert",
    body: `
      <h3 style="margin-top:0;">Transaction ${status === "Completed" ? "Successful" : status}</h3>
      <p>Your transfer has been processed.</p>

      <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse; margin-top:15px;">
        <tr>
          <td><b>Amount</b></td>
          <td style="color:#28a745;"><b>${currency}${amount.toLocaleString()}</b></td>
        </tr>
        <tr>
          <td><b>Available Balance</b></td>
          <td>${currency}${balance.toLocaleString()}</td>
        </tr>
        <tr>
          <td><b>Transfer Fee</b></td>
          <td>${currency}${transferFee.toLocaleString()}</td>
        </tr>
        <tr>
          <td><b>Status</b></td>
          <td style="color:${statusColors[status] || "#000"};"><b>${status}</b></td>
        </tr>
      </table>

      <p style="margin-top:20px;">
        Please ${status === "Pending" ? `complete the required fee payment of ${currency}${transferFee.toLocaleString()} to allow the transfer to proceed.` : ""}
      </p>
    `,
  });
};

/* ============================
   2️⃣ TRANSFER FEE REQUIRED
============================ */
const transferFeeTemplate = ({ amount, recipientName, currency }) =>
  baseLayout({
    title: "Transfer Fee Required",
    body: `
      <h3 style="color:#d9534f;margin-top:0;">Transfer Pending</h3>

      <p>Your transfer to <b>${recipientName}</b> requires a processing fee.</p>

      <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin-top:15px;">
        <tr>
          <td><b>Transfer Fee</b></td>
          <td>${currency}${amount.toLocaleString()}</td>
        </tr>
        <tr>
          <td><b>Status</b></td>
          <td style="color:#f0ad4e;"><b>Pending</b></td>
        </tr>
      </table>

      <p style="margin-top:20px;">
        Please complete the required fee payment to allow the transfer to proceed.
      </p>
    `,
  });

/* ============================
   3️⃣ RECIPIENT INCOMING TRANSFER
============================ */
const recipientIncomingTransferTemplate = ({
  recipientName,
  senderName,
  amount,
  currency,
  transactionId,
}) =>
  baseLayout({
    title: "Incoming Transfer (Pending)",
    body: `
      <h3 style="color:#f0ad4e;margin-top:0;">
        Incoming Transfer Notification
      </h3>

      <p>Hello ${recipientName || "Customer"},</p>

      <p>
        You have been listed as the recipient of a transfer from
        <b>${senderName}</b>.
      </p>

      <table width="100%" cellpadding="8" cellspacing="0" style="margin-top:15px;border-collapse:collapse;">
        <tr>
          <td><b>Amount</b></td>
          <td>${currency}${amount.toLocaleString()}</td>
        </tr>
        <tr>
          <td><b>Transaction ID</b></td>
          <td>${transactionId}</td>
        </tr>
        <tr>
          <td><b>Status</b></td>
          <td style="color:#f0ad4e;"><b>Pending</b></td>
        </tr>
      </table>

      <p style="margin-top:20px;">
        This transfer is currently being processed and will be credited once all
        required checks are completed.
      </p>

      <p>No action is required from you at this time.</p>
    `,
  });

/* ============================
   EXPORT ALL TEMPLATES
============================ */
module.exports = {
  transactionAlertTemplate,
  transferFeeTemplate,
  recipientIncomingTransferTemplate,
};
