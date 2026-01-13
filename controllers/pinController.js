/**
 * PIN CONTROLLER
 * -------------------------------
 * Handles:
 * - Set PIN
 * - Verify PIN
 * - Change PIN
 */

const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Set PIN
exports.setPin = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pin } = req.body;

    if (!/^[0-9]{4}$/.test(pin))
      return res.status(400).json({ message: "PIN must be 4 digits" });

    const hash = await bcrypt.hash(pin, 10);
    await User.findByIdAndUpdate(userId, {
      pinHash: hash,
      forcePinChange: false,
    });

    res.json({ success: true, message: "PIN set successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Verify PIN
exports.verifyPin = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pin } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.pinHash)
      return res.status(400).json({ message: "No PIN set" });

    const ok = await bcrypt.compare(pin, user.pinHash);
    if (!ok) return res.status(401).json({ message: "Invalid PIN" });

    res.json({ success: true, message: "PIN verified" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Change PIN
exports.changePin = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPin, newPin } = req.body;

    if (!/^[0-9]{4}$/.test(newPin))
      return res.status(400).json({ message: "New PIN must be 4 digits" });

    const user = await User.findById(userId);

    const ok = user.pinHash
      ? await bcrypt.compare(currentPin, user.pinHash)
      : false;
    if (!ok) return res.status(401).json({ message: "Current PIN invalid" });

    user.pinHash = await bcrypt.hash(newPin, 10);
    await user.save();

    res.json({ success: true, message: "PIN updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
