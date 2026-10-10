-- ============================================================
-- SCHÉMA DE LA BASE DE DONNÉES - Le Délice (SQLite)
-- Fichier de base créé automatiquement : db/ledelice.db
-- ============================================================

-- Comptes (clients + administrateur)
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  is_admin      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Produits du menu (gérés par l'administrateur)
CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'plat',      -- plat | boisson | dessert
  price       INTEGER NOT NULL,                  -- en FCFA
  image       TEXT,                              -- ex: images/plats/thieb.jpg
  available   INTEGER NOT NULL DEFAULT 1,        -- 1 = commandable, 0 = masqué
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Commandes / réservations
CREATE TABLE IF NOT EXISTS reservations (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id               INTEGER NOT NULL,
  full_name             TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  date                  TEXT NOT NULL,
  time                  TEXT NOT NULL,
  guests                INTEGER NOT NULL,        -- nombre de places
  amount_due            INTEGER NOT NULL,        -- total de la commande (FCFA)
  payment_method        TEXT NOT NULL,           -- card | orange_money | wave | sur_place
  payment_status        TEXT NOT NULL,           -- en_attente | paye | a_payer_sur_place | annule
  reservation_status    TEXT NOT NULL,           -- en_attente | confirmee | annulee
  transaction_reference TEXT,                    -- ID Orange Money / Wave
  stripe_session_id     TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Lignes d'une commande (plats choisis + quantités)
CREATE TABLE IF NOT EXISTS order_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id INTEGER NOT NULL,
  product_id     INTEGER,
  product_name   TEXT NOT NULL,                  -- copie du nom au moment de la commande
  unit_price     INTEGER NOT NULL,               -- copie du prix au moment de la commande
  quantity       INTEGER NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)     REFERENCES products(id)     ON DELETE SET NULL
);
