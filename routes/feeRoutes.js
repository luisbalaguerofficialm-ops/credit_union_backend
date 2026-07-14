const express = require("express");
const router = express.Router();
const feeController = require("../controllers/feeRoleController");
const { protect, authorize } = require("../middlewares/authMiddleware");

// ==========================
// FEE RULE ROUTES
// ==========================

// Create a new fee rule (Admin or SuperAdmin)
router.post("/admin", protect, authorize, feeController.createFeeRule);

// Get all fee rules
router.get("/admin", protect, authorize, feeController.getFeeRules);

// Update a fee rule by ID
router.put("/admin/:id", protect, authorize, feeController.updateFeeRule);

// Disable a fee rule by ID
router.patch(
  "/admin/:id/disable",
  protect,
  authorize,
  feeController.disableFeeRule,
);

module.exports = router;
