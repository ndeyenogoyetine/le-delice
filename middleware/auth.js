// ============================================================
// MIDDLEWARE D'AUTHENTIFICATION
// ============================================================
// Vérifie que le client a bien un token de connexion valide
// (stocké dans un cookie nommé "token") avant d'accéder à une
// route protégée, comme la création d'une réservation.
// ============================================================

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

function requireAuth(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "Vous devez être connecté pour accéder à cette page." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, name, email, isAdmin }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session invalide ou expirée, veuillez vous reconnecter." });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: "Accès réservé à l'administrateur." });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
