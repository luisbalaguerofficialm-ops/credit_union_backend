import { sendEmail } from "../services/emailService.js";

export const sendOtpEmail = async ({ email, otp }) => {
  return sendEmail({
    to: email,
    subject: "Your Credixa One-Time Password (OTP)",
    html: `
      <div style="font-family: Arial; max-width: 600px; margin: auto;">
        <h2>Verify Your Account</h2>
        <p>Your OTP is:</p>
        <h1 style="letter-spacing: 6px;">${otp}</h1>
        <p>This code expires in <strong>5 minutes</strong>.</p>
        <p>If you did not request this, ignore this email.</p>
        <hr />
        <small>© ${new Date().getFullYear()} Credixa</small>
      </div>
    `,
  });
};
