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
} = require("../controllers/userController");

// -----------------------------
// USER PROFILE
// -----------------------------
router.get("/profile", protect, getUserProfile);

// -----------------------------
// DASHBOARD
// -----------------------------
router.get("/dashboard", protect, getDashboard);

// -----------------------------
// PROFILE IMAGE UPDATE
// -----------------------------
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

module.exports = router;
