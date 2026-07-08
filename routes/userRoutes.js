// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

const {
  getUserProfile,
  getDashboard,
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

router.post("/transaction-pin/verify-otp", verifyTransactionPinOtp);

router.put("/transaction-pin/reset", protect, resetTransactionPin);

module.exports = router;
