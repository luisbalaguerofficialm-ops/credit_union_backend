const express = require("express");
const router = express.Router();

// ===============================
// MIDDLEWARE IMPORTS
// ===============================
const { protect } = require("../middlewares/authMiddleware");
const verifyTransactionPin = require("../middlewares/verifyTransactionPin");

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

// All transactions for user
router.get("/", protect, getTransactions);

// Export
router.get("/export/csv", protect, exportTransactionsCSV);
router.get("/export/pdf", protect, exportTransactionsPDF);

// ===============================
// CREATE TRANSACTION (PIN REQUIRED)
// ===============================
router.post(
  "/",
  protect,
  verifyTransactionPin, //  PIN verification here
  createTransaction
);

// Get transaction by transactionId (DYNAMIC)
router.get("/:transactionId", protect, getTransactionByTransactionId);

// Update transaction (Admin / internal use)
router.put("/:id", protect, updateTransaction);

// Delete transaction
router.delete("/:id", protect, deleteTransaction);

module.exports = router;
