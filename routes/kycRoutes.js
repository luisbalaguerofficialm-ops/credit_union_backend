// routes/kycRoutes.js
const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");
const { submitKyc, getUserKyc } = require("../controllers/kycController");

// Submit KYC
// Accepts: idDocument (front), idDocumentBack (back), selfie
router.post(
  "/submit",
  protect,
  upload.fields([
    { name: "idDocument", maxCount: 1 }, // Front of ID
    { name: "idDocumentBack", maxCount: 1 }, // Back of ID
    { name: "selfie", maxCount: 1 }, // Selfie
  ]),
  submitKyc
);

// Get current user's KYC
router.get("/me", protect, getUserKyc);

module.exports = router;
