module.exports = (req, res, next) => {
  if (req.user.kycStatus !== "approved") {
    return res.status(403).json({
      success: false,
      message: "KYC verification required to perform transactions",
    });
  }

  next();
};
