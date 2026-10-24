// Carnet de projet (repris du carnet de chantier de l'appli Flex) : photos, notes, choses à faire, retours du client,
// dépenses, heures, paiements et rendez-vous, datés et rangés par étape (avant, création, en ligne).

import { OBJETS_RDV, carteRdv, lierRdv } from "./agenda.js";
import { totaux } from "./pdf.js";

const ETAPES = { avant: "Avant", pendant: "Création", apres: "En ligne" };
const TYPES = {
  note: { nom: "Note", bouton: "+ Note", aide: "Le client veut une page pour ses tarifs" },
  tache: { nom: "À faire", bouton: "+ À faire", aide: "Demander les photos du salon" },
  imprevu: { nom: "Retour du client", bouton: "+ Retour du client", aide: "Il préfère un bandeau bleu marine" },
  depense: { nom: "Dépense", bouton: "+ Dépense", aide: "Nom de domaine" },
  heures: { nom: "Heures", bouton: "+ Heures", aide: "Détail (facultatif) : intégration des textes" },
  paiement: { nom: "Paiement reçu", bouton: "+ Paiement reçu", aide: "Détail (facultatif) : acompte par virement" },
  rdv: { nom: "Rendez-vous", bouton: "+ Rendez-vous", aide: "Précision (facultatif) : préparer la maquette" }
};
export const CATEGORIES = { domaine: "Noms de domaine", hebergement: "Hébergement", logiciels: "Logiciels et abonnements", publicite: "Publicité",
  materiel: "Matériel informatique", telephone: "Téléphone et internet", soustraitance: "Sous-traitance", deplacement: "Déplacements",
  formation: "Formation", banque: "Banque et assurance", autre: "Autre" };
const duree = h => { const t = Math.round((Number(h) || 0) * 60); return `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, "0")}`; };
// échéancier de Nora Éditions : un acompte à la commande, le solde à la livraison
export const AVANCEMENTS = acompte => [["signature", "Commande", Number(acompte) || 30], ["fin", "Livré", 100]];
// ce que le client a versé, comparé à ce qui est dû selon l'avancement
export function etatPaiements(lignes, totalDevis, acompte) {
  const verse = lignes.filter(l => l.type === "paiement").reduce((a, l) => a + (Number(l.montant) || 0), 0);
  const av = lignes.filter(l => l.type === "avancement").sort((a, b) => a.created_at < b.created_at ? 1 : -1)[0];
  const pct = av ? Number(av.montant) || 0 : totalDevis ? Number(acompte) || 30 : 0;
  const du = Math.round(totalDevis * pct) / 100;
  return { verse, pct, du, aReclamer: Math.max(0, Math.round((du - verse) * 100) / 100) };
}
const eur = n => (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const arrondi2 = n => Math.round(n * 100) / 100;
// un paiement reçu vient en déduction des factures envoyées du client, la plus ancienne d'abord
async function imputerPaiement(db, clientId, montant) {
  const factures = (await db.lister("documents")).filter(d => d.client_id === clientId && d.type === "facture" && d.statut === "envoye")
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  let reste = montant; const part = {}, payees = [], numeros = [];
  for (const d of factures) {
    if (reste <= 0.01) break;
    const du = totaux(d).reste; if (du <= 0.01) continue;
    const a = arrondi2(Math.min(du, reste));
    d.deja_regle = arrondi2((Number(d.deja_regle) || 0) + a);
    if (totaux(d).reste <= 0.01) { d.statut = "paye"; payees.push(d.id); }
    await db.enregistrer("documents", d);
    part[d.id] = a; numeros.push(d.numero); reste = arrondi2(reste - a);
  }
  return { part, payees, numeros };
}
// on retire un paiement : les factures retrouvent ce qu'elles avaient avant
async function annulerImputation(db, ligne) {
  let imp; try { imp = JSON.parse(ligne.categorie || ""); } catch { return; }
  if (!imp?.part) return;
  for (const [id, a] of Object.entries(imp.part)) {
    const d = await db.lire("documents", id); if (!d) continue;
    d.deja_regle = Math.max(0, arrondi2((Number(d.deja_regle) || 0) - Number(a)));
    if ((imp.payees || []).includes(id) && d.statut === "paye") d.statut = "envoye";
    await db.enregistrer("documents", d);
  }
}
const estPhoto = l => (l.chemin || l.image) && l.type !== "depense";

// photo du téléphone → JPEG de 1600 px au plus
async function reduire(fichier) {
  const img = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise(ok => c.toBlob(ok, "image/jpeg", .8));
}
const chargerImage = src => new Promise((ok, ko) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = ko; i.src = src; });

