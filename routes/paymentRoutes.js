const express = require("express");
const router = express.Router();
const { protect } = require("../utils/authMiddleware");
const {
  initPayment,
  verifyPayment,
} = require("../controllers/paymentController");

router.post("/init", protect, initPayment);
router.get("/verify/:txId", protect, verifyPayment);

module.exports = router;
