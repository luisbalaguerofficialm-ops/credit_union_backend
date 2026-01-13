const provider = process.env.SMS_PROVIDER || "mock";

exports.sendSms = async ({ to, message }) => {
  if (provider === "twilio") {
    const Twilio = require("twilio");
    const client = new Twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    return client.messages.create({
      body: message,
      from: process.env.TWILIO_FROM,
      to,
    });
  }
  console.log("[SMS MOCK]", to, message);
  return { sid: "mock" };
};
