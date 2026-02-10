const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user._id;

    // ===============================
    // FETCH USER
    // ===============================
    const user = await User.findById(userId).select(
      "firstName lastName email accountNumber kycStatus notifications",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ===============================
    // FETCH OR CREATE WALLET
    // ===============================
    let wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      wallet = await Wallet.create({
        user: userId,
        balance: 0,
        currency: "USD", // ISO currency only
      });
    }

    // HARD GUARD AGAINST INVALID CURRENCY
    const safeCurrency =
      typeof wallet.currency === "string" && wallet.currency.length === 3
        ? wallet.currency
        : "USD";

    // ===============================
    // FETCH TRANSACTIONS
    // ===============================
    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(15);

    // ===============================
    // RESPONSE (MATCHES FRONTEND)
    // ===============================
    res.status(200).json({
      success: true,

      user: {
        _id: user._id,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        accountNumber: user.accountNumber,
        kycStatus: user.kycStatus,
      },

      balance: {
        balance: wallet.balance,
        currency: safeCurrency,
        accountNumber: user.accountNumber,
      },

      transactions,
      notifications: user.notifications || [],
    });
  } catch (err) {
    console.error("Dashboard fetch error:", err);
    res.status(500).json({
      success: false,
      message: "Dashboard fetch failed",
    });
  }
};
