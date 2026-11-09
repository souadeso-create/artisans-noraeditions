// Les suggestions de villes (09/11/2026, « relie aussi la ville à une base ») : la base officielle des communes de France
// (geo.api.gouv.fr), interrogée pendant la frappe, avec le code postal. On peut toujours écrire autre chose.
(function () {
  function relier(champ) {
    const id = "villes-" + Math.random().toString(36).slice(2);
    const dl = document.createElement("datalist"); dl.id = id; champ.after(dl); champ.setAttribute("list", id); champ.setAttribute("autocomplete", "off");
    let attente, derniere = "", numero = 0;   // seule la réponse à la dernière frappe compte
    champ.addEventListener("input", () => {
      clearTimeout(attente);
      const q = champ.value.trim().replace(/\s*\(\d{5}\)$/, "");
      if (q.length < 2 || q === derniere) return;
      attente = setTimeout(async () => {
        derniere = q; const n = ++numero;
        const parCode = /^\d{5}$/.test(q);
        const url = "https://geo.api.gouv.fr/communes?" + (parCode ? "codePostal=" + q : "nom=" + encodeURIComponent(q) + "&boost=population&limit=12") + "&fields=nom,codesPostaux";
        try {
          const l = await (await fetch(url)).json();
          if (n !== numero) return;
          dl.innerHTML = l.map(c => `<option value="${c.nom} (${(c.codesPostaux || [""])[0]})"></option>`).join("");
        } catch (e) { /* sans réseau, on écrit sa ville à la main */ }
      }, 220);
    });
  }
  const tous = () => document.querySelectorAll('input[name="Ville"]').forEach(c => { if (!c.dataset.villes) { c.dataset.villes = "1"; relier(c); } });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tous); else tous();
})();
