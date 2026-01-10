const express = require("express");
const crypto = require("crypto");
const router = express.Router();

router.post("/razorpay", (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const signature = req.headers["x-razorpay-signature"];

  const body = JSON.stringify(req.body);

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  if (signature === expected) {
    console.log("Webhook verified");
  }

  res.status(200).send("OK");
});

module.exports = router;
