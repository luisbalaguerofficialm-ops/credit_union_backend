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
   GLOBAL MIDDLEWARE
============================== */
app.use(cors());
app.use(express.json());

/* ==============================
   AUTH MIDDLEWARE

const { protect } = require("./middlewares/authMiddleware");

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

app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/notify", notifyRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", FundsRoutes);
app.use("/api/pin", pinRoutes);
app.use("/uploads", express.static("uploads"));

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

    const server = app.listen(port, () => {
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
