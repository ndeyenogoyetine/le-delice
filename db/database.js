// ============================================================
// BASE DE DONNÉES SQLITE  →  fichier : db/ledelice.db
// Créée automatiquement au premier démarrage, avec :
//  - les tables (voir db/schema.sql)
//  - le menu de départ (produits)
//  - le compte administrateur
// ============================================================

const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

const db = new Database(path.join(__dirname, "ledelice.db"));
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

// ---------------- Menu de départ (si aucun produit) ----------------
const productCount = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
if (productCount === 0) {
  const insert = db.prepare(
    "INSERT INTO products (name, description, category, price, image) VALUES (?, ?, ?, ?, ?)"
  );
  const menu = [
    ["Thiéboudiène", "Poisson, riz et légumes : le plat national.", "plat", 1500, "images/plats/thieb.jpg"],
    ["Yassa Poulet", "Poulet mariné au citron et aux oignons.", "plat", 1500, "images/plats/yassa.jpg"],
    ["Mafé", "Sauce à l'arachide, viande et riz.", "plat", 1500, "images/galerie/mafe.jpg"],
    ["Poisson braisé", "Poisson grillé, salade fraîche et alloco.", "plat", 1000, "images/galerie/poisson.jpg"],
    ["Pastels Sénégalais", "Beignets farcis au poisson, sauce tomate épicée.", "plat", 2000, "images/galerie/pastels.jpg"],
    ["Soupe Kandia", "Soupe traditionnelle à base de gombo.", "plat", 2000, "images/plats/soupe Kandia.jpeg"],
    ["Lakh", "Dessert-repas de mil, lait caillé et sucre.", "plat", 1500, "images/galerie/lakh.jpeg"],
    ["Jus de Bissap", "Jus d'hibiscus frais.", "boisson", 1500, "images/plats/bissap.jpg"],
    ["Jus de Bouye", "Jus de fruit du baobab.", "boisson", 1500, "images/plats/bouye.jpg"],
    ["Café Touba", "Café épicé à la graine de Guinée.", "boisson", 1500, "images/plats/cafe.jpg"],
    ["Thiakry", "Dessert de couscous de mil au lait caillé.", "dessert", 1000, "images/plats/thiakry.jpg"],
    ["Salade de fruits", "Fruits frais de saison.", "dessert", 1500, "images/plats/fruits.jpg"],
    ["Glace artisanale", "Glace maison.", "dessert", 1500, "images/plats/glace.jpeg"],
  ];
  const seed = db.transaction(() => menu.forEach((m) => insert.run(...m)));
  seed();
  console.log(`🍽️  Menu de départ créé (${menu.length} produits).`);
}

// ---------------- Compte administrateur (si absent) ----------------
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@ledelice.sn").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@2026";
const adminExists = db.prepare("SELECT id FROM users WHERE email = ?").get(ADMIN_EMAIL);
if (!adminExists) {
  db.prepare(
    "INSERT INTO users (name, email, phone, password_hash, is_admin) VALUES (?, ?, ?, ?, 1)"
  ).run("Administrateur", ADMIN_EMAIL, null, bcrypt.hashSync(ADMIN_PASSWORD, 10));
  console.log(`🔐 Compte admin créé : ${ADMIN_EMAIL}  /  mot de passe : ${ADMIN_PASSWORD}`);
  console.log("   (changez ADMIN_PASSWORD dans .env avant la mise en ligne)");
}

module.exports = db;
