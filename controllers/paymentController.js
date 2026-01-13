const axios = require("axios");
const User = require("../models/User");

exports.paystackInit = async (req, res) => {
  try {
    const { amount } = req.body; // naira
    const user = await User.findById(req.user.id);
    const body = {
      email: user.email,
      amount: Math.round(Number(amount) * 100),
      callback_url: process.env.PAYSTACK_CALLBACK_URL,
      metadata: { userId: req.user.id },
    };
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      body,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET}` },
      }
    );
    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ success: false, message: "Payment init failed" });
  }
};

exports.paystackVerify = async (req, res) => {
  try {
    const { reference } = req.params;
    const verify = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET}` },
      }
    );
    const data = verify.data;
    if (data.status && data.data.status === "success") {
      const userId = data.data.metadata?.userId;
      if (userId) {
        const user = await User.findById(userId);
        const amount = data.data.amount / 100;
        user.balance = (user.balance || 0) + amount;
        await user.save();
      }
      return res.json({ success: true, data: data.data });
    }
    return res
      .status(400)
      .json({ success: false, message: "Payment not successful" });
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

exports.initPayment = async (req, res) => {
  const amount = req.body.amount;

  const paymentURL = "https://checkout.flutterwave.com/v3/test-payment"; // replace

  res.json({ url: paymentURL });
};

exports.verifyPayment = async (req, res) => {
  res.json({ success: true, message: "Wallet funded" });
};
