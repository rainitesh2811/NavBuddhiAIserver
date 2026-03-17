const crypto = require("crypto");

module.exports = function verifySignature(orderId, paymentId, signature) {
  // Allow test mode bypass
  if (process.env.NODE_ENV === "development" || process.env.RAZORPAY_TEST_MODE === "true") {
    return true;
  }

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
};

