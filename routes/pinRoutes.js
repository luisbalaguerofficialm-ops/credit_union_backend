const express = require("express");
const router = express.Router();

const pinController = require("../controllers/pinController");
const { protect } = require("../middlewares/authMiddleware");
const verifyTransactionPin = require("../middlewares/verifyTransactionPin");

/**
 * -------------------------------
 * PIN ROUTES
 * Base: /api/pin
 * -------------------------------
 */

/**
 * Set transaction PIN
 * POST /api/pin/set
 */
router.post("/set", protect, pinController.setPin);

/**
 * Confirm transaction PIN (UI step-by-step / modal)
 * POST /api/pin/confirm
 *
 * NOTE:
 * - Uses middleware only
 * - No controller logic needed
 */
router.post("/confirm", protect, verifyTransactionPin, (req, res) => {
  res.json({
    success: true,
    message: "PIN confirmed",
  });
});

module.exports = router;
