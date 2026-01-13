// app.js
const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);

/* ==============================
   SOCKET.IO SETUP
============================== */
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Make io available in controllers
app.set("io", io);

/* ==============================
   SOCKET EVENTS
============================== */
const ChatMessage = require("./models/ChatMessage");

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
        { read: true }
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
   GLOBAL MIDDLEWARE
============================== */
app.use(cors());
app.use(express.json());

/* ==============================
   AUTH MIDDLEWARE
============================== */
const updateSession = require("./middlewares/updateSession");
const { protect } = require("./middlewares/authMiddleware");

/* ==============================
   ROUTES
============================== */
const authRoutes = require("./routes/authRoutes");
const kycRoutes = require("./routes/kycRoutes");
const userRoutes = require("./routes/userRoutes");
const beneficiariesRoutes = require("./routes/beneficiariesRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const walletRoutes = require("./routes/walletRoutes");
const chatRoutes = require("./routes/chatRoutes");
const notifyRoutes = require("./routes/notifyRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const FundsRoutes = require("./routes/FundsRoutes");

/* ==============================
   PUBLIC ROUTE
============================== */
app.get("/", (req, res) => {
  res.status(200).send("✅ API is running...");
});

/* ==============================
   AUTH ROUTES (PUBLIC)
============================== */
app.use("/api/auth", authRoutes);

/* ==============================
   PROTECTED ROUTES
============================== */
app.use("/api", updateSession, protect);

app.use("/api/kyc", kycRoutes);
app.use("/api/users", userRoutes);
app.use("/api/beneficiaries", beneficiariesRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/notify", notifyRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", FundsRoutes);

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
    console.log("✅ Database connected");

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
