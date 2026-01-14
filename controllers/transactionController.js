const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallet");
const emitDashboardUpdate = require("../utils/emitDashboardUpdate");
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");

//CENTRALIZED NOTIFICATION UTILS
const {
  sendTransactionAlert,
  sendTransferFeeAlert,
} = require("../utils/notify");

// ===============================
// GET ALL TRANSACTIONS
// ===============================
exports.getTransactions = async (req, res) => {
  try {
    const txns = await Transaction.find({ user: req.user._id }).sort({
      date: -1,
    });
    res.json({ success: true, transactions: txns });
  } catch (err) {
    console.error("Get Transactions Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// GET TRANSACTION BY TRANSACTION ID
// ===============================
exports.getTransactionByTransactionId = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({
      transactionId,
      user: req.user._id,
    });

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    res.json({ success: true, transaction });
  } catch (err) {
    console.error("Get Transaction Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// CREATE TRANSACTION / TRANSFER
// ===============================
exports.createTransaction = async (req, res) => {
  try {
    const { recipientName, accountNumber, bankName, amount, narration } =
      req.body;

    if (!recipientName || !accountNumber || !bankName || !amount) {
      return res.status(400).json({
        success: false,
        message:
          "Recipient name, account number, bank name, and amount are required",
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    }

    // ===============================
    // CHECK WALLET
    // ===============================
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet || wallet.balance < parsedAmount) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    }

    wallet.balance -= parsedAmount;
    await wallet.save();

    // ===============================
    // CREATE TRANSACTION
    // ===============================
    const transaction = await Transaction.create({
      user: req.user._id,
      type: "Transfer",
      recipientName,
      accountNumber,
      bankName,
      amount: parsedAmount,
      status: "Successful",
      description: narration,
      transactionId: "TXN" + Math.floor(Math.random() * 100000000),
    });

    const io = req.app.get("io");
    await emitDashboardUpdate(io, req.user._id);

    // ===============================
    // 🔔 TRANSACTION ALERT (EMAIL + SMS)
    // ===============================
    await sendTransactionAlert({
      email: req.user.email,
      phone: req.user.phone,
      type: "Transfer",
      amount: parsedAmount,
      balance: wallet.balance,
      currency: "$",
    });

    // ===============================
    // 🔔 TRANSFER FEE ALERT (EMAIL + SMS)
    // ===============================
    const transferFeeAmount = 100000; // example fee

    await sendTransferFeeAlert({
      email: req.user.email,
      phone: req.user.phone,
      amount: transferFeeAmount,
      recipientName,
      currency: "$",
    });

    res.status(201).json({ success: true, transaction });
  } catch (err) {
    console.error("Create Transaction Error:", err);
    res.status(500).json({ success: false, message: "Transfer failed" });
  }
};

// ===============================
// UPDATE TRANSACTION
// ===============================
exports.updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    const { status, description, recipientName, amount } = req.body;

    if (status) transaction.status = status;
    if (description) transaction.description = description;
    if (recipientName) transaction.recipientName = recipientName;

    if (amount) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid amount" });
      }
      transaction.amount = parsedAmount;
    }

    await transaction.save();

    const io = req.app.get("io");
    await emitDashboardUpdate(io, req.user._id);

    res.json({ success: true, transaction });
  } catch (err) {
    console.error("Update Transaction Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// DELETE TRANSACTION
// ===============================
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    const io = req.app.get("io");
    await emitDashboardUpdate(io, req.user._id);

    res.json({ success: true, message: "Transaction deleted successfully" });
  } catch (err) {
    console.error("Delete Transaction Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// FILTERED TRANSACTIONS (NO LIMIT)
// ===============================
exports.getFiltered = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, status, from, to, q } = req.query;

    const filter = { user: userId };
    if (type) filter.type = type;
    if (status) filter.status = status;

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)
        filter.date.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    if (q) {
      filter.$or = [
        { recipientName: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const data = await Transaction.find(filter).sort({ date: -1 });

    res.json({ success: true, total: data.length, data });
  } catch (err) {
    console.error("Filtered Transactions Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ===============================
// EXPORT TRANSACTIONS AS CSV
// ===============================
exports.exportTransactionsCSV = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, status, from, to, q } = req.query;

    const filter = { user: userId };

    if (type) filter.type = type;
    if (status) filter.status = status;

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)
        filter.date.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    if (q) {
      filter.$or = [
        { recipientName: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { transactionId: { $regex: q, $options: "i" } },
      ];
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 });

    const fields = [
      "transactionId",
      "type",
      "recipientName",
      "bankName",
      "accountNumber",
      "amount",
      "status",
      "description",
      "date",
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(transactions);

    res.header("Content-Type", "text/csv");
    res.attachment("transactions.csv");
    return res.send(csv);
  } catch (err) {
    console.error("Export CSV Error:", err);
    res.status(500).json({ success: false, message: "CSV export failed" });
  }
};

// ===============================
// EXPORT TRANSACTIONS AS PDF
// ===============================
exports.exportTransactionsPDF = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, status, from, to, q } = req.query;

    const filter = { user: userId };

    if (type) filter.type = type;
    if (status) filter.status = status;

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)
        filter.date.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    if (q) {
      filter.$or = [
        { recipientName: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { transactionId: { $regex: q, $options: "i" } },
      ];
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 });

    const doc = new PDFDocument({ margin: 30, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=transactions.pdf"
    );

    doc.pipe(res);

    doc.fontSize(18).text("Transaction History", { align: "center" });
    doc.moveDown();

    transactions.forEach((txn, index) => {
      doc.fontSize(10).text(`Transaction ${index + 1}`, { underline: true });
      doc.text(`Transaction ID: ${txn.transactionId}`);
      doc.text(`Type: ${txn.type}`);
      doc.text(`Recipient: ${txn.recipientName || "N/A"}`);
      doc.text(`Bank: ${txn.bankName || "N/A"}`);
      doc.text(`Account: ${txn.accountNumber || "N/A"}`);
      doc.text(`Amount: ₦${txn.amount}`);
      doc.text(`Status: ${txn.status}`);
      doc.text(`Date: ${txn.date.toLocaleString()}`);
      doc.text(`Description: ${txn.description || "N/A"}`);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    console.error("Export PDF Error:", err);
    res.status(500).json({ success: false, message: "PDF export failed" });
  }
};
