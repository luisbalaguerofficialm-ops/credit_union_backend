const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const crypto = require("crypto");
const { createNotification } = require("./notificationController");
const emitDashboardUpdate = require("../utils/emitDashboardUpdate");

exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "All",
      accountType = "All",
      sort = "newest",
    } = req.query;

    // =======================
    // FILTER BUILDER
    // =======================

    const filter = {};

    if (search) {
      const regex = new RegExp(search, "i");

      filter.$or = [
        {
          firstName: regex,
        },

        {
          lastName: regex,
        },

        {
          username: regex,
        },

        {
          email: regex,
        },
      ];

      // account number search
      if (!isNaN(search)) {
        filter.$or.push({
          accountNumber: Number(search),
        });
      }
    }

    // STATUS FILTER

    if (status && status !== "All") {
      filter.status =
        status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }

    // ACCOUNT TYPE FILTER

    if (accountType && accountType !== "All") {
      filter.accountType = accountType;
    }

    // =======================
    // SORT
    // =======================

    let sortOption = {
      createdAt: -1,
    };

    if (sort === "oldest")
      sortOption = {
        createdAt: 1,
      };

    if (sort === "name")
      sortOption = {
        firstName: 1,
      };

    if (sort === "lastLogin")
      sortOption = {
        lastLogin: -1,
      };

    const currentPage = Math.max(Number(page), 1);

    const perPage = Math.max(Number(limit), 1);

    const skip = (currentPage - 1) * perPage;

    const [
      total,
      users,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      flaggedUsers,
    ] = await Promise.all([
      User.countDocuments(filter),

      User.find(filter)
        .select("-password -pinHash -refreshToken")
        .sort(sortOption)
        .skip(skip)
        .limit(perPage),

      User.countDocuments({
        status: "Active",
      }),

      User.countDocuments({
        status: "Pending",
      }),

      User.countDocuments({
        status: "Suspended",
      }),

      User.countDocuments({
        status: "Flagged",
      }),
    ]);

    // =======================
    // GROWTH RATE
    // =======================

    const startMonth = new Date();

    startMonth.setDate(1);
    startMonth.setHours(0, 0, 0, 0);

    const previousMonth = new Date(startMonth);

    previousMonth.setMonth(previousMonth.getMonth() - 1);

    const [newUsersThisMonth, newUsersLastMonth] = await Promise.all([
      User.countDocuments({
        createdAt: {
          $gte: startMonth,
        },
      }),

      User.countDocuments({
        createdAt: {
          $gte: previousMonth,
          $lt: startMonth,
        },
      }),
    ]);

    let growthRate = 0;

    if (newUsersLastMonth > 0) {
      growthRate =
        ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100;
    } else if (newUsersThisMonth > 0) {
      growthRate = 100;
    }

    res.json({
      success: true,
      total,
      page: currentPage,
      pages: Math.ceil(total / perPage),

      analytics: {
        totalUsers: total,
        activeUsers,
        pendingUsers,
        suspendedUsers,
        flaggedUsers,
        newUsersThisMonth,
        growthRate: Number(growthRate.toFixed(1)),
        securityStatus: "Secure",
        lastAudit: new Date(),
      },

      users,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,

      message: "Failed to fetch users",
    });
  }
};

//
//
// GET USER PROFILE
// GET /api/admin/users/:id
//
exports.getUserById = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;

    const user = await User.findById(req.params.id)
      .select("-password -pinHash -refreshToken")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // ============================
    // WALLET
    // ============================

    const wallet = await Wallet.findOne({
      user: user._id,
    }).lean();

    // ============================
    // TRANSACTIONS
    // ============================

    const totalTransactions = await Transaction.countDocuments({
      user: user._id,
    });

    const transactions = await Transaction.find({
      user: user._id,
    })
      .sort({
        createdAt: -1,
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,

      user,

      wallet: {
        balance: wallet?.balance || 0,
        currency: wallet?.currency || "USD",
        walletId: wallet?._id || null,
      },

      transactions,

      transactionSummary: {
        total: totalTransactions,
      },

      pagination: {
        total: totalTransactions,
        page,
        limit,
        pages: Math.ceil(totalTransactions / limit),
        hasNextPage: page < Math.ceil(totalTransactions / limit),

        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("Get User Profile Error:", err);

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
// UPDATE USER STATUS
// PATCH /api/admin/users/:id/status
// ======================================

exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatus = ["Pending", "Active", "Suspended", "Flagged"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status.",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.status = status;
    await user.save();

    // Optional notification
    await createNotification({
      userId: user._id,
      title: "Account Status Updated",
      message: `Your account status has been updated to ${status}.`,
      category: "account",
      email: user.email,
    });

    const io = req.app.get("io");

    if (io) {
      await emitDashboardUpdate(io, user._id);
    }

    res.status(200).json({
      success: true,
      message: "User status updated successfully.",
      status: user.status,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to update status.",
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

