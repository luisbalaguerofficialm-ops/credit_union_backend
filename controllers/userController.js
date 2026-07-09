const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Notification = require("../models/Notification");
const Wallet = require("../models/Wallet");
const { uploadToCloudinary } = require("../utils/cloudinary");
const bcrypt = require("bcryptjs");
const { sendEmail } = require("../utils/notify");
const { createNotification } = require("./notificationController");

/* ===============================
   GET USER PROFILE (NEW)
   GET /api/users/profile
================================ */
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select(
      `
  firstName
  lastName
  email
  phone
  address
  state
  city
  zipcode
  accountNumber
  profileImage
  username
  accountType
  choosedAccount
  `,
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get wallet
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await Wallet.create({ user: userId });
    }

    res.json({
      success: true,
      user: {
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        accountNumber: user.accountNumber,
        balance: wallet.balance,
        currency: wallet.currency,
        choosedAccount: user.choosedAccount,
        username: user.username,
        accountType: user.accountType,
        profileImage: user.profileImage,
        state: user.state,
        city: user.city,
        zipcode: user.zipcode,
        address: user.address,
      },
    });
  } catch (err) {
    console.error("PROFILE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};

//  ============ UPDATE PROFILE ==================================

exports.updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      username,
      phone,
      state,
      city,
      zipcode,
      address,
      profileImage,
    } = req.body;

    // Find current user
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check username only if it was provided
    if (username) {
      const existingUsername = await User.findOne({
        username: username.toLowerCase(),
        _id: { $ne: req.user._id },
      });

      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: "Username already exists",
        });
      }

      user.username = username.toLowerCase();
    }

    // Update only provided fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (state) user.state = state;
    if (city) user.city = city;
    if (zipcode) user.zipcode = zipcode;
    if (address) user.address = address;
    if (profileImage) user.profileImage = profileImage;
    if (username) user.username = username;

    await user.save();

    await createNotification({
      userId: user._id,
      title: "Profile Updated",
      message: "Your profile information was updated successfully.",
      category: "system",
      email: user.email,
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Profile update failed",
    });
  }
};
/* ===============================
   GET DASHBOARD
================================ */
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const timeframe = req.query.timeframe || "30days";
    const user = await User.findById(userId);

    // Fetch wallet to get balance and currency
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await Wallet.create({ user: userId });
    }

    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(3);

    // ==========================================
    // FORMAT TRANSACTIONS FOR FRONTEND
    // ==========================================
    const formattedTransactions = transactions.map((tx) => ({
      id: tx._id,
      description: tx.description,
      date: tx.createdAt,
      type: tx.type,
      amount: tx.amount,
      status: tx.status,
      createdAt: tx.createdAt,
      isNegative:
        tx.type === "withdrawal" ||
        tx.type === "transfer" ||
        tx.type === "payment",
    }));

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(3);

    // ==========================================
    // SPENDING ANALYTICS AGGREGATION PIPELINE
    // ==========================================
    const now = new Date();
    let startDate = new Date();
    let numIntervals = 4; // 4 weeks for 30 days breakdown

    if (timeframe === "3months") {
      startDate.setMonth(now.getMonth() - 3);
      numIntervals = 3; // 3 months breakdown
    } else {
      startDate.setDate(now.getDate() - 30);
    }

    const spendingData = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: startDate },
          type: { $in: ["withdrawal", "transfer", "payment"] },
          status: "Successful", // Filter out failed/pending adjustments if necessary
        },
      },
      {
        $group: {
          _id:
            timeframe === "3months"
              ? { $month: "$createdAt" }
              : {
                  $ceil: {
                    $divide: [
                      { $subtract: [now, "$createdAt"] },
                      1000 * 60 * 60 * 24 * 7,
                    ],
                  },
                },
          totalSpent: { $sum: "$amount" },
        },
      },
    ]);

    // Format metrics seamlessly into index arrays for predictable chart rendering
    let analyticsArray = [];
    if (timeframe === "3months") {
      // Setup structural array for the past 3 months
      for (let i = 2; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        const mIdx = d.getMonth() + 1;
        const label = d.toLocaleString("default", { month: "short" });
        const found = spendingData.find((s) => s._id === mIdx);
        analyticsArray.push({ label, amount: found ? found.totalSpent : 0 });
      }
    } else {
      // Setup structural array for 4 uniform interval blocks (Week 1 -> Week 4)
      // Group allocations normalized into reverse chronological delta buckets
      for (let w = 4; w >= 1; w--) {
        const found = spendingData.find(
          (s) => s._id === w || (w === 4 && s._id > 4),
        );
        analyticsArray.push({
          label: `Week ${5 - w}`,
          amount: found ? found.totalSpent : 0,
        });
      }
    }

    // Determine highest amount to calculate percentage scaling for visual layout balances
    const maxSpending = Math.max(...analyticsArray.map((a) => a.amount), 1);
    const chartData = analyticsArray.map((item) => ({
      ...item,
      percentage: Math.min(Math.round((item.amount / maxSpending) * 100), 100),
    }));

    res.json({
      success: true,
      balance: wallet.balance,
      currency: wallet.currency,
      accountNumber: user.accountNumber,
      greetingName: user.fullName,
      transactions: formattedTransactions,
      notifications,
      choosedAccount: user.choosedAccount,
      profileImage: user.profileImage,
      unreadNotifications: notifications.filter((n) => !n.read).length,
      analytics: chartData,
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({
      success: false,
      message: "Dashboard fetch failed",
    });
  }
};

