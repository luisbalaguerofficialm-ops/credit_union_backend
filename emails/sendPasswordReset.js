import { sendEmail } from "../services/emailService.js";

export const sendPasswordResetEmail = async ({ email, token }) => {
  const resetLink = `${process.env.APP_URL}/reset-password?token=${token}`;

  return sendEmail({
    to: email,
    subject: "Reset Your Credixa Password",
    html: `
      <div style="font-family: Arial; max-width: 600px; margin: auto;">
        <h2>Password Reset</h2>
        <p>Click the button below to reset your password:</p>
        <a href="${resetLink}"
           style="display:inline-block;padding:12px 20px;background:#006A91;color:#fff;text-decoration:none;border-radius:6px;">
           Reset Password
        </a>
        <p>This link expires in 15 minutes.</p>
        <hr />
        <small>© ${new Date().getFullYear()} Credixa</small>
      </div>
    `,
  });
};
