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
 getTransactionById,
  updateTransaction,
  deleteTransactionByTransactionId,
  getFiltered,
  exportTransactionsCSV,
  exportTransactionsPDF,
} = require("../controllers/transactionController");

// Export
router.get("/export/csv", protect, exportTransactionsCSV);
router.get("/export/pdf", protect, exportTransactionsPDF);

// All transactions for user
router.get("/", protect, getTransactions);

// ===============================
// CREATE TRANSACTION (PIN REQUIRED)
// ===============================
router.post("/", protect, verifyTransactionPin, createTransaction);



router.get(
  "/:id",
  protect,
getTransactionById
);

// Update transaction (Admin / internal use)
router.put("/:id", protect, updateTransaction);

router.delete(
  "/:transactionId",
  protect,
  deleteTransactionByTransactionId,
);

module.exports = router;
