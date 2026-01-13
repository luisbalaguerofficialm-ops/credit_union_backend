// utils/generatePin.js

/**
 * Generate a numeric transaction PIN
 * @param {number} length - Number of digits (default: 4)
 * @returns {string} PIN as a string
 */
function generatePin(length = 4) {
  if (length <= 0) throw new Error("PIN length must be greater than 0");

  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;

  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

module.exports = generatePin;
