const express = require("express");

const router = express.Router();

const {
  getAllUsers,
  getUserById,
  updateUser,
  adminDeleteUser,
  activateUser,
  suspendUser,
  flagUser,
  unflagUser,
  updateUserStatus,
  creditWallet,
  debitWallet,
  getMemberById,
} = require("../controllers/adminUserController");

const { protect, authorize } = require("../middlewares/authMiddleware");

// ======================================
// USER MANAGEMENT
// ======================================

// GET /api/admin/users
router.get(
  "/users",
  protect,
  authorize("superadmin", "admin", "manager"),
  getAllUsers,
);

router.get(
  "/users/member/:id",
  protect,
  authorize("admin", "manager", "superadmin"),
  getMemberById,
);

// GET /api/admin/users/:id
router.get(
  "/users/:id",
  protect,
  authorize("superadmin", "admin", "manager"),
  getUserById,
);

// PATCH /api/admin/users/:id
router.patch(
  "/users/:id",
  protect,
  authorize("superadmin", "admin"),
  updateUser,
);

// PATCH /api/admin/users/:id/activate
router.patch(
  "/users/:id/activate",
  protect,
  authorize("superadmin", "admin", "manager"),
  activateUser,
);

// PATCH /api/admin/users/:id/suspend
router.patch(
  "/users/:id/suspend",
  protect,
  authorize("superadmin", "admin"),
  suspendUser,
);

// ======================================
// SECURITY FLAGS
// ======================================

router.patch(
  "/users/:id/flag",
  protect,
  authorize("superadmin", "admin", "manager"),
  flagUser,
);

router.patch(
  "/users/:id/unflag",
  protect,
  authorize("superadmin", "admin", "manager"),
  unflagUser,
);

// PATCH /api/admin/users/:id/status
router.patch(
  "/users/:id/status",
  protect,
  authorize("superadmin", "admin", "manager"),
  updateUserStatus,
);

// ======================================
// WALLET MANAGEMENT
// ======================================

router.post(
  "/users/:id/credit-wallet",
  protect,
  authorize("superadmin", "admin"),
  creditWallet,
);

router.post(
  "/users/:id/debit-wallet",
  protect,
  authorize("superadmin", "admin"),
  debitWallet,
);
router.delete(
  "/users/:id",
  protect,
  authorize("superadmin", "admin", "manager"),
  adminDeleteUser,
);


module.exports = router;
