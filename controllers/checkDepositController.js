const CheckDeposit = require("../models/CheckDeposit");
const { createNotification } = require("./notificationController");
const User = require("../models/User");
const emitDashboardUpdate = require("../utils/emitDashboardUpdate");
const { uploadToCloudinary } = require("../utils/cloudinary");
const { sendEmail } = require("../utils/notify");

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
