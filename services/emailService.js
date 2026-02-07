const { Resend } = require("resend");

if (!process.env.RESEND_API_KEY) {
  console.warn(
    "⚠️  RESEND_API_KEY not set in environment variables - emails will fail",
  );
}

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendEmail = async ({ to, subject, html }) => {
  try {
    console.log(`📧 Sending email to ${to} with subject: ${subject}`);
    const result = await resend.emails.send({
      from: "Credit Union Bank <support@credixa.co>",
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent successfully:`, result);
    return result;
  } catch (err) {
    console.error(`❌ Email failed for ${to}:`, err.message);
    throw err;
  }
};
