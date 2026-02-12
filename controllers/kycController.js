const Kyc = require("../models/Kyc");
const User = require("../models/User");
const { uploadToCloudinary } = require("../utils/cloudinary");

// =======================
// SUBMIT KYC
// =======================
exports.submitKyc = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { idType, idNumber, country } = req.body;

    if (!idType || !idNumber || !country) {
      return res.status(400).json({
        success: false,
        message: "idType, idNumber, and country are required",
      });
    }

    // ✅ Match route field names exactly
    if (
      !req.files?.idDocumentFront ||
      !req.files?.idDocumentBack ||
      !req.files?.selfie
    ) {
      return res.status(400).json({
        success: false,
        message: "ID front, ID back, and selfie are required",
      });
    }

    const userId = req.user._id;

    const existingKyc = await Kyc.findOne({ user: userId });
    if (existingKyc) {
      return res.status(400).json({
        success: false,
        message: "KYC already submitted",
      });
    }

    // ✅ Use correct field names
    const uploadedFront = await uploadToCloudinary(
      req.files.idDocumentFront[0],
      "kyc/idFront",
    );

    const uploadedBack = await uploadToCloudinary(
      req.files.idDocumentBack[0],
      "kyc/idBack",
    );

    const uploadedSelfie = await uploadToCloudinary(
      req.files.selfie[0],
      "kyc/selfie",
    );

    await Kyc.create({
      user: userId,
      idType,
      idNumber,
      country,
      idFront: uploadedFront.secure_url,
      idBack: uploadedBack.secure_url,
      selfie: uploadedSelfie.secure_url,
      status: "pending",
    });

    await User.findByIdAndUpdate(userId, {
      kycStatus: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "KYC submitted successfully",
      status: "pending",
    });
  } catch (err) {
    console.error("KYC ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "KYC submission failed",
    });
  }
};

// =======================
// GET USER KYC
// =======================
exports.getUserKyc = async (req, res) => {
  try {
    const kyc = await Kyc.findOne({ user: req.user._id });

    if (!kyc) {
      return res.json({
        success: true,
        status: "not_verified",
      });
    }

    return res.json({
      success: true,
      status: kyc.status,
      kyc,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch KYC",
    });
  }
};
