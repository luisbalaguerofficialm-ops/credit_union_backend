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
      transferType,
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

    // ==================================
    // REQUIRED FIELDS
    // ==================================
    if (
      !transferType ||
      !recipientName ||
      !recipientEmail ||
      !recipientCountry ||
      !bankName ||
      !amount
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Transfer type, recipient name, recipient email, recipient country, bank name and amount are required.",
      });
    }

    // ==================================
    // VALIDATE TRANSFER TYPE
    // ==================================
    const allowedTransferTypes = ["Domestic", "International", "Wire"];

    if (!allowedTransferTypes.includes(transferType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transfer type.",
      });
    }

    // ==================================
    // TRANSFER TYPE VALIDATION
    // ==================================
    switch (transferType) {
      case "Domestic":
        if (!accountNumber) {
          return res.status(400).json({
            success: false,
            message: "Account number is required for domestic transfers.",
          });
        }
        break;

      case "International":
        if (!iban || !swiftCode) {
          return res.status(400).json({
            success: false,
            message:
              "IBAN and SWIFT code are required for international transfers.",
          });
        }
        break;

      case "Wire":
        if (!swiftCode) {
          return res.status(400).json({
            success: false,
            message: "SWIFT code is required for wire transfers.",
          });
        }

        // Optional but recommended
        if (!accountNumber && !iban) {
          return res.status(400).json({
            success: false,
            message: "Account number or IBAN is required for wire transfers.",
          });
        }
        break;
    }

    // ==================================
    // VALIDATE AMOUNT
    // ==================================
    const parsedAmount = Number(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount.",
      });
    }

    // ==================================
    // CALCULATE TRANSFER FEE
    // ==================================
    const feeData = await calculateTransferFee(parsedAmount);
    const transferFeeAmount = feeData.fee;

    // ==================================
    // GET USER & WALLET
    // ==================================
    const user = await User.findById(req.user._id);

    const wallet = await Wallet.findOne({
      user: req.user._id,
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found.",
      });
    }

    // Check if balance covers transfer amount only
    if (wallet.balance < parsedAmount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance.",
      });
    }

    // ==================================
    // DEDUCT WALLET
    // ==================================
    wallet.balance -= parsedAmount;
    wallet.lastUpdatedBy = "user";

    await wallet.save();

    // ==================================
    // CREATE TRANSACTION
    // ==================================
    const transaction = await Transaction.create({
      user: user._id,
      type: "Transfer",
      transferType,
      recipientName,
      recipientEmail,
      recipientCountry,
      bankName,
      accountNumber:
        transferType === "Domestic" || transferType === "Wire"
          ? accountNumber
          : null,
      iban: transferType !== "Domestic" ? iban : null,
      swiftCode: transferType !== "Domestic" ? swiftCode : null,
      amount: parsedAmount,
      status: "Pending",
      description: narration,
      transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      metadata: {
        transferFee: transferFeeAmount,
      },
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
      limit = 3,
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

// ======================================
// ADMIN GET ALL TRANSACTIONS
// GET /api/admin/transactions
// ======================================
exports.adminGetTransactions = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    // const query = {
    //   deleted: false,
    // };

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.type) {
      query.type = req.query.type;
    }

    if (req.query.search) {
      query.$or = [
        {
          recipientName: {
            $regex: req.query.search,
            $options: "i",
          },
        },
        {
          recipientEmail: {
            $regex: req.query.search,
            $options: "i",
          },
        },
        {
          transactionId: {
            $regex: req.query.search,
            $options: "i",
          },
        },
        {
          accountNumber: {
            $regex: req.query.search,
            $options: "i",
          },
        },
      ];
    }

    const [transactions, total, volume, statusCounts, activeUsers] =
      await Promise.all([
        Transaction.find(query)
          .populate(
            "user",
            "firstName lastName email profileImage accountNumber",
          )
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),

        Transaction.countDocuments(query),

        Transaction.aggregate([
          {
            $match: {
              status: "Successful",
              deleted: false,
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: "$amount",
              },
            },
          },
        ]),

        Transaction.aggregate([
          {
            $match: {
              deleted: false,
            },
          },
          {
            $group: {
              _id: "$status",
              count: {
                $sum: 1,
              },
            },
          },
        ]),

        User.countDocuments({
          status: "Active",
        }),
      ]);

    const counts = {
      Pending: 0,
      Processing: 0,
      "Funds Authorized": 0,
      Successful: 0,
      Failed: 0,
      "Initiated from Web Portal": 0,
    };

    statusCounts.forEach((item) => {
      counts[item._id] = item.count;
    });

    const failedRate =
      counts.Successful + counts.Failed === 0
        ? 0
        : Number(
            (
              (counts.Failed / (counts.Successful + counts.Failed)) *
              100
            ).toFixed(2),
          );

    return res.status(200).json({
      success: true,

      stats: {
        totalVolume: volume[0]?.total || 0,
        pendingTasks: counts.Pending,
        processing: counts.Processing,
        authorized: counts["Funds Authorized"],
        successful: counts.Successful,
        failed: counts.Failed,
        initiated: counts["Initiated from Web Portal"],
        activeUsers,
        failedRate,
      },

      transactions,

      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("Admin Transactions:", err);

    return res.status(500).json({
      success: false,
      message: "Unable to load transactions",
    });
  }
};

// ======================================
// ADMIN GET TRANSACTION BY ID
// GET /api/transactions/admin/:id
// ======================================
exports.adminTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate(
      "user",
      "firstName lastName email username accountNumber country state city profileImage",
    );

    if (!transaction || transaction.deleted) {
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
        amount: transaction.amount,
        status: transaction.status,
        type: transaction.type,
        transferType: transaction.transferType,
        description: transaction.description,
        transferFee: transferFeeAmount,
        metadata: transaction.metadata,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        sender: {
          id: transaction.user?._id,

          fullName: `${transaction.user?.firstName || ""} ${
            transaction.user?.lastName || ""
          }`.trim(),

          firstName: transaction.user?.firstName,
          lastName: transaction.user?.lastName,
          username: transaction.user?.username,
          email: transaction.user?.email,
          accountNumber: transaction.user?.accountNumber,
          country: transaction.user?.country,
          state: transaction.user?.state,
          city: transaction.user?.city,
          profileImage: transaction.user?.profileImage,
        },
        recipient: {
          name: transaction.recipientName,
          email: transaction.recipientEmail,
          country: transaction.recipientCountry,
          bankName: transaction.bankName,
          accountNumber: transaction.accountNumber,
          iban: transaction.iban,
          swiftCode: transaction.swiftCode,
        },

        audit: {
          deleted: transaction.deleted,

          deletedAt: transaction.deletedAt,

          deletedBy: transaction.deletedBy,
        },
      },
    });
  } catch (err) {
    console.error("Admin Transaction By Id:", err);

    res.status(500).json({
      success: false,
      message: "Unable to fetch transaction",
    });
  }
};

// DELETE /api/admin/transactions/:id

exports.adminDeleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Soft delete
    transaction.deleted = true;
    transaction.deletedAt = new Date();
    transaction.deletedBy = req.user._id;

    await transaction.save();
    // Update the affected user's dashboard
    const io = req.app.get("io");

    if (io) {
      await emitDashboardUpdate(io, transaction.user);
    }

    return res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
      deletedTransaction: transaction,
    });
  } catch (err) {
    console.error("Admin Delete Transaction Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