// image verticale 1080 × 1920 : la photo d'avant en haut, celle d'après en bas, le logo au milieu
async function montageAvantApres(srcAvant, srcApres) {
  const [a, b, logo] = await Promise.all([chargerImage(srcAvant), chargerImage(srcApres), chargerImage("/medias/logo-site.png").catch(() => null)]);
  const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"); g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
  const couvrir = (img, y, h) => { const k = Math.max(W / img.width, h / img.height), w2 = img.width * k, h2 = img.height * k;
    g.save(); g.beginPath(); g.rect(0, y, W, h); g.clip(); g.drawImage(img, (W - w2) / 2, y + (h - h2) / 2, w2, h2); g.restore(); };
  couvrir(a, 0, H / 2 - 6); couvrir(b, H / 2 + 6, H / 2 - 6);
  const etiquette = (txt, y) => { g.font = "600 46px Inter, Arial, sans-serif"; const w = g.measureText(txt).width + 64;
    g.fillStyle = "rgba(27,26,24,.82)"; g.beginPath(); g.roundRect(40, y, w, 84, 42); g.fill(); g.fillStyle = "#fff"; g.fillText(txt, 72, y + 58); };
  etiquette("AVANT", 40); etiquette("APRÈS", H / 2 + 46);
  if (logo) { const lw = 220, lh = lw * logo.height / logo.width; g.fillStyle = "#fff"; g.beginPath(); g.roundRect(W - lw - 70, H / 2 - lh / 2 - 24, lw + 40, lh + 48, 24); g.fill(); g.drawImage(logo, W - lw - 50, H / 2 - lh / 2, lw, lh); }
  return new Promise(ok => c.toBlob(ok, "image/jpeg", .9));
}

async function partagerFichier(blob, nom) {
  const f = new File([blob], nom, { type: blob.type || "image/jpeg" });
  if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f] }); return; } catch (er) { if (er.name === "AbortError") return; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click();
}

