// routes/kycRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");
const { submitKyc, getUserKyc } = require("../controllers/kycController");

// Submit KYC
router.post(
  "/submit",
  protect,
  upload.fields([
    { name: "idDocumentFront", maxCount: 1 },
    { name: "idDocumentBack", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  submitKyc,
);

// Get current user's KYC
router.get("/me", protect, getUserKyc);

module.exports = router;
