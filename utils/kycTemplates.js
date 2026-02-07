const BANK_NAME = "Credit Union Bank";

const LOGO_URL =
  process.env.BANK_LOGO_URL ||
  "https://res.cloudinary.com/dvthnscx7/image/upload/v1768231460/images_p4tgmy.png";

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
        <table width="600" style="background:#fff;border-radius:8px;">
          <tr>
            <td style="background:#0a6cf1;padding:20px;text-align:center;">
              <img src="${LOGO_URL}" width="120" />
              <h2 style="color:#fff;margin:10px 0 0;">${BANK_NAME}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;font-size:14px;color:#333;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="background:#f0f0f0;padding:15px;text-align:center;font-size:12px;">
              © ${new Date().getFullYear()} ${BANK_NAME}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

exports.kycApprovedTemplate = (name) =>
  baseLayout({
    title: "KYC Approved",
    body: `
      <h3 style="color:#28a745;">KYC Verification Approved 🎉</h3>

      <p>Hello ${name || "Customer"},</p>

      <p>
        We’re happy to inform you that your <b>KYC verification has been
        successfully approved</b>.
      </p>

      <p>
        You can now enjoy full access to all transfer features on your account.
      </p>

      <p style="margin-top:25px;">
        Thank you for banking with us.
      </p>
    `,
  });
