// Trouver des prospects (11/11/2026, « tu as oublié l'étape en premier, qui est trouver des prospects ») : on choisit un métier et une ville,
// et l'appli interroge l'annuaire officiel des entreprises (recherche-entreprises.api.gouv.fr, données publiques de l'État, gratuit).
// Il donne le nom, l'adresse, l'activité, la date de création et le dirigeant ; il ne donne ni e-mail ni téléphone, et l'appli n'en invente pas :
// ils se recopient depuis le site de l'entreprise. Les entreprises qui s'opposent à la prospection commerciale sont montrées, sans bouton d'ajout.

// Du métier au code d'activité (NAF) : les mots du métier, sans accents, donnent le ou les codes où l'annuaire range ces entreprises.
// La première règle qui correspond l'emporte : les plus précises sont donc en tête. Table écrite à la main, à compléter au besoin.
const CODES = [
  // santé : aucun métier n'est écarté de la recherche (11/11/2026, « on ne limite aucun métier »)
  [/kinesi|orthophon|orthopt|podolog|pedicure/, "86.90E"], [/infirm|sage-femme/, "86.90D"], [/dentist/, "86.23Z"], [/medecin|generaliste/, "86.21Z"],
  [/pharmac/, "47.73Z"], [/veterinaire/, "75.00Z"],
  [/artiste peintre|sculpt|plasticien/, "90.03A"],
  // bâtiment
  [/plomb|sanitaire/, "43.22A,43.22B"], [/chauffag|climati|frigoriste|pompe a chaleur/, "43.22B"], [/electricien|electricite/, "43.21A"],
  [/couvreur|couverture|zingu/, "43.91B"], [/charpent/, "43.91A"], [/peintre en batiment|peintre|vitrier|vitrerie/, "43.34Z"],
  [/carrel|solier|parquet|moquett/, "43.33Z"], [/platr|plaquiste|staff/, "43.31Z"], [/serrur|metallier|ferronn/, "43.32B"],
  [/cuisiniste|agenceur|agencement/, "43.32C"], [/menuis|ebenist|poseur de fenetre/, "43.32A,31.09B"], [/facad|ravalement/, "43.34Z,43.39Z"],
  [/macon|gros oeuvre|renovation|tous corps|batiment/, "43.99C,43.39Z,41.20A"], [/terrass/, "43.12A"], [/demoli/, "43.11Z"], [/isolat/, "43.29A"],
  [/etanch/, "43.99A"], [/piscin/, "43.99D"], [/architecte d.interieur|decorat|designer/, "74.10Z"], [/architecte/, "71.11Z"], [/geometre/, "71.12A"],
  [/paysag|jardin|elagu|espaces? verts?|tonte/, "81.30Z"], [/ramon/, "81.22Z"],
  // nettoyage, services aux bâtiments
  [/nettoy|proprete|laveur de vitres|entretien de locaux/, "81.21Z,81.22Z,81.29B"], [/desinsect|deratis|desinfect/, "81.29A"], [/concierg/, "82.99Z,81.10Z"],
  [/\bmenage|aide a domicile|auxiliaire de vie/, "88.10A,81.21Z"], [/garde d.enfant|assistante maternelle|creche/, "88.91A"],
  // transport, automobile
  [/demenag/, "49.42Z"], [/depann|remorqu/, "52.21Z,45.20A"], [/taxi|vtc|chauffeur/, "49.32Z"], [/coursier|livreur/, "53.20Z"], [/transporteur|transport routier/, "49.41B"],
  [/carross|garag|mecanicien|mecanique auto|lavage auto/, "45.20A"], [/moto/, "45.40Z"], [/auto-ecole|auto ecole|moniteur de conduite/, "85.53Z"], [/controle technique/, "71.20A"],
  // métiers de bouche, restauration
  [/patiss/, "10.71D,10.71C"], [/boulang/, "10.71C"], [/charcut/, "10.13B,47.22Z"], [/bouch/, "47.22Z"], [/poissonn/, "47.23Z"], [/primeur|fruits et legumes/, "47.21Z"],
  [/fromag|cremier/, "47.29Z"], [/cavist|\bvins?\b/, "47.25Z"], [/chocolat|confis/, "10.82Z"], [/glacier/, "10.52Z"], [/traiteur/, "56.21Z"],
  [/food ?truck|restauration rapide|pizz|kebab|snack/, "56.10C"], [/restaurant|restauration traditionnelle|cuisinier|chef de cuisine/, "56.10A"], [/barman|cafe|bar\b/, "56.30Z"], [/epicer/, "47.11B"],
  // commerces, réparation, métiers d'art
  [/fleur/, "47.76Z"], [/bijou|joaill/, "47.77Z,32.12Z"], [/horlog/, "95.25Z"], [/cordonn/, "95.23Z"], [/coutur|retouch/, "95.29Z,14.13Z"], [/pressing|blanchiss/, "96.01B"],
  [/libraire|librairie/, "47.61Z"], [/opticien/, "47.78A"], [/pret-a-porter|vetement/, "47.71Z"], [/animalerie/, "47.76Z"],
  [/electromenager/, "95.22Z"], [/telephone|ordinateur|informatique.*repar|reparateur informatique/, "95.11Z,95.12Z"], [/\bvelos?\b|\bcycles?\b/, "95.29Z,47.64Z"],
  [/tapissier/, "95.24Z,31.09B"], [/encadr/, "47.78C"], [/ceramist|potier/, "23.41Z"], [/verrier|souffleur de verre/, "23.13Z,23.19Z"], [/grav|imprim|enseigne/, "18.12Z"], [/maroquin/, "15.12Z"],
  // beauté, bien-être
  [/coiff|barb/, "96.02A"], [/estheti|ongl|ongul|manucur|maquill|\bcils\b|sourcil|beaute/, "96.02B"], [/\bspa\b|massage|bien-etre|bien etre|reflexo/, "96.04Z"], [/tatou|toilett|pierc/, "96.09Z"],
  // santé non remboursée
  [/osteo|chiro|psychomot/, "86.90E"], [/psycholog|dietet|nutrition|sophro|naturo|hypno|therapeut/, "86.90F,96.04Z"],
  // indépendants, services aux entreprises
  [/photograph/, "74.20Z"], [/video|realisat/, "59.11B"], [/graphi|illustrat|webdesign|web design/, "74.10Z"], [/consult|conseil en/, "70.22Z"], [/\bformat(eur|rice|ion)/, "85.59A"],
  [/traduct|interpret/, "74.30Z"], [/developp|programm|integrateur web/, "62.01Z"], [/community|publicit|marketing/, "73.11Z"], [/redact|journalis|ecrivain|blog/, "90.03B"],
  [/professeur|soutien scolaire|cours particuliers|enseignant/, "85.59B"], [/coach sportif|educateur sportif|moniteur de sport/, "85.51Z"], [/salle de sport|fitness/, "93.13Z"],
  [/secretar|assistant.*administratif/, "82.11Z"], [/comptab/, "69.20Z"], [/avocat|juriste/, "69.10Z"], [/immobili/, "68.31Z"], [/assur|courtier/, "66.22Z"],
  [/musicien|chanteu|disc-jockey|\bdj\b/, "90.01Z"], [/securite|gardiennage/, "80.10Z"],
  // hébergement, agriculture
  [/hotel/, "55.10Z"], [/gite|chambre d.hote|location saisonniere/, "55.20Z"], [/camping/, "55.30Z"], [/maraich/, "01.13Z"], [/vitic|vigneron/, "01.21Z"], [/apicult/, "01.49Z"],
];
const plat = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
// sans code connu, on cherche par le nom des entreprises : le premier mot parlant du métier (« Sommelier / Sommelière en restauration » → « sommelier »)
export const motDuMetier = metier => String(metier || "").split(/[\/,(]/)[0].trim().replace(/\s+/g, " ");
export const codesPour = metier => { const m = plat(metier); return m.length > 2 ? (CODES.find(x => x[0].test(m)) || [0, ""])[1] : ""; };
// la base des métiers du formulaire (le répertoire officiel des métiers), chargée au premier toucher du champ
let baseMetiers = null;
const chargerMetiers = () => baseMetiers || (baseMetiers = fetch("/medias/metiers.json").then(r => r.json()).then(l => l.map(m => [m, plat(m)])).catch(() => []));
const API = "https://recherche-entreprises.api.gouv.fr/search", GEO = "https://geo.api.gouv.fr/communes";
const propre = t => String(t || "").toLowerCase().replace(/(^|[\s'-])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase());   // « DURAND PLOMBERIE » → « Durand Plomberie »
// « MARCOS SAMPAIO DA SILVA (MC RENOVATION) » → l'enseigne d'abord : « Mc Renovation » ; « YDM (YDM) » → « Ydm »
const enseigne = e => { const m = String(e.nom_complet || "").match(/^(.*?)\s*\(([^)]*)\)/); if (!m) return propre(e.nom_complet);
  return propre(m[1]).toLowerCase() === propre(m[2]).toLowerCase() ? propre(m[1]) : propre(m[2]); };
let memoire = { metier: "", code: "", ville: null, texteVille: "", resultats: null, total: 0, pages: 1, derniere: 1, brut: [], codes: "", mot: "" };   // on retrouve sa recherche en revenant de la fiche

const DEPS = "https://geo.api.gouv.fr/departements";
// trois pages de l'annuaire (75 entreprises) à partir d'une page donnée ; le lieu est une commune ou un département
// Paris, Lyon et Marseille : l'annuaire range leurs entreprises par arrondissement, pas sous le code de la ville
const suite = (de, n) => Array.from({ length: n }, (x, i) => String(de + i));
const ARRONDISSEMENTS = { "75056": suite(75101, 20), "69123": suite(69381, 9), "13055": suite(13201, 16) };
const communesDe = lieu => ARRONDISSEMENTS[lieu.code] || [lieu.code];
async function chercher(codes, lieu, page = 1, mot = "") {
  let tout = [], total = 0, pages = 1, derniere = page;
  for (let p = page; p < page + 4; p++) {
    const r = await fetch(`${API}?${codes ? "activite_principale=" + encodeURIComponent(codes) : "q=" + encodeURIComponent(mot)}&${lieu.type === "dep" ? "departement=" + lieu.code : "code_commune=" + communesDe(lieu).join(",")}&etat_administratif=A&per_page=25&page=${p}`);
    if (!r.ok) throw new Error(r.status === 429 ? "L'annuaire reçoit trop de demandes : réessayez dans un instant." : "L'annuaire ne répond pas (" + r.status + ").");
    const d = await r.json(); tout = tout.concat(d.results || []); total = d.total_results || tout.length; pages = d.total_pages || 1; derniere = p;
    if (p >= pages) break;
  }
  return { tout, total, pages, derniere };
}
// tout est montré (11/11/2026, « tu les mets ici quand même ») : le siège sur place d'abord, puis les entreprises dont le siège est ailleurs,
// puis celles qui refusent la prospection commerciale, montrées sans bouton d'ajout (la loi interdit de les démarcher à partir de l'annuaire)
function ranger(tout, lieu) {
  const vus = new Set(), garde = tout.filter(e => e.siege && e.statut_diffusion === "O" && !vus.has(e.siren) && vus.add(e.siren));
  garde.forEach(e => { e._refus = !!e.opposition_diffusion_commerciale; e._ailleurs = lieu.type === "dep" ? e.siege.departement !== lieu.code : !communesDe(lieu).includes(e.siege.commune); });
  const rang = e => e._refus ? 2 : e._ailleurs ? 1 : 0;
  garde.sort((a, b) => rang(a) - rang(b) || String(b.date_creation || "").localeCompare(String(a.date_creation || "")));   // à rang égal, les plus récentes d'abord
  // celles qui ont demandé que leurs coordonnées ne soient pas diffusées : l'annuaire ne donne pas leur nom, elles ne sont pas montrées
  const cachees = new Set(tout.filter(e => e.statut_diffusion !== "O").map(e => e.siren)).size;
  return { liste: garde, ailleurs: garde.filter(e => e._ailleurs && !e._refus).length, refus: garde.filter(e => e._refus).length, cachees };
}

export async function vueTrouver(c) {
  const { db, vue, esc, toast, erreur } = c;
  let prospects = [];
  try { prospects = await db.lister("prospects"); } catch (e) { vue.innerHTML = `<div class="entete"><h1>Trouver des entreprises</h1></div><div class="carte"><b>La table des prospects n'existe pas encore dans votre base.</b><p class="gris" style="margin-top:6px">Passez une fois le fichier nora-schema-6-prospects.sql dans l'éditeur SQL de Supabase.</p></div>`; return; }
  const deja = new Set(prospects.map(p => (String(p.source || "").match(/SIREN (\d{9})/) || [])[1]).filter(Boolean));
  vue.innerHTML = `
    <div class="entete"><div><div class="petit"><a href="#/prospects" style="color:inherit">‹ Prospects</a></div><h1>Trouver des entreprises</h1></div></div>
    <form class="carte" id="fr" style="margin-bottom:16px">
      <div class="champ"><label>Quel métier ?</label><input type="text" id="tMetier" value="${esc(memoire.metier)}" placeholder="Tapez les premières lettres : plombier, coiffeuse, traiteur…" autocomplete="off"><div id="tMetiers"></div></div>
      <div class="champ"><label>Code d'activité de ce métier</label><input type="text" id="tCode" value="${esc(memoire.code)}" placeholder="ex. 43.22A"><small class="gris" id="tCodeAide">L'annuaire range les entreprises par code d'activité : il se remplit d'après le métier, et se corrige.</small></div>
      <div class="champ"><label>Dans quelle ville, ou quel département ?</label><input type="text" id="tVille" value="${esc(memoire.texteVille)}" placeholder="Ville, code postal, ou département (Yvelines, 78)" autocomplete="off"><div id="tVilles"></div></div>
      <button class="btn" style="width:100%">Chercher</button>
      <p class="gris" style="font-size:13px;margin:10px 0 0">Source : l'annuaire officiel des entreprises. Les entreprises qui refusent la prospection commerciale sont signalées : la loi interdit de les démarcher à partir de l'annuaire.</p>
    </form>
    <div id="tRes"></div>`;
  const el = i => document.getElementById(i);
  // le métier : les propositions viennent de la base du formulaire ; le code d'activité suit ce qui est tapé
  const suivreCode = () => { const c = codesPour(el("tMetier").value), z = el("tCode"); if (c) z.value = z.dataset.auto = c; else if (z.value === z.dataset.auto) z.value = z.dataset.auto = "";   // un code rempli par l'appli s'efface si le métier change ; un code tapé à la main reste
    el("tCodeAide").textContent = c ? "Trouvé d'après le métier. Vous pouvez le corriger." : el("tMetier").value.trim().length > 2 ? "L'appli ne connaît pas le code de ce métier : elle cherchera les entreprises dont le nom contient ce mot. Pour une liste plus complète, tapez le code d'activité (il figure sur l'extrait d'immatriculation d'une entreprise du même métier)." : "L'annuaire range les entreprises par code d'activité : il se remplit d'après le métier, et se corrige."; };
  el("tMetier").onfocus = chargerMetiers;
  el("tMetier").oninput = async () => { suivreCode(); const mots = plat(el("tMetier").value).split(/[\s,/'-]+/).filter(Boolean); if (!mots.length) { el("tMetiers").innerHTML = ""; return; }
    const l = await chargerMetiers(), debut = [], dedans = [];
    for (const [m, p] of l) { if (!mots.every(w => p.includes(w))) continue; (p.startsWith(mots[0]) ? debut : dedans).push(m); if (debut.length >= 6) break; }
    if (plat(el("tMetier").value).split(/[\s,/'-]+/).filter(Boolean).join(" ") !== mots.join(" ")) return;   // on a continué de taper
    el("tMetiers").innerHTML = debut.concat(dedans).slice(0, 6).map(m => `<button type="button" class="choix" style="margin-top:6px" data-metier="${esc(m)}"><span>${esc(m)}</span><span>›</span></button>`).join(""); };
  el("tMetiers").onclick = e => { const b = e.target.closest("[data-metier]"); if (!b) return; el("tMetier").value = b.dataset.metier; el("tMetiers").innerHTML = ""; suivreCode(); };
  // le lieu : la base officielle des communes et des départements ; deux ou trois chiffres seuls, c'est un numéro de département
  let attente, numero = 0;
  el("tVille").oninput = () => { memoire.ville = null; clearTimeout(attente); const q = el("tVille").value.trim(); if (q.length < 2) { el("tVilles").innerHTML = ""; return; }
    attente = setTimeout(async () => { const n = ++numero, lire = u => fetch(u).then(r => r.json()).catch(() => []);
      const numDep = /^(\d{2,3}|2[abAB])$/.test(q);
      const [deps, villes] = await Promise.all([lire(`${DEPS}?${numDep ? "code=" + q.toUpperCase() : "nom=" + encodeURIComponent(q) + "&limit=3"}&fields=nom,code`),
        numDep ? [] : lire(`${GEO}?${/^\d{5}$/.test(q) ? "codePostal=" + q : "nom=" + encodeURIComponent(q) + "&boost=population&limit=6"}&fields=nom,code,codesPostaux`)]);
      if (n !== numero) return;
      const bouton = (type, code, nom, detail) => `<button type="button" class="choix" style="margin-top:6px" data-type="${type}" data-code="${esc(code)}" data-nom="${esc(nom)}"><span>${esc(nom)} <small class="gris">${esc(detail)}</small></span><span>›</span></button>`;
      el("tVilles").innerHTML = (Array.isArray(deps) ? deps : []).map(d => bouton("dep", d.code, d.nom, "département " + d.code)).join("") + (Array.isArray(villes) ? villes : []).map(v => bouton("ville", v.code, v.nom, (v.codesPostaux || [""])[0])).join(""); }, 220); };
  el("tVilles").onclick = e => { const b = e.target.closest("[data-code]"); if (!b) return; memoire.ville = { type: b.dataset.type, code: b.dataset.code, nom: b.dataset.nom };
    el("tVille").value = memoire.texteVille = b.dataset.type === "dep" ? `${b.dataset.nom} (${b.dataset.code})` : b.dataset.nom; el("tVilles").innerHTML = ""; };

  const montrer = () => {
    const r = memoire.resultats; if (!r) return;
    const carte = (e, i) => { const s = e.siege, ici = (e.matching_etablissements || [])[0], d = (e.dirigeants || []).find(x => x.type_dirigeant === "personne physique" && x.nom), an = String(e.date_creation || "").slice(0, 4), fait = deja.has(e.siren);
      return `<div class="ligne-liste" style="flex-wrap:wrap;gap:8px"><div style="flex:1 1 100%"><b>${esc(enseigne(e))}</b>
        <small style="display:block">${esc(propre((e._ailleurs && ici?.adresse) || s.adresse || ""))}</small>${e._ailleurs ? `<small style="display:block">Siège à ${esc(propre(s.libelle_commune || ""))}</small>` : ""}<small style="display:block">${an ? "Créée en " + an : ""}${d ? " · " + esc(propre((d.prenoms || "").split(" ")[0] + " " + String(d.nom).split(" (")[0])) : ""}</small></div>
        <div class="actions-doc" style="margin:0">${e._refus ? '<span class="badge refuse">Refuse la prospection : à ne pas démarcher</span>' : fait ? '<span class="badge signe">Déjà dans mes prospects</span>' : `<button class="btn petit-btn" data-ajout="${i}">Ajouter à mes prospects</button>`}
          <a class="btn discret petit-btn" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(enseigne(e) + " " + (s.libelle_commune || ""))}">Chercher son site</a>
          <a class="btn discret petit-btn" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(enseigne(e) + " " + (s.libelle_commune || "") + " facebook instagram")}">Chercher ses réseaux</a></div></div>`; };
    const dep = memoire.ville.type === "dep", ou = dep ? `dans le département ${esc(memoire.ville.nom)} (${esc(memoire.ville.code)})` : `à ${esc(memoire.ville.nom)}`, reste = memoire.derniere < memoire.pages;
    el("tRes").innerHTML = `<p class="gris" style="margin:0 0 10px">${r.liste.length ? `${r.liste.length} entreprise${r.liste.length > 1 ? "s" : ""} ${ou}${reste ? `, sur ${memoire.total} dans l'annuaire (les autres arrivent avec le bouton du bas)` : ""} : celles ${dep ? "du département" : "de la ville"} d'abord, les plus récentes en tête.` : `Aucune entreprise trouvée ${ou} pour ce métier. Essayez ${memoire.mot ? "un mot plus courant, ou le code d'activité" : dep ? "un autre code d'activité" : "une ville voisine, ou le département"}.`}
      ${memoire.mot ? ` Recherche faite sur le nom des entreprises (« ${esc(memoire.mot)} ») : celles dont le nom ne dit pas le métier n'y sont pas.` : ""}${r.ailleurs ? ` ${r.ailleurs} ont leur siège ${dep ? "dans un autre département" : "dans une autre ville"}.` : ""}${r.cachees ? ` ${r.cachees} ne sont pas montrées : elles ont demandé que leurs coordonnées ne soient pas diffusées.` : ""}${r.refus ? ` ${r.refus} refusent la prospection commerciale : elles sont montrées en bas, sans bouton d'ajout.` : ""}</p><div class="liste">${r.liste.map(carte).join("")}</div>
      ${reste ? `<button type="button" class="btn clair" id="tSuite" style="width:100%;margin-top:12px">Voir les suivantes (encore ${Math.max(0, memoire.total - memoire.derniere * 25)} dans l'annuaire)</button>` : ""}`;
  };
  el("fr").onsubmit = async e => {
    e.preventDefault();
    memoire.metier = el("tMetier").value.trim(); memoire.code = el("tCode").value.trim().toUpperCase().replace(/\s+/g, "");
    const codes = memoire.code; el("tMetiers").innerHTML = "";
    memoire.mot = codes ? "" : motDuMetier(memoire.metier);
    if (!codes && memoire.mot.length < 3) return toast("Indiquez un métier.");
    if (codes && !/^\d{2}\.\d{2}[A-Z](,\d{2}\.\d{2}[A-Z])*$/.test(codes)) return toast("Le code d'activité s'écrit comme 43.22A (plusieurs codes : séparés par une virgule).");
    if (!memoire.ville) return toast("Choisissez la ville ou le département dans la liste proposée.");
    el("tRes").innerHTML = '<p class="gris">Recherche dans l\'annuaire…</p>';
    try { const x = await chercher(codes, memoire.ville, 1, memoire.mot); Object.assign(memoire, { brut: x.tout, total: x.total, pages: x.pages, derniere: x.derniere, codes, resultats: ranger(x.tout, memoire.ville) }); montrer(); } catch (er) { el("tRes").innerHTML = ""; erreur(er); }
  };
  el("tRes").onclick = async e => {
    if (e.target.closest("#tSuite")) { e.target.disabled = true;   // la suite : trois pages de plus, rangées avec les précédentes
      try { const x = await chercher(memoire.codes, memoire.ville, memoire.derniere + 1, memoire.mot); memoire.brut = memoire.brut.concat(x.tout); memoire.derniere = x.derniere; memoire.pages = x.pages; memoire.resultats = ranger(memoire.brut, memoire.ville); montrer(); } catch (er) { e.target.disabled = false; erreur(er); }
      return; }
    const b = e.target.closest("[data-ajout]"); if (!b) return; b.disabled = true;
    const x = memoire.resultats.liste[+b.dataset.ajout], s = x.siege, d = (x.dirigeants || []).find(y => y.type_dirigeant === "personne physique" && y.nom);
    try {
      const qui = (() => { try { return localStorage.getItem("nora_prospecteur") || ""; } catch (e) { return ""; } })(), ligne = { ...(qui ? { prospecteur: qui } : {}), entreprise: enseigne(x), nom: d ? propre((d.prenoms || "").split(" ")[0] + " " + String(d.nom).split(" (")[0]) : null, metier: memoire.metier || null,
        ville: propre((x._ailleurs && (x.matching_etablissements || [])[0]?.libelle_commune) || s.libelle_commune || memoire.ville.nom), source: `Annuaire des entreprises · SIREN ${x.siren}`, etape: "nouveau", constats: [], opposition: false,
        historique: [{ par: qui, d: new Date().toISOString().slice(0, 10), t: "note", texte: `Trouvée dans l'annuaire des entreprises. Adresse : ${propre(s.adresse || "")}.${x.date_creation ? " Créée en " + String(x.date_creation).slice(0, 4) + "." : ""} E-mail et téléphone à recopier depuis son site.` }] };
      try { await db.enregistrer("prospects", ligne); } catch (er) { if (!/prospecteur/.test(String(er?.message || er))) throw er; delete ligne.prospecteur; await db.enregistrer("prospects", ligne); toast("Ajoutée sans le prospecteur : la colonne manque dans la base"); }
      deja.add(x.siren); toast("Ajoutée à vos prospects ✓"); montrer();
    } catch (er) { b.disabled = false; erreur(er); }
  };
  montrer();
}
