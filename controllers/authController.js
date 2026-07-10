// controllers/authController.js
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const Wallet = require("../models/Wallet");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const TokenBlacklist = require("../models/TokenBlacklist");
const generateAccountNumber = require("../utils/generateAccountNumber");
const generatePin = require("../utils/generatePin");
const { generateOTP, hashOTP, verifyOTP } = require("../utils/otp");
const { sendEmail, sendSMS, sendOTP } = require("../utils/notify");
const { uploadToCloudinary } = require("../utils/cloudinary");
const { createNotification } = require("./notificationController");

/* =====================================================
   HELPER FUNCTIONS
===================================================== */
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "30d" });

const sanitizeUser = (user) => {
  const obj = user.toObject();
  delete obj.password;
  delete obj.pinHash; // hide transaction PIN hash
  delete obj.otpHash;
  delete obj.otpExpiresAt;
  return obj;
};

/* =====================================================
   REGISTER USER
===================================================== */
exports.registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      username,
      email,
      phone,
      socialSecurityNumber,
      password,
      confirmPassword,
      accountType,
      address,
      state,
      city,
      zipcode,
      choosedAccount,
    } = req.body;

    // =====================================
    // REQUIRED FIELDS VALIDATION
    // =====================================
    if (
      !firstName ||
      !lastName ||
      !username ||
      !email ||
      !phone ||
      !socialSecurityNumber ||
      !password ||
      !confirmPassword ||
      !address ||
      !state ||
      !city ||
      !zipcode ||
      !accountType ||
      !choosedAccount
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // =====================================
    // PROFILE IMAGE UPLOAD
    // =====================================

    let profileImageUrl = "";

    if (req.file) {
      const uploadedImage = await uploadToCloudinary(
        req.file,
        "profile_images",
      );

      profileImageUrl = uploadedImage.secure_url;
    }

    // =====================================
    // PASSWORD VALIDATION
    // =====================================

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    // =====================================
    // DUPLICATE CHECKS
    // =====================================

    const emailExists = await User.findOne({
      email: email.toLowerCase(),
    });

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const usernameExists = await User.findOne({
      username: username.toLowerCase(),
    });

    if (usernameExists) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
      });
    }

    const ssnExists = await User.findOne({
      socialSecurityNumber,
    });

    if (ssnExists) {
      return res.status(400).json({
        success: false,
        message: "SSN already exists",
      });
    }

    // =====================================
    // HASH PASSWORD
    // =====================================

    const hashedPassword = await bcrypt.hash(password, 10);

    // =====================================
    // GENERATE TRANSACTION PIN
    // =====================================

    const transactionPin = generatePin();

    const pinHash = await bcrypt.hash(transactionPin, 10);

    // =====================================
    // GENERATE ACCOUNT NUMBER
    // =====================================

    const accountNumber = await generateAccountNumber();

    // =====================================
    // CREATE USER
    // =====================================

    const user = await User.create({
      firstName,
      lastName,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      phone,
      socialSecurityNumber,
      password: hashedPassword,
      accountType,
      accountNumber,
      pinHash,
      address,
      state,
      city,
      zipcode,
      choosedAccount,
      profileImage: profileImageUrl,
    });

    await createNotification({
      userId: user._id,
      title: "Welcome to Credit Union",
      message:
        "Your account has been created successfully. Welcome to Credit Union.",
      category: "system",
      email: user.email,
      metadata: {
        accountNumber: user.accountNumber,
      },
    });
    // =====================================
    // GENERATE JWT
    // =====================================

    const token = generateToken(user._id);

    // =====================================
    // SEND WELCOME EMAIL
    // =====================================

    await sendEmail({
      to: user.email,
      subject: "Welcome to Credit Union Bank",
      html: `
        <div style="max-width:600px;margin:auto;font-family:Arial">

          <div style="text-align:center">
            <img
              src="https://res.cloudinary.com/dvthnscx7/image/upload/v1768231460/images_p4tgmy.png"
              width="160"
            />
          </div>

          <h2>Welcome ${firstName} 🎉</h2>

          <p>Your account has been successfully created.</p>

          <p>
            <strong>Account Number:</strong>
            ${accountNumber}
          </p>

          <p>
            <strong>Temporary Transaction PIN:</strong>
            ${transactionPin}
          </p>

          <p>
            Please keep this PIN secure.
          </p>

          <hr />

          <small>
            © ${new Date().getFullYear()}
            Credit Union Bank
          </small>

        </div>
      `,
    });

    // =====================================
    // SEND SMS
    // =====================================

    if (phone) {
      await sendSMS({
        to: phone,
        message: `
Welcome ${firstName}

Account Number: ${accountNumber}

Transaction PIN: ${transactionPin}

Please change your PIN after login.
        `,
      });
    }

    // =====================================
    // RESPONSE
    // =====================================

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Register Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Registration failed",
    });
  }
};
// ===============================
// LOGIN USER
// ===============================
exports.loginUser = async (req, res) => {
  try {
    const { identifier, password, rememberMe } = req.body;

    // =====================
    // VALIDATION
    // =====================
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Username/Email and password are required",
      });
    }

    // =====================
    // FIND USER BY EMAIL OR USERNAME
    // =====================
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() },
      ],
    }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid login credentials",
      });
    }

    // =====================
    // PASSWORD CHECK
    // =====================
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials",
      });
    }

    // =====================
    // ACCESS TOKEN
    // =====================
    const accessToken = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    // =====================
    // REFRESH TOKEN
    // =====================
    const refreshToken = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: rememberMe ? "30d" : "7d",
      },
    );

    // =====================
    // SAVE REFRESH TOKEN
    // =====================
    user.refreshToken = refreshToken;
    await user.save();

    await createNotification({
      userId: user._id,
      title: "New Login Detected",
      message: `A login was detected from ${req.headers["user-agent"]}.`,
      category: "system",
      email: user.email,
      metadata: {
        ipAddress: req.ip,
        browser: req.headers["user-agent"],
        loginTime: new Date(),
      },
    });

    // =====================
    // COOKIE
    // =====================
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
    });

    // =====================
    // RESPONSE
    // =====================
    return res.status(200).json({
      success: true,
      message: "Login successful",

      accessToken,

      user: {
        id: user._id,

        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        accountNumber: user.accountNumber,
        choosedAccount: user.choosedAccount,
        accountType: user.accountType,
        profileImage: user.profileImage,
        country: user.country,
        state: user.State,
        city: user.City,
        zipcode: user.Zipcode,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};
// ===============================
// GET AUTHENTICATED USER PROFILE
// ===============================
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -pinHash -__v",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ===================== FETCH OR CREATE WALLET =====================
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      wallet = await Wallet.create({ user: req.user._id }); // default balance applied
    }

    // ===================== RESPONSE =====================
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName:
          user.fullName || `${user.firstName || ""} ${user.lastName || ""}`,
        accountType: user.accountType,
        accountNumber: user.accountNumber,
        balance: wallet.balance,
        currency: wallet.currency,
        kycStatus: user.kycStatus,
        status: user.status,
        notifications: user.notifications,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        username: user.username,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    console.error("GetMe error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
    });
  }
};