//    UPDATE PROFILE IMAGE
exports.updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload an image",
      });
    }

    // Use your helper function
    const uploadedImage = await uploadToCloudinary(req.file, "profile_images");

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: uploadedImage.secure_url },
      { new: true },
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile image updated successfully",
      user,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({
      message: "Server error while uploading image",
    });
  }
};

// ====================== CHANGE PASSWORD ====================

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");

    const valid = await bcrypt.compare(currentPassword, user.password);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    await createNotification({
      userId: user._id,
      title: "Password Changed",
      message:
        "Your account password was changed successfully. If this wasn't you, contact support immediately.",
      category: "security",
      email: user.email,
    });

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};

//  CHANGE TRANSACTION PIN ===============================
exports.changeTransactionPin = async (req, res) => {
  try {
    const { currentPin, newPin, confirmPin } = req.body;

    const user = await User.findById(req.user._id).select("+pinHash");

    const valid = await bcrypt.compare(currentPin, user.pinHash);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Current PIN is incorrect",
      });
    }

    if (newPin !== confirmPin) {
      return res.status(400).json({
        success: false,
        message: "PINs do not match",
      });
    }

    if (!/^\d{4}$/.test(newPin)) {
      return res.status(400).json({
        success: false,
        message: "PIN must be exactly 4 digits",
      });
    }

    user.pinHash = await bcrypt.hash(newPin, 10);

    await user.save();

    await createNotification({
      userId: user._id,
      title: "Transaction PIN Changed",
      message: "Your transaction PIN has been changed successfully.",
      category: "security",
      email: user.email,
      metadata: {
        type: "pin_changed",
      },
    });

    // =====================================
    // SEND EMAIL
    // =====================================

    await sendEmail({
      to: user.email,
      subject: "Transaction PIN Changed Successfully",
      html: `
  <div style="max-width:600px;margin:auto;font-family:Arial,sans-serif;background:#fff;border:1px solid #eee;padding:30px">

    <div style="text-align:center;margin-bottom:20px;">
      <img
        src="https://res.cloudinary.com/dvthnscx7/image/upload/v1768231460/images_p4tgmy.png"
        width="150"
        alt="Credit Union Bank"
      />
    </div>

    <h2 style="color:#004B6E;">
      Hello ${user.firstName} ${user.lastName},
    </h2>

    <p>
      Your <strong>Transaction PIN</strong> has been changed successfully.
    </p>

    <table style="width:100%;border-collapse:collapse;border:1px solid #ddd;margin:20px 0;">
      <tr style="background:#f5f5f5;">
        <td style="padding:10px;"><strong>Account Number</strong></td>
        <td style="padding:10px;">${user.accountNumber}</td>
      </tr>

      <tr>
        <td style="padding:10px;"><strong>New Transaction PIN</strong></td>
        <td style="padding:10px;font-size:20px;font-weight:bold;color:#0a6cf1;">
          ${newPin}
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
      Please keep your Transaction PIN confidential and never share it with anyone.
    </p>

    <p style="color:#d32f2f;">
      If you did not authorize this change, please contact Credit Union Bank immediately.
    </p>

    <hr>

    <small>
      © ${new Date().getFullYear()} Credit Union Bank. All rights reserved.
    </small>

  </div>
  `,
    });

    res.status(200).json({
      success: true,
      message: "Transaction PIN updated",
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Failed to update PIN",
    });
  }
};

exports.sendTransactionPinOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const otp = generateOTP();

    user.otpHash = hashOTP(otp);
    user.otpExpiresAt = Date.now() + 5 * 60 * 1000;
    user.otpPurpose = "reset_transaction_pin";

    await user.save();

    await sendOTP({
      email: user.email,
      phone: user.phone,
      otp,
    });

    res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

