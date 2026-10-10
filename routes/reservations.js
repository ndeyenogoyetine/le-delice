// ============================================================
// COMMANDES / RÉSERVATIONS : /api/reservations
// Le prix est TOUJOURS recalculé côté serveur à partir de la base.
// ============================================================

const express = require("express");
const db = require("../db/database");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
const METHODES_VALIDES = ["card", "orange_money", "wave", "sur_place"];

// Ajoute les lignes (order_items) à une liste de réservations
function withItems(reservations) {
  if (reservations.length === 0) return reservations;
  const ids = reservations.map((r) => r.id);
  const items = db
    .prepare(`SELECT * FROM order_items WHERE reservation_id IN (${ids.map(() => "?").join(",")})`)
    .all(...ids);
  return reservations.map((r) => ({ ...r, items: items.filter((i) => i.reservation_id === r.id) }));
}

// ---------------- Créer une commande (compte requis) ----------------
router.post("/", requireAuth, (req, res) => {
  const { full_name, email, phone, date, time, guests, payment_method, items } = req.body;

  if (!full_name || !email || !phone || !date || !time || !guests || !payment_method) {
    return res.status(400).json({ error: "Merci de remplir tous les champs obligatoires." });
  }
  if (!METHODES_VALIDES.includes(payment_method)) {
    return res.status(400).json({ error: "Mode de paiement invalide." });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Ajoutez au moins un plat à votre commande." });
  }

  // Recalcul du total depuis la base (on ne fait jamais confiance au prix du navigateur)
  const lines = [];
  let total = 0;
  for (const it of items) {
    const qty = parseInt(it.quantity, 10);
    const product = db.prepare("SELECT * FROM products WHERE id = ? AND available = 1").get(it.product_id);
    if (!product) return res.status(400).json({ error: "Un des plats choisis n'est plus disponible." });
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) {
      return res.status(400).json({ error: "Quantité invalide." });
    }
    lines.push({ product, qty });
    total += product.price * qty;
  }

  let paymentStatus = "en_attente";
  let reservationStatus = "en_attente";
  if (payment_method === "sur_place") {
    paymentStatus = "a_payer_sur_place";
    reservationStatus = "confirmee";
  }

  const create = db.transaction(() => {
    const r = db
      .prepare(
        `INSERT INTO reservations (user_id, full_name, email, phone, date, time, guests, amount_due, payment_method, payment_status, reservation_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(req.user.id, full_name, email, phone, date, time, parseInt(guests, 10) || 1, total, payment_method, paymentStatus, reservationStatus);
    const insertItem = db.prepare(
      "INSERT INTO order_items (reservation_id, product_id, product_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)"
    );
    lines.forEach((l) => insertItem.run(r.lastInsertRowid, l.product.id, l.product.name, l.product.price, l.qty));
    return r.lastInsertRowid;
  });

  const id = create();
  const [reservation] = withItems([db.prepare("SELECT * FROM reservations WHERE id = ?").get(id)]);

  if (payment_method === "orange_money" || payment_method === "wave") {
    const numero = payment_method === "orange_money" ? process.env.ORANGE_MONEY_NUMBER : process.env.WAVE_NUMBER;
    const nomService = payment_method === "orange_money" ? "Orange Money" : "Wave";
    return res.status(201).json({
      reservation,
      instructions: {
        message: `Envoyez ${total} FCFA au numéro ${numero} via ${nomService}, puis entrez l'ID de transaction reçu par SMS pour confirmer votre commande.`,
        numero,
        montant: total,
      },
    });
  }

  res.status(201).json({ reservation });
});

// ---------------- Confirmer un paiement Orange Money / Wave ----------------
router.post("/:id/confirm-mobile-payment", requireAuth, (req, res) => {
  const { transaction_reference } = req.body;
  if (!transaction_reference || transaction_reference.trim().length < 4) {
    return res.status(400).json({ error: "Merci d'entrer un ID de transaction valide." });
  }
  const reservation = db.prepare("SELECT * FROM reservations WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!reservation) return res.status(404).json({ error: "Commande introuvable." });
  if (!["orange_money", "wave"].includes(reservation.payment_method)) {
    return res.status(400).json({ error: "Cette commande n'utilise pas Orange Money / Wave." });
  }
  db.prepare("UPDATE reservations SET transaction_reference = ? WHERE id = ?").run(transaction_reference.trim(), reservation.id);
  res.json({
    message: "Merci ! Votre référence a été enregistrée. Votre commande sera confirmée dès vérification du paiement par le restaurant.",
  });
});

// ---------------- Mes commandes (client connecté) ----------------
router.get("/mine", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM reservations WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json({ reservations: withItems(rows) });
});

// ---------------- Toutes les commandes (admin) ----------------
router.get("/", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM reservations ORDER BY created_at DESC, id DESC").all();
  res.json({ reservations: withItems(rows) });
});

// ---------------- Confirmer un paiement (admin) ----------------
router.post("/:id/admin-confirm", requireAdmin, (req, res) => {
  db.prepare("UPDATE reservations SET payment_status = 'paye', reservation_status = 'confirmee' WHERE id = ?").run(req.params.id);
  res.json({ message: "Commande confirmée." });
});

// ---------------- Modifier le statut (admin) ----------------
router.put("/:id/status", requireAdmin, (req, res) => {
  const { reservation_status, payment_status } = req.body;
  const RES = ["en_attente", "confirmee", "annulee"];
  const PAY = ["en_attente", "paye", "a_payer_sur_place", "annule"];
  if (reservation_status && !RES.includes(reservation_status)) return res.status(400).json({ error: "Statut invalide." });
  if (payment_status && !PAY.includes(payment_status)) return res.status(400).json({ error: "Statut de paiement invalide." });
  db.prepare(
    "UPDATE reservations SET reservation_status = COALESCE(?, reservation_status), payment_status = COALESCE(?, payment_status) WHERE id = ?"
  ).run(reservation_status || null, payment_status || null, req.params.id);
  res.json({ message: "Statut mis à jour." });
});

// ---------------- Supprimer une commande (admin) ----------------
router.delete("/:id", requireAdmin, (req, res) => {
  const r = db.prepare("DELETE FROM reservations WHERE id = ?").run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: "Commande introuvable." });
  res.json({ message: "Commande supprimée." });
});

module.exports = router;
