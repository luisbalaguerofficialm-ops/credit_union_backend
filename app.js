// app.js
const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
  : [
      "http://localhost:5173",
      "https://www.credixa.co",
      "https://credixa.co",
      "https://admin.credixa.co",
    ];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
/* ==============================
   SOCKET.IO SETUP
============================== */
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io available in controllers
app.set("io", io);
app.use(cookieParser());

/* ==============================
   SOCKET EVENTS
============================== */

io.on("connection", (socket) => {
  console.log("🔌 Socket.IO client connected:", socket.id);

  socket.on("chat:subscribe", (chatId) => {
    socket.join(`chat_${chatId}`);
  });

  socket.on("chat:send", async ({ chatId, userId, content }) => {
    if (!chatId || !userId || !content) return;

    try {
      const message = await ChatMessage.create({
        user: userId,
        sender: "user",
        content,
        read: false,
      });

      io.to(`chat_${chatId}`).emit("chat:receive", { chatId, message });
      io.to("admin-room").emit("chat:update", { chatId, lastMessage: message });
    } catch (err) {
      console.error("Chat send error:", err.message);
    }
  });

  socket.on("chat:mark-read", async ({ chatId }) => {
    try {
      await ChatMessage.updateMany(
        { chatSession: chatId, read: false },
        { read: true },
      );
      io.to("admin-room").emit("chat:update", { chatId, messagesRead: true });
    } catch (err) {
      console.error("Mark read error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket.IO client disconnected:", socket.id);
  });
});

/* ==============================
   ROUTES
============================== */
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const walletRoutes = require("./routes/walletRoutes");
const notifyRoutes = require("./routes/notifyRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const FundsRoutes = require("./routes/FundsRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const pinRoutes = require("./routes/pinRoutes");
const checkRoutes = require("./routes/checkRoutes");
const supportRoutes = require("./routes/supportRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const systemSettingsRoutes = require("./routes/systemSettingsRoutes");
const feeRoutes = require("./routes/feeRoutes");
/* ==============================
   PUBLIC ROUTE
============================== */
app.get("/", (req, res) => {
  res.status(200).send("✅ API is running...");
});

//  PROTECTED ROUTES

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/notify", notifyRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", FundsRoutes);
app.use("/api/pin", pinRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/check-deposits", checkRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin", adminUserRoutes);
app.use("/api/admin/system-settings", systemSettingsRoutes);
app.use("/api/admin/fee", feeRoutes);
/* ==============================
   404 HANDLER
============================== */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/* ==============================
   SERVER START
============================== */
const port = process.env.PORT || 5000;

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Database connected");

    server.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log("📡 Socket.IO active");
    });
  } catch (err) {
    console.error("Database error:", err.message);
    process.exit(1);
  }
};

start();

module.exports = app;
