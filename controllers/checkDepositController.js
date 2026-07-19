const CheckDeposit = require("../models/CheckDeposit");
const { createNotification } = require("./notificationController");
const User = require("../models/User");
const emitDashboardUpdate = require("../utils/emitDashboardUpdate");
const { uploadToCloudinary } = require("../utils/cloudinary");
const { sendEmail } = require("../utils/notify");
const Wallet = require("../models/Wallet");

// ======================================
// CREATE CHECK DEPOSIT REQUEST
// POST /api/check-deposit
// ======================================
exports.requestCheckDeposit = async (req, res) => {
  try {
    const { amount, accountNumber, accountType } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid deposit amount.",
      });
    }

    if (!accountNumber) {
      return res.status(400).json({
        success: false,
        message: "Account number is required.",
      });
    }

    // ==========================
    // VALIDATE IMAGES
    // ==========================
    if (!req.files || !req.files.frontImage || !req.files.backImage) {
      return res.status(400).json({
        success: false,
        message: "Front and back images of the check are required.",
      });
    }

    // ==========================
    // UPLOAD IMAGES
    // ==========================
    const frontUpload = await uploadToCloudinary(
      req.files.frontImage[0],
      "check_deposits",
    );

    const backUpload = await uploadToCloudinary(
      req.files.backImage[0],
      "check_deposits",
    );

    // ==========================
    // USER
    // ==========================
    const user = await User.findById(req.user._id);

    // ==========================
    // CREATE REQUEST
    // ==========================
    const deposit = await CheckDeposit.create({
      user: user._id,
      accountNumber,
      accountType,
      amount: Number(amount),
      frontImage: frontUpload.secure_url,
      backImage: backUpload.secure_url,
      status: "Pending",
    });

    await createNotification({
      userId: user._id,
      title: "Check Deposit Submitted",
      message: `Your mobile check deposit request for $${Number(amount).toLocaleString()} has been submitted and is awaiting approval.`,
      category: "transaction",
      email: user.email,
      phone: user.phone,
      metadata: {
        type: "check_deposit",
        amount: Number(amount),
        status: "Pending",
      },
    });

    // ==========================
    // EMAIL
    // ==========================
    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: "Check Deposit Submitted",
        html: `
          <div style="font-family:Arial">

            <h2>Check Deposit Received</h2>

            <p>Hello ${user.firstName},</p>

            <p>
              We have successfully received your mobile check deposit request.
            </p>

            <table cellpadding="6">

              <tr>
                <td><strong>Amount</strong></td>
                <td>$${Number(amount).toLocaleString()}</td>
              </tr>

              <tr>
                <td><strong>Account</strong></td>
                <td>${accountNumber}</td>
              </tr>

              <tr>
                <td><strong>Status</strong></td>
                <td>Pending Verification</td>
              </tr>

            </table>

            <p>
              Our team will review your submission shortly.
            </p>

          </div>
        `,
      });
    }

    // ==========================
    // SOCKET UPDATE
    // ==========================
    const io = req.app.get("io");

    if (io) {
      io.to("admin-room").emit("check-deposit:new", deposit);

      await emitDashboardUpdate(io, user._id);
    }

    // ==========================
    // RESPONSE
    // ==========================
    res.status(201).json({
      success: true,
      message: "Your check deposit request has been submitted successfully.",
      deposit,
    });
  } catch (err) {
    console.error("Check Deposit Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to submit check deposit.",
    });
  }
};

// ======================================
// GET MY CHECK DEPOSITS
// GET /api/check-deposits
// ======================================
exports.getMyCheckDeposits = async (req, res) => {
  try {
    const { page = 1, limit = 4, status } = req.query;

    const filter = {
      user: req.user._id,
    };

    // Optional status filter
    if (status && status !== "All") {
      filter.status = status;
    }

    const currentPage = Math.max(parseInt(page, 4), 1);
    const perPage = Math.max(parseInt(limit, 4), 1);
    const skip = (currentPage - 1) * perPage;

    const total = await CheckDeposit.countDocuments(filter);

    const deposits = await CheckDeposit.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage);

    res.status(200).json({
      success: true,
      count: deposits.length,
      total,
      page: currentPage,
      pages: Math.ceil(total / perPage),
      hasNextPage: currentPage < Math.ceil(total / perPage),
      hasPrevPage: currentPage > 1,
      deposits,
    });
  } catch (err) {
    console.error("Get Check Deposits Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch check deposits.",
    });
  }
};

