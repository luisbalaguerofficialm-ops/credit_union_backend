const Beneficiary = require("../models/Beneficiary");

// GET all beneficiaries for a user
exports.getBeneficiaries = async (req, res) => {
  try {
    const beneficiaries = await Beneficiary.find({ userId: req.params.userId });
    res.json(beneficiaries);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch beneficiaries", error: err.message });
  }
};

// ADD new beneficiary
exports.addBeneficiary = async (req, res) => {
  try {
    const { name, bank, account, userId } = req.body;
    const beneficiary = await Beneficiary.create({
      name,
      bank,
      account,
      userId,
    });
    res.status(201).json(beneficiary);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to add beneficiary", error: err.message });
  }
};

// UPDATE a beneficiary
exports.updateBeneficiary = async (req, res) => {
  try {
    const updated = await Beneficiary.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to update beneficiary", error: err.message });
  }
};

// DELETE a beneficiary
exports.deleteBeneficiary = async (req, res) => {
  try {
    await Beneficiary.findByIdAndDelete(req.params.id);
    res.json({ message: "Beneficiary deleted" });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to delete beneficiary", error: err.message });
  }
};
