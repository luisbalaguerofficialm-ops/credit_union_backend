const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/authMiddleware");
const verifyTransactionPin = require("../middlewares/verifyTransactionPin");

const {
  getWalletBalance,
  addMoney,
  getCards,
  getCardById,
  addCard,
  updateCard,
  deleteCard,
} = require("../controllers/walletController");


 


// Wallet balance
router.get("/", protect, getWalletBalance);

// Add money to wallet (PIN required)
router.post("/add", protect, verifyTransactionPin, addMoney);

/* ===============================
   CARD ROUTES
================================ */

router.get("/cards", protect, getCards);
router.get("/cards/:id", protect, getCardById);
router.post("/cards", protect, addCard);
router.put("/cards/:id", protect, updateCard);
router.delete("/cards/:id", protect, deleteCard);

module.exports = router;
