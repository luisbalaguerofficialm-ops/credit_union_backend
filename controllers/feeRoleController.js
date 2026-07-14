const FeeRule = require("../models/FeeRules");

/**
 * CREATE FEE RULE
 * POST /api/fees
 */
exports.createFeeRule = async (req, res) => {
  try {
    const { ruleName, type, structure, tiers, fixedFee, percentage, status } =
      req.body;

    if (!ruleName || !type || !structure) {
      return res.status(400).json({
        success: false,
        message: "ruleName, type and structure are required",
      });
    }

    // 🔥 Structure validation
    if (structure === "Tiered") {
      if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Tiered structure requires tiers array",
        });
      }
    }

    if (structure === "Fixed" && fixedFee == null) {
      return res.status(400).json({
        success: false,
        message: "Fixed structure requires fixedFee",
      });
    }

    if (structure === "Percentage" && percentage == null) {
      return res.status(400).json({
        success: false,
        message: "Percentage structure requires percentage",
      });
    }

    // 🚫 Prevent multiple active rules per type
    if (status !== "Disabled") {
      const existingActive = await FeeRule.findOne({
        type,
        status: "Active",
      });

      if (existingActive) {
        return res.status(400).json({
          success: false,
          message: "An active fee rule already exists for this type",
        });
      }
    }

    const feeRule = await FeeRule.create({
      ruleName,
      type,
      structure,
      tiers: structure === "Tiered" ? tiers : [],
      fixedFee: structure === "Fixed" ? fixedFee : undefined,
      percentage: structure === "Percentage" ? percentage : undefined,
      status: status || "Active",
    });

    res.status(201).json({
      success: true,
      message: "Fee rule created successfully",
      data: feeRule,
    });
  } catch (error) {
    console.error("Create Fee Rule Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET ALL FEE RULES
 * GET /api/fees
 */
exports.getFeeRules = async (req, res) => {
  try {
    const fees = await FeeRule.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: fees.length,
      data: fees,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * UPDATE FEE RULE
 * PUT /api/fees/:id
 */
exports.updateFeeRule = async (req, res) => {
  try {
    const { ruleName, type, structure, tiers, fixedFee, percentage, status } =
      req.body;

    const rule = await FeeRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Fee rule not found",
      });
    }

    // 🚫 Prevent activating if another active rule exists
    if (status === "Active") {
      const existingActive = await FeeRule.findOne({
        _id: { $ne: req.params.id },
        type,
        status: "Active",
      });

      if (existingActive) {
        return res.status(400).json({
          success: false,
          message: "Another active rule already exists for this type",
        });
      }
    }

    // Update fields
    rule.ruleName = ruleName ?? rule.ruleName;
    rule.type = type ?? rule.type;
    rule.structure = structure ?? rule.structure;
    rule.status = status ?? rule.status;

    if (structure === "Tiered") {
      rule.tiers = tiers || [];
      rule.fixedFee = undefined;
      rule.percentage = undefined;
    }

    if (structure === "Fixed") {
      rule.fixedFee = fixedFee;
      rule.tiers = [];
      rule.percentage = undefined;
    }

    if (structure === "Percentage") {
      rule.percentage = percentage;
      rule.tiers = [];
      rule.fixedFee = undefined;
    }

    await rule.save();

    res.json({
      success: true,
      message: "Fee rule updated successfully",
      data: rule,
    });
  } catch (error) {
    console.error("Update Fee Rule Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * DISABLE FEE RULE
 * PATCH /api/fees/:id/disable
 */
exports.disableFeeRule = async (req, res) => {
  try {
    const fee = await FeeRule.findByIdAndUpdate(
      req.params.id,
      { status: "Disabled" },
      { new: true },
    );

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: "Fee rule not found",
      });
    }

    res.json({
      success: true,
      message: "Fee rule disabled",
      data: fee,
    });
  } catch (error) {
    console.error("Disable Fee Rule Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
