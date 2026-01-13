const User = require("../models/User");
const Transaction = require("../models/Transaction");

exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user balance + account number
    const user = await User.findById(userId).select(
      "balance accountNumber notifications"
    );

    // Fetch latest 10 transactions
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      balance: user.balance,
      accountNumber: user.accountNumber,
      notifications: user.notifications.reverse(),
      transactions,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Dashboard fetch failed", error: err.message });
  }
};
