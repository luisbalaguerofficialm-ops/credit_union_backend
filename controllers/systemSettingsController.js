const SystemSettings = require("../models/SystemSettings");
const User = require("../models/User");

// =======================================
// GET SYSTEM SETTINGS
// =======================================

exports.getSystemSettings = async (req, res) => {
  try {
    let settings = await SystemSettings.findOne().populate(
      "updatedBy",
      "firstName lastName email",
    );

    if (!settings) {
      settings = await SystemSettings.create({
        updatedBy: req.user._id,
      });

      settings = await SystemSettings.findById(settings._id).populate(
        "updatedBy",
        "firstName lastName email",
      );
    }

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
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
      settings = new SystemSettings();
    }

    settings.branchName = req.body.branchName;
    settings.regionalCode = req.body.regionalCode;
    settings.entityId = req.body.entityId;
    settings.contactEmail = req.body.contactEmail;
    settings.supportPhone = req.body.supportPhone;

    settings.systemAlertEmail = req.body.systemAlertEmail;
    settings.smsGateway = req.body.smsGateway;

    settings.weeklyPerformanceSummary = req.body.weeklyPerformanceSummary;

    settings.transactionPushAlerts = req.body.transactionPushAlerts;

    settings.systemMaintenanceAlerts = req.body.systemMaintenanceAlerts;

    settings.securityBreachNotifications = req.body.securityBreachNotifications;

    settings.newAdminAccountAlerts = req.body.newAdminAccountAlerts;

    settings.twoFactorRequired = req.body.twoFactorRequired;

    settings.sessionTimeout = req.body.sessionTimeout;

    settings.loggingLevel = req.body.loggingLevel;

    settings.dataRetentionYears = req.body.dataRetentionYears;

    settings.passwordPolicy = {
      minLength: req.body.passwordPolicy?.minLength,
      specialCharacters: req.body.passwordPolicy?.specialCharacters,
      passwordRotationDays: req.body.passwordPolicy?.passwordRotationDays,
      preventReuseCount: req.body.passwordPolicy?.preventReuseCount,
    };

    settings.updatedBy = req.user._id;

    await settings.save();

    const updatedSettings = await SystemSettings.findById(
      settings._id,
    ).populate("updatedBy", "firstName lastName email");

    return res.status(200).json({
      success: true,
      message: "System settings updated successfully.",
      settings: updatedSettings,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Failed to update settings.",
    });
  }
};
