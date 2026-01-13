const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");

// ==============================
// AUTH ROUTES
// ==============================
router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
router.post("/otp/send", authController.sendOtpController);
router.post("/otp/verify", authController.verifyOtpController);
router.post("/password/reset", authController.resetPassword);

// ==============================
// LOGOUT ROUTE
// ==============================
router.post("/logout", protect, authController.logout);

module.exports = router;
