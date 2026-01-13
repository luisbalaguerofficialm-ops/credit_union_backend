const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  sendTransferFeeNotification,
} = require("../controllers/notificationController");

const { protect } = require("../middlewares/authMiddleware");

// Get all notifications
router.get("/", protect, getNotifications);

// Mark one notification as read
router.put("/:id/read", protect, markAsRead);

// Mark all notifications as read
router.put("/read-all", protect, markAllAsRead);

// Delete one notification
router.delete("/:id", protect, deleteNotification);

// Delete all notifications
router.delete("/", protect, deleteAllNotifications);

// ===============================
// SEND TRANSFER FEE NOTIFICATION
// ===============================
router.post("/transfer-fee", protect, async (req, res) => {
  const { userId, amount, recipientName } = req.body;

  if (!userId || !amount || !recipientName) {
    return res.status(400).json({
      success: false,
      message: "userId, amount, and recipientName are required",
    });
  }

  try {
    const notification = await sendTransferFeeNotification({
      user: req.user,
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
