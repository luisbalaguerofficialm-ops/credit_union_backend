const express = require("express");
const router = express.Router();

const {
  requestCheckDeposit,
  getMyCheckDeposits,
} = require("../controllers/checkDepositController");

const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

// ======================================
// USER ROUTES
// ======================================

// Submit a new check deposit
router.post(
  "/",
  protect,
  upload.fields([
    { name: "frontImage", maxCount: 1 },
    { name: "backImage", maxCount: 1 },
  ]),
  requestCheckDeposit,
);

// Get logged-in user's deposit history
router.get("/", protect, getMyCheckDeposits);

module.exports = router;
