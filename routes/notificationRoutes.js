const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  sendTransferFeeNotification,
  sendNotification,
  getNotificationHistory,
  adminGetAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  adminDeleteNotification,
  adminDeleteAllNotifications,
} = require("../controllers/notificationController");

const { protect, authorize } = require("../middlewares/authMiddleware");

// ===============================
// GET ALL NOTIFICATIONS
// ===============================
router.get("/", protect, getNotifications);

// ===============================
// MARK ALL AS READ (must be before /:id routes)
// ===============================
router.put("/read-all", protect, markAllAsRead);

// ===============================
// MARK SINGLE AS READ
// ===============================
router.put("/:id/read", protect, markAsRead);

// ===============================
// DELETE ALL (must be before /:id)
// ===============================
router.delete("/", protect, deleteAllNotifications);

// ===============================
// DELETE SINGLE
// ===============================
router.delete("/:id", protect, deleteNotification);

router.post(
  "/send",
  protect,
  authorize("admin", "manager", "superadmin"),
  sendNotification,
);

router.get(
  "/notifications/history",
  protect,
  authorize("admin", "manager", "superadmin"),
  getNotificationHistory,
);

router.get(
  "/admin/notifications",
  protect,
  authorize("admin", "manager", "superadmin"),
  adminGetAllNotifications,
);
router.patch(
  "/notifications/read-all",
  protect,
  authorize("admin", "manager", "superadmin"),
  markAllNotificationsAsRead,
);

router.patch(
  "/notifications/read/:id",
  protect,
  authorize("admin", "manager", "superadmin"),
  markNotificationAsRead,
);
router.delete(
  "/notifications",
  protect,
  authorize("admin", "manager", "superadmin"),
  adminDeleteAllNotifications,
);
router.delete(
  "/notifications/:id",
  protect,
  authorize("admin", "manager", "superadmin"),
  adminDeleteNotification,
);

// ===============================
// SEND TRANSFER FEE NOTIFICATION
// ===============================
router.post("/transfer-fee", protect, async (req, res) => {
  const { amount, recipientName } = req.body;

  if (!amount || !recipientName) {
    return res.status(400).json({
      success: false,
      message: "amount and recipientName are required",
    });
  }

  try {
    const notification = await sendTransferFeeNotification({
      user: req.user, // logged-in user
      amount,
      recipientName,
    });

    if (!notification) {
      return res.status(500).json({
        success: false,
        message: "Failed to send transfer fee notification",
      });
    }

    res.status(200).json({
      success: true,
      message: "Transfer fee notification sent successfully",
      notification,
    });
  } catch (err) {
    console.error("Transfer Fee Route Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
