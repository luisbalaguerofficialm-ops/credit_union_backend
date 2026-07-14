// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

const {
  getUserProfile,
  getDashboard,
  getDashboardStats,
  changePassword,
  changeTransactionPin,
  updatePreferences,
  updateProfile,
  getPreferences,
  deleteAccount,
  updateProfileImage,
  sendTransactionPinOtp,
  verifyTransactionPinOtp,
  resetTransactionPin,
} = require("../controllers/userController");

router.get("/profile", protect, getUserProfile);

router.get("/dashboard", protect, getDashboard);
router.get(
  "/admin/dashboard",
  protect,
  authorize("superadmin", "admin", "manager"),
  getDashboardStats,
);

router.put(
  "/update-profile-image",
  protect,
  upload.single("profileImage"),
  updateProfileImage,
);

router.put("/update-profile", protect, updateProfile);

router.put("/change-password", protect, changePassword);

router.put("/change-pin", protect, changeTransactionPin);

router.get("/preferences", protect, getPreferences);

router.put("/preferences", protect, updatePreferences);

router.delete("/delete-account", protect, deleteAccount);

router.post("/transaction-pin/send-otp", sendTransactionPinOtp);

router.post("/verify-transaction-pin-otp", verifyTransactionPinOtp);

router.put("/transaction-pin/reset", protect, resetTransactionPin);

module.exports = router;
