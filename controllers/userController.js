const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Notification = require("../models/Notification");
const Session = require("../models/Session");

/* ===============================
   GET USER PROFILE (NEW)
   GET /api/users/profile
================================ */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Get Profile Error:", err);
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
    const user = await User.findById(req.user._id);

    const transactions = await Transaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    const notifications = await Notification.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      balance: user.balance,
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
