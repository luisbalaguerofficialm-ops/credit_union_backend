// controllers/authController.js
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const Wallet = require("../models/Wallet");
const bcrypt = require("bcryptjs");
const TokenBlacklist = require("../models/TokenBlacklist");
const generateAccountNumber = require("../utils/generateAccountNumber");
const generatePin = require("../utils/generatePin");
const { generateOTP, hashOTP, verifyOTP } = require("../utils/otp");
const { sendEmail, sendSMS, sendOTP } = require("../utils/notify");

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
      email,
      username,
      phone,
      accountType,
      password,
      confirmPassword,
    } = req.body;

    // -----------------------------
    // Basic validation
    // -----------------------------
    if (
      !firstName ||
      !lastName ||
      !email ||
      !username ||
      !phone ||
      !accountType ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    // -----------------------------
    // Check duplicates
    // -----------------------------
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(400).json({ message: "Email already registered" });
    }

    if (await User.findOne({ username })) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // -----------------------------
    // Hash password
    // -----------------------------
    const hashedPassword = await bcrypt.hash(password, 10);

    // -----------------------------
    // Generate transaction PIN
    // -----------------------------
    const transactionPin = generatePin();
    const pinHash = await bcrypt.hash(transactionPin, 10);

    // -----------------------------
    // Generate account number
    // -----------------------------
    const accountNumber = await generateAccountNumber();

    // -----------------------------
    // Create user (MINIMAL DATA)
    // -----------------------------
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      username,
      phone,
      password: hashedPassword,
      accountType,
      accountNumber,
      pinHash,
      balance: 0,
      forcePinChange: true,
    });

    const token = generateToken(user._id);

    // -----------------------------
    // Send Welcome Email
    // -----------------------------
    await sendEmail({
      to: user.email,
      subject: "Welcome to Credit Union Bank",
      html: `
        <div style="max-width:600px;margin:auto;font-family:Arial;">
          <div style="text-align:center;">
            <img
              src="https://res.cloudinary.com/dvthnscx7/image/upload/v1768231460/images_p4tgmy.png"
              width="160"
            />
          </div>

          <h2>Welcome, ${firstName} 🎉</h2>

          <p>Your account has been successfully created.</p>

          <p><b>Account Number:</b> ${accountNumber}</p>
          <p><b>Temporary Transaction PIN:</b> ${transactionPin}</p>

          <p>Please note:this is your transaction PIN keep it secure..</p>

          <hr />
          <small>© ${new Date().getFullYear()} Credit Union Bank</small>
        </div>
      `,
    });

    // -----------------------------
    // Send SMS (optional)
    // -----------------------------
    if (phone) {
      await sendSMS({
        to: phone,
        message: `Welcome ${firstName}!
Account Number: ${accountNumber}
Transaction PIN: ${transactionPin}
Login to change your PIN.`,
      });
    }

    // -----------------------------
    // Response
    // -----------------------------
    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Registration failed" });
  }
};

// ===============================
// LOGIN USER
// ===============================
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ===================== VALIDATION =====================
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // ===================== FIND USER =====================
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ===================== CHECK PASSWORD =====================
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password",
      });
    }

    // ===================== TOKENS =====================
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "5d" },
    );

    user.refreshToken = refreshToken;
    await user.save();

    // ===================== COOKIE =====================
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
    });

    // ===================== FETCH OR CREATE WALLET =====================
    let wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) {
      wallet = await Wallet.create({ user: user._id }); // default balance applied
    }

    // ===================== RESPONSE =====================
    res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        username: user.username,
        accountType: user.accountType,
        kycStatus: user.kycStatus,
        forcePinChange: user.forcePinChange,
        createdAt: user.createdAt,
        profileImage: user.profileImage,
        walletBalance: wallet.balance,
        currency: wallet.currency,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({
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

/* =====================================================
   PASSWORD RESET
===================================================== */
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (
      !user.otpHash ||
      !user.otpExpiresAt ||
      user.otpPurpose !== "password_reset"
    )
      return res.status(400).json({ message: "Invalid reset request" });

    if (Date.now() > user.otpExpiresAt)
      return res.status(400).json({ message: "OTP expired" });

    const valid = verifyOTP(otp, user.otpHash);
    if (!valid) return res.status(400).json({ message: "Invalid OTP" });

    user.password = await bcrypt.hash(newPassword, 10);

    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpPurpose = null;

    await user.save();

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Password reset failed" });
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
