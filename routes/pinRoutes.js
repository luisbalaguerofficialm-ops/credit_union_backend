const express = require("express");
const router = express.Router();
const pinController = require("../controllers/pinController");
const { protect } = require("../middlewares/authMiddleware");

// PIN Routes
router.post("/set", protect, pinController.setPin);
router.post("/verify", protect, pinController.verifyPin);
router.put("/change", protect, pinController.changePin);

module.exports = router;
