const bcrypt = require("bcryptjs");
const User = require("../models/User");

const verifyTransactionPin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { transactionPin } = req.body;

    if (!transactionPin) {
      return res.status(400).json({ message: "Transaction PIN required" });
    }

    // Include pinHash explicitly because select: false in schema
    const user = await User.findById(userId).select("+pinHash");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.pinHash) {
      return res
        .status(400)
        .json({
          message: "Transaction PIN not set. Please set your PIN first.",
        });
    }

    const isMatch = await bcrypt.compare(transactionPin, user.pinHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid transaction PIN" });
    }

    next();
  } catch (err) {
    console.error("PIN Verification Error:", err);
    res.status(500).json({ message: "PIN verification failed" });
  }
};

module.exports = verifyTransactionPin;
