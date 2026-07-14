const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const crypto = require("crypto");
const { createNotification } = require("./notificationController");
const emitDashboardUpdate = require("../utils/emitDashboardUpdate");

//
// GET ALL USERS
// GET /api/admin/users
//
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      status,
      accountType,
      sort = "newest",
    } = req.query;

    const filter = {};

    // Search
    if (search) {
      const searchRegex = new RegExp(search, "i");

      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { username: searchRegex },
        { email: searchRegex },
        { accountNumber: search },
      ];
    }

    // Status
    if (status && status !== "All") {
      filter.status = status;
    }

    // Account Type
    if (accountType && accountType !== "All") {
      filter.accountType = accountType;
    }

    // Sorting
    let sortOption = { createdAt: -1 };

    switch (sort) {
      case "oldest":
        sortOption = { createdAt: 1 };
        break;

      case "name":
        sortOption = { firstName: 1 };
        break;

      case "lastLogin":
        sortOption = { lastLogin: -1 };
        break;

      case "newest":
      default:
        sortOption = { createdAt: -1 };
    }

    const currentPage = Math.max(parseInt(page), 1);
    const perPage = Math.max(parseInt(limit), 1);

    const skip = (currentPage - 1) * perPage;

    const total = await User.countDocuments(filter);

    const users = await User.find(filter)
      .select("-password -pinHash -refreshToken")
      .sort(sortOption)
      .skip(skip)
      .limit(perPage);

    res.status(200).json({
      success: true,
      total,
      page: currentPage,
      pages: Math.ceil(total / perPage),
      hasNextPage: currentPage < Math.ceil(total / perPage),
      hasPrevPage: currentPage > 1,
      users,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
    });
  }
};

//
// GET USER PROFILE
// GET /api/admin/users/:id
//
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "-password -pinHash -refreshToken",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const wallet = await Wallet.findOne({
      user: user._id,
    });

    res.status(200).json({
      success: true,
      user,
      wallet,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch user.",
    });
  }
};

//
// UPDATE USER
// PATCH /api/admin/users/:id
//
exports.updateUser = async (req, res) => {
  try {
    const allowedUpdates = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "country",
      "state",
      "city",
      "zipcode",
      "address",
      "accountType",
      "status",
    ];

    const updates = {};

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password -pinHash -refreshToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully.",
      user,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to update user.",
    });
  }
};

//
// ACTIVATE USER
// PATCH /api/admin/users/:id/activate
//
exports.activateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.status = "Active";
    user.suspensionReason = "";

    await user.save();

    res.status(200).json({
      success: true,
      message: "User activated successfully.",
      user,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to activate user.",
    });
  }
};

//
// SUSPEND USER
// PATCH /api/admin/users/:id/suspend
//
exports.suspendUser = async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.status = "Suspended";
    user.suspensionReason = reason || "Administrative action";

    await user.save();

    res.status(200).json({
      success: true,
      message: "User suspended successfully.",
      user,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to suspend user.",
    });
  }
};

// ======================================
// FLAG USER
// PATCH /api/admin/users/:id/flag
// ======================================
exports.flagUser = async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.status = "Flagged";
    user.flagReason = reason || "Suspicious activity";

    await user.save();

    await createNotification({
      userId: user._id,
      title: "Account Flagged",
      message: "Your account has been flagged for review.",
      category: "security",
      email: user.email,
      metadata: {
        reason: user.flagReason,
      },
    });

    res.json({
      success: true,
      message: "User flagged successfully",
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to flag user",
    });
  }
};

// ======================================
// UNFLAG USER
// PATCH /api/admin/users/:id/unflag
// ======================================
exports.unflagUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.status = "Active";
    user.flagReason = "";

    await user.save();

    res.json({
      success: true,
      message: "User unflagged successfully",
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to remove flag",
    });
  }
};