// =====================
exports.getAllCheckDeposits = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const sort = req.query.sort || "newest";
    const filter = req.query.filter || "all";

    const query = {};

    if (filter === "pending") {
      query.status = "Pending";
    }

    if (filter === "high") {
      query.amount = { $gte: 50000 };
    }

    if (filter === "flagged") {
      query.amount = { $gte: 50000 };
    }

    let sortOption = { createdAt: -1 };

    if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    }

    if (sort === "amount-high") {
      sortOption = { amount: -1 };
    }

    if (sort === "amount-low") {
      sortOption = { amount: 1 };
    }

    const total = await CheckDeposit.countDocuments(query);

    const deposits = await CheckDeposit.find(query)
      .populate("user", "firstName lastName email accountNumber profileImage")
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit);

    const pendingCount = await CheckDeposit.countDocuments({
      status: "Pending",
    });

    const pendingVolumeAgg = await CheckDeposit.aggregate([
      {
        $match: {
          status: "Pending",
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$amount",
          },
          average: {
            $avg: "$amount",
          },
        },
      },
    ]);

    const flaggedCount = await CheckDeposit.countDocuments({
      amount: { $gte: 50000 },
    });

    res.status(200).json({
      success: true,

      metrics: {
        pendingCount,

        pendingVolume: pendingVolumeAgg[0]?.total || 0,

        averageDeposit: pendingVolumeAgg[0]?.average || 0,

        flaggedCount,
      },

      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },

      deposits,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch check deposits.",
    });
  }
};

// ======================================

exports.approveCheckDeposit = async (req, res) => {
  try {
    const { id } = req.params;

    const deposit = await CheckDeposit.findById(id);

    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: "Check deposit not found.",
      });
    }

    if (!["Pending", "Under Review"].includes(deposit.status)) {
      return res.status(400).json({
        success: false,
        message: "This check has already been processed.",
      });
    }

    const user = await User.findById(deposit.user);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const wallet = await Wallet.findOne({
      user: user._id,
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found.",
      });
    }

    // Credit wallet
    await wallet.addFunds(deposit.amount, "admin");

    deposit.status = "Approved";
    deposit.reviewedAt = new Date();
    deposit.reviewedBy = req.user._id;
    deposit.depositedAt = new Date();

    await deposit.save();

    await createNotification({
      userId: user._id,
      title: "Check Deposit Approved",
      message: `Your check deposit of $${deposit.amount.toLocaleString()} has been approved and credited to your account.`,
      category: "transaction",
      email: user.email,
      phone: user.phone,
    });

    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: "Check Deposit Approved",
        html: `
            <h2>Deposit Approved</h2>

            <p>Hello ${user.firstName},</p>

            <p>
              Your mobile check deposit has been approved.
            </p>

            <p>
              Amount:
              <strong>$${deposit.amount.toLocaleString()}</strong>
            </p>

            <p>
              The funds are now available in your account.
            </p>
        `,
      });
    }

    const io = req.app.get("io");

    if (io) {
      await emitDashboardUpdate(io, user._id);

      io.to("admin-room").emit("check-deposit:approved", deposit);
    }

    res.status(200).json({
      success: true,
      message: "Check approved successfully.",
      deposit,
      walletBalance: wallet.balance,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to approve check deposit.",
    });
  }
};

exports.rejectCheckDeposit = async (req, res) => {
  try {
    const { id } = req.params;

    const { reason } = req.body;

    const deposit = await CheckDeposit.findById(id);

    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: "Check deposit not found.",
      });
    }

    if (deposit.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "This check has already been processed.",
      });
    }

    const user = await User.findById(deposit.user);

    deposit.status = "Rejected";
    deposit.reviewedAt = new Date();
    deposit.reviewedBy = req.user._id;
    deposit.rejectionReason = reason || "Rejected by administrator";

    await deposit.save();

    await createNotification({
      userId: user._id,
      title: "Check Deposit Rejected",
      message: `Your mobile check deposit of $${deposit.amount.toLocaleString()} was rejected.`,
      category: "transaction",
      email: user.email,
      phone: user.phone,
    });

    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: "Check Deposit Rejected",
        html: `
          <h2>Deposit Rejected</h2>

          <p>Hello ${user.firstName},</p>

          <p>
            Unfortunately your mobile check deposit could not be approved.
          </p>

          <p>
            Reason:
            <strong>${reason || "Rejected by administrator"}</strong>
          </p>
        `,
      });
    }

    const io = req.app.get("io");

    if (io) {
      await emitDashboardUpdate(io, user._id);

      io.to("admin-room").emit("check-deposit:rejected", deposit);
    }

    res.status(200).json({
      success: true,
      message: "Check deposit rejected.",
      deposit,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to reject check deposit.",
    });
  }
};
