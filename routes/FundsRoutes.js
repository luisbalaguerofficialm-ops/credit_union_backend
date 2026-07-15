const express = require("express");
const router = express.Router();

const {
  requestBankFunding,
  getMyFundingRequests,
  getAllFundingRequests,
  approveFundingRequest,
  rejectFundingRequest,
} = require("../controllers/FundsController");

const { protect, authorize } = require("../middlewares/authMiddleware");

// ================= USER ROUTES =================
router.post("/funding-request", protect, requestBankFunding);
router.get("/funding-request/me", protect, getMyFundingRequests);

// ADMIN ROUTES

// =======================================
// ADMIN / MANAGER / SUPER ADMIN ROUTES
// =======================================

// Get all funding requests
router.get(
  "/admin/funding-requests",
  protect,
  authorize("manager", "admin", "superadmin"),
  getAllFundingRequests,
);

// Approve funding request
router.patch(
  "/admin/funding-requests/:id/approve",
  protect,
  authorize("manager", "admin", "superadmin"),
  approveFundingRequest,
);

// Reject funding request
router.patch(
  "/admin/funding-requests/:id/reject",
  protect,
  authorize("manager", "admin", "superadmin"),
  rejectFundingRequest,
);

module.exports = router;