// ======================================
// CREDIT USER WALLET
// POST /api/admin/users/:id/credit
// ======================================
exports.creditWallet = async (req, res) => {
  try {
    const { amount, note } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let wallet = await Wallet.findOne({
      user: user._id,
    });

    if (!wallet) {
      wallet = await Wallet.create({
        user: user._id,
      });
    }

    await wallet.addFunds(Number(amount), req.user.role);

    // create transaction

    const transaction = await Transaction.create({
      user: user._id,

      type: "Deposit",

      recipientName: `${user.firstName} ${user.lastName}`,

      recipientEmail: user.email,

      recipientCountry: user.country || "N/A",

      bankName: "Internal Wallet Funding",

      accountNumber: user.accountNumber,

      amount: Number(amount),

      status: "Successful",

      description: note || "Admin wallet credit",

      transactionId: "CR-" + crypto.randomBytes(8).toString("hex"),

      metadata: {
        createdBy: req.user._id,
        role: req.user.role,
      },
    });

    await createNotification({
      userId: user._id,

      title: "Wallet Credited",

      message: `Your account has been credited with $${Number(amount).toLocaleString()}`,

      category: "transaction",

      email: user.email,

      metadata: {
        transactionId: transaction.transactionId,
        amount,
      },
    });

    const io = req.app.get("io");

    if (io) {
      await emitDashboardUpdate(io, user._id);
    }

    res.json({
      success: true,

      message: "Wallet credited successfully",

      transaction,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to credit wallet",
    });
  }
};

// ======================================
// DEBIT USER WALLET
// POST /api/admin/users/:id/debit
// ======================================
exports.debitWallet = async (req, res) => {
  try {
    const { amount, note } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const wallet = await Wallet.findOne({
      user: user._id,
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    await wallet.deductFunds(Number(amount), req.user.role);

    const transaction = await Transaction.create({
      user: user._id,

      type: "Withdrawal",

      recipientName: `${user.firstName} ${user.lastName}`,

      recipientEmail: user.email,

      recipientCountry: user.country || "N/A",

      bankName: "Internal Wallet Debit",

      accountNumber: user.accountNumber,

      amount: Number(amount),

      status: "Successful",

      description: note || "Admin wallet debit",

      transactionId: "DB-" + crypto.randomBytes(8).toString("hex"),

      metadata: {
        createdBy: req.user._id,
        role: req.user.role,
      },
    });

    await createNotification({
      userId: user._id,

      title: "Wallet Debited",

      message: `$${Number(amount).toLocaleString()} has been deducted from your account.`,

      category: "transaction",

      email: user.email,

      metadata: {
        transactionId: transaction.transactionId,
      },
    });

    const io = req.app.get("io");

    if (io) {
      await emitDashboardUpdate(io, user._id);
    }

    res.json({
      success: true,

      message: "Wallet debited successfully",

      transaction,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,

      message: error.message || "Debit failed",
    });
  }
};

// ======================================
// CHANGE ROLE
// PATCH /api/admin/users/:id/role
// ======================================
exports.changeRole = async (req, res) => {
  try {
    const { role } = req.body;

    const allowedRoles = ["user", "admin", "manager", "superadmin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.role = role;

    await user.save();

    res.json({
      success: true,

      message: "Role updated successfully",

      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,

      message: "Failed to change role",
    });
  }
};


// ======================================
// GET USER STATISTICS
// GET /api/admin/users/statistics
// ======================================
exports.getStatistics = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      flaggedUsers,
      admins,
      managers,
      customers,
      totalWalletBalance,
      totalTransactions,
    ] = await Promise.all([
      // Total users
      User.countDocuments(),

      // Active users
      User.countDocuments({
        status: "active",
      }),

      // Suspended users
      User.countDocuments({
        status: "suspended",
      }),

      // Flagged users
      User.countDocuments({
        flagged: true,
      }),

      // Admin roles
      User.countDocuments({
        role: "admin",
      }),

      // Managers
      User.countDocuments({
        role: "manager",
      }),

      // Normal users
      User.countDocuments({
        role: "user",
      }),

      // Wallet total balance
      Wallet.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: "$balance",
            },
          },
        },
      ]),

      // Transactions count
      Transaction.countDocuments(),
    ]);

    res.status(200).json({
      success: true,

      statistics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
          flagged: flaggedUsers,
        },

        roles: {
          users: customers,
          admins,
          managers,
        },

        wallet: {
          totalBalance: totalWalletBalance[0]?.total || 0,
        },

        transactions: {
          total: totalTransactions,
        },
      },
    });
  } catch (error) {
    console.error("Get Statistics Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get statistics",
    });
  }
};
