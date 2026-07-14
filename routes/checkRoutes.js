const express = require("express");
const router = express.Router();

const {
  requestCheckDeposit,
  getMyCheckDeposits,
  getAllCheckDeposits,
  approveCheckDeposit,
  rejectCheckDeposit,
} = require("../controllers/checkDepositController");

const { protect, authorize } = require("../middlewares/authMiddleware");
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

router.get(
  "/admin/check-deposits",
  protect,
  authorize("manager", "admin", "superadmin"),
  getAllCheckDeposits,
);

router.patch(
  "/admin/check-deposits/:id/approve",
  protect,
  authorize("manager", "admin", "superadmin"),
  approveCheckDeposit,
);

router.patch(
  "/admin/check-deposits/:id/reject",
  protect,
  authorize("manager", "admin", "superadmin"),
  rejectCheckDeposit,
);

module.exports = router;
