const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect, authorize } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

// ==============================
// AUTH ROUTES
// ==============================
router.post(
  "/register",
  upload.single("profileImage"),
  authController.registerUser,
);
router.post("/send/otp", authController.sendOtpController);
router.post("verify/otp", authController.verifyOtpController);
router.post("/login", authController.loginUser);
router.get("/me", protect, authController.getMe);
router.post("/logout", protect, authController.logout);
router.post("/password/forgot", authController.forgotPassword);
router.post("/password/verify-otp", authController.verifyForgotPasswordOtp);
router.post("/password/reset", authController.resetPassword);
router.post("/refresh-token", authController.refreshToken);
router.post(
  "/create-admin",
  protect,
  authorize("superadmin"),
  authController.createAdmin,
);
module.exports = router;
