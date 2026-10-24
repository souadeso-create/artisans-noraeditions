// Le nom de domaine est-il libre ? On interroge directement les registres officiels (RDAP) :
// l'Afnic pour le .fr, Verisign pour le .com. Un nom enregistré répond, un nom libre est « introuvable » (404).
(function () {
  const REGISTRES = { ".fr": "https://rdap.nic.fr/domain/", ".com": "https://rdap.verisign.com/com/v1/domain/" };
  // « Belle Peau Institut.fr » → « belle-peau-institut »
  function nettoyer(nom) {
    return String(nom || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\.(fr|com)\/?$/, "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’\s_.]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 63);
  }
  async function verifier(nom, ext) {
    const base = nettoyer(nom), domaine = base + ext;
    if (base.length < 2) return { etat: "court", domaine };
    try {
      const r = await fetch(REGISTRES[ext] + encodeURIComponent(domaine), { headers: { Accept: "application/rdap+json" } });
      return { etat: r.status === 404 ? "libre" : r.ok ? "pris" : "inconnu", domaine };
    } catch (e) { return { etat: "inconnu", domaine }; }
  }
  // branche un vérificateur : champ du nom, extensions (.fr / .com), bouton, zone de réponse
  function brancher({ champ, extensions, bouton, reponse, apres }) {
    const ext = () => (extensions.find(e => e.checked) || extensions[0]).value;
    const lancer = async () => {
      if (!nettoyer(champ.value)) { reponse.className = "dom-res"; reponse.textContent = ""; return; }
      reponse.className = "dom-res attente"; reponse.textContent = "Vérification…";
      const e = ext(), r = await verifier(champ.value, e), autre = e === ".fr" ? ".com" : ".fr";
      if (r.etat === "court") { reponse.className = "dom-res pris"; reponse.textContent = "Le nom est trop court."; }
      else if (r.etat === "libre") { reponse.className = "dom-res libre"; reponse.textContent = `✓ ${r.domaine} est libre.`; }
      else if (r.etat === "pris") {
        const r2 = await verifier(champ.value, autre);
        reponse.className = "dom-res pris";
        reponse.textContent = `${r.domaine} est déjà pris.` + (r2.etat === "libre" ? ` ${r2.domaine} est libre.` : " Essayez un autre nom, par exemple avec votre ville.");
      } else { reponse.className = "dom-res attente"; reponse.textContent = "La vérification n'a pas répondu : réessayez dans un instant."; }
      if (apres) apres(r);
    };
    bouton.addEventListener("click", lancer);
    champ.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); lancer(); } });
    extensions.forEach(x => x.addEventListener("change", () => { if (reponse.textContent) lancer(); }));
    return lancer;
  }
  window.NoraDomaine = { nettoyer, verifier, brancher };
})();
