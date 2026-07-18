const SystemSettings = require("../models/SystemSettings");
const User = require("../models/User");

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
