// ============================================================
// RESERVATION.JS
// - Page accessible uniquement aux clients connectés
// - Côté gauche : formulaire / côté droit : récapitulatif
// - Valider = envoie la commande, Annuler = vide la commande
// ============================================================

(async function () {
  const $ = (id) => document.getElementById(id);

  // ---------- 1. Vérifier la connexion ----------
  let currentUser;
  try {
    const res = await fetch("/api/auth/me");
    if (!res.ok) throw new Error();
    currentUser = (await res.json()).user;
  } catch (err) {
    window.location.href = "login.html?redirect=reservation.html";
    return;
  }

  $("loadingState").style.display = "none";
  $("reservationSection").style.display = "block";
  $("full_name").value = currentUser.name || "";
  $("email").value = currentUser.email || "";

  // Date minimale = aujourd'hui
  $("date").min = new Date().toISOString().split("T")[0];

  // ---------- 2. Charger le menu depuis la base ----------
  const fmt = (n) => `${Number(n).toLocaleString("fr-FR")} FCFA`;
  const escapeHtml = (s) => {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  };
  let products = [];
  const CATEGORY_LABELS = { plat: "Plats", boisson: "Boissons", dessert: "Desserts" };

  try {
    products = (await (await fetch("/api/products")).json()).products;
  } catch (err) {}

  const dishSelect = $("dishSelect");
  dishSelect.innerHTML = '<option value="">Choisissez un plat...</option>';
  Object.keys(CATEGORY_LABELS).forEach((cat) => {
    const list = products.filter((p) => p.category === cat);
    if (!list.length) return;
    const group = document.createElement("optgroup");
    group.label = CATEGORY_LABELS[cat];
    list.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name} — ${fmt(p.price)}`;
      group.appendChild(opt);
    });
    dishSelect.appendChild(group);
  });

  // ---------- 3. Commande (panier) ----------
  const cart = new Map(); // product_id -> { name, price, qty }
  const errorBox = $("formError");

  function renderCart() {
    const list = $("orderList");
    list.innerHTML = "";
    let total = 0;

    cart.forEach((item, id) => {
      total += item.price * item.qty;
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="order-line-name">${escapeHtml(item.name)}
          <small>${fmt(item.price)} × ${item.qty}</small>
        </div>
        <div class="order-line-actions">
          <button type="button" class="qty-btn" data-act="minus" data-id="${id}" aria-label="Moins">−</button>
          <span>${item.qty}</span>
          <button type="button" class="qty-btn" data-act="plus" data-id="${id}" aria-label="Plus">+</button>
          <strong>${fmt(item.price * item.qty)}</strong>
          <button type="button" class="qty-btn remove" data-act="remove" data-id="${id}" aria-label="Retirer"><i class="fas fa-trash"></i></button>
        </div>`;
      list.appendChild(li);
    });

    $("orderEmpty").style.display = cart.size ? "none" : "block";
    $("orderTotal").textContent = fmt(total);
  }

  $("orderList").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const id = btn.dataset.id;
    const item = cart.get(id);
    if (!item) return;
    if (btn.dataset.act === "plus") item.qty = Math.min(50, item.qty + 1);
    if (btn.dataset.act === "minus") item.qty -= 1;
    if (btn.dataset.act === "remove" || item.qty < 1) cart.delete(id);
    renderCart();
  });

  $("btnAddDish").addEventListener("click", () => {
    errorBox.style.display = "none";
    const id = dishSelect.value;
    const qty = Math.max(1, Math.min(50, parseInt($("dishQty").value, 10) || 1));
    if (!id) {
      errorBox.textContent = "Choisissez d'abord un plat dans la liste.";
      errorBox.style.display = "block";
      return;
    }
    const product = products.find((p) => String(p.id) === id);
    const existing = cart.get(id);
    if (existing) existing.qty = Math.min(50, existing.qty + qty);
    else cart.set(id, { name: product.name, price: product.price, qty });
    dishSelect.value = "";
    $("dishQty").value = 1;
    renderCart();
  });

  // ---------- 4. Récapitulatif client (mise à jour en direct) ----------
  const PAY_LABELS = { card: "Carte bancaire", orange_money: "Orange Money", wave: "Wave", sur_place: "Payer sur place" };
  const selectedPayment = () => document.querySelector('input[name="payment_method"]:checked').value;

  function renderSummary() {
    $("sumName").textContent = $("full_name").value || "—";
    const contact = [$("email").value, $("phone").value].filter(Boolean).join(" · ");
    $("sumContact").textContent = contact || "—";
    const d = $("date").value, t = $("time").value;
    $("sumDate").textContent = d || t ? `${d ? new Date(d + "T00:00").toLocaleDateString("fr-FR") : "—"} à ${t || "—"}` : "—";
    const g = $("guests").value;
    $("sumGuests").textContent = g ? `${g} place${g > 1 ? "s" : ""}` : "—";
    $("sumPayment").textContent = PAY_LABELS[selectedPayment()];
  }
  $("reservationForm").addEventListener("input", renderSummary);
  $("reservationForm").addEventListener("change", renderSummary);
  renderSummary();
  renderCart();

  // ---------- 5. Annuler la commande ----------
  $("btnCancel").addEventListener("click", () => {
    if (!confirm("Voulez-vous vraiment annuler cette commande ? Tout sera effacé.")) return;
    cart.clear();
    $("reservationForm").reset();
    $("full_name").value = currentUser.name || "";
    $("email").value = currentUser.email || "";
    errorBox.style.display = "none";
    renderCart();
    renderSummary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ---------- 6. Valider la commande ----------
  $("reservationForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.style.display = "none";

    if (cart.size === 0) {
      errorBox.textContent = "Votre commande est vide : ajoutez au moins un plat.";
      errorBox.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const payload = {
      full_name: $("full_name").value,
      email: $("email").value,
      phone: $("phone").value,
      date: $("date").value,
      time: $("time").value,
      guests: $("guests").value,
      payment_method: selectedPayment(),
      items: [...cart.entries()].map(([id, it]) => ({ product_id: Number(id), quantity: it.qty })),
    };

    $("btnValidate").disabled = true;
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        errorBox.textContent = data.error || "Une erreur est survenue.";
        errorBox.style.display = "block";
        $("btnValidate").disabled = false;
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      handlePaymentFlow(payload.payment_method, data);
    } catch (err) {
      errorBox.textContent = "Impossible de contacter le serveur.";
      errorBox.style.display = "block";
      $("btnValidate").disabled = false;
    }
  });

  // ---------- 7. Suite selon le mode de paiement ----------
  async function handlePaymentFlow(method, data) {
    $("orderLayout").style.display = "none";

    if (method === "card") {
      try {
        const res = await fetch(`/api/payment/create-checkout-session/${data.reservation.id}`, { method: "POST" });
        const session = await res.json();
        if (!res.ok) throw new Error(session.error);
        window.location.href = session.url;
      } catch (err) {
        $("successBox").style.display = "block";
        $("successMessage").textContent =
          "Votre commande est enregistrée, mais le paiement par carte n'a pas pu démarrer (" +
          (err.message || "erreur") + "). Contactez le restaurant.";
      }
      return;
    }

    if (method === "orange_money" || method === "wave") {
      $("mobilePaymentBox").style.display = "block";
      $("mobilePaymentInstructions").textContent = data.instructions.message;
      $("btnConfirmMobile").addEventListener("click", async () => {
        const r = await fetch(`/api/reservations/${data.reservation.id}/confirm-mobile-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transaction_reference: $("transactionRef").value }),
        });
        const d = await r.json();
        const msg = $("mobileConfirmMessage");
        msg.textContent = r.ok ? d.message : d.error || "Erreur lors de la confirmation.";
        msg.style.display = "block";
      });
      return;
    }

    $("successBox").style.display = "flex";
    $("successMessage").textContent = "Votre commande est confirmée ! Vous réglerez directement sur place.";
  }
})();
