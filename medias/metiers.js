// Les suggestions de métiers (09/11/2026) : tous les intitulés du répertoire officiel des métiers (ROME de France Travail)
// et nos métiers à nous, dans /medias/metiers.json. La liste n'est chargée qu'au premier toucher du champ ;
// on peut toujours écrire un métier qui n'y est pas.
(function () {
  let liste = null, chargement = null;
  const plat = t => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const charger = () => chargement || (chargement = fetch("/medias/metiers.json").then(r => r.json()).then(l => { liste = l.map(m => [m, plat(m)]); }).catch(() => { liste = []; }));
  function relier(champ) {
    const id = "metiers-" + Math.random().toString(36).slice(2);
    const dl = document.createElement("datalist"); dl.id = id; champ.after(dl); champ.setAttribute("list", id); champ.setAttribute("autocomplete", "off");
    const proposer = () => {
      if (!liste) return;
      const mots = plat(champ.value).split(/[\s,/'-]+/).filter(Boolean);
      if (!mots.length) { dl.innerHTML = ""; return; }
      // d'abord ce qui commence comme ce qui est tapé, puis ce qui contient tous les mots
      const debut = [], dedans = [];
      for (const [m, p] of liste) {
        if (!mots.every(w => p.includes(w))) continue;
        (p.startsWith(mots[0]) ? debut : dedans).push(m);
        if (debut.length >= 40) break;
      }
      dl.innerHTML = debut.concat(dedans).slice(0, 40).map(m => `<option value="${m.replace(/"/g, "&quot;")}"></option>`).join("");
    };
    champ.addEventListener("focus", () => charger().then(proposer));
    champ.addEventListener("input", () => charger().then(proposer));
  }
  const tous = () => document.querySelectorAll('input[name="Métier"], input[name="Métier (autre)"]').forEach(c => { if (!c.dataset.metiers) { c.dataset.metiers = "1"; relier(c); } });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tous); else tous();
})();
