// ============================================================
// ADMIN : /api/admin  (clients)
// ============================================================

const express = require("express");
const db = require("../db/database");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Liste des clients avec leur nombre de commandes et le total dépensé
router.get("/users", requireAdmin, (req, res) => {
  const users = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at,
              COUNT(r.id) AS orders_count,
              COALESCE(SUM(CASE WHEN r.reservation_status != 'annulee' THEN r.amount_due END), 0) AS total_amount
       FROM users u
       LEFT JOIN reservations r ON r.user_id = u.id
       WHERE u.is_admin = 0
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    )
    .all();
  res.json({ users });
});

module.exports = router;
