const FundingRequest = require("../models/FundingRequest");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const emitDashboardUpdate = require("../utils/emitDashboardUpdate");
const { createNotification } = require("./notificationController");

/**
 * @desc  Create a new bank funding request
 * @route POST /api/funding-request
 * @access Private (User)
 */
exports.requestBankFunding = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid amount",
      });
    }

    // Safely pick a name from user object
    const userFullName =
      (req.user.firstName && req.user.lastName
        ? `${req.user.firstName} ${req.user.lastName}`
        : req.user.name) ||
      req.user.username ||
      "Unknown User";

    const request = await FundingRequest.create({
      user: req.user._id,
      userName: req.user.username || userFullName, // required field in schema
      userEmail: req.user.email,
      amount: Number(amount),
      status: "pending",
    });

    await createNotification({
      userId: req.user._id,
      title: "Funding Request Submitted",
      message: `Your funding request of $${Number(amount).toLocaleString()} has been submitted and is awaiting approval.`,
      category: "transaction",
      email: req.user.email,
    });
    // emit real-time update
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
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc  Get all funding requests of the logged-in user
 * @route GET /api/funding-request/me
 * @access Private (User)
 */
exports.getMyFundingRequests = async (req, res) => {
  try {
    const requests = await FundingRequest.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Get My Funding Requests Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================
// GET ALL FUNDING REQUESTS (ADMIN)
// ======================================
exports.getAllFundingRequests = async (req, res) => {
  try {
    const requests = await FundingRequest.find()
      .populate("user", "firstName lastName email accountNumber")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Get Funding Requests:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch funding requests.",
    });
  }
};

// ======================================
// APPROVE FUNDING REQUEST
// ======================================
exports.approveFundingRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNote } = req.body;

    const request = await FundingRequest.findById(id).populate("user");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Funding request not found.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This funding request has already been processed.",
      });
    }

    // =====================================
    // FIND OR CREATE WALLET
    // =====================================

    let wallet = await Wallet.findOne({
      user: request.user._id,
    });

    if (!wallet) {
      wallet = await Wallet.create({
        user: request.user._id,
      });
    }

    await wallet.addFunds(request.amount, req.user.role);

    // =====================================
    // CREATE TRANSACTION
    // =====================================

    await Transaction.create({
      user: request.user._id,
      amount: request.amount,
      type: "Deposit",
      status: "Successful",
      category: "Funding",
      narration: "Bank Funding Request Approved",
    });

    // =====================================
    // UPDATE REQUEST
    // =====================================

    request.status = "approved";
    request.reviewNote = reviewNote || "";
    request.reviewedAt = new Date();
    request.reviewedBy = req.user._id;
    request.reviewedRole = req.user.role;

    await request.save();

    // =====================================
    // NOTIFICATION
    // =====================================

    await createNotification({
      userId: request.user._id,
      title: "Funding Request Approved",
      message: `Your funding request of $${request.amount.toLocaleString()} has been approved and credited to your account.`,
      category: "transaction",
      email: request.user.email,
    });

    // =====================================
    // SOCKETS
    // =====================================

    const io = req.app.get("io");

    if (io) {
      io.to("admin-room").emit("funding-request:approved", request);

      await emitDashboardUpdate(io, request.user._id);
    }

    res.status(200).json({
      success: true,
      message: "Funding request approved successfully.",
      request,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to approve funding request.",
    });
  }
};

// ======================================
// REJECT FUNDING REQUEST
// ======================================
exports.rejectFundingRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNote } = req.body;

    const request = await FundingRequest.findById(id).populate("user");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Funding request not found.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This funding request has already been processed.",
      });
    }

    request.status = "rejected";
    request.reviewNote = reviewNote || "";
    request.reviewedAt = new Date();
    request.reviewedBy = req.user._id;
    request.reviewedRole = req.user.role;

    await request.save();

    // =====================================
    // NOTIFICATION
    // =====================================

    await createNotification({
      userId: request.user._id,
      title: "Funding Request Rejected",
      message: `Unfortunately your funding request of $${request.amount.toLocaleString()} was rejected.`,
      category: "transaction",
      email: request.user.email,
    });

    // =====================================
    // SOCKETS
    // =====================================

    const io = req.app.get("io");

    if (io) {
      io.to("admin-room").emit("funding-request:rejected", request);

      await emitDashboardUpdate(io, request.user._id);
    }

    res.status(200).json({
      success: true,
      message: "Funding request rejected successfully.",
      request,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to reject funding request.",
    });
  }
};
