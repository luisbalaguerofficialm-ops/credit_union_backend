const Notification = require("../models/Notification");
const { emailService } = require("./emailService");

exports.createNotification = async ({
  user,
  title,
  message,
  type = "system",
  email,
  emailSubject,
  emailHtml,
}) => {
  // Save in DB
  await Notification.create({
    user,
    title,
    message,
    type,
  });

  // Send email if provided
  if (email && emailHtml) {
    await sendEmail({
      to: email,
      subject: emailSubject || title,
      html: emailHtml,
    });
  }
};
