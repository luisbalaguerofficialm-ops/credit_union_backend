const FundingRequest = require("../models/FundingRequest");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const emitDashboardUpdate = require("../utils/emitDashboardUpdate");

/**
 * @desc  Create a new bank funding request
 * @route POST /api/funding-request
 * @access Private (User)
 */
exports.requestBankFunding = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid amount",
      });
    }

    const request = await FundingRequest.create({
      user: userId,
      amount: Number(amount),
      status: "pending",
    });

    // Optionally emit real-time update to admin dashboard
    const io = req.app.get("io");
    if (io) {
      io.to("admin-room").emit("funding-request:new", request);
    }

    res.status(201).json({
      success: true,
      message: "Funding request submitted. Awaiting admin approval.",
      request,
    });
  } catch (error) {
    console.error("Request Funding Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc  Get all funding requests of the logged-in user
 * @route GET /api/funding-request/me
 * @access Private (User)
 */
exports.getMyFundingRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await FundingRequest.find({ user: userId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Get My Funding Requests Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
