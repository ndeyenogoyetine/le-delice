// ============================================================
// AUTH.JS — Affiche "Connexion" ou "Bonjour {nom}" dans le menu
// Inclus sur TOUTES les pages du site.
// ============================================================

(async function () {
  const navAuth = document.getElementById("nav-auth");
  if (!navAuth) return;

  try {
    const res = await fetch("/api/auth/me");

    if (res.ok) {
      const adminLink = "";
 navAuth.innerHTML = `
  <a href="mon-espace.html" class="nav-user">👤 Mon compte</a>
  ${adminLink}
  <a href="#" id="logoutLink">Déconnexion</a>
`;

      document.getElementById("logoutLink").addEventListener("click", async (e) => {
        e.preventDefault();
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "index.html";
      });
    } else {
      navAuth.innerHTML = `<a href="login.html">Connexion</a>`;
    }
  } catch (err) {
    navAuth.innerHTML = `<a href="login.html">Connexion</a>`;
  }
})();