/* =====================================================
   SEND OTP (LOGIN / PASSWORD RESET)
===================================================== */
exports.sendOtpController = async (req, res) => {
  try {
    const { email, purpose = "login" } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOTP();

    user.otpHash = hashOTP(otp);
    user.otpExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    user.otpPurpose = purpose;

    await user.save();
    await createNotification({
      userId: user._id,
      title: "Verification Code Sent",
      message: `A verification code has been sent to your registered email for ${purpose}.`,
      category: "system",
      email: user.email,
      metadata: {
        purpose,
      },
    });

    await sendOTP({ email: user.email, phone: user.phone, otp });

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("Send OTP Error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

/* =====================================================
   VERIFY OTP
===================================================== */
exports.verifyOtpController = async (req, res) => {
  try {
    const { email, otp, purpose = "login" } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.otpHash || !user.otpExpiresAt || user.otpPurpose !== purpose)
      return res.status(400).json({ message: "Invalid OTP request" });

    if (Date.now() > user.otpExpiresAt)
      return res.status(400).json({ message: "OTP expired" });

    const valid = verifyOTP(otp, user.otpHash);
    if (!valid) return res.status(400).json({ message: "Invalid OTP" });

    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpPurpose = null;

    await user.save();
    await createNotification({
      userId: user._id,
      title: "Verification Successful",
      message: `Your verification code has been confirmed successfully.`,
      category: "security",
      email: user.email,
    });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "OTP verified",
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ message: "OTP verification failed" });
  }
};

exports.logout = async (req, res) => {
  try {
    /* =========================
       ACCESS TOKEN
    ========================= */
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "No access token provided",
      });
    }

    /* =========================
       BLACKLIST ACCESS TOKEN
    ========================= */
    const decoded = jwt.decode(token);

    await TokenBlacklist.create({
      token,
      expiresAt: new Date(decoded.exp * 1000), // auto-clean when JWT expires
    });

    /* =========================
       REFRESH TOKEN REVOCATION
    ========================= */
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await User.findByIdAndUpdate(decoded.id, {
        refreshToken: null,
      });
    }

    /* =========================
       CLEAR COOKIE
    ========================= */
    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    const user = await User.findById(decoded.id);

    if (user) {
      await createNotification({
        userId: user._id,
        title: "Logged Out",
        message: "You logged out of your account.",
        category: "system",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to logout",
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "No refresh token provided",
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Issue new access token
    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "20m" },
    );

    res.json({
      success: true,
      token: newAccessToken,
    });
  } catch (err) {
    console.error("Refresh token error:", err);
    return res.status(403).json({
      success: false,
      message: "Refresh token expired or invalid",
    });
  }
};

/* =====================================================
   FORGOT PASSWORD
===================================================== */

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

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
    user.otpExpiresAt = Date.now() + 10 * 60 * 1000;
    user.otpPurpose = "password_reset";

    await user.save();

    await createNotification({
      userId: user._id,
      title: "Password Reset Requested",
      message: "A password reset verification code was requested.",
      category: "security",
      email: user.email,
    });

    await sendOTP({
      email: user.email,
      phone: user.phone,
      otp,
    });

    return res.json({
      success: true,
      message: "Verification code sent successfully",
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      success: false,
      message: "Failed to send verification code",
    });
  }
};

/* =====================================================
   VERIFY PASSWORD RESET OTP
===================================================== */

exports.verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+otpHash");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.otpPurpose !== "password_reset") {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP request",
      });
    }

    if (!user.otpExpiresAt || Date.now() > user.otpExpiresAt) {
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

    // Create temporary reset token

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpPurpose = null;

    await user.save();

    return res.json({
      success: true,
      message: "OTP verified",
      resetToken,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: {
        $gt: Date.now(),
      },
    }).select("+password");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    user.password = await bcrypt.hash(password, 10);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    await createNotification({
      userId: user._id,
      title: "Password Reset Successful",
      message: "Your password has been reset successfully.",
      category: "system",
      email: user.email,
    });

    return res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: "Password reset failed",
    });
  }
};
