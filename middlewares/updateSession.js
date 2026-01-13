const Session = require("../models/Session");

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      await Session.findOneAndUpdate({ token }, { lastActive: Date.now() });
    }
  } catch (e) {
    console.log("session update error:", e.message);
  }

  next();
};
