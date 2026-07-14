const express = require("express");

const router = express.Router();

const {
  getSystemSettings,
  updateSystemSettings,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
} = require("../controllers/systemSettingsController");

const { protect } = require("../middlewares/authMiddleware");

const { authorize } = require("../middlewares/authMiddleware");

// SYSTEM SETTINGS

router.get(
  "/",
  protect,
  authorize("superadmin", "admin", "manager"),
  getSystemSettings,
);

router.put(
  "/",
  protect,
  authorize("superadmin", "admin"),
  updateSystemSettings,
);

// ADMIN PROFILE

router.get("/profile", protect, getAdminProfile);

router.put("/profile", protect, updateAdminProfile);

// PASSWORD

router.patch("/change-password", protect, changeAdminPassword);

module.exports = router;
