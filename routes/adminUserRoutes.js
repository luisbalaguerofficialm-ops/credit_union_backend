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
  authorize("superadmin", "admin", "manager"),
  getAllUsers,
);

// Get single user profile
// GET /api/admin/users/:id
router.get(
  "/users/:id",
  protect,
  authorize("superadmin", "admin", "manager"),
  getUserById,
);

// Update user information
// PATCH /api/admin/users/:id
router.patch(
  "/users/:id",
  protect,
  authorize("superadmin", "admin"),
  updateUser,
);

// Activate user
// PATCH /api/admin/users/:id/activate
router.patch(
  "/users/:id/activate",
  protect,
  authorize("superadmin", "admin", "manager"),
  activateUser,
);

// Suspend user
// PATCH /api/admin/users/:id/suspend
router.patch(
  "/users/:id/suspend",
  protect,
  authorize("superadmin", "admin"),
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
  authorize("superadmin", "admin", "manager"),
  flagUser,
);

// Remove flag
// PATCH /api/admin/users/:id/unflag
router.patch(
  "/users/:id/unflag",
  protect,
  authorize("superadmin", "admin", "manager"),
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
  authorize("superadmin", "admin"),
  creditWallet,
);

// Debit wallet
// POST /api/admin/users/:id/debit-wallet
router.post(
  "/users/:id/debit-wallet",
  protect,
  authorize("superadmin", "admin"),
  debitWallet,
);

// ======================================
// ROLE MANAGEMENT
// ======================================

// Change user role
// PATCH /api/admin/users/:id/role
router.patch("/users/:id/role", protect, authorize("superadmin"), changeRole);


// ======================================
// ANALYTICS
// ======================================

// User statistics
// GET /api/admin/users/statistics
router.get(
  "/users/statistics",
  protect,
  authorize("superadmin", "admin", "manager"),
  getStatistics,
);

module.exports = router;
