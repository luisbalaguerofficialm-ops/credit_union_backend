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

    const all = await Notification.countDocuments({
      user: req.user.id,
    });

    const security = await Notification.countDocuments({
      user: req.user.id,
      category: "security",
    });

    const transaction = await Notification.countDocuments({
      user: req.user.id,
      category: "transaction",
    });

    const system = await Notification.countDocuments({
      user: req.user.id,
      category: "system",
    });

    res.status(200).json({
      success: true,
      unreadCount,
      notifications,
      counts: {
        all,
        security,
        transaction,
        system,
      },
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
  category,
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

exports.sendNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      templateId,
      channels = [],
      audience = "all",
      userId,
      schedule = "immediate",
      scheduledTime,
    } = req.body;

    if (!title && !templateId) {
      return res.status(400).json({
        success: false,
        message: "Title or template is required",
      });
    }

    /* ================================
       FORMAT CHANNELS
    ================================ */

    const formattedChannels = channels.map((c) => {
      if (c === "email") return "Email";
      if (c === "sms") return "SMS";
      if (c === "inApp") return "InApp";
      return c;
    });

    /* ================================
       AUDIENCE MAP
    ================================ */

    const audienceMap = {
      all: "All Users",
      verified: "Verified Users",
      kyc_pending: "KYC Pending Users",
      inactive: "Inactive Users",
      specific: "Specific User",
    };

    const target = audienceMap[audience] || "All Users";

    /* ================================
       FETCH TEMPLATE
    ================================ */

    let template;

    if (templateId) {
      template = await Template.findById(templateId);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }
    }

    const finalTitle = template?.subject || title;
    const finalMessageContent = template?.content || message;

    /* ================================
       FIND USER EMAIL
    ================================ */
    let user = null;
    let userEmail = null;

    if (audience === "specific" && userId) {
      user = await User.findById(userId); // ✅ FIXED

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      userEmail = user.email;
    }

    // ✅ Build full name correctly
    const fullName = user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ")
      : "Valued Customer";

    // ✅ Generate email AFTER fetching user
    const emailHtml = dynamicNotificationTemplate({
      variables: {
        user_name: fullName,
        message: finalMessageContent,
        subject: finalTitle,
      },
    });
    /* ================================
       SAVE NOTIFICATION
    ================================ */

    const notification = await Notification.create({
      title: finalTitle,
      message: finalMessageContent,
      channels: formattedChannels,
      target,
      specificUserId: audience === "specific" ? userId : null,
      status: "Delivered",
      sentToCount: audience === "specific" ? 1 : 0,
      deliveryTime:
        schedule === "scheduled" ? new Date(scheduledTime) : new Date(),
      createdBy: req.admin?.id,
    });

    /* ================================
       SEND EMAIL
    ================================ */

    if (formattedChannels.includes("Email") && userEmail) {
      try {
        const emailResponse = await resend.emails.send({
          from: FROM_EMAIL,
          to: userEmail,
          subject: finalTitle,
          html: emailHtml,
          replyTo: REPLY_TO_EMAIL,
        });

        console.log("✅ Resend response:", emailResponse);
      } catch (emailError) {
        console.error("❌ Email send error:", emailError);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      notification,
    });
  } catch (err) {
    console.error("Send notification error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getNotificationHistory = async (req, res) => {
  try {
    // Fetch all notifications, sorted by newest first
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(7)
      .populate("createdBy", "name email"); // optional: populate admin name/email

    // Format response for frontend table
    const formattedNotifications = notifications.map((n) => ({
      id: n._id,
      title: n.title,
      channel: n.channels.join(", "), // e.g. "Email, InApp"
      audience: n.target,
      sentCount: n.sentToCount || 0,
      createdAt: n.createdAt,
      createdBy: n.createdBy?.name || "Admin",
      status: n.status,
    }));

    return res.status(200).json({
      success: true,
      notifications: formattedNotifications,
    });
  } catch (err) {
    console.error("Fetch notification history error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notification history",
    });
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
