const FAQ = require("../models/Faq");

// ===============================
// GET ALL FAQS
// ===============================
exports.getFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ section: 1 });

    res.json({ success: true, faqs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
