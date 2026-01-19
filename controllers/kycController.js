const Kyc = require("../models/Kyc");
const User = require("../models/User");
const { uploadToCloudinary } = require("../utils/cloudinary");

exports.submitKyc = async (req, res) => {
  try {
    // -----------------------------
    // Validate uploads
    // -----------------------------
    if (!req.files?.idDocument || !req.files?.selfie) {
      return res.status(400).json({
        success: false,
        message: "ID document and selfie are required",
      });
    }

    const userId = req.user._id;

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
    const idDoc = await uploadToCloudinary(req.files.idDocument[0], "kyc/id");

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
        { name: "ID Document", url: idDoc.secure_url },
        { name: "Selfie", url: selfie.secure_url },
      ],
    });

    // -----------------------------
    // Sync user KYC status
    // -----------------------------
    await User.findByIdAndUpdate(userId, {
      kycStatus: "pending",
    });

    res.status(201).json({
      success: true,
      message: "KYC submitted successfully",
      status: "pending",
    });
  } catch (err) {
    console.error("KYC ERROR:", err);
    res.status(500).json({
      success: false,
      message: "KYC submission failed",
    });
  }
};

exports.getUserKyc = async (req, res) => {
  try {
    const kyc = await Kyc.findOne({ user: req.user._id });

    if (!kyc) {
      return res.json({
        success: true,
        status: "not_verified",
      });
    }

    res.json({
      success: true,
      status: kyc.status,
      kyc,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch KYC",
    });
  }
};
