const Kyc = require("../models/Kyc");
const User = require("../models/User");
const { uploadToCloudinary } = require("../utils/cloudinary");

// -----------------------------
// Submit KYC
// -----------------------------
exports.submitKyc = async (req, res) => {
  try {
    const userId = req.user._id;

    // -----------------------------
    // Validate uploads
    // -----------------------------
    if (
      !req.files?.idDocument ||
      !req.files?.idDocumentBack ||
      !req.files?.selfie
    ) {
      return res.status(400).json({
        success: false,
        message: "Front, back ID documents and selfie are required",
      });
    }

    // -----------------------------
    // Prevent duplicate KYC
    // -----------------------------
    const existingKyc = await Kyc.findOne({ user: userId });
    if (existingKyc) {
      return res.status(400).json({
        success: false,
        message: "KYC already submitted",
      });
    }

    // -----------------------------
    // Upload files
    // -----------------------------
    const idDocFront = await uploadToCloudinary(
      req.files.idDocument[0],
      "kyc/id/front"
    );
    const idDocBack = await uploadToCloudinary(
      req.files.idDocumentBack[0],
      "kyc/id/back"
    );
    const selfie = await uploadToCloudinary(req.files.selfie[0], "kyc/selfie");

    // -----------------------------
    // Create KYC record
    // -----------------------------
    const kyc = await Kyc.create({
      user: userId,
      idType: req.body.idType,
      idNumber: req.body.idNumber,
      country: req.body.country,
      status: "pending",
      docs: [
        { name: "ID Document Front", url: idDocFront.secure_url },
        { name: "ID Document Back", url: idDocBack.secure_url },
        { name: "Selfie", url: selfie.secure_url },
      ],
    });

    // -----------------------------
    // Update user KYC status
    // -----------------------------
    await User.findByIdAndUpdate(userId, {
      kycStatus: "pending",
    });

    res.status(201).json({
      success: true,
      message: "KYC submitted successfully",
      status: "pending",
      kyc,
    });
  } catch (err) {
    console.error("KYC ERROR:", err);
    res.status(500).json({
      success: false,
      message: "KYC submission failed",
    });
  }
};

// -----------------------------
// Get KYC for logged-in user
// -----------------------------
exports.getUserKyc = async (req, res) => {
  try {
    const kyc = await Kyc.findOne({ user: req.user._id });

    res.json({
      success: true,
      status: kyc ? kyc.status : "not_submitted", // enum: not_submitted | pending | verified | rejected
      kyc: kyc || null,
    });
  } catch (err) {
    console.error("Get KYC ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch KYC",
    });
  }
};
