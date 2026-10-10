// ============================================================
// ROUTES D'AUTHENTIFICATION : /api/auth/...
// ============================================================

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/database");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

function createToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, isAdmin: !!user.is_admin },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function setTokenCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,           // le JS du navigateur ne peut pas lire ce cookie (plus sûr)
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
  });
}

// ---------------- Inscription ----------------
router.post("/register", (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nom, email et mot de passe sont obligatoires." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const result = db
    .prepare(
      "INSERT INTO users (name, email, phone, password_hash, is_admin) VALUES (?, ?, ?, ?, 0)"
    )
    .run(name, email.toLowerCase(), phone || null, passwordHash);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
  const token = createToken(user);
  setTokenCookie(res, token);

  res.status(201).json({ message: "Compte créé avec succès.", user: { name: user.name, email: user.email, isAdmin: false } });
});

// ---------------- Connexion ----------------
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe sont obligatoires." });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Email ou mot de passe incorrect." });
  }

  const token = createToken(user);
  setTokenCookie(res, token);

  res.json({ message: "Connexion réussie.", user: { name: user.name, email: user.email, isAdmin: !!user.is_admin } });
});

// ---------------- Déconnexion ----------------
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Déconnecté." });
});

// ---------------- Qui suis-je ? (pour vérifier la session côté client) ----------------
router.get("/me", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Non connecté." });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ user: payload });
  } catch {
    res.status(401).json({ error: "Session invalide." });
  }
});

module.exports = router;
