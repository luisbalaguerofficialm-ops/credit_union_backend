/**
 * Transaction Email Templates
 * Centralized HTML branding
 */

// ======================================
// BRAND CONFIG
// ======================================
const BANK_NAME = "Credit Union Bank";

// Uses Cloudinary logo (safe for emails)
const LOGO_URL =
  process.env.BANK_LOGO_URL ||
  "https://res.cloudinary.com/dvthnscx7/image/upload/v1768231460/images_p4tgmy.png";

// ======================================
// BASE EMAIL LAYOUT
// ======================================
const baseLayout = ({ title, body }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>

<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:30px 0;">
        <table
          width="600"
          cellpadding="0"
          cellspacing="0"
          style="
            background:#ffffff;
            border-radius:8px;
            overflow:hidden;
            box-shadow:0 2px 8px rgba(0,0,0,0.05);
          "
        >

          <!-- HEADER -->
          <tr>
            <td
              style="
                background:#0a6cf1;
                padding:25px;
                text-align:center;
              "
            >
              <img
                src="${LOGO_URL}"
                alt="${BANK_NAME}"
                width="120"
                style="display:block;margin:0 auto 10px auto;"
              />
              <h2
                style="
                  margin:0;
                  color:#ffffff;
                  font-weight:normal;
                "
              >
                ${BANK_NAME}
              </h2>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td
              style="
                padding:30px;
                color:#333;
                font-size:14px;
                line-height:1.6;
              "
            >
              ${body}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td
              style="
                background:#f0f0f0;
                padding:15px;
                text-align:center;
                font-size:12px;
                color:#777;
              "
            >
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

// ======================================
// TRANSACTION ALERT TEMPLATE
// ======================================
const transactionAlertTemplate = ({ type, amount, balance, currency }) =>
  baseLayout({
    title: "Transaction Alert",
    body: `
      <h3 style="margin-top:0;color:#0a6cf1;">
        Transaction Successful
      </h3>

      <p>You have a new transaction on your account.</p>

      <table
        width="100%"
        cellpadding="8"
        cellspacing="0"
        style="margin-top:15px;border-collapse:collapse;"
      >
        <tr>
          <td style="border-bottom:1px solid #eee;"><b>Type</b></td>
          <td style="border-bottom:1px solid #eee;">${type}</td>
        </tr>

        <tr>
          <td style="border-bottom:1px solid #eee;"><b>Amount</b></td>
          <td style="border-bottom:1px solid #eee;">
            ${currency}${amount.toLocaleString()}
          </td>
        </tr>

        <tr>
          <td><b>Available Balance</b></td>
          <td>${currency}${balance.toLocaleString()}</td>
        </tr>
      </table>

      <p style="margin-top:25px;">
        If you did not authorize this transaction, please contact our support
        team immediately.
      </p>
    `,
  });

// ======================================
// TRANSFER FEE TEMPLATE
// ======================================
const transferFeeTemplate = ({ amount, recipientName, currency }) =>
  baseLayout({
    title: "Transaction Pending: Transfer Fee Required",
    body: `
      <h3 style="margin-top:0;color:#d9534f;">
        Transfer Fee Notice
      </h3>

      <p>
        You initiated a transfer to <b>${recipientName}</b>.
      </p>

      <p>
        A transfer fee of
        <b>${currency}${amount.toLocaleString()}</b>
        is required to complete this transaction.
      </p>

      <div
        style="
          margin-top:20px;
          padding:15px;
          background:#fff3cd;
          border-left:4px solid #f0ad4e;
        "
      >
        <p style="margin:0;">
          <b>Important:</b>
          This fee cannot be deducted from your balance.
          Please contact the bank to receive payment instructions.
        </p>
      </div>
    `,
  });

// ======================================
// EXPORTS
// ======================================
module.exports = {
  transactionAlertTemplate,
  transferFeeTemplate,
};
