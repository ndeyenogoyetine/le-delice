// ============================================================
// ADMIN.JS — Commandes, produits (CRUD) et clients
// ============================================================

(async function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; };
  const fmt = (n) => `${Number(n).toLocaleString("fr-FR")} FCFA`;
  const api = async (url, method = "GET", body) => {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erreur serveur");
    return data;
  };

  // ---------- Accès réservé à l'admin ----------
  let me;
  try { me = (await api("/api/auth/me")).user; }
  catch (e) { window.location.href = "login.html?redirect=admin.html"; return; }
  $("checkingAccess").style.display = "none";
  if (!me.isAdmin) { $("accessDenied").style.display = "block"; return; }
  $("adminContent").style.display = "block";

  const METHODS = { card: "Carte bancaire", orange_money: "Orange Money", wave: "Wave", sur_place: "Sur place" };
  const PAY_STATUS = { en_attente: "En attente", paye: "Payé", a_payer_sur_place: "À payer sur place", annule: "Annulé" };
  const CATS = { plat: "Plat", boisson: "Boisson", dessert: "Dessert" };

  // ---------- Onglets ----------
  document.querySelectorAll(".tab-btn").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((x) => x.classList.toggle("active", x === b));
      document.querySelectorAll(".tab-panel").forEach((p) => (p.style.display = p.id === "tab-" + b.dataset.tab ? "block" : "none"));
    })
  );

  // =====================================================
  // COMMANDES
  // =====================================================
  let orders = [], filter = "tous";

  async function loadOrders() {
    orders = (await api("/api/reservations")).reservations;
    $("statTotal").textContent = orders.length;
    $("statPending").textContent = orders.filter((o) => o.reservation_status === "en_attente").length;
    $("statConfirmed").textContent = orders.filter((o) => o.reservation_status === "confirmee").length;
    $("statRevenue").textContent = fmt(orders.filter((o) => o.payment_status === "paye").reduce((s, o) => s + o.amount_due, 0));
    renderOrders();
  }

  function renderOrders() {
    let list = orders;
    if (["en_attente", "confirmee", "annulee"].includes(filter)) list = orders.filter((o) => o.reservation_status === filter);
    else if (METHODS[filter]) list = orders.filter((o) => o.payment_method === filter);

    $("ordersBody").innerHTML = list.map((o) => {
      const items = (o.items || []).map((i) => `${esc(i.product_name)} × ${i.quantity}`).join("<br>") || "-";
      const toConfirm = ["orange_money", "wave"].includes(o.payment_method) && o.payment_status !== "paye";
      return `<tr>
        <td>#${o.id}</td>
        <td><strong>${esc(o.full_name)}</strong><br><small>${esc(o.email)}<br>${esc(o.phone)}</small></td>
        <td>${esc(o.date)}<br><small>${esc(o.time)}</small></td>
        <td>${o.guests}</td>
        <td>${items}</td>
        <td><strong>${fmt(o.amount_due)}</strong></td>
        <td>${METHODS[o.payment_method] || o.payment_method}<br><small>${PAY_STATUS[o.payment_status] || o.payment_status}</small>
            ${o.transaction_reference ? `<br><small>Réf : ${esc(o.transaction_reference)}</small>` : ""}</td>
        <td><select class="status-select badge-${o.reservation_status}" data-act="status" data-id="${o.id}">
              ${["en_attente", "confirmee", "annulee"].map((s) => `<option value="${s}" ${s === o.reservation_status ? "selected" : ""}>${{ en_attente: "En attente", confirmee: "Confirmée", annulee: "Annulée" }[s]}</option>`).join("")}
            </select></td>
        <td class="actions">
          ${toConfirm ? `<button class="btn-small ok" data-act="confirm" data-id="${o.id}">Confirmer paiement</button>` : ""}
          <button class="btn-small danger" data-act="delete-order" data-id="${o.id}"><i class="fas fa-trash"></i></button>
        </td></tr>`;
    }).join("");
    $("ordersEmpty").style.display = list.length ? "none" : "block";
  }

  $("ordersBody").addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    try {
      if (b.dataset.act === "confirm") await api(`/api/reservations/${b.dataset.id}/admin-confirm`, "POST");
      if (b.dataset.act === "delete-order") {
        if (!confirm("Supprimer définitivement cette commande ?")) return;
        await api(`/api/reservations/${b.dataset.id}`, "DELETE");
      }
      await loadOrders();
    } catch (err) { alert(err.message); }
  });
  $("ordersBody").addEventListener("change", async (e) => {
    if (e.target.dataset.act !== "status") return;
    try { await api(`/api/reservations/${e.target.dataset.id}/status`, "PUT", { reservation_status: e.target.value }); await loadOrders(); }
    catch (err) { alert(err.message); }
  });
  document.querySelectorAll(".filter-chip").forEach((c) =>
    c.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach((x) => x.classList.toggle("active", x === c));
      filter = c.dataset.filter; renderOrders();
    })
  );

  // =====================================================
  // PRODUITS (ajouter / modifier / supprimer)
  // =====================================================
  let products = [];

  async function loadProducts() {
    products = (await api("/api/products/all")).products;
    $("productsBody").innerHTML = products.map((p) => `<tr>
      <td>${p.image ? `<img class="thumb" src="${esc(p.image)}" alt="" onerror="this.style.visibility='hidden'">` : "-"}</td>
      <td><strong>${esc(p.name)}</strong><br><small>${esc(p.description || "")}</small></td>
      <td>${CATS[p.category] || p.category}</td>
      <td>${fmt(p.price)}</td>
      <td><span class="badge ${p.available ? "badge-confirmee" : "badge-annulee"}">${p.available ? "Disponible" : "Masqué"}</span></td>
      <td class="actions">
        <button class="btn-small" data-act="edit" data-id="${p.id}"><i class="fas fa-pen"></i> Modifier</button>
        <button class="btn-small danger" data-act="delete-product" data-id="${p.id}"><i class="fas fa-trash"></i> Supprimer</button>
      </td></tr>`).join("");
  }

  function openForm(p) {
    $("productForm").style.display = "block";
    $("productError").style.display = "none";
    $("productFormTitle").textContent = p ? "Modifier le produit" : "Nouveau produit";
    $("pId").value = p ? p.id : "";
    $("pName").value = p ? p.name : "";
    $("pCategory").value = p ? p.category : "plat";
    $("pPrice").value = p ? p.price : "";
    $("pImage").value = p ? p.image || "" : "";
    $("pDescription").value = p ? p.description || "" : "";
    $("pAvailable").checked = p ? !!p.available : true;
    $("productForm").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  const closeForm = () => ($("productForm").style.display = "none");

  $("btnNewProduct").addEventListener("click", () => openForm(null));
  $("btnCancelProduct").addEventListener("click", closeForm);

  $("productForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      name: $("pName").value, category: $("pCategory").value, price: $("pPrice").value,
      image: $("pImage").value, description: $("pDescription").value, available: $("pAvailable").checked,
    };
    try {
      const id = $("pId").value;
      await api(id ? `/api/products/${id}` : "/api/products", id ? "PUT" : "POST", body);
      closeForm(); await loadProducts();
    } catch (err) { $("productError").textContent = err.message; $("productError").style.display = "block"; }
  });

  $("productsBody").addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    const p = products.find((x) => String(x.id) === b.dataset.id);
    if (b.dataset.act === "edit") openForm(p);
    if (b.dataset.act === "delete-product") {
      if (!confirm(`Supprimer « ${p.name} » du menu ?`)) return;
      try { await api(`/api/products/${p.id}`, "DELETE"); await loadProducts(); } catch (err) { alert(err.message); }
    }
  });

  // =====================================================
  // CLIENTS
  // =====================================================
  async function loadClients() {
    const users = (await api("/api/admin/users")).users;
    $("clientsBody").innerHTML = users.map((u) => `<tr>
      <td><strong>${esc(u.name)}</strong></td><td>${esc(u.email)}</td><td>${esc(u.phone || "-")}</td>
      <td>${esc((u.created_at || "").slice(0, 10))}</td><td>${u.orders_count}</td><td>${fmt(u.total_amount)}</td></tr>`).join("");
    $("clientsEmpty").style.display = users.length ? "none" : "block";
  }

  // ---------- Chargement ----------
  const loadAll = () => Promise.all([loadOrders(), loadProducts(), loadClients()]).catch((e) => alert(e.message));
  $("btnRefresh").addEventListener("click", loadAll);
  loadAll();
})();
