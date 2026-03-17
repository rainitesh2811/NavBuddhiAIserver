const razorpay = require("../config/razorpay");
const verifySignature = require("../utils/verifySignatures");
const { createClient } = require("@supabase/supabase-js");

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
      return res.status(400).json({ error: "Missing fields: amount or courseTitle" });
    }
    
    try {
      const { data } = await supabase
        .from("user_courses")
        .select("id")
        .eq("user_id", userId)
        .eq("course_title", courseTitle)
        .maybeSingle();

      if (data) {
        return res.status(400).json({ error: "Course already purchased" });
      }
    } catch (dbError) {
      // Continue if check fails
    }

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `rcpt_${Date.now().toString().slice(-8)}`,
      notes: {
        userId,
        courseTitle,
        type,
      },
    });

    // Store preliminary order record
    try {
      await supabase.from("orders").insert([{
        user_id: userId,
        course_title: courseTitle,
        amount,
        razorpay_order_id: order.id,
        status: "pending",
        created_at: new Date().toISOString(),
      }]);
    } catch (dbError) {
      // Don't fail the request
    }

    res.json(order);

  } catch (error) {
    res.status(500).json({ 
      error: "Failed to create order",
      details: error.message || "Unknown error",
    });
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
    
    // Store order in orders table
    const { error: orderError } = await supabase
      .from("orders")
      .insert([{
        user_id: userId,
        course_title: courseTitle,
        category,
        amount,
        razorpay_order_id,
        razorpay_payment_id,
        status: "paid",
        created_at: new Date().toISOString(),
      }]);

    if (orderError) {
      throw new Error(`Failed to insert order: ${orderError.message}`);
    }

    // Store in user_courses table
    const { error: courseError } = await supabase
      .from("user_courses")
      .insert([{
        user_id: userId,
        course_title: courseTitle,
        category,
        purchased_at: new Date().toISOString(),
        unlocked: true,
      }]);

    if (courseError) {
      throw new Error(`Failed to insert user_courses: ${courseError.message}`);
    }

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ error: error.message || "Payment verification failed" });
  }
};
exports.getPurchasedCourses = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const { data: courses, error } = await supabase
      .from("user_courses")
      .select("course_title, category, purchased_at, unlocked")
      .eq("user_id", userId);

    if (error) {
      return res.status(500).json({ error: "Failed to fetch purchased courses" });
    }

    res.json({ purchasedCourses: courses || [] });

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch purchased courses" });
  }
};