const Razorpay = require("razorpay");
require("dotenv").config();

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error("❌ Razorpay credentials not found in environment variables");
  console.error("RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID ? "Set" : "NOT SET");
  console.error("RAZORPAY_KEY_SECRET:", process.env.RAZORPAY_KEY_SECRET ? "Set" : "NOT SET");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

console.log("✅ Razorpay initialized with key:", process.env.RAZORPAY_KEY_ID ? "✓" : "✗");

module.exports = razorpay;
