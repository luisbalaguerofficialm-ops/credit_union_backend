const Notification = require("../models/Notification");
const emitDashboardUpdate = require("../utils/emitDashboardUpdate");
const { sendEmail, sendSMS } = require("../utils/notify");

// ===============================
// GET ALL USER NOTIFICATIONS
// ===============================
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user.id,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    console.error("Get Notifications Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

// ===============================
// CREATE NEW NOTIFICATION + OPTIONAL EMAIL/SMS
// ===============================
exports.createNotification = async ({
  userId,
  title,
  message,
  email,
  phone,
}) => {
  try {
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      read: false,
    });

    // Emit real-time dashboard update
    const io = global.io || null; // you can pass io from app if needed
    if (io) io.to(userId.toString()).emit("new-notification", notification);

    // Send email and SMS if provided
    if (email)
      await sendEmail({ to: email, subject: title, html: `<p>${message}</p>` });
    if (phone) await sendSMS({ to: phone, message });

    return notification;
  } catch (err) {
    console.error("Create Notification Error:", err);
    return null;
  }
};

// ===============================
// MARK SINGLE NOTIFICATION AS READ
// ===============================
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    const io = req.app.get("io");
    await emitDashboardUpdate(io, req.user.id);
    io.to(req.user.id.toString()).emit("notification-read", {
      notificationId: id,
    });

    res.status(200).json({ success: true, notification });
  } catch (err) {
    console.error("Mark As Read Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update notification" });
  }
};

// ===============================
// MARK ALL USER NOTIFICATIONS AS READ
// ===============================
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true }
    );

    const io = req.app.get("io");
    await emitDashboardUpdate(io, req.user.id);
    io.to(req.user.id.toString()).emit("notifications-cleared");

    res
      .status(200)
      .json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error("Mark All As Read Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update notifications" });
  }
};

// ===============================
// DELETE SINGLE NOTIFICATION
// ===============================
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Notification.findOneAndDelete({
      _id: id,
      user: req.user.id,
    });

    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });

    const io = req.app.get("io");
    await emitDashboardUpdate(io, req.user.id);
    io.to(req.user.id.toString()).emit("notification-deleted", {
      notificationId: id,
    });

    res.status(200).json({ success: true, message: "Notification deleted" });
  } catch (err) {
    console.error("Delete Notification Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete notification" });
  }
};

// ===============================
// DELETE ALL USER NOTIFICATIONS
// ===============================
exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.id });

    const io = req.app.get("io");
    await emitDashboardUpdate(io, req.user.id);
    io.to(req.user.id.toString()).emit("notifications-deleted-all");

    res
      .status(200)
      .json({ success: true, message: "All notifications deleted" });
  } catch (err) {
    console.error("Delete All Notifications Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete notifications" });
  }
};

// ===============================
// SEND TRANSFER FEE NOTIFICATION
// ===============================
exports.sendTransferFeeNotification = async ({
  user,
  amount,
  recipientName,
}) => {
  try {
    // 1️⃣ Send Email + SMS
    const emailMessage = `
      <h2>Transfer Fee Required</h2>
      <p>A transfer of $${amount.toLocaleString()} to ${recipientName} requires a transfer fee.</p>
      <p>The fee cannot be deducted from your available balance. Please contact your bank branch to pay the fee.</p>
    `;
    const smsMessage = `A transfer of $${amount.toLocaleString()} to ${recipientName} requires a transfer fee. Fee cannot be deducted from your balance. Contact your bank branch.`;

    if (user.email)
      await sendEmail({
        to: user.email,
        subject: "Transfer Fee Required",
        html: emailMessage,
      });
    if (user.phone) await sendSMS({ to: user.phone, message: smsMessage });

    // 2️⃣ Create Dashboard Notification
    const notification = await Notification.create({
      user: user._id,
      title: "Transfer Fee Required",
      message: `A transfer of $${amount.toLocaleString()} to ${recipientName} requires a transfer fee. Fee cannot be deducted from your balance.`,
      type: "transfer_fee",
      read: false,
    });

    // 3️⃣ Emit real-time update via socket
    const io = global.io || null;
    if (io) io.to(user._id.toString()).emit("new-notification", notification);

    return notification;
  } catch (err) {
    console.error("Transfer Fee Notification Error:", err);
    return null;
  }
};
