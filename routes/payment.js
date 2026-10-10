// ============================================================
// ROUTES DE PAIEMENT : /api/payment/...
// ============================================================
// Utilise Stripe Checkout (redirection) : aucun script Stripe.js
// n'est nécessaire côté client, tout se passe côté serveur.
// ============================================================

const express = require("express");
const Stripe = require("stripe");
const db = require("../db/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Crée une session de paiement Stripe pour une réservation existante
router.post("/create-checkout-session/:reservationId", requireAuth, async (req, res) => {
  const reservation = db
    .prepare("SELECT * FROM reservations WHERE id = ? AND user_id = ?")
    .get(req.params.reservationId, req.user.id);

  if (!reservation) {
    return res.status(404).json({ error: "Réservation introuvable." });
  }
  if (reservation.payment_status === "paye") {
    return res.status(400).json({ error: "Cette réservation est déjà payée." });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "xof", // Franc CFA
            product_data: {
              name: `Commande n°${reservation.id} - Le Délice`,
            },
            unit_amount: reservation.amount_due, // XOF n'a pas de centimes chez Stripe
          },
          quantity: 1,
        },
      ],
      success_url: `${BASE_URL}/reservation-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/reservation-cancel.html`,
      metadata: { reservation_id: String(reservation.id) },
    });

    db.prepare("UPDATE reservations SET stripe_session_id = ? WHERE id = ?").run(
      session.id,
      reservation.id
    );

    res.json({ url: session.url });
  } catch (err) {
    console.error("Erreur Stripe :", err.message);
    res.status(500).json({ error: "Impossible de créer la session de paiement. Vérifiez vos clés Stripe dans .env" });
  }
});

// Vérifie le paiement après retour de Stripe (page reservation-success.html)
router.get("/verify/:sessionId", requireAuth, async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);

    if (session.payment_status === "paid") {
      db.prepare(
        "UPDATE reservations SET payment_status = 'paye', reservation_status = 'confirmee' WHERE stripe_session_id = ?"
      ).run(session.id);
      return res.json({ paid: true });
    }
    res.json({ paid: false });
  } catch (err) {
    res.status(500).json({ error: "Impossible de vérifier le paiement." });
  }
});

module.exports = router;
