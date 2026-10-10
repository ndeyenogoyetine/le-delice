// Affiche le contenu de la base dans le terminal :  npm run db:show
require("dotenv").config();
const db = require("../db/database");

for (const table of ["users", "products", "reservations", "order_items"]) {
  const rows = db.prepare(`SELECT * FROM ${table}`).all();
  console.log(`\n=== ${table.toUpperCase()} (${rows.length}) ===`);
  if (table === "users") rows.forEach((r) => delete r.password_hash);
  if (rows.length) console.table(rows);
}
