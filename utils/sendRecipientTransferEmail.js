const { sendEmail } = require("../services/emailService");
const { recipientIncomingTransferTemplate } = require("./transactionTemplates");

exports.sendRecipientTransferEmail = async ({
  recipientEmail,
  recipientName,
  senderName,
  amount,
  currency,
  transactionId,
}) => {
  try {
    const html = recipientIncomingTransferTemplate({
      recipientName,
      senderName,
      amount,
      currency,
      transactionId,
    });

    console.log(`📧 Sending recipient transfer email to: ${recipientEmail}`);
    await sendEmail({
      to: recipientEmail,
      subject: "Incoming Transfer Pending",
      html,
    });
    console.log(
      `✅ Recipient transfer email sent successfully to: ${recipientEmail}`,
    );
  } catch (err) {
    console.error(`❌ Failed to send recipient transfer email:`, err.message);
  }
};
