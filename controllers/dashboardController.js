const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user._id;

    // ==========================================
    // USER
    // ==========================================
    const user = await User.findById(userId).select(
      `
      firstName
      lastName
      email
      accountNumber
      choosedAccount
      notifications
      `,
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ==========================================
    // WALLET
    // ==========================================
    let wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      wallet = await Wallet.create({
        user: userId,
        balance: 0,
        currency: "USD",
      });
    }

    // ==========================================
    // RECENT TRANSACTIONS
    // ==========================================
    const transactions = await Transaction.find({
      user: userId,
    })
      .sort({ createdAt: -1 })
      .limit(5);

    // ==========================================
    // FORMAT TRANSACTIONS FOR FRONTEND
    // ==========================================
    const formattedTransactions = transactions.map((tx) => ({
      id: tx._id,
      title: tx.description,
      date: tx.createdAt,
      type: tx.type,
      amount: tx.amount,
      status: tx.status,
      createdAt: tx.createdAt,
      isNegative:
        tx.type === "withdrawal" ||
        tx.type === "transfer" ||
        tx.type === "payment",
    }));

    // ==========================================
    // RESPONSE
    // ==========================================
    res.status(200).json({
      success: true,

      dashboard: {
        greetingName: user.fullName,

        account: {
          accountNumber: user.accountNumber,
          choosedAccount: user.choosedAccount,
          balance: wallet.balance,
          currency: wallet.currency || "USD",
        },

        profile: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          profileImage: profileImageUrl,
        },

        notifications: user.notifications || [],

        recentTransactions: formattedTransactions,
      },
    });
  } catch (err) {
    console.error("Dashboard Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
    });
  }
};
