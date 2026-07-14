const express = require("express");

const router = express.Router();

const {
  getAllUsers,
  getUserById,
  updateUser,
  activateUser,
  suspendUser,
  flagUser,
  unflagUser,
  creditWallet,
  debitWallet,
  changeRole,
  getStatistics,
} = require("../controllers/adminUserController");

const { protect, authorize } = require("../middlewares/authMiddleware");

// ======================================
// USER MANAGEMENT
// ======================================

// Get all users
// Search, pagination, filtering, sorting
// GET /api/admin/users
router.get(
  "/users",
  protect,
  authorize("super admin", "admin", "manager"),
  getAllUsers,
);

// Get single user profile
// GET /api/admin/users/:id
router.get(
  "/users/:id",
  protect,
  authorize("super admin", "admin", "manager"),
  getUserById,
);

// Update user information
// PATCH /api/admin/users/:id
router.patch(
  "/users/:id",
  protect,
  authorize("super admin", "admin"),
  updateUser,
);

// Activate user
// PATCH /api/admin/users/:id/activate
router.patch(
  "/users/:id/activate",
  protect,
  authorize("super admin", "admin", "manager"),
  activateUser,
);

// Suspend user
// PATCH /api/admin/users/:id/suspend
router.patch(
  "/users/:id/suspend",
  protect,
  authorize("super admin", "admin"),
  suspendUser,
);

// ======================================
// USER SECURITY FLAGS
// ======================================

// Flag user
// PATCH /api/admin/users/:id/flag
router.patch(
  "/users/:id/flag",
  protect,
  authorize("super admin", "admin", "manager"),
  flagUser,
);

// Remove flag
// PATCH /api/admin/users/:id/unflag
router.patch(
  "/users/:id/unflag",
  protect,
  authorize("super admin", "admin", "manager"),
  unflagUser,
);

// ======================================
// WALLET MANAGEMENT
// ======================================

// Credit wallet
// POST /api/admin/users/:id/credit-wallet
router.post(
  "/users/:id/credit-wallet",
  protect,
  authorize("super admin", "admin"),
  creditWallet,
);

// Debit wallet
// POST /api/admin/users/:id/debit-wallet
router.post(
  "/users/:id/debit-wallet",
  protect,
  authorize("super admin", "admin"),
  debitWallet,
);

// ======================================
// ROLE MANAGEMENT
// ======================================

// Change user role
// PATCH /api/admin/users/:id/role
router.patch("/users/:id/role", protect, authorize("super admin"), changeRole);


// ======================================
// ANALYTICS
// ======================================

// User statistics
// GET /api/admin/users/statistics
router.get(
  "/users/statistics",
  protect,
  authorize("super admin", "admin", "manager"),
  getStatistics,
);

module.exports = router;
