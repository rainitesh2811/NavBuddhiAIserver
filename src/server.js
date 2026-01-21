require("dotenv").config();
const express = require("express");
const cors = require("cors");

const paymentRoutes = require("./routes/payments.routes");
const webhookRoutes = require("./routes/webhook.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/payment", paymentRoutes);
app.use("/api/webhook", webhookRoutes);

app.get("/", (req, res) => {
  res.send("Digitalskill Sathi Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
