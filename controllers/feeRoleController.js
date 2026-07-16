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
          message: "Tiered structure requires tiers.",
        });
      }

      const invalidTier = tiers.some(
        (tier) => tier.min == null || tier.max == null || tier.fee == null,
      );

      if (invalidTier) {
        return res.status(400).json({
          success: false,
          message: "Each tier must contain min, max and fee.",
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

    // determine the final type first
    const newType = type ?? rule.type;
    const newStructure = structure ?? rule.structure;
    const newStatus = status ?? rule.status;

    // 🚫 Prevent activating if another active rule exists
    if (newStatus === "Active") {
      const existingActive = await FeeRule.findOne({
        _id: { $ne: rule._id },
        type: newType,
        status: "Active",
      });

      if (existingActive) {
        return res.status(400).json({
          success: false,
          message: "Another active rule already exists for this type.",
        });
      }
    }

    // Update fields
    rule.ruleName = ruleName ?? rule.ruleName;
    rule.type = newType;
    rule.structure = newStructure;
    rule.status = newStatus;

    if (newStructure === "Tiered") {
      rule.tiers = tiers || [];
      rule.fixedFee = undefined;
      rule.percentage = undefined;
    }

    if (newStructure === "Fixed") {
      rule.fixedFee = fixedFee;
      rule.tiers = [];
      rule.percentage = undefined;
    }

    if (newStructure === "Percentage") {
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
 * DELETE FEE RULE
 * DELETE /api/fees/:id
 */
exports.deleteFeeRule = async (req, res) => {
  try {
    const fee = await FeeRule.findByIdAndDelete(req.params.id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: "Fee rule not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Fee rule deleted successfully",
      data: fee,
    });
  } catch (error) {
    console.error("Delete Fee Rule Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete fee rule",
    });
  }
};
