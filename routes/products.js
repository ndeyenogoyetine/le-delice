// ============================================================
// PRODUITS : /api/products
//  - GET /            → menu visible par les clients (public)
//  - GET /all         → tous les produits (admin)
//  - POST /           → ajouter un produit (admin)
//  - PUT /:id         → modifier un produit (admin)
//  - DELETE /:id      → supprimer un produit (admin)
// ============================================================

const express = require("express");
const db = require("../db/database");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();
const CATEGORIES = ["plat", "boisson", "dessert"];

function readProduct(body) {
  const name = String(body.name || "").trim();
  const price = parseInt(body.price, 10);
  const category = body.category || "plat";
  if (!name) return { error: "Le nom du produit est obligatoire." };
  if (!Number.isInteger(price) || price < 0) return { error: "Le prix doit être un nombre positif." };
  if (!CATEGORIES.includes(category)) return { error: "Catégorie invalide." };
  return {
    value: {
      name,
      price,
      category,
      description: String(body.description || "").trim() || null,
      image: String(body.image || "").trim() || null,
      available: body.available === false || body.available === 0 || body.available === "0" ? 0 : 1,
    },
  };
}

router.get("/", (req, res) => {
  const products = db
    .prepare("SELECT id, name, description, category, price, image FROM products WHERE available = 1 ORDER BY category, name")
    .all();
  res.json({ products });
});

router.get("/all", requireAdmin, (req, res) => {
  res.json({ products: db.prepare("SELECT * FROM products ORDER BY category, name").all() });
});

router.post("/", requireAdmin, (req, res) => {
  const { value, error } = readProduct(req.body);
  if (error) return res.status(400).json({ error });
  const r = db
    .prepare("INSERT INTO products (name, description, category, price, image, available) VALUES (@name, @description, @category, @price, @image, @available)")
    .run(value);
  res.status(201).json({ product: db.prepare("SELECT * FROM products WHERE id = ?").get(r.lastInsertRowid) });
});

router.put("/:id", requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT id FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Produit introuvable." });
  const { value, error } = readProduct(req.body);
  if (error) return res.status(400).json({ error });
  db.prepare("UPDATE products SET name=@name, description=@description, category=@category, price=@price, image=@image, available=@available WHERE id=@id")
    .run({ ...value, id: req.params.id });
  res.json({ product: db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id) });
});

router.delete("/:id", requireAdmin, (req, res) => {
  const r = db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: "Produit introuvable." });
  res.json({ message: "Produit supprimé." });
});

module.exports = router;
