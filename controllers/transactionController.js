const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallet");
const emitDashboardUpdate = require("../utils/emitDashboardUpdate");
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");
const Notification = require("../models/Notification");
const { calculateTransferFee } = require("../utils/feeCalculation");
const { createNotification } = require("./notificationController");

//CENTRALIZED NOTIFICATION UTILS
const {
  sendTransactionAlert,
  sendTransferFeeAlert,
  sendRecipientTransferAlert,
} = require("../utils/notify");

// ===============================
// CREATE TRANSACTION / TRANSFER
// ===============================
exports.createTransaction = async (req, res) => {
  try {
    const {
      recipientName,
      recipientEmail,
      accountNumber,
      bankName,
      amount,
      recipientCountry,
      iban,
      swiftCode,
      narration,
    } = req.body;

    if (
      !recipientName ||
      !recipientEmail ||
      !recipientCountry ||
      !bankName ||
      !amount
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Recipient name, recipient email, recipient country, bank name, and amount are required",
      });
    }

    // Validate Account Number OR IBAN
    // Right now a user can submit neither one of both.
    if (!accountNumber && !iban) {
      return res.status(400).json({
        success: false,
        message: "Account Number or IBAN is required",
      });
    }

    // If an IBAN is provided, require SWIFT for international transfers:
    if (iban && !swiftCode) {
      return res.status(400).json({
        success: false,
        message: "SWIFT/BIC code is required for international transfers",
      });
    }

    // Chect Amount on the Account
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    }

    // // ===============================
    // // MINIMUM TRANSFER VALIDATION
    // // ===============================
    // if (parsedAmount < 2500) {
    //   return res.status(400).json({
    //     success: false,
    //   message: `for now you can only tranfer ${wallet.currency} 2,500 and above,  `
    //   });
    // }

    // ===============================
    // CALCULATE TRANSFER FEE EARLY
    // ===============================
    const feeData = await calculateTransferFee(parsedAmount);
    const transferFeeAmount = feeData.fee;

    // ===============================
    // GET USER & WALLET
    // ===============================
    const user = await User.findById(req.user._id);
    const wallet = await Wallet.findOne({ user: req.user._id });

    if (!wallet || wallet.balance < parsedAmount) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    }

    // ===============================
    // DEDUCT WALLET
    // ===============================
    wallet.balance -= parsedAmount;
    await wallet.save();

    // ===============================
    // CREATE TRANSACTION (PENDING)
    // ===============================
    const transaction = await Transaction.create({
      user: user._id,
      type: "Transfer",
      recipientName,
      recipientEmail,
      accountNumber,
      email: user.email,
      phone: user.phone,
      bankName,
      iban,
      swiftCode,
      recipientCountry,
      amount: parsedAmount,
      status: "Pending",
      description: narration,
      transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    });

    // ===============================
    // REALTIME DASHBOARD UPDATE
    // ===============================
    const io = req.app.get("io");
    await emitDashboardUpdate(io, user._id);

    // ===============================
    // EMAIL SENDER
    // ===============================
    console.log("📧 Attempting to send transaction alert to:", user.email);
    await sendTransactionAlert({
      email: user.email,
      phone: user.phone,
      type: "Transfer",
      amount: parsedAmount,
      balance: wallet.balance,
      currency: wallet.currency,
      transferFee: transferFeeAmount,
    });

    // ===============================
    // SMS SENDER
    // ===============================
    console.log("📧 Attempting to send transaction alert to:", user.phone);
    await sendTransactionAlert({
      phone: user.phone,
      recipientName,
      type: "Transfer",
      amount: parsedAmount,
      balance: wallet.balance,
      currency: wallet.currency,
      transferFee: transferFeeAmount,
    });

    // ===============================
    // EMAIL RECIPIENT (PENDING)
    // ===============================
    console.log(
      "📧 Attempting to send recipient transfer email to:",
      recipientEmail,
    );
    await sendRecipientTransferAlert({
      email: recipientEmail,
      recipientName,
      senderName:
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.email,
      amount: parsedAmount,
      currency: wallet.currency,
      transactionId: transaction.transactionId,
    });
    try {
      console.log(
        "📧 Sending transfer fee alert to:",
        user.email,
        "amount:",
        transferFeeAmount,
      );

      await sendTransferFeeAlert({
        email: user.email,
        phone: user.phone,
        amount: transferFeeAmount,
        recipientName,
        currency: wallet.currency,
      });

      console.log("✅ Transfer fee alert attempt finished for:", user.email);
    } catch (err) {
      console.error(
        "❌ sendTransferFeeAlert threw an error:",
        err.message,
        err.stack,
      );
    }

    // ===============================
    res.status(201).json({
      success: true,
      message: "Transfer initiated successfully",
      transaction,
    });
  } catch (err) {
    console.error("Create Transaction Error:", err.message, err.stack);
    res.status(500).json({
      success: false,
      message: "Transfer failed",
      error: err.message,
    });
  }
};

