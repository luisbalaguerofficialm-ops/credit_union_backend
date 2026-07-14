const SystemSettings = require("../models/SystemSettings");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
// =======================================
// GET SYSTEM SETTINGS
// =======================================

exports.getSystemSettings = async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();

    if (!settings) {
      settings = await SystemSettings.create({});
    }

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to load settings",
    });
  }
};

// =======================================
// UPDATE SYSTEM SETTINGS
// =======================================

exports.updateSystemSettings = async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();

    if (!settings) {
      settings = await SystemSettings.create(req.body);
    } else {
      Object.assign(settings, req.body);

      settings.updatedBy = req.user._id;

      await settings.save();
    }

    res.json({
      success: true,
      message: "System settings updated",
      settings,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Update failed",
    });
  }
};

// =======================================
// GET ADMIN PROFILE
// =======================================

exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id).select(
      "-password -pinHash -refreshToken",
    );

    res.json({
      success: true,
      admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to fetch profile",
    });
  }
};

// =======================================
// UPDATE ADMIN PROFILE
// =======================================

exports.updateAdminProfile = async (req, res) => {
  try {
    const admin = await User.findByIdAndUpdate(
      req.user._id,

      {
        $set: req.body,
      },

      {
        new: true,
      },
    ).select("-password -pinHash");

    res.json({
      success: true,
      message: "Profile updated",
      admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Profile update failed",
    });
  }
};

// =======================================
// CHANGE PASSWORD
// =======================================

exports.changeAdminPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const admin = await User.findById(req.user._id).select("+password");

    const valid = await bcrypt.compare(oldPassword, admin.password);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Old password incorrect",
      });
    }

    admin.password = await bcrypt.hash(newPassword, 12);

    await admin.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Password change failed",
    });
  }
};
