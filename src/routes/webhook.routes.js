const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post("/razorpay", async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    const body = JSON.stringify(req.body);

    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (signature === expected) {
      const event = req.body.event;
      const payment = req.body.payload?.payment?.entity;

      if (event === "payment.authorized" || event === "payment.captured") {
        if (payment) {
          const { id: razorpay_payment_id, amount, notes, order_id } = payment;
          const userId = notes?.userId;
          const courseTitle = notes?.courseTitle;
          const category = notes?.category || "";

          if (userId && courseTitle) {
            const { data: existingOrder } = await supabase
              .from("orders")
              .select("id")
              .eq("razorpay_payment_id", razorpay_payment_id)
              .maybeSingle();

            if (!existingOrder) {
              await supabase
                .from("orders")
                .insert([{
                  user_id: userId,
                  course_title: courseTitle,
                  category,
                  amount: Math.floor(amount / 100),
                  razorpay_order_id: order_id,
                  razorpay_payment_id,
                  status: event === "payment.captured" ? "paid" : "authorized",
                  created_at: new Date().toISOString(),
                }]);

              await supabase
                .from("user_courses")
                .insert([{
                  user_id: userId,
                  course_title: courseTitle,
                  category,
                  purchased_at: new Date().toISOString(),
                  unlocked: true,
                }]);
            }
          }
        }
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    res.status(200).send("OK");
  }
});

module.exports = router;
