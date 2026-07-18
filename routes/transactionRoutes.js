const express = require("express");
const router = express.Router();

// ===============================
// MIDDLEWARE IMPORTS
// ===============================
const { protect, authorize } = require("../middlewares/authMiddleware");
const verifyTransactionPin = require("../middlewares/verifyTransactionPin");
const requireVerifiedKyc = require("../middlewares/requireVerifiedKyc");

// ===============================
// CONTROLLER IMPORTS
// ===============================
const {
  getTransactions,
  createTransaction,
  getTransactionById,
  updateTransaction,
  deleteTransactionById,
  getFiltered,
  adminGetTransactions,
  adminDeleteTransaction,
  adminTransactionById,
} = require("../controllers/transactionController");

// All transactions for user
router.get("/", protect, getTransactions);

// ===============================
// CREATE TRANSACTION (PIN REQUIRED)
// ===============================
router.post("/", protect, verifyTransactionPin, createTransaction);

router.get("/:id", protect, getTransactionById);

// Update transaction (Admin / internal use)
router.put("/:id", protect, updateTransaction);

router.delete("/:id", protect, deleteTransactionById);

router.get(
  "/admin/transactions",
  protect,
  authorize("superadmin", "admin", "manager"),
  adminGetTransactions,
);

router.delete(
  "admin/transactions/:id",
  protect,
  authorize("superadmin", "admin", "manager"),
  adminDeleteTransaction,
);

router.get(
  "/admin/transactions/:id",
  protect,
  authorize("superadmin", "admin", "manager"),
  adminTransactionById, 
);

module.exports = router;
