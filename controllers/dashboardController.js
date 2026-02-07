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
      "accountNumber notifications",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ===============================
    // FETCH WALLET (from wallet model)
    // ===============================
    let wallet = await Wallet.findOne({ user: userId });

    // If wallet doesn't exist, create it with default balance
    if (!wallet) {
      wallet = await Wallet.create({ user: userId });
    }

    console.log("Wallet found:", wallet);
    const balance = wallet.balance;
    const currency = wallet.currency;
    console.log("Balance:", balance, "Currency:", currency);

    // ===============================
    // FETCH TRANSACTIONS
    // ===============================
    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(15);

    res.status(200).json({
      success: true,
      balance: user.wallet ? user.wallet.balance : 0,
      currency: user.wallet ? user.wallet.currency : "$",
      accountNumber: user.accountNumber,
      notifications: user.notifications?.reverse() || [],
      unreadNotifications:
        user.notifications?.filter((n) => !n.read).length || 0,
      transactions,
    });
  } catch (err) {
    console.error("Dashboard fetch error:", err);
    res.status(500).json({
      success: false,
      message: "Dashboard fetch failed",
    });
  }
};
