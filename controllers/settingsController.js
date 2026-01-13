const User = require("../models/User");
const { sendEmail, sendSMS } = require("../utils/notify");

// Allowed settings fields (must match frontend)
const ALLOWED_FIELDS = [
  "twoFA",
  "personalData",
  "historyVisible",
  "freezeAccount",
  "emailNotif",
  "smsNotif",
  "marketing",
  "securityAlert",
  "appearance",
];

// ===============================
// GET USER SETTINGS
// ===============================
exports.getUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("settings");
    res.json(user.settings);
  } catch (err) {
    console.error("Get Settings Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load settings" });
  }
};

// ===============================
// UPDATE SINGLE SETTING
// ===============================
exports.updateSetting = async (req, res) => {
  try {
    const { field } = req.params;
    const { value } = req.body;

    // ❌ Block invalid fields
    if (!ALLOWED_FIELDS.includes(field)) {
      return res.status(400).json({
        success: false,
        message: "Invalid setting field",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { [`settings.${field}`]: value } },
      { new: true }
    );

    // ===============================
    // OPTIONAL NOTIFICATIONS
    // ===============================
    if (field === "emailNotif" && user.settings.emailNotif) {
      await sendEmail({
        to: user.email,
        subject: "Email Notification Settings Updated",
        html: `<p>Your email notification preference has been updated.</p>`,
      });
    }

    if (field === "smsNotif" && user.settings.smsNotif && user.phone) {
      await sendSMS({
        to: user.phone,
        message: "Your SMS notification preference has been updated.",
      });
    }

    res.json({
      success: true,
      settings: user.settings,
    });
  } catch (err) {
    console.error("Update Setting Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update setting",
    });
  }
};

// ===============================
// DELETE USER ACCOUNT
// ===============================
exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (err) {
    console.error("Delete Account Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete account",
    });
  }
};
