const User = require("../models/User");

async function generateAccountNumber() {
  let accountNumber;
  let exists = true;

  while (exists) {
    accountNumber = Math.floor(
      1000000000 + Math.random() * 9000000000
    ).toString();
    exists = await User.exists({ accountNumber });
  }

  return accountNumber;
}

// Export the function properly
module.exports = generateAccountNumber;
