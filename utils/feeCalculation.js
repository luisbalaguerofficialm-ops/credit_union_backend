const FeeRule = require("../models/FeeRules");

/**
 * Calculate fee based on transfer amount and fee rule
 * @param {Number} amount - Transfer amount
 * @param {String} type - Fee type: "Transfer", "Withdrawal", "Service"
 * @returns {Promise<Object>} - { fee, structure, rule }
 */
exports.calculateTransferFee = async (amount, type = "Transfer") => {
  try {
    // Fetch active fee rule for the given type
    const rule = await FeeRule.findOne({
      type,
      status: "Active",
    });

    if (!rule) {
      console.warn(`No active fee rule found for ${type}. Using $0 fee.`);

      return {
        fee: 0,
        structure: "None",
        rule: null,
        ruleName: "No Fee Rule",
      };
    }

    let fee = 0;

    // Calculate based on structure type
    if (rule.structure === "Tiered") {
      // Find matching tier

      const matchingTier = rule.tiers.find(
        (tier) => amount >= tier.min && amount < tier.max,
      );

      fee = matchingTier ? matchingTier.fee : 0;

      if (!matchingTier) {
        console.warn(
          `No fee tier found for amount $${amount}. Defaulting fee to $0.`,
        );
      }
    } else if (rule.structure === "Fixed") {
      fee = rule.fixedFee;
    } else if (rule.structure === "Percentage") {
      fee = (amount * rule.percentage) / 100;
    }

    return {
      fee: Math.round(fee * 100) / 100, // Round to 2 decimal places
      structure: rule.structure,
      rule: rule._id,
      ruleName: rule.ruleName,
    };
  } catch (error) {
    console.error("Fee Calculation Error:", error);
    throw error;
  }
};

/**
 * Get fee preview before transaction (for frontend)
 */
exports.getFeePreview = async (amount, type = "Transfer") => {
  const feeData = await exports.calculateTransferFee(amount, type);
  return {
    transferAmount: amount,
    fee: feeData.fee,
    totalAmount: amount + feeData.fee,
    feeStructure: feeData.structure,
    ruleName: feeData.ruleName,
  };
};
