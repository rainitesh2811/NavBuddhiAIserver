const express = require("express");
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getPurchasedCourses
} = require("../controllers/payment.controller");

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.get("/purchased-courses/:userId", getPurchasedCourses);

module.exports = router;
