// routes/userRoutes.js
const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/authMiddleware");
const { getDashboardData } = require("../controllers/dashboardController");

// ===============================
// USER DASHBOARD
// ===============================
router.get("/", protect, getDashboardData);

module.exports = router;
