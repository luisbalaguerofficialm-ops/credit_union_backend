const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Notification = require("../models/Notification");

module.exports = async (io, userId) => {
  if (!io || !userId) return;

  const user = await User.findById(userId).select(
    "balance accountNumber notifications"
  );

  const transactions = await Transaction.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(10);

  const unreadCount = await Notification.countDocuments({
    user: userId,
    read: false,
  });

  io.to(userId.toString()).emit("dashboard:update", {
    balanceWidget: {
      balance: user.balance,
      accountNumber: user.accountNumber,
    },
    transactionWidget: transactions,
    alertWidget: {
      unreadCount,
    },
  });
};
