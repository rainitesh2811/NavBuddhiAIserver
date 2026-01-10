const razorpay = require("../config/razorpay");
const verifySignature = require("../utils/verifySignatures"); // ✅ fixed name
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.createOrder = async (req, res) => {
  try {
    const { amount, userId, courseTitle } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!amount || !courseTitle) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const { data: existing } = await supabase
      .from("user_courses")
      .select("id")
      .eq("user_id", userId)
      .eq("course_title", courseTitle)
      .single();

    if (existing) {
      return res.status(400).json({ error: "Course already purchased" });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100, 
      currency: "INR",
      receipt: `rcpt_${Date.now()}`
    });

    res.json(order);

  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
};
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      courseTitle,
      category,
      amount,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !userId ||
      !courseTitle
    ) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const isValid = verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({ error: "Invalid signature" });
    }
    await supabase.from("orders").insert({
      user_id: userId,
      course_title: courseTitle,
      category,
      amount,
      razorpay_order_id,
      razorpay_payment_id,
      status: "paid",
    });
    await supabase.from("user_courses").insert({
      user_id: userId,
      course_title: courseTitle,
    });

    res.json({ success: true });

  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ error: "Payment verification failed" });
  }
};
