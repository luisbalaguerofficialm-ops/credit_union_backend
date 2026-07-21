const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const crypto = require("crypto");
const { createNotification } = require("./notificationController");
const emitDashboardUpdate = require("../utils/emitDashboardUpdate");
const { sendEmail } = require("../utils/notify");

exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 4,
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

// Admin Delete Single User
exports.adminDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Prevent admin from deleting themselves
    if (req.user && req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    /*
    =====================================
    Delete Related Records
    =====================================
    */

    await Promise.all([
      Wallet.deleteMany({ user: user._id }),
      Notification.deleteMany({ userId: user._id }),
      Transaction.deleteMany({ user: user._id }),

      // Uncomment if these collections reference users
      // Beneficiary.deleteMany({ user: user._id }),
      // Device.deleteMany({ user: user._id }),
      // LoginHistory.deleteMany({ user: user._id }),
      // OTP.deleteMany({ user: user._id }),
    ]);

    /*
    =====================================
    Delete User
    =====================================
    */

    await user.deleteOne();

    return res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete user.",
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

    await sendEmail({
      to: user.email,
      subject: "Account Credit Notification",
      html: `
<div style="max-width:600px;margin:auto;font-family:Arial,sans-serif;background:#fff;border:1px solid #eee;padding:30px">

  <div style="text-align:center;margin-bottom:20px;">
    <img
      src="https://res.cloudinary.com/dvthnscx7/image/upload/v1768231460/images_p4tgmy.png"
      width="150"
      alt="America Bank"
    />
  </div>

  <h2 style="color:#004B6E;">
    Hello ${user.firstName} ${user.lastName},
  </h2>

  <p>
    We are pleased to inform you that your account has been
    <strong style="color:#0a8f4f;">credited successfully.</strong>
  </p>

  <table style="width:100%;border-collapse:collapse;border:1px solid #ddd;margin:20px 0;">

    <tr style="background:#f5f5f5;">
      <td style="padding:10px;"><strong>Account Number</strong></td>
      <td style="padding:10px;">${user.accountNumber}</td>
    </tr>

    <tr>
      <td style="padding:10px;"><strong>Transaction ID</strong></td>
      <td style="padding:10px;">${transaction.transactionId}</td>
    </tr>

    <tr style="background:#f5f5f5;">
      <td style="padding:10px;"><strong>Amount Credited</strong></td>
      <td style="padding:10px;color:#0a8f4f;font-size:18px;font-weight:bold;">
        $${Number(amount).toLocaleString()}
      </td>
    </tr>

    <tr>
      <td style="padding:10px;"><strong>Description</strong></td>
      <td style="padding:10px;">
        ${note || "Admin Wallet Credit"}
      </td>
    </tr>

    <tr style="background:#f5f5f5;">
      <td style="padding:10px;"><strong>Date</strong></td>
      <td style="padding:10px;">
        ${new Date().toLocaleString()}
      </td>
    </tr>

    <tr>
      <td style="padding:10px;"><strong>Status</strong></td>
      <td style="padding:10px;color:green;font-weight:bold;">
        Successful
      </td>
    </tr>

  </table>

  <p>
    This credit has been applied to your account successfully.
  </p>

  <p style="color:#d32f2f;">
    If you do not recognize this transaction, please contact America Bank immediately.
  </p>

  <hr>

  <small>
    © ${new Date().getFullYear()} America Bank. All rights reserved.
  </small>

</div>
`,
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

    await sendEmail({
      to: user.email,
      subject: "Account Debit Notification",
      html: `
<div style="max-width:600px;margin:auto;font-family:Arial,sans-serif;background:#fff;border:1px solid #eee;padding:30px">

  <div style="text-align:center;margin-bottom:20px;">
    <img
      src="https://res.cloudinary.com/dvthnscx7/image/upload/v1768231460/images_p4tgmy.png"
      width="150"
      alt="America Bank"
    />
  </div>

  <h2 style="color:#004B6E;">
    Hello ${user.firstName} ${user.lastName},
  </h2>

  <p>
    This is to notify you that your account has been
    <strong style="color:#d32f2f;">debited successfully.</strong>
  </p>

  <table style="width:100%;border-collapse:collapse;border:1px solid #ddd;margin:20px 0;">

    <tr style="background:#f5f5f5;">
      <td style="padding:10px;"><strong>Account Number</strong></td>
      <td style="padding:10px;">${user.accountNumber}</td>
    </tr>

    <tr>
      <td style="padding:10px;"><strong>Transaction ID</strong></td>
      <td style="padding:10px;">${transaction.transactionId}</td>
    </tr>

    <tr style="background:#f5f5f5;">
      <td style="padding:10px;"><strong>Amount Debited</strong></td>
      <td style="padding:10px;color:#d32f2f;font-size:18px;font-weight:bold;">
        $${Number(amount).toLocaleString()}
      </td>
    </tr>

    <tr>
      <td style="padding:10px;"><strong>Description</strong></td>
      <td style="padding:10px;">
        ${note || "Admin Wallet Debit"}
      </td>
    </tr>

    <tr style="background:#f5f5f5;">
      <td style="padding:10px;"><strong>Date</strong></td>
      <td style="padding:10px;">
        ${new Date().toLocaleString()}
      </td>
    </tr>

    <tr>
      <td style="padding:10px;"><strong>Status</strong></td>
      <td style="padding:10px;color:green;font-weight:bold;">
        Successful
      </td>
    </tr>

  </table>

  <p>
    Please review this transaction carefully.
  </p>

  <p style="color:#d32f2f;">
    If you did not authorize this debit, contact America Bank immediately.
  </p>

  <hr>

  <small>
    © ${new Date().getFullYear()} America Bank. All rights reserved.
  </small>

</div>
`,
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

// ============================
exports.getMemberById = async (req, res) => {
  try {
    const member = await User.findById(req.params.id)
      .select(
        "firstName lastName username accountNumber accountType choosedAccount email phone createdAt",
      )
      .populate("createdBy", "firstName lastName");

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    res.json({
      success: true,
      member,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