exports.verifyTransactionPinOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.otpPurpose !== "reset_transaction_pin") {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP request",
      });
    }

    if (Date.now() > user.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    const valid = verifyOTP(otp, user.otpHash);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    user.transactionPinResetVerified = true;

    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpPurpose = null;

    await user.save();

    res.json({
      success: true,
      message: "OTP verified",
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
};

exports.resetTransactionPin = async (req, res) => {
  try {
    const { newPin, confirmPin } = req.body;

    const user = await User.findById(req.user._id).select("+pinHash");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.transactionPinResetVerified) {
      return res.status(401).json({
        success: false,
        message: "OTP verification required",
      });
    }

    if (newPin !== confirmPin) {
      return res.status(400).json({
        success: false,
        message: "PINs do not match",
      });
    }

    if (!/^\\d{4}$/.test(newPin)) {
      return res.status(400).json({
        success: false,
        message: "PIN must be exactly 4 digits",
      });
    }

    user.pinHash = await bcrypt.hash(newPin, 10);

    user.transactionPinResetVerified = false;

    await user.save();
    await createNotification({
      userId: user._id,
      title: "Transaction PIN Reset",
      message: "Your transaction PIN has been reset successfully.",
      category: "security",
      email: user.email,
      metadata: {
        type: "pin_reset",
      },
    });

    await sendEmail({
      to: user.email,
      subject: "Transaction PIN has been reset successfully",
      html: `
  <div style="max-width:600px;margin:auto;font-family:Arial,sans-serif;background:#fff;border:1px solid #eee;padding:30px">

    <div style="text-align:center;margin-bottom:20px;">
      <img
        src="https://res.cloudinary.com/dvthnscx7/image/upload/v1768231460/images_p4tgmy.png"
        width="150"
        alt="Credit Union Bank"
      />
    </div>

    <h2 style="color:#004B6E;">
      Hello ${user.firstName} ${user.lastName},
    </h2>

    <p>
      Your <strong>Transaction PIN</strong> has been Reset successfully.
    </p>

    <table style="width:100%;border-collapse:collapse;border:1px solid #ddd;margin:20px 0;">
      <tr style="background:#f5f5f5;">
        <td style="padding:10px;"><strong>Account Number</strong></td>
        <td style="padding:10px;">${user.accountNumber}</td>
      </tr>

      <tr>
        <td style="padding:10px;"><strong>New Transaction PIN</strong></td>
        <td style="padding:10px;font-size:20px;font-weight:bold;color:#0a6cf1;">
          ${newPin}
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
      Please keep your Transaction PIN confidential and never share it with anyone.
    </p>

    <p style="color:#d32f2f;">
      If you did not authorize this reset, please contact Credit Union Bank immediately.
    </p>

    <hr>

    <small>
      © ${new Date().getFullYear()} Credit Union Bank. All rights reserved.
    </small>

  </div>
  `,
    });

    res.json({
      success: true,

      message: "Transaction PIN reset successfully",
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,

      message: "Failed to reset transaction PIN",
    });
  }
};

// =============== GET PREFERENCES ==========================

exports.getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      preferences: {
        pushNotifications: user.pushNotifications ?? true,

        emailNotifications: user.emailNotifications ?? true,

        smsNotifications: user.smsNotifications ?? true,
      },
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Failed to load preferences",
    });
  }
};

//-===================  UPDATE PREFERENCES  ==================

exports.updatePreferences = async (req, res) => {
  try {
    const { pushNotifications, emailNotifications, smsNotifications } =
      req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        pushNotifications,
        emailNotifications,
        smsNotifications,
      },
      {
        new: true,
      },
    );
    await createNotification({
      userId: user._id,
      title: "Notification Preferences Updated",
      message: "Your notification preferences have been updated.",
      category: "system",
    });

    res.json({
      success: true,
      message: "Preferences updated",
      preferences: {
        pushNotifications: user.pushNotifications,
        emailNotifications: user.emailNotifications,
        smsNotifications: user.smsNotifications,
      },
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Update failed",
    });
  }
};

//======== DELETE ACCOUNT =========================

exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user._id).select("+password");

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password",
      });
    }

    await Wallet.deleteOne({
      user: user._id,
    });

    await createNotification({
      userId: user._id,
      title: "Account Scheduled For Deletion",
      message: "Your account has been deleted successfully.",
      category: "security",
      email: user.email,
    });

    await User.findByIdAndDelete(user._id);

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Failed to delete account",
    });
  }
};
