# Le Délice — Site du restaurant (comptes, commandes, paiement, administration)

## 🚀 Démarrage

1. Remettez votre dossier **`images/`** dans `public/images/` (logo.png, galerie/, plats/…)
2. `npm install`
3. Copiez `.env.example` en **`.env`** et remplissez-le (voir plus bas)
4. `npm start` puis ouvrez **http://localhost:3000**

## 🗄️ La base de données (visible dans VS Code)

La base SQLite est le fichier **`db/ledelice.db`** (créé automatiquement au premier `npm start`).
Le schéma lisible est dans **`db/schema.sql`**.

Pour **voir les données dans VS Code** :
- Installez l'extension **« SQLite Viewer »** (ou « SQLite » de alexcvzz), puis cliquez sur `db/ledelice.db`
- Ou dans le terminal : `npm run db:show` (affiche toutes les tables)

Tables : `users` (clients + admin), `products` (menu), `reservations` (commandes), `order_items` (plats de chaque commande).

> L'ancien fichier `ledelice.db` à la racine (ancienne version) n'est plus utilisé : vous pouvez le supprimer.

## 👨‍🍳 Administration

- Un compte administrateur existe déjà dans la base fournie :
  **`admin@ledelice.sn`** / mot de passe **`ChangezMoi@2026`**.
- Pour choisir un autre email/mot de passe : modifiez `ADMIN_EMAIL` / `ADMIN_PASSWORD` dans `.env`,
  supprimez `db/ledelice.db` et relancez `npm start` (la base et le compte admin sont recréés).
- Connectez-vous sur `/login.html` : vous arrivez directement sur **`/admin.html`**.
- **Commandes** : voir les clients qui ont commandé (plats, quantités, total, paiement), changer le statut,
  confirmer un paiement Orange Money / Wave, supprimer une commande.
- **Produits** : **ajouter, modifier, supprimer** un plat (nom, catégorie, prix, image, description, disponible/masqué).
  Les changements apparaissent tout de suite sur la page de réservation.
- **Clients** : liste des inscrits, nombre de commandes et total dépensé.

## 🧾 Parcours client

1. Sans compte, la page **Réservation** est inaccessible → redirection vers la connexion
2. Après connexion/inscription → retour automatique sur la réservation
3. **Côté gauche** : nom, email, téléphone, date, heure, nombre de places, choix du/des plat(s) + quantité, mode de paiement
4. **Côté droit** : récapitulatif de la commande en direct, avec **Valider** ou **Annuler** la commande
5. Paiement : carte (Stripe), Orange Money, Wave ou sur place. Le total est recalculé côté serveur.

## ⚙️ Fichier `.env`

| Variable | Rôle |
|---|---|
| `JWT_SECRET` | longue phrase secrète aléatoire |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | clés Stripe (mode test pour commencer) |
| `BASE_URL` | adresse du site (retour Stripe) |
| `ORANGE_MONEY_NUMBER` / `WAVE_NUMBER` | vos numéros, affichés au client |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | compte administrateur |

Carte de test Stripe : `4242 4242 4242 4242`, date future, CVC quelconque.

## 📁 Structure

```
server.js            serveur Express
db/                  schema.sql, database.js, ledelice.db
routes/              auth, products, reservations, payment, admin
middleware/auth.js   protection des routes (connecté / admin)
scripts/show-db.js   npm run db:show
public/              pages HTML, css/, js/ (reservation.js, admin.js, auth.js…)
```