// ===============================
// GET TRANSACTIONS (WITH FILTERS)
// GET /api/transactions
// ===============================

exports.getTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 5,
      type,
      status,
      dateRange,
      search,
      from,
      to,
    } = req.query;

    const currentPage = Math.max(parseInt(page), 1);
    const perPage = Math.max(parseInt(limit), 1);

    const filter = {
      user: req.user._id,
    };

    // =====================
    // TYPE
    // =====================
    if (type && type !== "All Types") {
      filter.type = type;
    }

    // =====================
    // STATUS
    // =====================
    if (status && status !== "All Status") {
      filter.status = status;
    }

    // =====================
    // SEARCH
    // =====================
    if (search?.trim()) {
      filter.$or = [
        {
          recipientName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          recipientEmail: {
            $regex: search,
            $options: "i",
          },
        },
        {
          transactionId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          bankName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    // =====================
    // CUSTOM DATE
    // =====================
    if (from || to) {
      filter.createdAt = {};

      if (from) {
        filter.createdAt.$gte = new Date(from);
      }

      if (to) {
        filter.createdAt.$lte = new Date(
          new Date(to).setHours(23, 59, 59, 999),
        );
      }
    }

    // =====================
    // PRESET DATE RANGE
    // =====================
    else if (dateRange) {
      const now = new Date();
      let startDate;

      switch (dateRange) {
        case "Last Week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;

        case "Last Two Weeks":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 14);
          break;

        case "Last Month":
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;

        case "Last 30 Days":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
          break;

        case "Last 90 Days":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 90);
          break;

        case "This Year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;

        case "Last Year":
          filter.createdAt = {
            $gte: new Date(now.getFullYear() - 1, 0, 1),
            $lte: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
          };
          break;
      }

      if (startDate) {
        filter.createdAt = {
          $gte: startDate,
          $lte: now,
        };
      }
    }

    // =====================
    // COUNT
    // =====================
    const total = await Transaction.countDocuments(filter);

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .lean();

    const formattedTransactions = transactions.map((transaction) => ({
      _id: transaction._id,
      transactionId: transaction.transactionId,
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount,
      recipientName: transaction.recipientName,
      recipientEmail: transaction.recipientEmail,
      bankName: transaction.bankName,
      description: transaction.description,
      createdAt: transaction.createdAt,
    }));

    res.status(200).json({
      success: true,

      pagination: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages: Math.ceil(total / perPage),
        hasNextPage: currentPage < Math.ceil(total / perPage),
        hasPrevPage: currentPage > 1,
      },

      transactions: formattedTransactions,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch transactions",
    });
  }
};
// ===============================
// GET TRANSACTION BY ID
// GET /api/transactions/:id
// ===============================
exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOne({
      _id: id,
      user: req.user._id,
    })
      .populate("user", "firstName lastName username email")
      .lean();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      transaction: {
        _id: transaction._id,
        transactionId: transaction.transactionId,

        type: transaction.type,
        status: transaction.status,
        amount: transaction.amount,

        // Sender (logged-in user)
        user: {
          _id: transaction.user._id,
          firstName: transaction.user.firstName,
          lastName: transaction.user.lastName,
          fullName: `${transaction.user.firstName} ${transaction.user.lastName}`,
          username: transaction.user.username,
          email: transaction.user.email,
        },

        // Recipient
        recipientName: transaction.recipientName,
        recipientEmail: transaction.recipientEmail,
        recipientCountry: transaction.recipientCountry,

        // Banking
        bankName: transaction.bankName,
        accountNumber: transaction.accountNumber,
        iban: transaction.iban,
        swiftCode: transaction.swiftCode,

        // Transaction
        description: transaction.description,

        // Contact
        email: transaction.email,
        phone: transaction.phone,

        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    });
  } catch (err) {
    console.error("Get Transaction By ID Error:", err);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
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
// DELETE TRANSACTION BY MONGODB _ID
// DELETE /api/transactions/:id
// ===============================
exports.deleteTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Realtime dashboard update
    const io = req.app.get("io");
    await emitDashboardUpdate(io, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
      deletedTransaction: {
        _id: transaction._id,
        transactionId: transaction.transactionId,

        type: transaction.type,
        status: transaction.status,
        amount: transaction.amount,

        recipientName: transaction.recipientName,
        recipientEmail: transaction.recipientEmail,
        recipientCountry: transaction.recipientCountry,

        bankName: transaction.bankName,
        accountNumber: transaction.accountNumber,
        iban: transaction.iban,
        swiftCode: transaction.swiftCode,

        description: transaction.description,

        email: transaction.email,
        phone: transaction.phone,

        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    });
  } catch (err) {
    console.error("Delete Transaction Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
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
      "attachment; filename=transactions.pdf",
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
