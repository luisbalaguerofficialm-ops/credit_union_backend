/**
 * PIN CONTROLLER
 * -------------------------------
 * Handles:
 * - Set PIN
 
 */

const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Set PIN
exports.setPin = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { transactionPin } = req.body;

    if (!/^[0-9]{4}$/.test(transactionPin)) {
      return res.status(400).json({
        message: "PIN must be 4 digits",
      });
    }

    const hash = await bcrypt.hash(transactionPin, 10);

    await User.findByIdAndUpdate(userId, {
      pinHash: hash,
      forcePinChange: false,
    });

    res.json({
      success: true,
      message: "PIN set successfully",
    });
  } catch (err) {
    console.error("Set PIN Error:", err);
    res.status(500).json({
      message: "Server error",
    });
  }
};

