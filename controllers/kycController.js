const Kyc = require("../models/Kyc");
const User = require("../models/User");
const { uploadToCloudinary } = require("../utils/cloudinary");

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

    if (
      !req.files?.idDocument ||
      !req.files?.idDocumentBack ||
      !req.files?.selfie
    ) {
      return res.status(400).json({
        success: false,
        message: "ID document, ID document back, and selfie are required",
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

    const idDoc = await uploadToCloudinary(req.files.idDocument[0], "kyc/id");
    const idDocBack = await uploadToCloudinary(
      req.files.idDocumentBack[0],
      "kyc/idback",
    );
    const selfie = await uploadToCloudinary(req.files.selfie[0], "kyc/selfie");

    await Kyc.create({
      user: userId,
      idType,
      idNumber,
      country,
      status: "pending",
      docs: [
        { name: "ID Document", url: idDoc.secure_url },
        { name: "ID Document Back", url: idDocBack.secure_url },
        { name: "Selfie", url: selfie.secure_url },
      ],
    });

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
