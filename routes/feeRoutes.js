const express = require("express");
const router = express.Router();
const {
  createFeeRule,
  getFeeRules,
  updateFeeRule,
  deleteFeeRule,
} = require("../controllers/feeRoleController");
const { protect, authorize } = require("../middlewares/authMiddleware");

// ==========================
// FEE RULE ROUTES
// ==========================

// Create a new fee rule (Admin or SuperAdmin)
router.post(
  "/admin",
  protect,
  authorize("superadmin", "admin", "manager"),
  createFeeRule,
);

// Get all fee rules
router.get(
  "/admin",
  protect,
  authorize("superadmin", "admin", "manager"),
  getFeeRules,
);

// Update a fee rule by ID
router.put(
  "/admin/:id",
  protect,
  authorize("superadmin", "admin", "manager"),
  updateFeeRule,
);

router.delete(
  "/admin/:id",
  protect,
  authorize("superadmin", "admin", "manager"),
  deleteFeeRule,
);

module.exports = router;
