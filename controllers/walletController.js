// controllers/walletController.js
const Wallet = require("../models/Wallet");
const Card = require("../models/Card");
const Transaction = require("../models/Transaction");

// ===============================
// GET WALLET BALANCE
// ===============================
exports.getWalletBalance = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    res.json({
      success: true,
      balance: wallet?.balance || 0,
    });
  } catch (err) {
    console.error("Wallet fetch error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wallet balance",
    });
  }
};

// ===============================
// ADD MONEY TO WALLET
// ===============================
exports.addMoney = async (req, res) => {
  try {
    const { amount, cardId } = req.body;

    if (!amount || !cardId)
      return res
        .status(400)
        .json({ success: false, message: "Amount and card ID are required" });

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });

    // Ensure wallet exists
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user._id,
        balance: 0,
        currency: "USD", // <- add default currency here
      });
    }

    // Validate card ownership
    const card = await Card.findOne({ _id: cardId, user: req.user._id });
    if (!card)
      return res
        .status(404)
        .json({ success: false, message: "Card not found" });

    // Add money to wallet
    wallet.balance += parsedAmount;
    await wallet.save();

    // Create transaction record for wallet top-up
    const transaction = await Transaction.create({
      user: req.user._id,
      type: "Deposit",
      amount: parsedAmount,
      status: "Successful",
      description: `Wallet top-up via card ending ${card.number.slice(-4)}`,
      transactionId: "TXN" + Math.floor(Math.random() * 10000000),
      metadata: { cardId: card._id },
    });

    res.json({
      success: true,
      message: "Money added successfully",
      balance: wallet.balance,
      transaction,
    });
  } catch (err) {
    console.error("Add money error:", err);
    res.status(500).json({ success: false, message: "Failed to add money" });
  }
};

// ===============================
// GET ALL CARDS
// ===============================
exports.getCards = async (req, res) => {
  try {
    const cards = await Card.find({ user: req.user._id });
    res.json({ success: true, cards });
  } catch (err) {
    console.error("Fetch cards error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch cards" });
  }
};

// ===============================
// GET CARD BY ID
// ===============================
exports.getCardById = async (req, res) => {
  try {
    const card = await Card.findOne({ _id: req.params.id, user: req.user._id });
    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }
    res.json({ success: true, card });
  } catch (err) {
    console.error("Fetch card by ID error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch card" });
  }
};

// ===============================
// ADD NEW CARD
// ===============================
exports.addCard = async (req, res) => {
  try {
    const { number, name, expiry, cvv } = req.body;
    if (!number || !name || !expiry || !cvv) {
      return res.status(400).json({
        success: false,
        message: "All card fields are required",
      });
    }

    const last4 = number.slice(-4);
    const newCard = await Card.create({
      user: req.user._id,
      number: `**** **** **** ${last4}`,
      type: "Card",
      name,
      expiry,
    });

    res.status(201).json({ success: true, card: newCard });
  } catch (err) {
    console.error("Add card error:", err);
    res.status(500).json({ success: false, message: "Failed to add card" });
  }
};

// ===============================
// UPDATE CARD
// ===============================
exports.updateCard = async (req, res) => {
  try {
    const { number, name, expiry } = req.body;
    const card = await Card.findOne({ _id: req.params.id, user: req.user._id });
    if (!card)
      return res
        .status(404)
        .json({ success: false, message: "Card not found" });

    if (number) card.number = `**** **** **** ${number.slice(-4)}`;
    if (name) card.name = name;
    if (expiry) card.expiry = expiry;

    await card.save();
    res.json({ success: true, card });
  } catch (err) {
    console.error("Update card error:", err);
    res.status(500).json({ success: false, message: "Failed to update card" });
  }
};

// ===============================
// DELETE CARD
// ===============================
exports.deleteCard = async (req, res) => {
  try {
    const card = await Card.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!card)
      return res
        .status(404)
        .json({ success: false, message: "Card not found" });

    res.json({ success: true, message: "Card deleted successfully" });
  } catch (err) {
    console.error("Delete card error:", err);
    res.status(500).json({ success: false, message: "Failed to delete card" });
  }
};
