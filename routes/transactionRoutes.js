const express = require("express");
const router = express.Router();

// ===============================
// MIDDLEWARE IMPORTS
// ===============================
const { protect } = require("../middlewares/authMiddleware");
const verifyTransactionPin = require("../middlewares/verifyTransactionPin");
const requireVerifiedKyc = require("../middlewares/requireVerifiedKyc");

// ===============================
// CONTROLLER IMPORTS
// ===============================
const {
  getTransactions,
  createTransaction,
  getTransactionByTransactionId,
  updateTransaction,
  deleteTransaction,
  getFiltered,
  exportTransactionsCSV,
  exportTransactionsPDF,
} = require("../controllers/transactionController");

/* ===============================
   IMPORTANT: ORDER MATTERS
================================ */

// Filtered transactions (STATIC)
router.get("/filter", protect, getFiltered);

// Export
router.get("/export/csv", protect, exportTransactionsCSV);
router.get("/export/pdf", protect, exportTransactionsPDF);

// All transactions for user
router.get("/", protect, getTransactions);

// ===============================
// CREATE TRANSACTION (PIN + KYC REQUIRED)
// ===============================
router.post(
  "/",
  protect,
  requireVerifiedKyc, // 🔒 BLOCK IF KYC NOT VERIFIED
  verifyTransactionPin,
  createTransaction
);

// Get transaction by transactionId (DYNAMIC)
router.get("/:transactionId", protect, getTransactionByTransactionId);

// Update transaction (Admin / internal use)
router.put("/:id", protect, updateTransaction);

// Delete transaction
router.delete("/:id", protect, deleteTransaction);

module.exports = router;
