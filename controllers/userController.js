const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Notification = require("../models/Notification");
const Session = require("../models/Session");
const Wallet = require("../models/Wallet");
const { uploadToCloudinary } = require("../utils/cloudinary");

/* ===============================
   GET USER PROFILE (NEW)
   GET /api/users/profile
================================ */
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select(
      "firstName lastName email accountNumber profileImage username accountType",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get wallet
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await Wallet.create({ user: userId });
    }

    res.json({
      success: true,
      user: {
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        accountNumber: user.accountNumber,
        balance: wallet.balance,
        currency: wallet.currency,
        username: user.username,
        accountType: user.accountType,
        profileImage: user.profileImage,
      },
    });
  } catch (err) {
    console.error("PROFILE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};

/* ===============================
   GET DASHBOARD
================================ */
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    // Fetch wallet to get balance and currency
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await Wallet.create({ user: userId });
    }

    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10);

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      balance: wallet.balance,
      currency: wallet.currency,
      accountNumber: user.accountNumber,
      transactions,
      notifications,
      unreadNotifications: notifications.filter((n) => !n.read).length,
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({
      success: false,
      message: "Dashboard fetch failed",
    });
  }
};

/* ===============================
   GET ACTIVE SESSIONS
================================ */
exports.getActiveSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user._id }).sort({
      lastActive: -1,
    });

    res.json({
      success: true,
      sessions,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch sessions",
    });
  }
};

/* ===============================
   LOGOUT SPECIFIC SESSION
================================ */
exports.logoutSession = async (req, res) => {
  const { token } = req.body;

  await Session.deleteOne({ token, userId: req.user._id });

  res.json({
    success: true,
    message: "Session logged out",
  });
};

/* ===============================
   LOGOUT ALL OTHER SESSIONS
================================ */
exports.logoutAllOtherSessions = async (req, res) => {
  const currentToken = req.token;

  await Session.deleteMany({
    userId: req.user._id,
    token: { $ne: currentToken },
  });

  res.json({
    success: true,
    message: "Other sessions logged out",
  });
};

exports.updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload an image",
      });
    }

    // Use your helper function
    const uploadedImage = await uploadToCloudinary(req.file, "profile_images");

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: uploadedImage.secure_url },
      { new: true },
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile image updated successfully",
      user,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({
      message: "Server error while uploading image",
    });
  }
};

