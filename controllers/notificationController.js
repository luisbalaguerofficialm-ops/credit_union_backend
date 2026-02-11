const Notification = require("../models/Notification");
const emitDashboardUpdate = require("../utils/emitDashboardUpdate");
const { sendEmail, sendSMS } = require("../utils/notify");

// ===============================
// GET ALL USER NOTIFICATIONS
// ===============================
exports.getNotifications = async (req, res) => {
  try {
    const { category, unread } = req.query;

    const filter = { user: req.user.id };

    if (category) filter.category = category;
    if (unread === "true") filter.read = false;

    const notifications = await Notification.find(filter).sort({
      createdAt: -1,
    });

    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      read: false,
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
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
// CREATE NEW NOTIFICATION
// ===============================
exports.createNotification = async ({
  userId,
  title,
  message,
  category = "system", // default category
  email,
  phone,
  metadata = null,
}) => {
  try {
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      category,
      read: false,
      metadata,
    });

    // Real-time update
    const io = global.io || null;
    if (io) io.to(userId.toString()).emit("new-notification", notification);

    // Optional email + SMS
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
// MARK SINGLE AS READ
// ===============================
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { read: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const io = req.app.get("io");
    await emitDashboardUpdate(io, req.user.id);

    if (io) {
      io.to(req.user.id.toString()).emit("notification-read", {
        notificationId: id,
      });
    }

    res.status(200).json({ success: true, notification });
  } catch (err) {
    console.error("Mark As Read Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update notification",
    });
  }
};

// ===============================
// MARK ALL AS READ
// ===============================
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true },
    );

    const io = req.app.get("io");
    await emitDashboardUpdate(io, req.user.id);

    if (io) io.to(req.user.id.toString()).emit("notifications-cleared");

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (err) {
    console.error("Mark All As Read Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update notifications",
    });
  }
};

// ===============================
// DELETE SINGLE
// ===============================
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Notification.findOneAndDelete({
      _id: id,
      user: req.user.id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const io = req.app.get("io");
    await emitDashboardUpdate(io, req.user.id);

    if (io)
      io.to(req.user.id.toString()).emit("notification-deleted", {
        notificationId: id,
      });

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (err) {
    console.error("Delete Notification Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
};

// ===============================
// DELETE ALL
// ===============================
exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.id });

    const io = req.app.get("io");
    await emitDashboardUpdate(io, req.user.id);

    if (io) io.to(req.user.id.toString()).emit("notifications-deleted-all");

    res.status(200).json({
      success: true,
      message: "All notifications deleted",
    });
  } catch (err) {
    console.error("Delete All Notifications Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete notifications",
    });
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
    const formattedAmount = amount.toLocaleString();

    const message = `A transfer of $${formattedAmount} to ${recipientName} requires a transfer fee. Fee cannot be deducted from your balance.`;

    // Email + SMS
    if (user.email)
      await sendEmail({
        to: user.email,
        subject: "Transfer Fee Required",
        html: `<p>${message}</p>`,
      });

    if (user.phone) await sendSMS({ to: user.phone, message });

    // Dashboard notification (uses VALID category)
    const notification = await Notification.create({
      user: user._id,
      title: "Transfer Fee Required",
      message,
      category: "transaction", // ✅ valid enum now
      metadata: {
        amount,
        recipientName,
        type: "transfer_fee",
      },
    });

    const io = global.io || null;
    if (io) io.to(user._id.toString()).emit("new-notification", notification);

    return notification;
  } catch (err) {
    console.error("Transfer Fee Notification Error:", err);
    return null;
  }
};
