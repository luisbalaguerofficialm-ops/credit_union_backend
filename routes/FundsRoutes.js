const express = require("express");
const router = express.Router();

const {
  requestBankFunding,
  getMyFundingRequests,
} = require("../controllers/FundsController");

const { protect } = require("../middlewares/authMiddleware");

// ================= USER ROUTES =================
router.post("/funding-request", protect, requestBankFunding);
router.get("/funding-request/me", protect, getMyFundingRequests);

module.exports = router;
