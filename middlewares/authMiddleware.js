// middlewares/authMiddleware.js

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist");

// =====================================
// AUTHENTICATION
// =====================================
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

    // ============================
    // CHECK BLACKLIST
    // ============================
    const blacklisted = await TokenBlacklist.findOne({ token });

    if (blacklisted) {
      return res.status(401).json({
        success: false,
        message: "Token has been invalidated",
      });
    }

    try {
      // ============================
      // VERIFY ACCESS TOKEN
      // ============================
      const payload = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(payload.id).select(
        "_id role email firstName lastName",
      );

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      req.user = {
        _id: user._id,
        id: user._id,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      return next();
    } catch (err) {
      // ============================
      // ACCESS TOKEN EXPIRED
      // ============================
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

      let refreshPayload;

      try {
        refreshPayload = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET,
        );
      } catch {
        return res.status(401).json({
          success: false,
          message: "Invalid refresh token",
        });
      }

      const user = await User.findById(refreshPayload.id).select(
        "_id role email firstName lastName refreshToken",
      );

      if (!user || user.refreshToken !== refreshToken) {
        return res.status(403).json({
          success: false,
          message: "Session invalid",
        });
      }

      // ============================
      // ISSUE NEW ACCESS TOKEN
      // ============================
      const newAccessToken = jwt.sign(
        {
          id: user._id,
          role: user.role,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "15m",
        },
      );

      res.setHeader("x-access-token", newAccessToken);

      req.user = {
        _id: user._id,
        id: user._id,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };

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

// =====================================
// GENERIC ROLE AUTHORIZATION
// =====================================
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    next();
  };
};

// =====================================
// READY-MADE ROLE MIDDLEWARES
// =====================================
const isAdmin = authorize("admin");

const isManager = authorize("manager");

const isSuperAdmin = authorize("superadmin");

const isAdminOrManager = authorize("admin", "manager");

const isAdminOrSuperAdmin = authorize("admin", "superadmin");

const isStaff = authorize("manager", "admin", "superadmin");

module.exports = {
  protect,
  authorize,
  isAdmin,
  isManager,
  isSuperAdmin,
  isAdminOrManager,
  isAdminOrSuperAdmin,
  isStaff,
};
