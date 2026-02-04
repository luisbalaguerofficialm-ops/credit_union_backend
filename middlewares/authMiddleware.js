// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist");

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const token = authHeader.split(" ")[1];

    /* ============================
       CHECK BLACKLIST
    ============================ */
    const blacklisted = await TokenBlacklist.findOne({ token });
    if (blacklisted) {
      return res.status(401).json({
        success: false,
        message: "Token has been invalidated",
      });
    }

    try {
      /* ============================
         VERIFY ACCESS TOKEN
      ============================ */
      const payload = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(payload.id).select("_id role email");
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      req.user = user;
      return next();
    } catch (err) {
      /* ============================
         ACCESS TOKEN EXPIRED → TRY REFRESH
      ============================ */
      if (err.name !== "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
        });
      }

      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: "Session expired, please login again",
        });
      }

      /* ============================
         VERIFY REFRESH TOKEN
      ============================ */
      let refreshPayload;
      try {
        refreshPayload = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET,
        );
      } catch (e) {
        return res.status(401).json({
          success: false,
          message: "Invalid refresh token",
        });
      }

      const user = await User.findById(refreshPayload.id).select(
        "_id role email refreshToken",
      );

      if (!user || user.refreshToken !== refreshToken) {
        return res.status(403).json({
          success: false,
          message: "Session invalid",
        });
      }

      /* ============================
         ISSUE NEW ACCESS TOKEN
      ============================ */
      const newAccessToken = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "15m" },
      );

      // 🔥 Send new token to frontend
      res.setHeader("x-access-token", newAccessToken);

      req.user = user;
      next();
    }
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
}

module.exports = { protect };
