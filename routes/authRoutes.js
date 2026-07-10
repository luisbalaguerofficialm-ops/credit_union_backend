const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

// ==============================
// AUTH ROUTES
// ==============================
router.post(
  "/register",
  upload.single("profileImage"),
  authController.registerUser,
);
router.post("/login", authController.loginUser);
router.get("/me", protect, authController.getMe);
router.post("/logout", protect, authController.logout);
router.post("/otp/send", authController.sendOtpController);
router.post("/password/forgot", authController.forgotPassword);
router.post("/password/verify-otp", authController.verifyForgotPasswordOtp);
router.post("/password/reset", authController.resetPassword);
router.post("/refresh-token", authController.refreshToken);
module.exports = router;
