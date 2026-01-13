const express = require("express");
const router = express.Router();

//  Correct import path
const { protect } = require("../middlewares/authMiddleware");

const {
  getUserSettings,
  updateSetting,
  deleteAccount,
} = require("../controllers/settingsController");

// Routes using the middleware
router.get("/", protect, getUserSettings);
router.put("/:field", protect, updateSetting);
router.delete("/delete-account", protect, deleteAccount);

module.exports = router;
