const razorpay = require("../config/razorpay");
const verifySignature = require("../utils/verifySignatures");
const { createClient } = require("@supabase/supabase-js");
const comboCourses = require("../constants/comboCourses");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


exports.createOrder = async (req, res) => {
  try {
    const { amount, userId, courseTitle, type = "course" } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!amount || !courseTitle) {
      return res.status(400).json({ error: "Missing fields" });
    }
    if (type === "course") {
      const { data } = await supabase
        .from("user_courses")
        .select("id")
        .eq("user_id", userId)
        .eq("course_title", courseTitle)
        .maybeSingle();

      if (data) {
        return res.status(400).json({ error: "Course already purchased" });
      }
    }

    if (type === "combo") {
      const courses = comboCourses[courseTitle] || [];

      const { data } = await supabase
        .from("user_courses")
        .select("course_title")
        .eq("user_id", userId)
        .in("course_title", courses);

      if (data?.length) {
        return res.status(400).json({ error: "Combo already purchased" });
      }
    }

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `rcpt_${userId}_${Date.now()}`,
      notes: {
        userId,
        courseTitle,
        type,
      },
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
      type = "course",
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
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .maybeSingle();

    if (existingOrder) {
      return res.status(400).json({ error: "Payment already verified" });
    }
    await supabase.from("orders").insert({
      user_id: userId,
      course_title: courseTitle,
      category,
      amount,
      razorpay_order_id,
      razorpay_payment_id,
      status: "paid",
      type,
    });
    if (type === "combo") {
      const courses = comboCourses[courseTitle] || [];

      const unlockRows = courses.map((course) => ({
        user_id: userId,
        course_title: course,
        unlocked: true,
      }));

      await supabase.from("user_courses").insert(unlockRows);
    } else {
      await supabase.from("user_courses").insert({
        user_id: userId,
        course_title: courseTitle,
        unlocked: true,
      });
    }

    res.json({ success: true });

  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ error: "Payment verification failed" });
  }
};
