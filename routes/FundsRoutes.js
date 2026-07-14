const express = require("express");
const router = express.Router();

const {
  requestBankFunding,
  getMyFundingRequests,
  getAllFundingRequests,
  approveFundingRequest,
  rejectFundingRequest,
} = require("../controllers/FundsController");

const { protect, isStaff } = require("../middlewares/authMiddleware");

// ================= USER ROUTES =================
router.post("/funding-request", protect, requestBankFunding);
router.get("/funding-request/me", protect, getMyFundingRequests);

// ADMIN ROUTES

// =======================================
// ADMIN / MANAGER / SUPER ADMIN ROUTES
// =======================================

// Get all funding requests
router.get("/funding-requests", protect, isStaff, getAllFundingRequests);

// Approve funding request
router.patch(
  "/funding-requests/:id/approve",
  protect,
  isStaff,
  approveFundingRequest,
);

// Reject funding request
router.patch(
  "/funding-requests/:id/reject",
  protect,
  isStaff,
  rejectFundingRequest,
);

module.exports = router;
