const Template = require("../models/Template");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Contact = require("../models/Contact");
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

// ADMIN NOTIFICATION PATH

// /ADMIN  SENDING NOTIFICATION TO USERS==================================

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
    const emailHtml = sendEmail({
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
      createdBy: req.user?._id,
      createdByType: req.user?.role || "system",
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

// ======================

exports.adminGetAllNotifications = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 4,
      search = "",
      status,
      channel,
      target,
      type,
      sort = "newest",
    } = req.query;

    page = Number(page);
    limit = Number(limit);

    /*
    ====================================
    Notification Query
    ====================================
    */

    const notificationQuery = {};

    if (search) {
      notificationQuery.$or = [
        {
          title: {
            $regex: search,
            $options: "i",
          },
        },
        {
          message: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (status && status !== "All Activities" && status !== "Received") {
      notificationQuery.status = status;
    }

    if (channel && channel !== "All Channels" && channel !== "Contact Form") {
      notificationQuery.channels = channel;
    }

    if (type && type !== "All" && type !== "support") {
      notificationQuery.type = type;
    }

    if (target) {
      notificationQuery.target = target;
    }

    const notifications = await Notification.find(notificationQuery)
      .populate("createdBy", "firstName lastName name email role")
      .populate("specificUserId", "firstName lastName email")
      .lean();

    /*
    ====================================
    Contact Query
    ====================================
    */

    const contactQuery = {};

    if (search) {
      contactQuery.$or = [
        {
          subject: {
            $regex: search,
            $options: "i",
          },
        },
        {
          message: {
            $regex: search,
            $options: "i",
          },
        },
        {
          fullName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    let contacts = [];

    // Only fetch contacts if Support or All is selected
    if (!type || type === "All" || type === "support") {
      contacts = await Contact.find(contactQuery).lean();

      // Filter Contact Form channel
      if (channel && channel !== "All Channels" && channel !== "Contact Form") {
        contacts = [];
      }

      // Contacts only have "Received" status
      if (status && status !== "All Activities" && status !== "Received") {
        contacts = [];
      }
    }

    /*
    ====================================
    Normalize Notifications
    ====================================
    */

    const notificationData = notifications.map((item) => ({
      id: item._id,

      recordType: "notification",

      type: item.type,

      title: item.title || null,

      subject: null,

      titleOrSubject: item.title,

      message: item.message,

      channels: item.channels,

      target: item.target,

      sentCount: item.sentToCount || 0,

      createdAt: item.createdAt,

      createdBy:
        item.createdBy?.name ||
        `${item.createdBy?.firstName || ""} ${
          item.createdBy?.lastName || ""
        }`.trim() ||
        "System",

      createdByEmail: item.createdBy?.email || "-",

      createdByRole: item.createdBy?.role || "-",

      status: item.status,
    }));

    /*
    ====================================
    Normalize Contacts
    ====================================
    */

    const contactData = contacts.map((item) => ({
      id: item._id,

      recordType: "contact",

      type: "support",

      title: null,

      subject: item.subject,

      titleOrSubject: item.subject,

      message: item.message,

      channels: ["Contact Form"],

      target: item.email,

      sentCount: 1,

      createdAt: item.createdAt,

      createdBy: item.fullName,

      createdByEmail: item.email,

      createdByRole: "Customer",

      status: "Received",
    }));

    /*
    ====================================
    Merge + Sort
    ====================================
    */

    let data = [...notificationData, ...contactData];

    data.sort((a, b) =>
      sort === "oldest"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt),
    );

    /*
    ====================================
    Pagination
    ====================================
    */

    const total = data.length;

    const start = (page - 1) * limit;

    const end = start + limit;

    const paginatedData = data.slice(start, end);

    /*
    ====================================
    Response
    ====================================
    */

    return res.status(200).json({
      success: true,

      notifications: paginatedData,

      metrics: {
        total,
      },

      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("Admin notifications error:", err);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch notifications.",
    });
  }
};
// ADMIN . Mark Single Notification as Read
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.read = true;

    // prevent duplicates
    if (
      req.user?._id &&
      !notification.readBy.some(
        (userId) => userId.toString() === req.user._id.toString(),
      )
    ) {
      notification.readBy.push(req.user._id);
    }

    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ADMIN Mark All Notifications as Read

exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        read: false,
      },
      {
        $set: {
          read: true,
        },
      },
    );

    // keep track of who marked them
    await Notification.updateMany(
      {
        readBy: {
          $ne: req.user._id,
        },
      },
      {
        $push: {
          readBy: req.user._id,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ADMIN Delete Single Notification

exports.adminDeleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await notification.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ADMIN Delete All Notifications
// ADMIN Delete All Notifications
exports.adminDeleteAllNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({});

    return res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} notifications deleted successfully`,
    });
  } catch (error) {
    console.error("Delete All Notifications:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
