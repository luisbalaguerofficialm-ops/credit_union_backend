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
  adminGetAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  adminDeleteNotification,
  adminDeleteAllNotifications,
} = require("../controllers/notificationController");

const { protect, authorize } = require("../middlewares/authMiddleware");

// ======================================================
// USER NOTIFICATIONS
// ======================================================

router.get("/", protect, getNotifications);

router.patch("/read-all", protect, markAllAsRead);

router.patch("/:id/read", protect, markAsRead);

router.delete("/", protect, deleteAllNotifications);

router.delete("/:id", protect, deleteNotification);

// ======================================================
// ADMIN NOTIFICATIONS
// ======================================================

router.get(
  "/admin",
  protect,
  authorize("admin", "manager", "superadmin"),
  adminGetAllNotifications,
);

router.patch(
  "/admin/read-all",
  protect,
  authorize("admin", "manager", "superadmin"),
  markAllNotificationsAsRead,
);

router.patch(
  "/admin/:id/read",
  protect,
  authorize("admin", "manager", "superadmin"),
  markNotificationAsRead,
);

router.delete(
  "/admin/delete-all",
  protect,
  authorize("admin", "manager", "superadmin"),
  adminDeleteAllNotifications,
);

router.delete(
  "/admin/:id",
  protect,
  authorize("admin", "manager", "superadmin"),
  adminDeleteNotification,
);

// ======================================================
// SEND NOTIFICATIONS
// ======================================================

router.post(
  "/send",
  protect,
  authorize("admin", "manager", "superadmin"),
  sendNotification,
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
