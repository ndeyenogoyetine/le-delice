// ============================================================
// SERVEUR PRINCIPAL - Le Délice
// ============================================================

require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRoutes = require("./routes/auth");
const reservationRoutes = require("./routes/reservations");
const paymentRoutes = require("./routes/payment");
const productRoutes = require("./routes/products");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- Middlewares ----------------
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// ---------------- Routes API ----------------
app.use("/api/auth", authRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);

// Expose la clé publique Stripe au front sans exposer la clé secrète
app.get("/api/config", (req, res) => {
  res.json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  });
});

// ---------------- Démarrage ----------------
app.listen(PORT, () => {
  console.log(`✅ Le Délice est en ligne : http://localhost:${PORT}`);
});