export async function monterCarnet(el, { db, client, P = {}, toast, esc, erreur, envoyerMessage }) {
  let devisSignes = 0, devisTTC = 0, acompte = Number(P.acompte_pct) || 30;
  try {
    const signes = (await db.lister("documents")).filter(d => d.client_id === client.id && d.type === "devis" && d.statut === "signe");
    devisSignes = signes.reduce((a, d) => a + (Number(d.total_ht) || 0), 0); // la marge se calcule sur le HT
    devisTTC = signes.reduce((a, d) => a + totaux(d).ttc, 0); // le client paie le TTC
    if (signes[0]?.acompte_pct) acompte = Number(signes[0].acompte_pct);
  } catch { /* pas grave */ }
  let etape = "pendant", filtre = "tout", saisie = null, lignes = [], urls = {}, enCours = 0, choixMontage = null;
  const caches = new Set(); // entrées retirées, en attente de suppression (on peut annuler)

  const charger = async () => {
    try { lignes = (await db.listerCarnet(client.id)).filter(l => l.type !== "mesures"); urls = await db.urlsCarnet(lignes); } // les mesures ont leur propre rubrique
    catch (e) { el.innerHTML = '<p class="gris">Le carnet n\'est pas encore activé.</p>'; return false; }
    lignes.forEach(l => { if (!l.type || (l.type === "note" && (l.chemin || l.image))) l.type = estPhoto(l) ? "photo" : "note"; });
    return true;
  };
  const jour = iso => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const heure = iso => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const vivantes = () => lignes.filter(l => !caches.has(l.id));
  const garde = l => filtre === "tout" ? true : ETAPES[filtre] ? l.etape === filtre : filtre === "tache" ? l.type === "tache" && !l.fait : l.type === filtre;

  const carteEntree = l => {
    const tete = `<small>${esc(TYPES[l.type]?.nom || "Note")} · ${esc(ETAPES[l.etape])} · ${heure(l.created_at)}</small>`;
    const croix = `<button type="button" class="icone" data-retirer="${l.id}" aria-label="Retirer">✕</button>`;
    if (l.type === "tache") return `<div class="note-carnet tache ${l.fait ? "faite" : ""}"><label><input type="checkbox" data-fait="${l.id}" ${l.fait ? "checked" : ""}><span>${esc(l.texte)}</span></label>${croix}</div>`;
    if (l.type === "heures") {
      const fin = l.fait ? new Date(new Date(l.created_at).getTime() + (Number(l.montant) || 0) * 3.6e6).toISOString() : null;
      return `<div class="note-carnet heures"><small>Heures · ${esc(ETAPES[l.etape])}</small><p><b>${l.fait ? duree(l.montant) : "en cours"}</b> · ${heure(l.created_at)} → ${fin ? heure(fin) : "…"}${l.texte && l.texte !== "Pointage" ? " · " + esc(l.texte) : ""}</p>${croix}</div>`;
    }
    if (l.type === "rdv") return carteRdv(l, esc, { retirer: true });
    if (l.type === "paiement") return `<div class="note-carnet paiement"><small>Paiement reçu · ${new Date(l.created_at).toLocaleDateString("fr-FR")}</small><p><b>${eur(l.montant)} €</b>${l.texte ? " · " + esc(l.texte) : ""}</p>${croix}</div>`;
    if (l.type === "avancement") { const a = AVANCEMENTS(acompte).find(x => x[2] === Number(l.montant)); return `<div class="note-carnet"><small>Avancement · ${heure(l.created_at)}</small><p>${esc(a ? a[1] : "Avancement")} : ${Number(l.montant)} % du devis dû</p>${croix}</div>`; }
    if (l.type === "depense") return `<div class="note-carnet depense">${tete}<p><b>${eur(l.montant)} €</b> · ${esc(CATEGORIES[l.categorie] || "Dépense")}${l.texte ? " · " + esc(l.texte) : ""}</p>${urls[l.id] ? `<button type="button" class="lien-ticket" data-voir="${l.id}">Voir le ticket</button>` : ""}${croix}</div>`;
    return `<div class="note-carnet ${l.type === "imprevu" ? "imprevu" : ""}">${tete}<p>${esc(l.texte).replace(/\n/g, "<br>")}</p>${croix}</div>`;
  };

  const dessiner = () => {
    const tout = vivantes(), visibles = tout.filter(garde);
    const jours = [];
    visibles.forEach(l => { const j = jour(l.created_at); let g = jours.find(x => x.j === j); if (!g) jours.push(g = { j, l: [] }); g.l.push(l); });
    const resteAFaire = tout.filter(l => l.type === "tache" && !l.fait).length, imprevus = tout.filter(l => l.type === "imprevu").length;
    const depenses = tout.filter(l => l.type === "depense").reduce((a, l) => a + (Number(l.montant) || 0), 0);
    const heures = tout.filter(l => l.type === "heures" && l.fait).reduce((a, l) => a + (Number(l.montant) || 0), 0);
    const enCoursPointage = tout.find(l => l.type === "heures" && !l.fait);
    const avants = tout.filter(l => l.type === "photo" && l.etape === "avant"), apres = tout.filter(l => l.type === "photo" && l.etape === "apres");
    const puce = (k, n) => `<button type="button" class="btn ${k === filtre ? "clair" : "discret"} petit-btn" data-filtre="${k}">${n}</button>`;
    const T = saisie && TYPES[saisie];
    el.innerHTML = `
      <div class="pointage ${enCoursPointage ? "actif" : ""}">
        ${enCoursPointage
          ? `<div><b>Au travail depuis ${heure(enCoursPointage.created_at)}</b><small>${duree((Date.now() - new Date(enCoursPointage.created_at)) / 3.6e6)}</small></div><button type="button" class="btn" id="cPars">J'arrête</button>`
          : `<div><b>Temps passé</b><small>Touchez quand vous commencez, puis quand vous arrêtez</small></div><button type="button" class="btn" id="cArrive">Je commence</button>`}
      </div>
      <div class="carte" style="margin-bottom:12px">
        <label>Ajouter au carnet · étape</label>
        <div class="palette" style="margin:6px 0 12px">${Object.entries(ETAPES).map(([k, n]) => `<button type="button" class="btn ${k === etape ? "" : "discret"} petit-btn" data-etape="${k}">${n}</button>`).join("")}</div>
        <div class="actions-doc" style="margin:0">
          <label class="btn petit-btn" style="display:inline-flex">+ Photos<input type="file" id="cPhotos" accept="image/*" multiple hidden></label>
          ${Object.entries(TYPES).map(([k, t]) => `<button type="button" class="btn ${saisie === k ? "" : "clair"} petit-btn" data-saisie="${k}">${t.bouton}</button>`).join("")}
        </div>
        ${T ? `<div style="margin-top:10px">
          ${saisie === "depense" ? `<div class="champ"><label for="cCategorie">Catégorie</label><select id="cCategorie">${Object.entries(CATEGORIES).map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></div>
            <div class="deux"><div class="champ"><label for="cMontant">Montant €</label><input type="number" id="cMontant" step="0.01" min="0" inputmode="decimal"></div>
            <div class="champ"><label>Ticket (facultatif)</label><label class="btn discret petit-btn" style="display:inline-flex">${"Photo du ticket"}<input type="file" id="cTicket" accept="image/*" hidden></label></div></div>` : ""}
          ${saisie === "rdv" ? (() => { const d = new Date(); d.setDate(d.getDate() + 1); return `<div class="champ"><label for="cRdvObjet">Rendez-vous</label><select id="cRdvObjet">${OBJETS_RDV.map(o => `<option>${o}</option>`).join("")}</select></div>
            <div class="deux"><div class="champ"><label for="cRdvDate">Date</label><input type="date" id="cRdvDate" value="${d.toISOString().slice(0, 10)}"></div>
            <div class="champ"><label for="cRdvHeure">Heure</label><input type="time" id="cRdvHeure" value="09:00"></div></div>`; })() : ""}
          ${saisie === "paiement" ? `<div class="champ"><label for="cMontant">Montant reçu €</label><input type="number" id="cMontant" step="0.01" min="0" inputmode="decimal"></div>` : ""}
          ${saisie === "heures" ? `<div class="deux"><div class="champ"><label for="cHeures">Nombre d'heures</label><input type="number" id="cHeures" step="0.25" min="0" inputmode="decimal" placeholder="7,5"></div>
            <div class="champ"><label for="cDebut">Début</label><input type="time" id="cDebut" value="08:00"></div></div>` : ""}
          <textarea id="cTexte" rows="${saisie === "tache" ? 1 : 3}" placeholder="${esc(saisie === "depense" ? "Détail (facultatif) : nom de domaine, logiciel…" : T.aide)}"></textarea>
          <div class="actions-doc" style="margin:8px 0 0"><button type="button" class="btn petit-btn" id="cOk">Ajouter</button><button type="button" class="btn discret petit-btn" data-saisie="">Annuler</button></div>
        </div>` : ""}
        ${enCours ? `<p class="gris" style="font-size:13px;margin-top:8px">Envoi de ${enCours} photo${enCours > 1 ? "s" : ""}…</p>` : ""}
      </div>
      <div class="resume-carnet">
        <button type="button" data-filtre="tache"><b>${resteAFaire}</b>à faire</button>
        <button type="button" data-filtre="imprevu"><b>${imprevus}</b>imprévu${imprevus > 1 ? "s" : ""}</button>
        <button type="button" data-filtre="heures"><b>${duree(heures)}</b>de travail</button>
        <button type="button" data-filtre="depense"><b>${eur(depenses)} €</b>dépenses</button>
      </div>
      ${devisSignes
        ? `<button type="button" class="reste-carnet" data-filtre="depense"><span>${Number(P.taux_horaire) ? "Marge du projet" : "Reste après dépenses"}<small>Devis signés ${eur(devisSignes)} €, moins ce que coûte le projet</small></span><b>${eur(devisSignes - depenses - heures * (Number(P.taux_horaire) || 0))} €</b></button>`
        : `<p class="gris" style="font-size:13px;margin:-2px 0 12px">Le reste après dépenses s'affiche ici dès qu'un devis de ce client est signé.</p>`}
      ${devisSignes ? (() => { const e = etatPaiements(tout, devisTTC, acompte); return `<div class="carte paiements-carnet" style="margin-bottom:12px">
        <b>Paiements du client</b>
        <div class="palette" style="margin:8px 0 6px">${AVANCEMENTS(acompte).map(([k, n, p]) => `<button type="button" class="btn ${e.pct === p ? "" : "discret"} petit-btn" data-avancement="${p}">${n} · ${p} %</button>`).join("")}</div>
        <div class="ligne-bilan"><span>Dû à ce stade (${e.pct} % de ${eur(devisTTC)} €)</span><span>${eur(e.du)} €</span></div>
        <div class="ligne-bilan"><span>Déjà versé</span><span>${eur(e.verse)} €</span></div>
        <div class="ligne-bilan total ${e.aReclamer ? "a-reclamer" : ""}"><span>${e.aReclamer ? "À réclamer maintenant" : "✓ Le client est à jour"}</span><span>${e.aReclamer ? eur(e.aReclamer) + " €" : ""}</span></div>
        <div class="ligne-bilan"><span>Reste à payer sur le devis</span><span>${eur(Math.max(0, devisTTC - e.verse))} €</span></div>
        <div class="actions-doc" style="margin:8px 0 0"><button type="button" class="btn clair petit-btn" data-saisie="paiement">+ Paiement reçu</button></div></div>`; })() : ""}
      ${filtre === "depense" || filtre === "heures" ? bilan(tout) : ""}
      ${avants.length && apres.length ? `<button type="button" class="btn clair petit-btn" id="cMontage" style="margin-bottom:10px">Créer une image avant / après</button>` : ""}
      ${choixMontage ? `<div class="carte" style="margin-bottom:12px"><b>${choixMontage.avant ? "Touchez la photo d'après" : "Touchez la photo d'avant"}</b>
        <p class="gris" style="font-size:13px">L'image se fait au format vertical, pour TikTok, Instagram ou Facebook.</p>
        <div class="photos-pv" style="margin-top:8px">${(choixMontage.avant ? apres : avants).map(l => `<button type="button" class="vignette" data-montage="${l.id}"><img src="${esc(urls[l.id] || "")}" alt=""></button>`).join("")}</div>
        <div class="actions-doc" style="margin:8px 0 0"><button type="button" class="btn discret petit-btn" id="cMontageNon">Annuler</button></div></div>` : ""}
      <div class="palette" style="margin-bottom:10px">${puce("tout", "Tout")}${Object.entries(ETAPES).map(([k, n]) => puce(k, n)).join("")}</div>
      ${jours.length ? jours.map(g => `
        <div class="jour-carnet"><div class="petit" style="margin:14px 0 8px">${esc(g.j)}</div>
          ${g.l.some(l => l.type === "photo") ? `<div class="photos-pv">${g.l.filter(l => l.type === "photo").map(l => `<button type="button" class="vignette" data-voir="${l.id}"><img src="${esc(urls[l.id] || "")}" alt="${esc(l.texte || "Photo " + ETAPES[l.etape])}" loading="lazy"><span>${esc(ETAPES[l.etape])} · ${heure(l.created_at)}</span>${l.texte ? `<em>${esc(l.texte)}</em>` : ""}</button>`).join("")}</div>` : ""}
          ${g.l.filter(l => l.type !== "photo").map(carteEntree).join("")}
        </div>`).join("") : `<p class="gris">${filtre === "tout" ? "Rien dans le carnet pour l'instant : notez ici les échanges, les textes et les photos reçus du client." : "Rien ici."}</p>`}`;
    lier();
  };

  // ce que coûte le chantier à l'artisan, par catégorie, et ce qu'il reste sur les devis signés
  const bilan = tout => {
    const deps = tout.filter(l => l.type === "depense"), parCat = {};
    deps.forEach(l => { const k = l.categorie || "autre"; parCat[k] = (parCat[k] || 0) + (Number(l.montant) || 0); });
    const total = Object.values(parCat).reduce((a, b) => a + b, 0);
    const h = tout.filter(l => l.type === "heures" && l.fait).reduce((a, l) => a + (Number(l.montant) || 0), 0), taux = Number(P.taux_horaire) || 0, mo = h * taux;
    return `<div class="carte" style="margin-bottom:12px"><b>Ce que coûte le projet</b>
      ${Object.entries(parCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="ligne-bilan"><span>${esc(CATEGORIES[k] || k)}</span><span>${eur(v)} €</span></div>`).join("") || '<p class="gris" style="font-size:13px">Aucune dépense notée.</p>'}
      <div class="ligne-bilan total"><span>Total des dépenses</span><span>${eur(total)} €</span></div>
      ${h ? `<div class="ligne-bilan"><span>Temps passé : ${duree(h)}${taux ? ` × ${eur(taux)} €` : ""}</span><span>${taux ? eur(mo) + " €" : "—"}</span></div>` : ""}
      ${h && !taux ? `<p class="gris" style="font-size:12px">Indiquez le coût d'une heure dans Réglages > Divers pour compter votre temps.</p>` : ""}
      ${devisSignes ? `<div class="ligne-bilan"><span>Devis signés</span><span>${eur(devisSignes)} €</span></div>
      <div class="ligne-bilan total"><span>${taux ? "Marge du projet" : "Reste après dépenses"}</span><span>${eur(devisSignes - total - mo)} €</span></div>
      <p class="gris" style="font-size:12px;margin-top:6px">${taux ? "Après dépenses et temps passé, avant vos charges." : "Avant votre temps de travail et vos charges."}</p>` : ""}</div>`;
  };

  // retrait annulable : l'entrée disparaît, et n'est vraiment supprimée qu'après 8 secondes
  const retirer = id => {
    const l = lignes.find(x => x.id === id); if (!l) return;
    caches.add(id); dessiner();
    const t = document.createElement("div"); t.className = "toast";
    t.innerHTML = `${esc(l.type === "photo" ? "Photo" : TYPES[l.type]?.nom || "Note")} retiré${l.type === "photo" || l.type === "note" ? "e" : ""} <button type="button" style="margin-left:10px;background:none;border:0;color:#fff;text-decoration:underline;font:inherit;cursor:pointer">Annuler</button>`;
    document.body.appendChild(t);
    const minuteur = setTimeout(async () => {
      t.remove();
      try { if (l.type === "paiement") await annulerImputation(db, l); await db.supprimerCarnet(l); lignes = lignes.filter(x => x.id !== id); } catch (e) { caches.delete(id); dessiner(); erreur(e); }
    }, 8000);
    t.querySelector("button").onclick = () => { clearTimeout(minuteur); t.remove(); caches.delete(id); dessiner(); };
  };
  const majLigne = async l => { const { image, ...sansImage } = l; await db.enregistrer("carnet", sansImage); };

  const voir = id => {
    const l = lignes.find(x => x.id === id); if (!l) return;
    const v = document.createElement("div"); v.className = "voile visionneuse";
    v.innerHTML = `<div class="fenetre" style="max-width:900px"><div class="tete"><h2>${esc(l.type === "depense" ? "Ticket" : ETAPES[l.etape])} · ${esc(jour(l.created_at))}</h2><button class="icone" data-fermer aria-label="Fermer">✕</button></div>
      <img src="${esc(urls[l.id] || "")}" alt="" style="width:100%;border-radius:12px;display:block">
      ${l.type === "photo" ? `<div class="champ" style="margin-top:12px"><label for="cLegende">Légende</label><input type="text" id="cLegende" value="${esc(l.texte || "")}" placeholder="Page d'accueil" maxlength="200"></div>` : ""}
      <div class="actions-doc"><button class="btn" data-partager>Partager</button>${l.type === "photo" ? '<button class="btn clair" data-legende>Enregistrer la légende</button>' : ""}<button class="btn danger" data-suppr>Retirer</button></div></div>`;
    document.body.appendChild(v);
    v.addEventListener("click", async e => {
      if (e.target === v || e.target.closest("[data-fermer]")) v.remove();
      else if (e.target.closest("[data-suppr]")) { v.remove(); retirer(id); }
      else if (e.target.closest("[data-legende]")) {
        l.texte = v.querySelector("#cLegende").value.trim() || null;
        try { await majLigne(l); toast("Légende enregistrée ✓"); v.remove(); dessiner(); } catch (er) { erreur(er); }
      } else if (e.target.closest("[data-partager]")) {
        try { await partagerFichier(await (await fetch(urls[l.id])).blob(), `projet-${client.nom || "photo"}-${l.etape}.jpg`.toLowerCase().replace(/[^\w.-]/g, "-")); } catch (er) { erreur(er); }
      }
    });
  };

  let ticket = null;
  function lier() {
    el.querySelectorAll("[data-etape]").forEach(b => b.onclick = () => { etape = b.dataset.etape; dessiner(); });
    el.querySelectorAll("[data-filtre]").forEach(b => b.onclick = () => { filtre = filtre === b.dataset.filtre ? "tout" : b.dataset.filtre; dessiner(); });
    el.querySelectorAll("[data-voir]").forEach(b => b.onclick = () => voir(b.dataset.voir));
    el.querySelectorAll("[data-retirer]").forEach(b => b.onclick = () => retirer(b.dataset.retirer));
    el.querySelectorAll("[data-saisie]").forEach(b => b.onclick = () => { saisie = b.dataset.saisie || null; ticket = null; dessiner(); el.querySelector("#cTexte")?.focus(); });
    if (envoyerMessage) lierRdv(el, lignes, () => client, envoyerMessage);
    el.querySelectorAll("[data-avancement]").forEach(b => b.onclick = async () => {
      try { const n = await db.ajouterCarnet({ client_id: client.id, etape, type: "avancement", montant: Number(b.dataset.avancement) }); lignes.unshift(n); toast("Avancement noté ✓"); dessiner(); } catch (e) { erreur(e); }
    });
    const ar = el.querySelector("#cArrive");
    if (ar) ar.onclick = async () => {
      try { const n = await db.ajouterCarnet({ client_id: client.id, etape, type: "heures", fait: false, texte: "Pointage" }); lignes.unshift(n); toast("Bonne journée ✓"); dessiner(); } catch (e) { erreur(e); }
    };
    const pa = el.querySelector("#cPars");
    if (pa) pa.onclick = async () => {
      const l = lignes.find(x => x.type === "heures" && !x.fait); if (!l) return;
      l.montant = Math.round((Date.now() - new Date(l.created_at)) / 3.6e6 * 100) / 100; l.fait = true;
      try { await majLigne(l); toast(`${duree(l.montant)} notées ✓`); dessiner(); } catch (e) { l.fait = false; l.montant = null; erreur(e); }
    };
    el.querySelectorAll("[data-fait]").forEach(c => c.onchange = async () => {
      const l = lignes.find(x => x.id === c.dataset.fait); l.fait = c.checked;
      try { await majLigne(l); dessiner(); } catch (e) { l.fait = !c.checked; erreur(e); }
    });
    const tk = el.querySelector("#cTicket");
    if (tk) tk.onchange = async () => { ticket = tk.files[0] ? await reduire(tk.files[0]) : null; if (ticket) toast("Ticket prêt ✓"); };
    const ok = el.querySelector("#cOk");
    if (ok) ok.onclick = async () => {
      const texte = el.querySelector("#cTexte").value.trim(), montant = Number(el.querySelector("#cMontant")?.value || 0);
      if (saisie === "rdv") {
        const quand = new Date(`${el.querySelector("#cRdvDate").value}T${el.querySelector("#cRdvHeure").value || "09:00"}`);
        if (isNaN(quand)) return toast("Indiquez la date et l'heure.");
        const objet = el.querySelector("#cRdvObjet").value;
        try {
          const n = await db.ajouterCarnet({ client_id: client.id, etape, type: "rdv", texte: texte ? `${objet} · ${texte}` : objet, created_at: quand.toISOString() });
          lignes.unshift(n); lignes.sort((a, b) => a.created_at < b.created_at ? 1 : -1); toast("Rendez-vous noté ✓"); saisie = null; dessiner();
        } catch (e) { erreur(e); }
        return;
      }
      if (saisie === "heures") {
        const nb = Number(el.querySelector("#cHeures").value || 0); if (!nb) return toast("Indiquez le nombre d'heures.");
        const [hh, mm] = (el.querySelector("#cDebut").value || "08:00").split(":").map(Number), debut = new Date(); debut.setHours(hh, mm, 0, 0);
        try {
          const n = await db.ajouterCarnet({ client_id: client.id, etape, type: "heures", fait: true, montant: nb, texte: texte || null, created_at: debut.toISOString() });
          lignes.unshift(n); lignes.sort((a, b) => a.created_at < b.created_at ? 1 : -1); toast("Heures ajoutées ✓"); saisie = null; dessiner();
        } catch (e) { erreur(e); }
        return;
      }
      const avecMontant = saisie === "depense" || saisie === "paiement";
      if (avecMontant ? !montant : !texte) return toast(avecMontant ? "Indiquez le montant." : "Écrivez quelque chose.");
      try {
        const n = await db.ajouterCarnet({ client_id: client.id, etape, type: saisie, texte: texte || null, ...(saisie === "depense" ? { montant, categorie: el.querySelector("#cCategorie").value } : saisie === "paiement" ? { montant } : {}) }, saisie === "depense" ? ticket : null);
        if (n.image || (ticket && n.chemin)) urls[n.id] = n.image || URL.createObjectURL(ticket);
        let message = `${TYPES[saisie].nom} ajouté${saisie === "note" || saisie === "depense" ? "e" : ""} ✓`;
        if (saisie === "paiement") {
          try {
            const imp = await imputerPaiement(db, client.id, montant);
            if (imp.numeros.length) {
              n.categorie = JSON.stringify(imp); await majLigne(n);
              const ids = Object.keys(imp.part);
              message = "Paiement noté ✓ · " + ids.map((id, i) => imp.payees.includes(id)
                ? `facture ${imp.numeros[i]} réglée` : `${eur(imp.part[id])} € déduits de la facture ${imp.numeros[i]}`).join(", ");
            }
          } catch (e) { erreur(e); }
        }
        lignes.unshift(n); toast(message); saisie = null; ticket = null; dessiner();
      } catch (e) { erreur(e); }
    };
    el.querySelector("#cPhotos").onchange = async e => {
      const fichiers = [...e.target.files]; if (!fichiers.length) return;
      enCours = fichiers.length; dessiner();
      for (const f of fichiers) {
        try {
          const blob = await reduire(f), n = await db.ajouterCarnet({ client_id: client.id, etape, type: "photo" }, blob);
          lignes.unshift(n); urls[n.id] = n.image || URL.createObjectURL(blob);
        } catch (er) { erreur(er); }
        enCours--; dessiner();
      }
      toast(`${fichiers.length} photo${fichiers.length > 1 ? "s" : ""} ajoutée${fichiers.length > 1 ? "s" : ""} ✓`);
    };
    // image avant / après : on touche une photo d'avant, puis une d'après
    const mo = el.querySelector("#cMontage");
    if (mo) mo.onclick = () => { choixMontage = {}; dessiner(); };
    const mn = el.querySelector("#cMontageNon");
    if (mn) mn.onclick = () => { choixMontage = null; dessiner(); };
    el.querySelectorAll("[data-montage]").forEach(b => b.onclick = async () => {
      if (!choixMontage.avant) { choixMontage.avant = b.dataset.montage; dessiner(); return; }
      const idAvant = choixMontage.avant; choixMontage = null; dessiner();
      try {
        toast("Création de l'image…");
        const blob = await montageAvantApres(urls[idAvant], urls[b.dataset.montage]);
        await partagerFichier(blob, `avant-apres-${(client.nom || "projet").toLowerCase().replace(/[^\w-]/g, "-")}.jpg`);
      } catch (e) { erreur(e); }
    });
  }

  if (await charger()) dessiner();
}
