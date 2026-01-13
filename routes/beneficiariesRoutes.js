const express = require("express");
const router = express.Router();
const {
  getBeneficiaries,
  addBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
} = require("../controllers/beneficiaryController");

// Routes
router.get("/:userId", getBeneficiaries);
router.post("/", addBeneficiary);
router.put("/:id", updateBeneficiary);
router.delete("/:id", deleteBeneficiary);

module.exports = router;
