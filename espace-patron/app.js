// L'appli de Nora Éditions (reprise de l'appli Flex) : demandes du questionnaire, devis, factures, clients, prestations,
// abonnements, agenda, carnet de projet, notifications.
import * as db from "./store.js";
// version des fichiers chargés à la demande : à changer à chaque mise en ligne, pour que le téléphone ne garde pas l'ancienne
const V = "20261024j";
import { UNITES } from "./donnees.js";
import { telechargerPDF, totaux, eur, poserTVA, avecTVA, TAUX_TVA, tauxTxt, avenantDe } from "./pdf.js";
import { CATEGORIES, etatPaiements } from "./carnet.js";
import { carteRdv, lierRdv, reglerSignature, OBJETS_RDV, jourRdv, heureRdv, champVisio, avecLien } from "./agenda.js";

const vue = document.getElementById("vue");
const nav = document.getElementById("nav");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const dateFr = d => d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR") : "";
const nomClient = c => c ? [c.civilite, c.nom, c.prenom].filter(Boolean).join(" ") + (c.societe ? ` · ${c.societe}` : "") : "Sans client";
const ICO = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>',
  poubelle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  partage: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
  liste: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  haut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m6 15 6-6 6 6"/></svg>',
  bas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m6 9 6 6 6-6"/></svg>',
  devis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
  client: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  boite: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 13h5l1.5 3h5l1.5-3h5"/><path d="M5.5 5h13L21 13v6H3v-6z"/></svg>',
  cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></svg>'
};
const STATUTS = {
  devis: [["brouillon", "Brouillon"], ["envoye", "Envoyé"], ["signe", "Signé"], ["refuse", "Refusé"]],
  facture: [["brouillon", "Brouillon"], ["envoye", "Envoyée"], ["paye", "Payée"], ["annule", "Annulée"]]
};
const libelleStatut = (type, s) => (STATUTS[type].find(x => x[0] === s) || [s, s])[1];

let P = null; // paramètres de l'entreprise
const lienSignature = d => d.jeton ? location.origin + "/devis/?d=" + d.jeton : "";
const numeroWa = t => { const n = String(t || "").replace(/\D/g, ""); return n.startsWith("0") ? "33" + n.slice(1) : n; };
const politesse = c => c ? [c.civilite, c.nom].filter(Boolean).join(" ") : "";
const quelDoc = d => { const av = avenantDe(d); return av ? `l'avenant n° ${av.n} au devis ${av.devis}` : `le devis ${d.numero}`; };
// le montant tel qu'il figure sur le document : TTC s'il y a de la TVA, sinon le montant tout court (franchise)
const montantTxt = d => { const t = totaux(d); return `${eur(t.ttc)} €${t.tva.length ? " TTC" : ""}`; };
const acompteTxt = d => Number(d.acompte_pct) > 0 ? ` (acompte de ${d.acompte_pct} % à la commande, soit ${eur(totaux(d).ttc * d.acompte_pct / 100)} €)` : "";
const msgSignature = d => `Bonjour ${politesse(d.client)},\n\nVoici ${avenantDe(d) ? quelDoc(d) : `votre devis ${d.numero}`} de ${P.entreprise} : ${montantTxt(d)}${acompteTxt(d)}. Vous pouvez le lire, le télécharger et le signer en ligne ici :\n${lienSignature(d)}\n\nBonne journée,\n${P.entreprise}`;
const msgRelance = d => `Bonjour ${politesse(d.client)},\n\nJe reviens vers vous au sujet de ${quelDoc(d)}. Il est toujours consultable et à signer en ligne ici :\n${lienSignature(d)}\n\nN'hésitez pas si vous avez des questions.\n${P.entreprise}`;
const SEPT_JOURS = 7 * 864e5;
// Relance d'une facture envoyée et pas encore payée : le reste à payer, et l'IBAN s'il est dans les réglages
const echeanceFacture = d => { const e = new Date(d.date + "T12:00:00"); e.setDate(e.getDate() + (Number(P?.echeance_jours) || 30)); return e; };
const virementTxt = d => P?.iban ? `\n\nVous pouvez faire le virement sur ce compte :\nIBAN : ${P.iban}${P.bic ? `\nBIC : ${P.bic}` : ""}${P.titulaire ? `\nTitulaire : ${P.titulaire}` : ""}\nRéférence : ${d.numero}` : "";
// la facture envoyée en simple message, sans PDF : le détail, le total, ce qui reste à payer, l'échéance et le RIB
const msgFacture = d => {
  const t = totaux(d), deja = Math.round((t.ttc - t.reste) * 100) / 100;
  const lignes = (d.sections || []).flatMap(x => x.lignes || []).filter(l => l.designation)
    .map(l => `- ${Number(l.qte) && Number(l.qte) !== 1 ? `${String(l.qte).replace(".", ",")} × ` : ""}${l.designation} : ${eur((Number(l.qte) || 0) * (Number(l.pu) || 0))} €`).join("\n");
  return `Bonjour ${politesse(d.client)},\n\nVoici votre facture ${d.numero} du ${dateFr(d.date)}, de ${P.entreprise} :\n${lignes}\n\nTotal : ${montantTxt(d)}.${deja > 0.01 ? `\nDéjà réglé : ${eur(deja)} €. Reste à payer : ${eur(t.reste)} €.` : ""}\nÀ régler avant le ${echeanceFacture(d).toLocaleDateString("fr-FR")}.${virementTxt(d)}\n\nMerci, et bonne journée.\n${P.entreprise}`;
};
// le message qui accompagne le PDF d'un devis ou d'une facture
const msgPDF = d => {
  const t = totaux(d), deja = Math.round((t.ttc - t.reste) * 100) / 100;
  if (d.type === "devis") return `Bonjour ${politesse(d.client)},\n\nVoici ${avenantDe(d) ? quelDoc(d) : `votre devis ${d.numero}`} de ${P.entreprise}, en pièce jointe : ${montantTxt(d)}${acompteTxt(d)}.${d.jeton ? `\nVous pouvez aussi le lire et le signer en ligne ici :\n${lienSignature(d)}` : ""}\n\nN'hésitez pas si vous avez une question.\nBonne journée,\n${P.entreprise}`;
  return `Bonjour ${politesse(d.client)},\n\nVoici votre facture ${d.numero} du ${dateFr(d.date)}, en pièce jointe : ${montantTxt(d)}.${deja > 0.01 ? `\nDéjà réglé : ${eur(deja)} €. Reste à payer : ${eur(t.reste)} €.` : ""}${t.reste > 0.01 ? `\nÀ régler avant le ${echeanceFacture(d).toLocaleDateString("fr-FR")}.${virementTxt(d)}` : "\nElle est réglée : merci !"}\n\nMerci, et bonne journée.\n${P.entreprise}`;
};
// « Envoyer » : on relit le message, puis le PDF part avec lui
function envoyerPDF(d, apres) {
  const f = fenetre(d.type === "devis" ? "Envoyer le devis" : "Envoyer la facture", `<p class="gris" style="font-size:14px;margin-bottom:8px">Le PDF part avec ce message. Vous pouvez le modifier.</p>
    <textarea id="msgPDF" rows="9" style="width:100%;font:15px var(--sans);padding:12px;border-radius:12px;border:1px solid var(--sable)">${esc(msgPDF(d))}</textarea>
    <div class="actions-doc" style="margin:12px 0 0"><button class="btn" id="okPDF">${ICO.partage}Envoyer le PDF et le message</button></div>
    <p class="gris" style="font-size:12px;margin-top:8px">Si l'application choisie ne reprend pas le texte, il est copié : collez-le dans le message.</p>`);
  f.el.querySelector("#okPDF").onclick = async () => {
    const texte = f.el.querySelector("#msgPDF").value.trim(); f.fermer();
    try { const parti = await telechargerPDF(d, P, { partager: true, texte }); if (!parti && texte) { try { await navigator.clipboard.writeText(texte); toast("PDF téléchargé, message copié ✓"); } catch (e) {} } if (apres) await apres(); }
    catch (e) { if (e.name !== "AbortError") erreur(e); }
  };
}
const msgRelanceFacture = d => {
  const t = totaux(d), echue = Date.now() > echeanceFacture(d);
  const virement = virementTxt(d);
  return `Bonjour ${politesse(d.client)},\n\nSauf erreur de ma part, la facture ${d.numero} du ${dateFr(d.date)} n'est pas encore réglée : il reste ${eur(t.reste)} € à payer${echue ? ` (échéance au ${echeanceFacture(d).toLocaleDateString("fr-FR")})` : ""}.${virement}\n\nMerci d'avance, et n'hésitez pas si vous avez une question.\n${P.entreprise}`;
};
// à relancer : envoyée, pas payée, échéance passée, et pas relancée (ni modifiée) depuis 7 jours
const aRelancerFacture = d => d.type === "facture" && d.statut === "envoye" && totaux(d).reste > 0.01 && Date.now() > echeanceFacture(d)
  && Date.now() - new Date(d.updated_at || d.created_at) > SEPT_JOURS;
const aRelancer = d => d.type === "devis" && d.statut === "envoye" && !d.signe_le && d.jeton && Date.now() - new Date(d.updated_at || d.created_at) > SEPT_JOURS;
async function listerDemandes() { try { return await db.lister("demandes"); } catch { return null; } }

/* Envoie un message déjà rédigé : on le relit, puis WhatsApp, SMS, e-mail ou une autre application. */
async function envoyerMessage(d, texte, sujet = "") {
  const tel = numeroWa(d.client?.tel), brut = String(d.client?.tel || "").replace(/\s/g, ""), mail = d.client?.email || "";
  const autre = async () => {
    if (navigator.share) { try { await navigator.share({ text: texte }); return; } catch (e) { if (e.name === "AbortError") return; } }
    await navigator.clipboard.writeText(texte); toast("Message copié ✓");
  };
  const f = fenetre("Envoyer par", `<div class="apercu-message">${esc(texte)}</div><div class="actions-doc" style="margin:0">
    ${tel.length >= 10 ? '<button class="btn" data-par="wa">WhatsApp</button><button class="btn clair" data-par="sms">SMS</button>' : ""}
    ${mail ? '<button class="btn clair" data-par="mail">E-mail</button>' : ""}
    <button class="btn discret" data-par="autre">${tel.length >= 10 || mail ? "Autre" : "Copier ou partager"}</button></div>`);
  f.el.addEventListener("click", e => {
    const b = e.target.closest("[data-par]"); if (!b) return; f.fermer();
    if (b.dataset.par === "wa") window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texte)}`, "_blank");
    else if (b.dataset.par === "sms") location.href = `sms:${brut}?&body=${encodeURIComponent(texte)}`;
    else if (b.dataset.par === "mail") location.href = `mailto:${mail}?subject=${encodeURIComponent(sujet || P.entreprise)}&body=${encodeURIComponent(texte)}`;
    else autre();
  });
}

/* Les messages prêts : on choisit, on relit, on envoie. */
const prenomDe = c => String(c?.prenom || c?.nom || "").trim().split(" ")[0];
const moisLong = (m = aujourdhui().slice(0, 7)) => new Date(m + "-15").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
const deMois = (m = moisLong()) => (/^[aeiou]/i.test(m) ? "d'" : "de ") + m;
// La période d'abonnement en cours : du jour de mise en ligne du site (abonnement_debut) au même jour du mois suivant.
// Sans date de mise en ligne, l'abonnement suit le mois du calendrier. cle = le mois où la période commence (rangé dans la facture).
const finDuMois = (a, m) => new Date(Date.UTC(a, m + 1, 0)).getUTCDate();
const dateIso = (a, m, j) => `${a}-${String(m + 1).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
function periodeAbo(c, jour = aujourdhui()) {
  const debut = c?.abonnement_debut || null, jj = debut ? Number(debut.slice(8, 10)) : 1;
  let [a, m] = jour.split("-").map(Number); m -= 1;
  const le = (a, m) => dateIso(a, m, Math.min(jj, finDuMois(a, m)));
  let d = le(a, m);
  if (d > jour) { m -= 1; if (m < 0) { m = 11; a -= 1; } d = le(a, m); }
  if (debut && jour < debut) return null; // le site n'est pas encore en ligne
  let a2 = a, m2 = m + 1; if (m2 > 11) { m2 = 0; a2 += 1; }
  const fin = new Date(le(a2, m2) + "T12:00:00"); fin.setDate(fin.getDate() - 1);
  const f = dateIso(fin.getFullYear(), fin.getMonth(), fin.getDate());
  return { cle: d.slice(0, 7), debut: d, fin: f, jour: jj, dateMiseEnLigne: debut };
}
// « du 15 octobre au 14 novembre 2026 » ; sans date de mise en ligne : « octobre 2026 »
function periodeTxt(p) {
  if (!p) return "";
  if (!p.dateMiseEnLigne) return moisLong(p.cle);
  const j = (x, an) => new Date(x + "T12:00:00").toLocaleDateString("fr-FR", an ? { day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "long" });
  return `du ${j(p.debut, p.debut.slice(0, 4) !== p.fin.slice(0, 4))} au ${j(p.fin, true)}`;
}
const factureAbo = (docs, c, p) => p && docs.find(d => d.type === "facture" && d.client_id === c.id && d.abo === p.cle);
const ribTexte = () => P.iban ? `IBAN : ${P.iban}${P.bic ? `\nBIC : ${P.bic}` : ""}${P.titulaire ? `\nTitulaire : ${P.titulaire}` : ""}` : "";
function messagesClient(c, { demande = null, abonnementDu = 0 } = {}) {
  const per = periodeTxt(periodeAbo(c));
  const p = prenomDe(c), sig = P.entreprise, l = [];
  if (demande) l.push(["Bien reçu", "Votre demande", `Bonjour ${p}, c'est ${sig}. Votre questionnaire est bien arrivé, merci ! Je vous appelle très vite pour en parler.`]);
  if (ribTexte()) l.push(["Envoyer mon RIB", "Nos coordonnées bancaires", `Bonjour ${p}, voici nos coordonnées bancaires pour le virement :\n${ribTexte()}\nMerci !\n${sig}`]);
  l.push(["Site en ligne", "Votre site est en ligne", `Bonjour ${p}, bonne nouvelle : votre site est en ligne ! Regardez-le et dites-moi ce que vous en pensez.\n${sig}`]);
  if (abonnementDu) l.push(["Rappel d'abonnement", `Abonnement ${per}`, `Bonjour ${p}, c'est ${sig}. Petit rappel : l'abonnement ${c.abonnement_debut ? per : deMois()} (${eur(abonnementDu)} €) reste à régler par virement.${ribTexte() ? "\n" + ribTexte() : ""}\nMerci !`]);
  if (P.lien_avis) l.push(["Demander un avis", "Un petit avis ?", `Bonjour ${p}, merci pour votre confiance ! Si votre site vous plaît, un petit avis Google nous aiderait beaucoup : ${P.lien_avis}\n${sig}`]);
  return l;
}
function choisirMessage(c, options) {
  const l = messagesClient(c, options);
  const f = fenetre("Écrire à " + (c?.nom || "ce client"), l.map(([n], i) => `<button class="choix" data-m="${i}"><span><b>${esc(n)}</b></span><span>›</span></button>`).join("")
    + `<button class="choix" data-m="libre"><span><b>Message libre</b></span><span>›</span></button>`);
  f.el.onclick = e => { const b = e.target.closest("[data-m]"); if (!b) return; f.fermer();
    const m = b.dataset.m === "libre" ? ["", P.entreprise, `Bonjour ${prenomDe(c)},\n\n\n${P.entreprise}`] : l[+b.dataset.m];
    envoyerMessage({ client: c }, m[2], m[1]); };
}

function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
function erreur(e) { console.error(e); toast("Erreur : " + (e.message || e)); }

function fenetre(titre, html) {
  const v = document.createElement("div"); v.className = "voile";
  v.innerHTML = `<div class="fenetre" role="dialog" aria-modal="true"><div class="tete"><h2>${esc(titre)}</h2><button class="icone" data-fermer aria-label="Fermer">✕</button></div>${html}</div>`;
  document.body.appendChild(v);
  const fermer = () => v.remove();
  v.addEventListener("click", e => { if (e.target === v || e.target.closest("[data-fermer]")) fermer(); });
  return { el: v.querySelector(".fenetre"), fermer };
}
function confirmer(message, oui = "Confirmer") {
  return new Promise(ok => {
    const f = fenetre("Confirmation", `<p style="margin-bottom:18px">${esc(message)}</p><div class="actions-doc"><button class="btn" data-oui>${esc(oui)}</button><button class="btn discret" data-fermer>Annuler</button></div>`);
    f.el.querySelector("[data-oui]").onclick = () => { f.fermer(); ok(true); };
    f.el.querySelectorAll("[data-fermer]").forEach(b => b.addEventListener("click", () => ok(false)));
  });
}

/* =================== Accueil =================== */
async function vueAccueil() {
  const [docs, clients, demandes, depenses] = await Promise.all([db.lister("documents"), db.lister("clients"), listerDemandes(), db.listerDepenses(["depense", "paiement", "avancement", "rdv"]).catch(() => [])]);
  const montants = depenses.splice(0); depenses.push(...montants.filter(x => (x.type || "depense") === "depense"));
  const nbAcomptes = await acomptesAutomatiques(docs);
  if (nbAcomptes) toast(nbAcomptes > 1 ? `${nbAcomptes} factures d'acompte préparées ✓` : "Facture d'acompte préparée ✓");
  const acomptesAEnvoyer = docs.filter(f => estAcompte(f) && f.statut === "brouillon");
  // devis signés en cours : pas encore facturés en entier, ou pas encore payés
  const signesEnCours = docs.filter(d => d.type === "devis" && d.statut === "signe" && !docs.some(f => f.type === "facture" && f.devis_id === d.id && !estAcompte(f) && f.statut === "paye"));
  const nouvelles = (demandes || []).filter(x => x.statut === "nouvelle");
  const relances = docs.filter(aRelancer), relancesF = docs.filter(aRelancerFacture);
  const devisAttente = docs.filter(d => d.type === "devis" && ["brouillon", "envoye"].includes(d.statut));
  const aEncaisser = docs.filter(d => d.type === "facture" && d.statut === "envoye");
  const mois = aujourdhui().slice(0, 7);
  const encaisse = docs.filter(d => d.type === "facture" && d.statut === "paye" && String(d.date).slice(0, 7) === mois);
  const somme = l => l.reduce((a, d) => a + totaux(d).ttc, 0);
  vue.innerHTML = `
    <div class="entete"><div><div class="petit">Bonjour Patronne</div><h1>${esc(new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))}</h1></div></div>
    <div class="stats">
      <div class="stat"><span class="petit">Devis en attente</span><b>${devisAttente.length}</b><small class="gris">${eur(somme(devisAttente))} €</small></div>
      <div class="stat"><span class="petit">À encaisser</span><b>${eur(aEncaisser.reduce((a, d) => a + totaux(d).reste, 0))} €</b><small class="gris">${aEncaisser.length} facture(s)</small></div>
      <div class="stat"><span class="petit">Encaissé ce mois</span><b>${eur(somme(encaisse))} €</b></div>
      <div class="stat"><span class="petit">Devis signés</span><b>${eur(somme(signesEnCours))} €</b><small class="gris">${signesEnCours.length} en cours</small></div>
    </div>
    ${acomptesAEnvoyer.map(f => `<a class="alerte" href="#/document/${f.id}">${ICO.liste}<span><b>Facture d'acompte à envoyer</b><small>${esc(nomClient(f.client))} · ${eur(totaux(f).ttc)} € · devis ${esc(f.devis_numero || "")}</small></span><span>›</span></a>`).join("")}
    ${blocRdv(montants, clients)}
    ${blocChantiers(docs, clients, depenses, montants)}
    ${blocDepenses(depenses, clients, mois)}
    ${aboAlerte(clients, docs)}
    ${nouvelles.length ? `<a class="alerte" href="#/demandes">${ICO.boite}<span><b>${nouvelles.length} nouvelle${nouvelles.length > 1 ? "s" : ""} demande${nouvelles.length > 1 ? "s" : ""}</b><small>${esc(nouvelles.slice(0, 3).map(x => x.nom).join(", "))}</small></span><span>›</span></a>` : ""}
    ${relances.length ? `<h2 style="margin-bottom:12px">À relancer</h2>
    <p class="gris" style="font-size:14px;margin:-6px 0 12px">Devis envoyés il y a plus de 7 jours, toujours sans réponse.</p>
    <div class="liste" id="relances" style="margin-bottom:26px">${relances.map(d => `<div class="ligne-liste"><a href="#/document/${d.id}" style="text-decoration:none;flex:1"><b>${esc(d.numero)}</b><small>${esc(nomClient(d.client))} · envoyé le ${dateFr(String(d.updated_at || d.created_at).slice(0, 10))}</small></a><button class="btn clair" data-relance="${d.id}">Relancer</button></div>`).join("")}</div>` : ""}
    ${relancesF.length ? `<h2 style="margin-bottom:12px">Factures à relancer</h2>
    <p class="gris" style="font-size:14px;margin:-6px 0 12px">Factures envoyées, échéance passée, toujours pas réglées.</p>
    <div class="liste" id="relancesF" style="margin-bottom:26px">${relancesF.map(d => `<div class="ligne-liste"><a href="#/document/${d.id}" style="text-decoration:none;flex:1"><b>${esc(d.numero)}</b><small>${esc(nomClient(d.client))} · reste ${eur(totaux(d).reste)} €</small></a><button class="btn clair" data-relance-f="${d.id}">Relancer</button></div>`).join("")}</div>` : ""}
    <div class="raccourcis">
      <a href="#/document/nouveau/devis">${ICO.devis}Nouveau devis</a>
      <a href="#/document/nouveau/facture">${ICO.devis}Nouvelle facture</a>
      <a href="#/client/nouveau">${ICO.client}Nouveau client</a>
      <a href="#/abonnements">${ICO.liste}Abonnements</a>
    </div>
    <h2 style="margin-bottom:12px">Derniers documents</h2>
    <div class="liste">${docs.slice(0, 6).map(ligneDoc).join("") || '<p class="vide">Aucun document pour l\'instant.</p>'}</div>`;
  const r = document.getElementById("relances");
  if (r) r.onclick = async e => {
    const b = e.target.closest("[data-relance]"); if (!b) return;
    const d = relances.find(x => x.id === b.dataset.relance);
    await envoyerMessage(d, msgRelance(d));
    try { await db.enregistrer("documents", { ...d }); } catch (er) { erreur(er); } // repart pour 7 jours
    b.closest(".ligne-liste").remove(); toast("Relance envoyée ✓");
  };
  const rf = document.getElementById("relancesF");
  if (rf) rf.onclick = async e => {
    const b = e.target.closest("[data-relance-f]"); if (!b) return;
    const d = relancesF.find(x => x.id === b.dataset.relanceF);
    await envoyerMessage(d, msgRelanceFacture(d));
    try { await db.enregistrer("documents", { ...d }); } catch (er) { erreur(er); } // repart pour 7 jours
    b.closest(".ligne-liste").remove(); toast("Relance envoyée ✓");
  };
}

// Rendez-vous des deux semaines à venir, avec l'agenda du téléphone et le rappel au client en un toucher
function blocRdv(montants, clients) {
  const maintenant = Date.now() - 3600000, horizon = Date.now() + 14 * 864e5;
  const rdvs = montants.filter(x => x.type === "rdv" && new Date(x.created_at) >= maintenant && new Date(x.created_at) <= horizon)
    .sort((a, b) => a.created_at < b.created_at ? -1 : 1);
  const clientDe = r => clients.find(c => c.id === r.client_id);
  setTimeout(() => { const z = document.getElementById("rdvs"); if (z) lierRdv(z, rdvs, clientDe, envoyerMessage); });
  return `<div class="carte" style="margin-bottom:22px" id="rdvs"><h2 style="margin-bottom:6px">Rendez-vous à venir</h2>
    ${rdvs.length ? rdvs.map(r => carteRdv(r, esc, { client: clientDe(r) })).join("") : '<p class="gris" style="font-size:14px">Aucun rendez-vous dans les deux semaines. On les note dans le carnet du client (+ Rendez-vous).</p>'}</div>`;
}

// Projets en cours : un devis signé ; un toucher ouvre la fiche du client (carnet du projet)
function blocChantiers(docs, clients, depenses, montants) {
  const payeTout = id => { const f = docs.filter(d => d.type === "facture" && d.client_id === id && !d.abo); return f.length && f.every(d => d.statut === "paye"); };
  const signes = docs.filter(d => d.type === "devis" && d.statut === "signe" && d.client_id && !payeTout(d.client_id));
  if (!signes.length) return "";
  const parClient = {};
  signes.forEach(d => { (parClient[d.client_id] = parClient[d.client_id] || []).push(d); });
  return `<div class="carte" style="margin-bottom:22px"><h2 style="margin-bottom:6px">Projets en cours</h2>
    <div id="chantiers">${Object.entries(parClient).map(([id, ds]) => {
      const c = clients.find(x => x.id === id), total = ds.reduce((a, d) => a + totaux(d).ttc, 0);
      const dep = depenses.filter(x => x.client_id === id).reduce((a, x) => a + (Number(x.montant) || 0), 0);
      const e = etatPaiements(montants.filter(x => x.client_id === id), total, ds[0].acompte_pct);
      return `<a class="ligne-chantier" href="#/client/${id}?carnet=1">
        <span><b>${esc(c ? nomClient(c) : nomClient(ds[0].client))}</b><small>Devis ${eur(total)} € · dépenses ${eur(dep)} €</small>
          <small>Versé ${eur(e.verse)} € · ${e.aReclamer ? `<span class="a-reclamer">à réclamer ${eur(e.aReclamer)} € (${e.pct} %)</span>` : "à jour"}</small></span>
        <span class="reste"><small>Reste</small>${eur(total - dep)} €</span></a>`;
    }).join("")}</div>
    <p class="gris" style="font-size:12px;margin-top:8px">Reste = devis signés moins les dépenses notées dans le carnet. Un toucher ouvre le projet.</p></div>`;
}

// Abonnements dont la période en cours n'est pas payée : une alerte sur l'accueil
function aboAlerte(clients, docs) {
  const reste = clients.filter(c => { if (c.archive || !(Number(c.abonnement_mensuel) > 0)) return false; const p = periodeAbo(c); return p && factureAbo(docs, c, p)?.statut !== "paye"; });
  if (!reste.length) return "";
  const total = reste.reduce((a, c) => a + Number(c.abonnement_mensuel), 0);
  return `<a class="alerte" href="#/abonnements">${ICO.liste}<span><b>Abonnements : ${reste.length} à encaisser</b><small>${eur(total)} € · ${esc(reste.slice(0, 3).map(c => c.nom).join(", "))}</small></span><span>›</span></a>`;
}

// Dépenses du mois : celles des carnets de projet et celles hors projet, par catégorie et par client
function blocDepenses(depenses, clients, moisChoisi) {
  const moisDispo = [...new Set([moisChoisi, ...depenses.map(x => String(x.created_at).slice(0, 7))])].sort().reverse();
  const nomMois = m => new Date(m + "-15").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const dessiner = m => {
    const l = depenses.filter(x => String(x.created_at).slice(0, 7) === m), total = l.reduce((a, x) => a + (Number(x.montant) || 0), 0);
    const grouper = cle => { const g = {}; l.forEach(x => { const k = cle(x); g[k] = g[k] || { v: 0, n: 0 }; g[k].v += Number(x.montant) || 0; g[k].n++; }); return Object.entries(g).sort((a, b) => b[1].v - a[1].v); };
    const parCat = grouper(x => x.categorie || "autre"), parChantier = grouper(x => x.client_id || "");
    const barre = (nom, { v, n }, lien) => `<div class="ligne-bilan"><span>${lien ? `<a href="${lien}">${esc(nom)}</a>` : esc(nom)} <small class="gris">· ${n} dépense${n > 1 ? "s" : ""}</small><i class="barre-dep" style="width:${total ? Math.max(4, v / total * 100) : 0}%"></i></span><span>${eur(v)} €</span></div>`;
    const hors = l.filter(x => !x.client_id).sort((a, b) => a.created_at < b.created_at ? 1 : -1);
    const ligneDep = x => { const c = clients.find(y => y.id === x.client_id);
      return `<div class="ligne-bilan sous"><span>${new Date(x.created_at).toLocaleDateString("fr-FR")} · ${esc(x.client_id ? (c ? nomClient(c) : "Client archivé") : "Hors projet")}${x.texte ? " · " + esc(x.texte) : ""}</span><span>${eur(x.montant)} €</span></div>`; };
    return l.length ? `<div class="petit" style="margin:10px 0 4px">Par catégorie · touchez pour le détail</div>${parCat.map(([k, g]) => `<details class="cat-dep"><summary>${barre(CATEGORIES[k] || "Autre", g)}</summary>${l.filter(x => (x.categorie || "autre") === k).sort((a, b) => a.created_at < b.created_at ? 1 : -1).map(ligneDep).join("")}</details>`).join("")}
      <div class="ligne-bilan total"><span>Total du mois</span><span>${eur(total)} €</span></div>
      <div class="petit" style="margin:16px 0 4px">Par client</div>${parChantier.map(([id, g]) => { const c = clients.find(x => x.id === id); return barre(id ? (c ? nomClient(c) : "Client archivé") : "Hors projet", g, c ? `#/client/${id}` : ""); }).join("")}
      ${hors.length ? `<div class="petit" style="margin:16px 0 4px">Détail hors projet</div>${hors.map(x => `<div class="ligne-bilan"><span>${new Date(x.created_at).toLocaleDateString("fr-FR")} · ${esc(CATEGORIES[x.categorie] || "Autre")}${x.texte ? " · " + esc(x.texte) : ""}</span><span>${eur(x.montant)} € <button type="button" class="icone" data-retirer-dep="${x.id}" aria-label="Retirer" style="width:28px;height:28px">✕</button></span></div>`).join("")}` : ""}`
      : '<p class="gris" style="font-size:14px;margin-top:8px">Aucune dépense ce mois-ci.</p>';
  };
  setTimeout(() => {
    const s = document.getElementById("moisDep"), z = document.getElementById("zoneDep"); if (!s) return;
    s.onchange = () => { z.innerHTML = dessiner(s.value); };
    document.getElementById("depHors").onclick = () => ajouterDepenseHors();
    z.onclick = e => {
      const b = e.target.closest("[data-retirer-dep]"); if (!b) return;
      const x = depenses.find(d => d.id === b.dataset.retirerDep); if (!x) return;
      const i = depenses.indexOf(x); depenses.splice(i, 1); z.innerHTML = dessiner(s.value);
      const t = document.createElement("div"); t.className = "toast";
      t.innerHTML = 'Dépense retirée <button type="button" style="margin-left:10px;background:none;border:0;color:#fff;text-decoration:underline;font:inherit;cursor:pointer">Annuler</button>';
      document.body.appendChild(t);
      const minuteur = setTimeout(async () => { t.remove(); try { await db.supprimerCarnet(x); } catch (er) { depenses.splice(i, 0, x); erreur(er); } }, 8000);
      t.querySelector("button").onclick = () => { clearTimeout(minuteur); t.remove(); depenses.splice(i, 0, x); z.innerHTML = dessiner(s.value); };
    };
  });
  return `<div class="carte" style="margin-bottom:22px">
    <div class="entete" style="margin-bottom:6px"><h2>Dépenses</h2>
      <select id="moisDep" style="width:auto">${moisDispo.map(m => `<option value="${m}">${nomMois(m)}</option>`).join("")}</select></div>
    <button type="button" class="btn clair petit-btn" id="depHors">+ Dépense hors projet</button>
    <div id="zoneDep">${dessiner(moisChoisi)}</div>
    <p class="gris" style="font-size:12px;margin-top:8px">Les dépenses d'un projet se notent dans le carnet du client (+ Dépense).</p></div>`;
}

// essence de la semaine, assurance, outillage… : une dépense sans client
function ajouterDepenseHors() {
  const f = fenetre("Dépense hors projet", `
    <div class="champ"><label for="hCat">Catégorie</label><select id="hCat">${Object.entries(CATEGORIES).map(([k, n]) => `<option value="${k}" ${k === "logiciels" ? "selected" : ""}>${n}</option>`).join("")}</select></div>
    <div class="deux"><div class="champ"><label for="hMontant">Montant €</label><input type="number" id="hMontant" step="0.01" min="0" inputmode="decimal"></div>
      <div class="champ"><label for="hDate">Date</label><input type="date" id="hDate" value="${aujourdhui()}"></div></div>
    <div class="champ"><label for="hTexte">Détail (facultatif)</label><input type="text" id="hTexte" placeholder="Logiciel, nom de domaine…" maxlength="200"></div>
    <label class="btn discret petit-btn" style="display:inline-flex">Photo du ticket (facultatif)<input type="file" id="hTicket" accept="image/*" hidden></label>
    <div class="actions-doc"><button class="btn" id="hOk">Ajouter</button><button class="btn discret" data-fermer>Annuler</button></div>`);
  let ticket = null;
  f.el.querySelector("#hTicket").onchange = async e => {
    const fi = e.target.files[0]; if (!fi) return;
    const img = await createImageBitmap(fi, { imageOrientation: "from-image" }), k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    ticket = await new Promise(ok => c.toBlob(ok, "image/jpeg", .8)); toast("Ticket prêt ✓");
  };
  f.el.querySelector("#hOk").onclick = async () => {
    const montant = Number(f.el.querySelector("#hMontant").value || 0); if (!montant) return toast("Indiquez le montant.");
    const date = f.el.querySelector("#hDate").value || aujourdhui();
    const quand = date === aujourdhui() ? new Date().toISOString() : new Date(date + "T12:00:00").toISOString();
    try {
      await db.ajouterCarnet({ client_id: null, type: "depense", etape: "pendant", montant, created_at: quand,
        categorie: f.el.querySelector("#hCat").value, texte: f.el.querySelector("#hTexte").value.trim() || null }, ticket);
      f.fermer(); toast("Dépense ajoutée ✓"); vueAccueil();
    } catch (e) { erreur(e); }
  };
}

function ligneDoc(d) {
  return `<a class="ligne-liste" href="#/document/${d.id}">
    <div><b>${esc(d.numero)}</b><small>${avenantDe(d) ? "Avenant · " : ""}${esc(nomClient(d.client))} · ${dateFr(d.date)}</small></div>
    <div class="droite"><div class="montant">${eur(totaux(d).ttc)} €</div><span class="badge ${esc(d.statut)}">${esc(libelleStatut(d.type, d.statut))}</span></div></a>`;
}

/* =================== Liste des documents =================== */
async function vueDocuments(type) {
  const docs = (await db.lister("documents")).filter(d => d.type === type);
  vue.innerHTML = `
    <div class="entete"><h1>${type === "devis" ? "Devis" : "Factures"}</h1>
      <a class="btn" href="#/document/nouveau/${type}">${ICO.plus}${type === "devis" ? "Nouveau devis" : "Nouvelle facture"}</a></div>
    <div class="onglets"><a href="#/documents/devis" class="${type === "devis" ? "actif" : ""}">Devis</a><a href="#/documents/facture" class="${type === "facture" ? "actif" : ""}">Factures</a></div>
    <input class="recherche" type="search" placeholder="Rechercher un client, un numéro…" id="rech">
    <div class="liste" id="res"></div>`;
  const afficher = q => {
    const f = q.toLowerCase();
    const l = docs.filter(d => !f || `${d.numero} ${nomClient(d.client)} ${d.objet}`.toLowerCase().includes(f));
    document.getElementById("res").innerHTML = l.map(ligneDoc).join("") || `<p class="vide">Aucun ${type === "devis" ? "devis" : "facture"}.</p>`;
  };
  afficher("");
  document.getElementById("rech").oninput = e => afficher(e.target.value);
}

/* =================== Éditeur de devis / facture =================== */
function numeroSuivant(type) {
  const d = new Date(), aa = String(d.getFullYear()).slice(2), mm = String(d.getMonth() + 1).padStart(2, "0");
  return type === "devis"
    ? `DE-${aa}${mm}-${String(P.prochain_devis).padStart(2, "0")}`
    : `FA-${aa}-${mm}-${String(P.prochain_facture).padStart(2, "0")}`;
}

async function vueDocument(id, type, params) {
  let d;
  if (id === "nouveau") {
    d = { type, numero: numeroSuivant(type), date: aujourdhui(), statut: "brouillon", objet: "", sections: [{ titre: "Prestations", lignes: [] }],
      acompte_pct: type === "devis" ? P.acompte_pct : 0, deja_regle: 0, client: null, client_id: null, notes: "" };
    if (params.get("client")) {
      const c = await db.lire("clients", params.get("client"));
      if (c) { d.client_id = c.id; d.client = instantane(c); d.objet = `Site internet - ${[c.civilite, c.nom].filter(Boolean).join(" ")}`; }
    }
  } else {
    d = await db.lire("documents", id);
    if (!d) { vue.innerHTML = '<p class="vide">Document introuvable.</p>'; return; }
    d.sections = d.sections?.length ? d.sections : [{ titre: "Travaux", lignes: [] }];
  }
  const estDevis = d.type === "devis";
  const av = avenantDe(d);
  // Avenants déjà faits sur ce devis (devis d'origine seulement)
  const avenants = estDevis && d.id && !av ? (await db.lister("documents", { desc: false }))
    .filter(x => x.type === "devis" && x.id !== d.id && (x.devis_id === d.id || avenantDe(x)?.devis === d.numero)) : [];
  let modifie = false;

  const dessiner = () => {
    vue.innerHTML = `
      <div class="entete"><div><div class="petit">${av ? `Avenant n° ${av.n} au devis ${esc(av.devis)}` : estDevis ? "Devis" : "Facture"} ${d.id ? "" : "· nouveau"}</div><h1>${esc(d.numero)}</h1></div>
        <select id="statut" style="width:auto">${STATUTS[d.type].map(([v, l]) => `<option value="${v}" ${v === d.statut ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="deux-col">
        <div>
          <div class="carte" style="margin-bottom:12px">
            <label>Client</label>
            <button class="choix" id="choixClient" style="border-color:var(--sable)"><span>${d.client ? `<b>${esc(nomClient(d.client))}</b><br><small class="gris">${esc([d.client.adresse, d.client.cp, d.client.ville].filter(Boolean).join(", "))}</small>` : '<span class="gris">Choisir ou créer un client…</span>'}</span><span>›</span></button>
            <div class="champ"><label for="objet">Objet</label><input type="text" id="objet" value="${esc(d.objet)}" placeholder="Site internet - M. Dupont"></div>
            <div class="deux">
              <div class="champ"><label for="date">Date</label><input type="date" id="date" value="${esc(d.date)}"></div>
              ${estDevis
                ? `<div class="champ"><label for="acompte">Acompte %</label><input type="number" id="acompte" value="${esc(d.acompte_pct)}" min="0" max="100"></div>`
                : `<div class="champ"><label for="regle">Déjà réglé €</label><input type="number" id="regle" value="${esc(d.deja_regle || 0)}" min="0" step="0.01"></div>`}
            </div>
            <div class="deux">
              <div class="champ"><label for="debut">Début</label><input type="date" id="debut" value="${esc(d.date_debut || "")}"></div>
              <div class="champ"><label for="duree">Durée estimée</label><input type="text" id="duree" value="${esc(d.duree || "")}" placeholder="1 semaine"></div>
            </div>
          </div>
          <div id="lots"></div>
          <button class="btn discret" id="ajoutLot" style="width:100%">${ICO.plus}Ajouter une partie</button>
          <div class="champ" style="margin-top:16px"><label for="notes">Note (apparaît sur le PDF)</label><textarea id="notes" rows="2">${esc(d.notes || "")}</textarea></div>
        </div>
        <div>
          <div class="actions-doc">
            <button class="btn" id="enreg">Enregistrer</button>
            <button class="btn clair" id="pdf">${ICO.pdf}PDF</button>
            <button class="btn clair" id="partage">${ICO.partage}Envoyer</button>
            ${estDevis && d.id ? `<button class="btn discret" id="versFacture">Transformer en facture</button>` : ""}
            ${estDevis && d.id && !av && d.statut === "signe" ? `<button class="btn clair" id="avenant">${ICO.plus}Créer un avenant</button>` : ""}
            ${!estDevis && d.id && d.statut !== "annule" ? `<button class="btn clair" id="msgFacture">Envoyer par message, sans PDF</button>` : ""}
            ${!estDevis && d.id && d.statut === "envoye" && totaux(d).reste > 0.01 ? `<button class="btn clair" id="relanceF">Relancer le paiement</button>` : ""}
            ${d.id ? `<button class="btn discret" id="dupliquer">Dupliquer</button>` : ""}
            ${d.id && (estDevis || d.statut === "brouillon") ? `<button class="btn danger" id="suppr">${ICO.poubelle}Supprimer</button>` : ""}
          </div>
          ${avenants.length ? `<div class="carte" style="margin-bottom:12px"><b>Avenants</b>
            <div class="liste" style="margin-top:8px">${avenants.map(ligneDoc).join("")}</div>
            <div class="ligne-bilan" style="margin-top:8px"><span>Devis et avenants signés</span><span><b>${eur([d, ...avenants].filter(x => x.statut === "signe").reduce((a, x) => a + totaux(x).ttc, 0))} €</b></span></div></div>` : ""}
          ${estDevis && d.id && d.statut === "signe" && Number(d.acompte_pct) > 0 ? `<div class="carte" style="margin-bottom:12px"><b>Acompte de ${esc(d.acompte_pct)} % : ${eur(totaux(d).acompte)} €</b>
            <p class="gris" style="font-size:14px;margin:4px 0 12px">La facture d'acompte se prépare dès que le devis est signé.</p>
            <div class="actions-doc" style="margin:0"><button class="btn" id="factAcompte">${ICO.plus}Facture d'acompte</button></div></div>` : ""}
          ${estDevis && d.id && d.jeton ? (d.signe_le
            ? `<div class="carte signe-ok"><b>✓ Signé en ligne</b><small>le ${new Date(d.signe_le).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })} par ${esc(d.signe_nom)}</small></div>`
            : `<div class="carte" style="margin-bottom:12px"><b>Signature en ligne</b><p class="gris" style="font-size:14px;margin:4px 0 12px">Le client reçoit un lien pour lire, télécharger et signer ce devis sur son téléphone.</p>
              <div class="actions-doc" style="margin:0"><button class="btn" id="envoiLien">${ICO.partage}Envoyer le lien</button><button class="btn discret" id="copieLien">Copier le lien</button></div></div>`) : ""}
          ${!estDevis && d.devis_numero ? `<p class="gris" style="font-size:14px">Facture du devis ${esc(d.devis_numero)}${d.devis_date ? " du " + dateFr(d.devis_date) : ""}.</p>` : ""}
          ${d.client_id ? `<p style="margin-top:8px"><a class="gris" href="#/client/${d.client_id}">Voir la fiche client ›</a></p>` : ""}
          ${d.id && d.client_id ? `<h2 style="margin:22px 0 10px">Carnet du projet</h2><div id="carnetDoc"><p class="gris">Chargement du carnet…</p></div>` : ""}
        </div>
      </div>
      <div class="barre-total"><div><small>${estDevis ? "Net à payer" : "Reste à payer"}</small><span class="montant" id="total"></span></div><small id="sousTotal" style="text-align:right"></small></div>`;
    dessinerLots();
    majTotal();
    lier();
    const cd = document.getElementById("carnetDoc");
    if (cd) import("./carnet.js").then(m => m.monterCarnet(cd, { db, client: { ...(d.client || {}), id: d.client_id }, P, toast, esc, erreur, envoyerMessage })).catch(erreur);
  };

  const dessinerLots = () => {
    document.getElementById("lots").innerHTML = d.sections.map((s, i) => `
      <div class="lot" data-lot="${i}">
        <div class="lot-tete">
          <input type="text" value="${esc(s.titre)}" data-titre="${i}" aria-label="Titre de la partie">
          <span class="st" data-st="${i}"></span>
          <button class="icone" data-monter="${i}" aria-label="Monter">${ICO.haut}</button>
          <button class="icone" data-suppr-lot="${i}" aria-label="Supprimer la partie">${ICO.poubelle}</button>
        </div>
        ${s.lignes.map((l, j) => `
          <div class="ligne-doc">
            <textarea rows="2" data-l="${i}.${j}" data-k="designation" placeholder="Désignation">${esc(l.designation)}</textarea>
            ${l.description ? `<textarea rows="2" class="detail-ligne" data-l="${i}.${j}" data-k="description" placeholder="Détail">${esc(l.description)}</textarea>` : ""}
            <div class="chiffres">
              <div><label>Qté</label><input type="number" step="0.01" inputmode="decimal" value="${esc(l.qte)}" data-l="${i}.${j}" data-k="qte"></div>
              <div><label>Unité</label><select data-l="${i}.${j}" data-k="unite">${UNITES.map(u => `<option ${u === l.unite ? "selected" : ""}>${u}</option>`).join("")}</select></div>
              <div><label>PU HT €</label><input type="number" step="0.01" inputmode="decimal" value="${esc(l.pu)}" data-l="${i}.${j}" data-k="pu"></div>
              ${l.tva != null && l.tva !== "" ? `<div><label>TVA</label><select data-l="${i}.${j}" data-k="tva">${TAUX_TVA.map(r => `<option value="${r}" ${Number(l.tva) === r ? "selected" : ""}>${tauxTxt(r)}</option>`).join("")}</select></div>` : ""}
              <button class="icone" data-suppr-ligne="${i}.${j}" aria-label="Supprimer la ligne">${ICO.poubelle}</button>
            </div>
            <div class="tot" data-tl="${i}.${j}"></div>
          </div>`).join("")}
        <div class="lot-pied">
          <button class="btn clair petit-btn" data-catalogue="${i}">${ICO.liste}Depuis mes prestations</button>
          <button class="btn discret petit-btn" data-libre="${i}">${ICO.plus}Ligne libre</button>
        </div>
      </div>`).join("");
  };

  // un document neuf, ou qui porte déjà la TVA ; jamais un ancien document émis sans TVA
  const doitTVA = () => !d.id || avecTVA(d);
  const majTotal = () => {
    const t = totaux(d);
    d.sections.forEach((s, i) => {
      const st = s.lignes.reduce((a, l) => a + (Number(l.qte) || 0) * (Number(l.pu) || 0), 0);
      const el = vue.querySelector(`[data-st="${i}"]`); if (el) el.textContent = eur(st) + " €";
      s.lignes.forEach((l, j) => { const e = vue.querySelector(`[data-tl="${i}.${j}"]`); if (e) e.textContent = eur((Number(l.qte) || 0) * (Number(l.pu) || 0)) + " €"; });
    });
    document.getElementById("total").textContent = eur(estDevis ? t.ttc : t.reste) + " €" + (t.avecTVA && estDevis ? " TTC" : "");
    const detailTVA = t.avecTVA ? `HT ${eur(t.ht)} € · ` + t.tva.map(([r, v]) => `TVA ${tauxTxt(r)} ${eur(v)} €`).join(" · ") : "";
    document.getElementById("sousTotal").textContent = [detailTVA, estDevis
      ? (Number(d.acompte_pct) ? `Acompte ${d.acompte_pct} % : ${eur(t.acompte)} €` : "")
      : (t.regle ? `Total ${eur(t.ttc)} € · réglé ${eur(t.regle)} €` : "")].filter(Boolean).join(" · ");
  };

  const lier = () => {
    const champ = (id, k, num) => { const e = document.getElementById(id); if (e) e.oninput = () => { d[k] = num ? Number(e.value) : e.value; modifie = true; majTotal(); }; };
    champ("objet", "objet"); champ("date", "date"); champ("debut", "date_debut"); champ("duree", "duree");
    champ("acompte", "acompte_pct", true); champ("regle", "deja_regle", true); champ("notes", "notes");
    document.getElementById("statut").onchange = e => { d.statut = e.target.value; modifie = true; };
    document.getElementById("choixClient").onclick = () => choisirClient(c => { d.client_id = c.id; d.client = instantane(c); if (!d.objet) d.objet = `Site internet - ${[c.civilite, c.nom].filter(Boolean).join(" ")}`; modifie = true; dessiner(); });
    document.getElementById("ajoutLot").onclick = () => { d.sections.push({ titre: "Nouvelle partie", lignes: [] }); modifie = true; dessinerLots(); majTotal(); };
    document.getElementById("lots").oninput = e => {
      const t = e.target;
      if (t.dataset.titre !== undefined) { d.sections[t.dataset.titre].titre = t.value; }
      if (t.dataset.l) { const [i, j] = t.dataset.l.split(".").map(Number); const k = t.dataset.k; d.sections[i].lignes[j][k] = (k === "qte" || k === "pu") ? Number(t.value) : t.value; }
      modifie = true; majTotal();
    };
    document.getElementById("lots").onchange = e => { const t = e.target;
      if (t.dataset.k === "unite") { const [i, j] = t.dataset.l.split(".").map(Number); d.sections[i].lignes[j].unite = t.value; modifie = true; }
      if (t.dataset.k === "tva") { const [i, j] = t.dataset.l.split(".").map(Number); d.sections[i].lignes[j].tva = Number(t.value); modifie = true; majTotal(); } };
    document.getElementById("lots").onclick = async e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.libre !== undefined) { d.sections[b.dataset.libre].lignes.push({ designation: "", qte: 1, unite: "presta", pu: 0 }); if (doitTVA()) poserTVA(d, P); }
      else if (b.dataset.catalogue !== undefined) { return choisirPrestation(p => { ajouterPrestation(d, p, Number(b.dataset.catalogue)); if (doitTVA()) poserTVA(d, P); modifie = true; dessinerLots(); majTotal(); }); }
      else if (b.dataset.supprLigne) { const [i, j] = b.dataset.supprLigne.split(".").map(Number); d.sections[i].lignes.splice(j, 1); }
      else if (b.dataset.supprLot !== undefined) { if (d.sections[b.dataset.supprLot].lignes.length && !(await confirmer("Supprimer cette partie et ses lignes ?", "Supprimer"))) return; d.sections.splice(b.dataset.supprLot, 1); }
      else if (b.dataset.monter !== undefined) { const i = Number(b.dataset.monter); if (i > 0) [d.sections[i - 1], d.sections[i]] = [d.sections[i], d.sections[i - 1]]; }
      else return;
      modifie = true; dessinerLots(); majTotal();
    };
    document.getElementById("enreg").onclick = () => enregistrer().then(() => toast("Enregistré ✓")).catch(erreur);
    document.getElementById("pdf").onclick = async () => { try { await enregistrer(); await telechargerPDF(d, P); } catch (e) { erreur(e); } };
    document.getElementById("partage").onclick = async () => { try { await enregistrer(); envoyerPDF(d, async () => { if (d.statut === "brouillon") { d.statut = "envoye"; modifie = true; await enregistrer(); dessiner(); } }); } catch (e) { erreur(e); } };
    const fa = document.getElementById("factAcompte");
    if (fa) fa.onclick = async () => {
      try {
        await enregistrer();
        const tous = await db.lister("documents"), deja = tous.find(f => estAcompte(f) && f.devis_id === d.id);
        const f = deja || await creerFactureAcompte(d);
        if (!deja) toast("Facture d'acompte créée ✓");
        location.hash = "#/document/" + f.id;
      } catch (e) { erreur(e); }
    };
    const vf = document.getElementById("versFacture");
    if (vf) vf.onclick = async () => {
      try {
        await enregistrer();
        const acomptes = (await db.lister("documents")).filter(x => estAcompte(x) && x.devis_id === d.id && x.statut !== "annule");
        const verse = Math.round(acomptes.reduce((a, x) => a + totaux(x).ttc, 0) * 100) / 100;
        const f = { type: "facture", numero: numeroSuivant("facture"), date: aujourdhui(), statut: "brouillon", client_id: d.client_id, client: d.client,
          objet: d.objet, sections: JSON.parse(JSON.stringify(d.sections)), acompte_pct: 0, deja_regle: verse, devis_id: d.id, devis_numero: d.numero, devis_date: d.date,
          notes: acomptes.length ? `Acompte déjà facturé (${acomptes.map(x => x.numero).join(", ")}) : ${eur(verse)} €, déduit du total.` : "" };
        f.total_ht = totaux(f).ht;
        const n = await db.enregistrer("documents", f);
        P.prochain_facture = Number(P.prochain_facture) + 1; await db.enregistrerParametres(P);
        if (d.statut !== "signe") { d.statut = "signe"; await db.enregistrer("documents", { ...d }); }
        toast("Facture créée ✓"); location.hash = "#/document/" + n.id;
      } catch (e) { erreur(e); }
    };
    const el = document.getElementById("envoiLien");
    if (el) el.onclick = async () => {
      try {
        await enregistrer();
        await envoyerMessage(d, msgSignature(d), `Votre devis ${d.numero}`);
        if (d.statut === "brouillon") { d.statut = "envoye"; modifie = true; await enregistrer(); dessiner(); }
      } catch (e) { erreur(e); }
    };
    const cl = document.getElementById("copieLien");
    if (cl) cl.onclick = async () => { await navigator.clipboard.writeText(lienSignature(d)); toast("Lien copié ✓"); };
    const ave = document.getElementById("avenant");
    if (ave) ave.onclick = async () => {
      try {
        await enregistrer();
        const n = avenants.reduce((m, x) => Math.max(m, avenantDe(x)?.n || 0), 0) + 1;
        const a = { type: "devis", numero: `${d.numero}-AV${n}`, date: aujourdhui(), statut: "brouillon", client_id: d.client_id, client: d.client,
          objet: `Avenant n° ${n}${d.objet ? " - " + d.objet : ""}`, date_debut: null, duree: "", sections: [{ titre: "Prestations en plus", lignes: [] }],
          acompte_pct: 0, deja_regle: 0, devis_id: d.id, devis_numero: d.numero, devis_date: d.date, notes: "" };
        poserTVA(a, P); a.total_ht = totaux(a).ht;
        const r = await db.enregistrer("documents", a); // l'avenant ne prend pas de numéro de devis
        toast("Avenant créé ✓"); location.hash = "#/document/" + r.id;
      } catch (e) { erreur(e); }
    };
    const mf = document.getElementById("msgFacture");
    if (mf) mf.onclick = async () => {
      try {
        await enregistrer();
        await envoyerMessage(d, msgFacture(d), `Facture ${d.numero}`);
        if (d.statut === "brouillon") { d.statut = "envoye"; modifie = true; await enregistrer(); dessiner(); }
      } catch (e) { erreur(e); }
    };
    const rlf = document.getElementById("relanceF");
    if (rlf) rlf.onclick = async () => {
      try { await enregistrer(); await envoyerMessage(d, msgRelanceFacture(d), `Facture ${d.numero}`); await db.enregistrer("documents", { ...d }); toast("Relance envoyée ✓"); } catch (e) { erreur(e); }
    };
    const du = document.getElementById("dupliquer");
    if (du) du.onclick = async () => {
      const copie = { ...JSON.parse(JSON.stringify(d)), id: undefined, created_at: undefined, numero: numeroSuivant(d.type), date: aujourdhui(), statut: "brouillon", devis_id: null, devis_numero: null, devis_date: null };
      delete copie.id; delete copie.created_at; delete copie.jeton; delete copie.signe_le; delete copie.signe_nom;
      try { const n = await enregistrerNouveau(copie); toast("Copie créée ✓"); location.hash = "#/document/" + n.id; } catch (e) { erreur(e); }
    };
    const su = document.getElementById("suppr");
    if (su) su.onclick = async () => {
      if (!(await confirmer(`Supprimer définitivement ${d.numero} ?`, "Supprimer"))) return;
      try { await db.supprimer("documents", d.id); toast("Supprimé"); location.hash = `#/documents/${d.type}`; } catch (e) { erreur(e); }
    };
  };

  async function enregistrer() {
    if (doitTVA()) poserTVA(d, P);
    d.total_ht = totaux(d).ht;
    if (!d.id) { const n = await enregistrerNouveau(d); Object.assign(d, n); history.replaceState(null, "", "#/document/" + d.id); }
    else if (modifie) await db.enregistrer("documents", d);
    modifie = false;
  }
  dessiner();
}

// La facture d'acompte d'un devis signé : une ligne « Acompte de 10 % sur le devis … », rattachée au devis.
const estAcompte = f => f.type === "facture" && f.devis_id && f.sections?.[0]?.titre === "Acompte";
async function creerFactureAcompte(d) {
  const pct = Number(d.acompte_pct) || 0; if (!pct) return null;
  const t = totaux(d), pu = Math.round(t.ht * pct) / 100;
  return enregistrerNouveau({ type: "facture", numero: numeroSuivant("facture"), date: aujourdhui(), statut: "brouillon", client_id: d.client_id, client: d.client,
    objet: `Acompte · ${d.objet || "devis " + d.numero}`, sections: [{ titre: "Acompte", lignes: [{ designation: `Acompte de ${pct} % sur le devis ${d.numero} du ${dateFr(d.date)}`, qte: 1, unite: "forfait", pu }] }],
    acompte_pct: 0, deja_regle: 0, devis_id: d.id, devis_numero: d.numero, devis_date: d.date, notes: "" });
}
// les devis signés depuis moins de 30 jours, avec un acompte, sans aucune facture : leur facture d'acompte se crée toute seule
async function acomptesAutomatiques(docs) {
  const aFaire = docs.filter(d => d.type === "devis" && d.statut === "signe" && Number(d.acompte_pct) > 0 && d.client_id
    && !docs.some(f => f.type === "facture" && f.devis_id === d.id) && Date.now() - new Date(d.signe_le || d.updated_at || d.created_at) < 30 * 864e5);
  for (const d of aFaire) { try { const f = await creerFactureAcompte(d); if (f) docs.unshift(f); } catch (e) { console.error(e); } }
  return aFaire.length;
}

async function enregistrerNouveau(doc) {
  poserTVA(doc, P); // tout nouveau document suit le régime de TVA des réglages
  doc.total_ht = totaux(doc).ht;
  const n = await db.enregistrer("documents", doc);
  if (doc.type === "devis") P.prochain_devis = Number(P.prochain_devis) + 1; else P.prochain_facture = Number(P.prochain_facture) + 1;
  await db.enregistrerParametres(P);
  return n;
}

function instantane(c) {
  const { id, civilite, nom, prenom, societe, adresse, cp, ville, tel, email } = c;
  return { id, civilite, nom, prenom, societe, adresse, cp, ville, tel, email };
}

function ajouterPrestation(d, p, indexLot) {
  let i = d.sections.findIndex(s => s.titre === p.categorie);
  if (i < 0) {
    const lot = d.sections[indexLot];
    if (lot && !lot.lignes.length && ["Prestations", "Nouvelle partie"].includes(lot.titre)) { lot.titre = p.categorie || lot.titre; i = indexLot; }
    else { d.sections.push({ titre: p.categorie || "Prestations", lignes: [] }); i = d.sections.length - 1; }
  }
  // sur une facture, une prestation au mois porte le mois facturé : « Abonnement du site · novembre 2026 »
  const auMois = d.type === "facture" && p.unite === "mois";
  d.sections[i].lignes.push({ designation: auMois ? `${p.designation} · ${moisLong((d.date || aujourdhui()).slice(0, 7))}` : p.designation, description: p.description || "", qte: 1, unite: p.unite, pu: Number(p.prix_ht) });
}

/* =================== Sélecteurs =================== */
async function choisirClient(rappel) {
  const clients = (await db.lister("clients", { ordre: "nom", desc: false })).filter(c => !c.archive);
  const f = fenetre("Choisir un client", `
    <input class="recherche" type="search" placeholder="Rechercher…" id="rc">
    <button class="btn discret" id="nvClient" style="width:100%;margin-bottom:12px">${ICO.plus}Nouveau client</button>
    <div id="lc"></div>`);
  const aff = q => {
    f.el.querySelector("#lc").innerHTML = clients.filter(c => !q || `${nomClient(c)} ${c.ville} ${c.tel} ${c.email}`.toLowerCase().includes(q.toLowerCase()))
      .map(c => `<button class="choix" data-id="${c.id}"><span><b>${esc(nomClient(c))}</b><br><small class="gris">${esc([c.ville, c.tel].filter(Boolean).join(" · "))}</small></span><span>›</span></button>`).join("")
      || '<p class="vide">Aucun client.</p>';
  };
  aff("");
  f.el.querySelector("#rc").oninput = e => aff(e.target.value);
  f.el.querySelector("#lc").onclick = e => { const b = e.target.closest("[data-id]"); if (b) { f.fermer(); rappel(clients.find(c => c.id === b.dataset.id)); } };
  f.el.querySelector("#nvClient").onclick = () => { f.fermer(); formulaireClient({}, c => rappel(c)); };
}

/* La création passe en tête du catalogue. */
const enTete = cats => [...cats.filter(c => c === "Création"), ...cats.filter(c => c !== "Création")];

async function choisirPrestation(rappel) {
  const ps = (await db.lister("prestations", { ordre: "created_at", desc: false })).filter(p => !p.archive);
  const f = fenetre("Mes prestations", `<input class="recherche" type="search" placeholder="Rechercher…" id="rp"><div id="lp"></div>`);
  const aff = q => {
    const l = ps.filter(p => !q || `${p.designation} ${p.categorie}`.toLowerCase().includes(q.toLowerCase()));
    const cats = enTete([...new Set(l.map(p => p.categorie || "Autres"))]);
    f.el.querySelector("#lp").innerHTML = cats.map(cat => `<div class="cat-titre">${esc(cat)}</div>` +
      l.filter(p => (p.categorie || "Autres") === cat).map(p => `<button class="choix" data-id="${p.id}"><span>${esc(p.designation)}</span><span class="gris" style="white-space:nowrap">${eur(p.prix_ht)} € / ${esc(p.unite)}</span></button>`).join("")).join("")
      || '<p class="vide">Aucune prestation.</p>';
  };
  aff("");
  f.el.querySelector("#rp").oninput = e => aff(e.target.value);
  f.el.querySelector("#lp").onclick = e => { const b = e.target.closest("[data-id]"); if (b) { f.fermer(); rappel(ps.find(p => p.id === b.dataset.id)); } };
}

/* =================== Demandes (questionnaire du site) =================== */
const STATUTS_DEM = [["nouvelle", "Nouvelles"], ["en cours", "En cours"], ["faite", "Faites"], ["archivee", "Archivées"]];
const NOM_DEM = { nouvelle: "Nouvelle", "en cours": "En cours", faite: "Faite", archivee: "Archivée" };
const repDe = (x, q) => ((x.reponses || []).find(r => r.q === q) || {}).v || "";
const aRappelerDem = x => x.rappel && x.rappel <= aujourdhui() && !["faite", "archivee"].includes(x.statut);
const dansJours = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
let filtreDem = "nouvelle";
async function vueDemandes() {
  const demandes = await listerDemandes();
  if (!demandes) { vue.innerHTML = `<div class="entete"><h1>Demandes</h1></div><p class="vide">Les demandes du questionnaire arriveront ici.</p>`; return; }
  const ligne = x => `<a class="ligne-liste" href="#/demande/${x.id}"><div><b>${esc(x.nom)}</b><small>${esc([x.metier, repDe(x, "Entreprise"), repDe(x, "Ville")].filter(Boolean).join(" · "))}</small>${repDe(x, "Je veux") ? `<small style="display:block">${esc(repDe(x, "Je veux"))}</small>` : ""}</div>
    <div class="droite"><small class="gris">${new Date(x.created_at).toLocaleDateString("fr-FR")}</small><br>${aRappelerDem(x) ? '<span class="badge refuse">À rappeler</span> ' : ""}${x.fichiers?.length ? `<span class="badge">${x.fichiers.length} fichier${x.fichiers.length > 1 ? "s" : ""}</span>` : ""}</div></a>`;
  vue.innerHTML = `
    <div class="entete"><h1>Demandes</h1><button class="btn" id="nvDem">${ICO.plus}Ajouter</button></div>
    <div class="onglets defile">${(demandes.some(aRappelerDem) ? [["rappeler", "À rappeler"]] : []).concat(STATUTS_DEM).map(([k, n]) => `<a href="" data-f="${k}" class="${filtreDem === k ? "actif" : ""}">${n}${k === "nouvelle" ? ` (${demandes.filter(x => x.statut === "nouvelle").length})` : ""}</a>`).join("")}</div>
    <input class="recherche" type="search" placeholder="Rechercher un nom, un métier, une ville…" id="rech">
    <div class="liste" id="res"></div>`;
  const aff = () => { const q = document.getElementById("rech").value.trim().toLowerCase();
    const l = demandes.filter(x => q ? `${x.nom} ${x.metier} ${x.email} ${x.tel} ${(x.reponses || []).map(r => r.v).join(" ")}`.toLowerCase().includes(q) : filtreDem === "rappeler" ? aRappelerDem(x) : x.statut === filtreDem);
    document.getElementById("res").innerHTML = l.map(ligne).join("") || `<p class="vide">Aucune demande ici.</p>`; };
  aff();
  document.getElementById("rech").oninput = aff;
  vue.querySelectorAll("[data-f]").forEach(a => a.onclick = e => { e.preventDefault(); filtreDem = a.dataset.f; vueDemandes(); });
  document.getElementById("nvDem").onclick = () => {
    const f = fenetre("Nouvelle demande", `<form id="fd"><div class="champ"><label>Nom et prénom</label><input type="text" name="nom" required></div>
      <div class="deux"><div class="champ"><label>Téléphone</label><input type="tel" name="tel"></div><div class="champ"><label>E-mail</label><input type="email" name="email"></div></div>
      <div class="deux"><div class="champ"><label>Métier</label><input type="text" name="metier"></div><div class="champ"><label>Ville</label><input type="text" name="ville"></div></div>
      <div class="champ"><label>Venu par</label><select name="source"><option>Téléphone</option><option>Bouche-à-oreille</option><option>Instagram</option><option>TikTok</option><option>Facebook</option><option>Google</option><option>Autre</option></select></div>
      <div class="champ"><label>Note</label><textarea name="note" rows="3"></textarea></div><button class="btn" style="width:100%">Ajouter</button></form>`);
    f.el.querySelector("#fd").onsubmit = async e => { e.preventDefault(); const o = lireForm(e.target, {});
      if (!o.nom) return toast("Le nom est obligatoire.");
      const x = { id: crypto.randomUUID(), created_at: new Date().toISOString(), nom: o.nom, tel: o.tel || null, email: o.email || null, metier: o.metier || null, statut: "nouvelle", note: o.note || null, fichiers: [],
        reponses: [["Venu par", o.source], ["Ville", o.ville]].filter(r => r[1]).map(([q, v]) => ({ s: "Ajoutée à la main", q, v })) };
      try { await db.enregistrer("demandes", x); f.fermer(); toast("Demande ajoutée ✓"); location.hash = "#/demande/" + x.id; } catch (er) { erreur(er); } };
  };
}

async function vueDemande(id) {
  const x = await db.lire("demandes", id);
  if (!x) { vue.innerHTML = '<p class="vide">Demande introuvable.</p>'; return; }
  const tel = String(x.tel || "").replace(/\s/g, "");
  const contact = { nom: x.nom, tel: x.tel, email: x.email, societe: repDe(x, "Entreprise"), ville: repDe(x, "Ville") };
  const sections = []; (x.reponses || []).forEach(r => { let g = sections.find(z => z.s === r.s); if (!g) sections.push(g = { s: r.s, l: [] }); g.l.push(r); });
  // le nom de domaine et l'abonnement prévu : site 10 €, .com + 0,60 €, e-mail pro + 1,50 €, web marketing 25 €
  const veut = repDe(x, "Je veux"), nomDom = repDe(x, "Nom de domaine"), ext = repDe(x, "Extension") || ".fr", mailPro = repDe(x, "Adresse e-mail professionnelle").startsWith("Oui");
  const domaine = [nomDom ? (/\.(fr|com)$/i.test(nomDom) ? nomDom : nomDom + ext) : "", repDe(x, "Nom de domaine : disponibilité").replace(/^.*? : /, ""), repDe(x, "Nom de domaine déjà à moi") ? "déjà à lui" : "", repDe(x, "Aide pour le nom de domaine") ? "veut de l'aide pour le choisir" : ""].filter(Boolean).join(" · ");
  const parMois = (/Un site internet|dans mon site/.test(veut) || nomDom ? 10 + (ext === ".com" ? 0.6 : 0) + (mailPro ? 1.5 : 0) : 0) + (/Web marketing/.test(veut) || repDe(x, "Vidéos") === "Oui" ? 25 : 0);
  const essentiel = [["Activité", x.activite], ["Métier", x.metier], ["Veut", veut], ["Nom de domaine", domaine], ["E-mail pro", mailPro ? "Oui · + 1,50 € par mois" : ""], ["Abonnement prévu", parMois ? eur(parMois) + " € par mois" : ""], ["Dans l'appli", repDe(x, "Appli")], ["Ses clients", repDe(x, "Mode")], ["Reçoit ses patients", repDe(x, "Lieu des soins")], ["Rendez-vous aujourd'hui", repDe(x, "Rendez-vous aujourd'hui")], ["Liste d'attente", repDe(x, "Liste d'attente")], ["Pour quand", repDe(x, "Délai")], ["Questions", repDe(x, "Remarques")]].filter(r => r[1]);
  const majDem = async (champs, msg) => { Object.assign(x, champs); try { await db.enregistrer("demandes", { ...x }); if (msg) toast(msg); } catch (e) { erreur(e); } };
  vue.innerHTML = `
    <div class="entete"><div><div class="petit">Demande du ${new Date(x.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}</div><h1>${esc(x.nom)}</h1>
      <p class="gris">${esc([x.metier, contact.societe, contact.ville].filter(Boolean).join(" · "))}</p></div>
      <span class="badge ${x.statut === "faite" ? "signe" : x.statut === "en cours" ? "envoye" : ""}">${NOM_DEM[x.statut] || x.statut}</span></div>
    <div class="deux-col">
      <div>
        <div class="actions-doc" style="margin-top:0">
          ${tel ? `<a class="btn" href="tel:${esc(tel)}">Appeler</a>` : ""}<button class="btn clair" id="ecrire">Écrire un message</button>
          ${x.client_id ? `<a class="btn clair" href="#/client/${x.client_id}">${ICO.client}Fiche client</a><a class="btn clair" href="#/document/nouveau/devis?client=${x.client_id}">${ICO.plus}Devis</a>`
            : `<button class="btn clair" id="versClient">${ICO.client}Créer la fiche client</button>`}
        </div>
        <div class="carte" style="margin-bottom:12px">
          <label>Où en est-elle</label>
          <div class="palette" style="margin-bottom:14px">${STATUTS_DEM.slice(0, 3).map(([k]) => `<button class="btn ${x.statut === k ? "" : "discret"} petit-btn" data-statut="${k}">${NOM_DEM[k]}</button>`).join("")}</div>
          <label>Rappel ${x.rappel ? `· <span style="text-transform:none;letter-spacing:0">${esc(jourRdv(x.rappel + "T12:00"))}</span>` : ""}</label>
          <div class="palette" style="margin-bottom:8px"><button class="btn discret petit-btn" data-rappel="1">Demain</button><button class="btn discret petit-btn" data-rappel="3">Dans 3 jours</button><button class="btn discret petit-btn" data-rappel="7">Dans une semaine</button>${x.rappel ? '<button class="btn discret petit-btn" data-rappel="0">Effacer</button>' : ""}</div>
          <input type="date" id="dRappel" value="${esc(x.rappel || "")}" style="margin-bottom:14px">
          <label for="dNote">Votre note</label><textarea id="dNote" rows="3" placeholder="Rappeler mardi, devis envoyé…">${esc(x.note || "")}</textarea><small class="gris" id="dEnreg"></small>
        </div>
        ${essentiel.length ? `<div class="carte" style="margin-bottom:12px"><label>L'essentiel</label>${essentiel.map(([k, v]) => `<div class="ligne-bilan"><span class="gris">${esc(k)}</span><span style="text-align:right">${esc(v)}</span></div>`).join("")}</div>` : ""}
        ${x.fichiers?.length ? `<h2 style="margin:18px 0 10px">Fichiers · ${x.fichiers.length}</h2><div class="photos-demande" id="fichiers">${x.fichiers.map(fi => `<a target="_blank" rel="noopener" class="fichier"><span>${esc(fi.nom)}</span><small>${esc(fi.type || "")}</small></a>`).join("")}</div>` : ""}
      </div>
      <div>
        <div class="carte"><div class="entete" style="margin:0 0 6px"><label style="margin:0">Ses réponses</label><button class="btn discret petit-btn" id="copier">Copier</button></div>
          ${sections.map(g => `<div class="cat-titre">${esc(g.s)}</div>${g.l.map(r => `<div class="ligne-bilan"><span class="gris">${esc(r.q)}</span><span style="text-align:right;white-space:pre-line">${esc(r.v)}</span></div>`).join("")}`).join("") || '<p class="gris">Aucune réponse.</p>'}</div>
        <div class="actions-doc"><button class="btn discret" id="archiver">${x.statut === "archivee" ? "Remettre dans les demandes" : "Archiver"}</button><button class="btn danger" id="suppr">${ICO.poubelle}Supprimer</button></div>
      </div>
    </div>`;
  if (x.fichiers?.length) db.photosDemande(x.fichiers.map(fi => fi.chemin)).then(urls => {
    [...document.getElementById("fichiers").children].forEach((a, i) => { if (!urls[i]) return; a.href = urls[i];
      if (/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(x.fichiers[i].nom)) a.innerHTML = `<img src="${esc(urls[i])}" alt="${esc(x.fichiers[i].nom)}" loading="lazy"><small>${esc(x.fichiers[i].type || "")}</small>`; });
  }).catch(e => console.error(e));
  document.getElementById("ecrire").onclick = () => choisirMessage(contact, { demande: x });
  vue.querySelectorAll("[data-statut]").forEach(b => b.onclick = async () => { await majDem({ statut: b.dataset.statut }, `Passée en « ${NOM_DEM[b.dataset.statut]} » ✓`); vueDemande(id); });
  vue.querySelectorAll("[data-rappel]").forEach(b => b.onclick = async () => { const n = +b.dataset.rappel; await majDem({ rappel: n ? dansJours(n) : null }, n ? "Rappel noté ✓" : "Rappel effacé"); vueDemande(id); });
  document.getElementById("dRappel").onchange = async e => { await majDem({ rappel: e.target.value || null }, e.target.value ? "Rappel noté ✓" : "Rappel effacé"); vueDemande(id); };
  let attente; document.getElementById("dNote").oninput = e => { document.getElementById("dEnreg").textContent = "…"; clearTimeout(attente);
    attente = setTimeout(async () => { await majDem({ note: e.target.value.trim() || null }); document.getElementById("dEnreg").textContent = "Enregistré"; }, 700); };
  document.getElementById("copier").onclick = () => navigator.clipboard.writeText(`${x.nom} · ${x.tel || ""} · ${x.email || ""}\n` + (x.reponses || []).map(r => `${r.q} : ${r.v}`).join("\n")).then(() => toast("Réponses copiées ✓"));
  const vc = document.getElementById("versClient");
  if (vc) vc.onclick = async () => {
    try {
      const c = await db.enregistrer("clients", { nom: x.nom, tel: x.tel, email: x.email, societe: contact.societe || null, ville: contact.ville || null, adresse: repDe(x, "Adresse") || null,
        notes: [x.metier, repDe(x, "Je veux")].filter(Boolean).join(" · ") || null, archive: false });
      await majDem({ client_id: c.id, statut: x.statut === "nouvelle" ? "en cours" : x.statut });
      toast("Fiche client créée ✓"); vueDemande(id);
    } catch (e) { erreur(e); }
  };
  document.getElementById("archiver").onclick = async () => { const avant = x.statut; await majDem({ statut: avant === "archivee" ? "nouvelle" : "archivee" });
    const t = document.createElement("div"); t.className = "toast"; t.innerHTML = `${avant === "archivee" ? "Demande remise" : "Demande archivée"} <button type="button" style="margin-left:10px;background:none;border:0;color:#fff;text-decoration:underline;font:inherit;cursor:pointer">Annuler</button>`;
    document.body.appendChild(t); setTimeout(() => t.remove(), 6000); t.querySelector("button").onclick = async () => { t.remove(); await majDem({ statut: avant }); vueDemande(id); };
    location.hash = "#/demandes"; };
  document.getElementById("suppr").onclick = async () => {
    if (!(await confirmer(`Supprimer définitivement la demande de ${x.nom} et ses fichiers ? (Pour la garder de côté, archivez-la plutôt.)`, "Supprimer"))) return;
    try { await db.supprimerPhotosDemande((x.fichiers || []).map(fi => fi.chemin)); await db.supprimer("demandes", x.id); toast("Demande supprimée"); location.hash = "#/demandes"; } catch (e) { erreur(e); }
  };
}

/* =================== Clients =================== */
async function vueClients() {
  const clients = (await db.lister("clients", { ordre: "nom", desc: false })).filter(c => !c.archive);
  vue.innerHTML = `
    <div class="entete"><h1>Clients</h1><a class="btn" href="#/client/nouveau">${ICO.plus}Nouveau client</a></div>
    <input class="recherche" type="search" placeholder="Rechercher un nom, une ville, un téléphone…" id="rech">
    <div class="liste" id="res"></div>`;
  const aff = q => {
    document.getElementById("res").innerHTML = clients.filter(c => !q || `${nomClient(c)} ${c.ville} ${c.tel} ${c.email}`.toLowerCase().includes(q.toLowerCase()))
      .map(c => `<a class="ligne-liste" href="#/client/${c.id}"><div><b>${esc(nomClient(c))}</b><small>${esc([c.ville, c.tel].filter(Boolean).join(" · "))}</small></div><span class="gris">›</span></a>`).join("")
      || '<p class="vide">Aucun client pour l\'instant.</p>';
  };
  aff("");
  document.getElementById("rech").oninput = e => aff(e.target.value);
}

const CHAMPS_CLIENT = [["civilite", "Civilité", "text", "M. / Mme"], ["nom", "Nom", "text"], ["prenom", "Prénom", "text"], ["societe", "Société", "text"],
  ["adresse", "Adresse", "text"], ["cp", "Code postal", "text"], ["ville", "Ville", "text"], ["tel", "Téléphone", "tel"], ["email", "E-mail", "email"]];

function champsClient(c) {
  return `<div class="deux">${CHAMPS_CLIENT.slice(0, 4).map(([k, l, t, ph]) => `<div class="champ"><label>${l}</label><input type="${t}" name="${k}" value="${esc(c[k])}" placeholder="${ph || ""}"></div>`).join("")}</div>
    ${CHAMPS_CLIENT.slice(4, 5).map(([k, l, t]) => `<div class="champ"><label>${l}</label><input type="${t}" name="${k}" value="${esc(c[k])}"></div>`).join("")}
    <div class="deux">${CHAMPS_CLIENT.slice(5).map(([k, l, t]) => `<div class="champ"><label>${l}</label><input type="${t}" name="${k}" value="${esc(c[k])}"></div>`).join("")}</div>
    <div class="champ"><label>Notes</label><textarea name="notes" rows="3">${esc(c.notes)}</textarea></div>`;
}
function lireForm(el, obj) { el.querySelectorAll("[name]").forEach(i => { obj[i.name] = i.value.trim(); }); return obj; }

function formulaireClient(c, rappel) {
  const f = fenetre(c.id ? "Modifier le client" : "Nouveau client", `<form id="fc">${champsClient(c)}<button class="btn" style="width:100%">Enregistrer</button></form>`);
  f.el.querySelector("#fc").onsubmit = async e => {
    e.preventDefault();
    const o = lireForm(e.target, { ...c });
    if (!o.nom) return toast("Le nom est obligatoire.");
    try { const n = await db.enregistrer("clients", o); f.fermer(); toast("Client enregistré ✓"); rappel(n); } catch (er) { erreur(er); }
  };
}

async function vueClient(id, params) {
  const c = id === "nouveau" ? {} : await db.lire("clients", id);
  if (!c) { vue.innerHTML = '<p class="vide">Client introuvable.</p>'; return; }
  const docs = c.id ? (await db.lister("documents")).filter(d => d.client_id === c.id) : [];
  vue.innerHTML = `
    <div class="entete"><div><div class="petit">Client</div><h1>${c.id ? esc(nomClient(c)) : "Nouveau client"}</h1></div></div>
    <div class="deux-col">
      <details class="section-fiche carte" ${c.id ? "" : "open"}><summary>Coordonnées<span>${esc([c.tel, c.ville].filter(Boolean).join(" · "))}</span></summary>
      <form id="fc" style="margin-top:10px">${champsClient(c)}
        <div class="actions-doc"><button class="btn">Enregistrer</button>
        ${c.id ? `<button type="button" class="btn danger" id="archiver">Archiver</button>` : ""}</div>
      </form></details>
      <div>
        ${c.id ? `
        <div class="actions-doc">${c.tel ? `<a class="btn" href="tel:${esc(c.tel.replace(/\s/g, ""))}">Appeler</a>` : ""}<button class="btn clair" id="ecrireClient">Écrire un message</button></div>
        <details class="section-fiche" ${Number(c.abonnement_mensuel) ? "open" : ""}><summary>Abonnement<span>${Number(c.abonnement_mensuel) ? eur(c.abonnement_mensuel) + " € / mois" : "aucun"}</span></summary>
        <form id="fAbo" class="carte" style="margin-top:6px"><div class="deux"><div class="champ"><label>Par mois €</label><input type="number" step="0.01" min="0" inputmode="decimal" name="abonnement_mensuel" value="${esc(c.abonnement_mensuel ?? "")}" placeholder="10"></div>
          <div class="champ"><label>Mise en ligne du site</label><input type="date" name="abonnement_debut" value="${esc(c.abonnement_debut || "")}"></div></div>
          <p class="gris" style="font-size:13px;margin:-4px 0 10px">L'abonnement court à partir de cette date, et revient le même jour chaque mois. <a href="#/abonnements">Tous les abonnements ›</a></p>
          <div class="champ"><label>Libellé sur la facture</label><input type="text" name="abonnement_libelle" value="${esc(c.abonnement_libelle || "")}" placeholder="${esc(P.abonnement_libelle || "Abonnement du site")}"><small class="gris" id="aboApercu">Sur la facture : ${esc(c.abonnement_libelle || P.abonnement_libelle || "Abonnement du site")} · ${esc(periodeTxt(periodeAbo(c) || periodeAbo({ abonnement_debut: c.abonnement_debut || aujourdhui() }, c.abonnement_debut || aujourdhui())))}</small></div>
          <button class="btn petit-btn">Enregistrer l'abonnement</button></form></details>
        <details class="section-fiche" ${params?.get("carnet") ? "open" : ""}><summary>Carnet du projet<span></span></summary>
        <div id="carnet" style="margin-top:6px"><p class="gris">Chargement du carnet…</p></div></details>
        <details class="section-fiche"><summary>Devis et factures<span>${docs.length}</span></summary>
        <div class="actions-doc" style="margin:6px 0 10px"><a class="btn petit-btn" href="#/document/nouveau/devis?client=${c.id}">${ICO.plus}Devis</a><a class="btn clair petit-btn" href="#/document/nouveau/facture?client=${c.id}">${ICO.plus}Facture</a></div>
        <div class="liste">${docs.map(ligneDoc).join("") || '<p class="gris">Aucun devis ni facture.</p>'}</div></details>
` : ""}
      </div>
    </div>`;
  const ec = document.getElementById("ecrireClient");
  if (ec) { const pa = periodeAbo(c), docsAbo = pa ? docs.filter(d => d.abo === pa.cle && d.statut === "paye") : [{}];
    ec.onclick = () => choisirMessage(c, { abonnementDu: Number(c.abonnement_mensuel) && !docsAbo.length ? Number(c.abonnement_mensuel) : 0 }); }
  const fa = document.getElementById("fAbo");
  if (fa) fa.abonnement_libelle.oninput = fa.abonnement_debut.onchange = () => { const deb = fa.abonnement_debut.value || null, p = periodeAbo({ abonnement_debut: deb }) || periodeAbo({ abonnement_debut: deb }, deb || aujourdhui());
    document.getElementById("aboApercu").textContent = `Sur la facture : ${fa.abonnement_libelle.value.trim() || P.abonnement_libelle || "Abonnement du site"} · ${periodeTxt(p)}`; };
  if (fa) fa.onsubmit = async e => { e.preventDefault(); const o = lireForm(e.target, {});
    try { await db.enregistrer("clients", { ...c, abonnement_mensuel: o.abonnement_mensuel === "" ? null : Number(o.abonnement_mensuel), abonnement_libelle: o.abonnement_libelle || null, abonnement_debut: o.abonnement_debut || null }); toast("Abonnement enregistré ✓"); vueClient(c.id, params); } catch (er) { erreur(er); } };
  if (c.id) import("./carnet.js").then(async m => {
    await m.monterCarnet(document.getElementById("carnet"), { db, client: c, P, toast, esc, erreur, envoyerMessage });
    if (params?.get("carnet")) document.getElementById("carnet").closest("details")?.scrollIntoView({ block: "start" });
  }).catch(erreur);
  document.getElementById("fc").onsubmit = async e => {
    e.preventDefault();
    const o = lireForm(e.target, { ...c });
    if (!o.nom) return toast("Le nom est obligatoire.");
    try { const n = await db.enregistrer("clients", o); toast("Client enregistré ✓"); if (!c.id) location.hash = "#/client/" + n.id; } catch (er) { erreur(er); }
  };
  const ar = document.getElementById("archiver");
  if (ar) ar.onclick = async () => {
    if (!(await confirmer("Archiver ce client ? Il n'apparaîtra plus dans la liste, ses devis et factures sont conservés.", "Archiver"))) return;
    await db.enregistrer("clients", { ...c, archive: true }); toast("Client archivé"); location.hash = "#/clients";
  };
}

/* =================== Prestations =================== */
async function vuePrestations() {
  const ps = (await db.lister("prestations", { ordre: "created_at", desc: false })).filter(p => !p.archive);
  const cats = enTete([...new Set(ps.map(p => p.categorie || "Autres"))]);
  vue.innerHTML = `
    <div class="entete"><div><h1>Prestations</h1><p class="gris">Votre catalogue de prix, utilisable dans chaque devis.</p></div><button class="btn" id="nv">${ICO.plus}Nouvelle prestation</button></div>
    <input class="recherche" type="search" placeholder="Rechercher…" id="rech">
    <div id="res"></div>`;
  const aff = q => {
    const l = ps.filter(p => !q || `${p.designation} ${p.categorie}`.toLowerCase().includes(q.toLowerCase()));
    document.getElementById("res").innerHTML = cats.map(cat => {
      const lc = l.filter(p => (p.categorie || "Autres") === cat);
      return lc.length ? `<div class="cat-titre">${esc(cat)}</div>` + lc.map(p => `<button class="choix" data-id="${p.id}"><span>${esc(p.designation)}</span><span class="gris" style="white-space:nowrap">${eur(p.prix_ht)} € / ${esc(p.unite)}</span></button>`).join("") : "";
    }).join("") || '<p class="vide">Aucune prestation.</p>';
  };
  aff("");
  document.getElementById("rech").oninput = e => aff(e.target.value);
  document.getElementById("nv").onclick = () => formulairePrestation({ unite: "presta", prix_ht: 0 }, cats);
  document.getElementById("res").onclick = e => { const b = e.target.closest("[data-id]"); if (b) formulairePrestation(ps.find(p => p.id === b.dataset.id), cats); };
}

function formulairePrestation(p, cats) {
  const f = fenetre(p.id ? "Modifier la prestation" : "Nouvelle prestation", `
    <form id="fp">
      <div class="champ"><label>Catégorie</label><input type="text" name="categorie" list="cats" value="${esc(p.categorie)}"><datalist id="cats">${cats.map(c => `<option value="${esc(c)}">`).join("")}</datalist></div>
      <div class="champ"><label>Désignation</label><textarea name="designation" rows="3">${esc(p.designation)}</textarea></div>
      <div class="champ"><label>Détail (facultatif)</label><textarea name="description" rows="2">${esc(p.description)}</textarea></div>
      <div class="deux">
        <div class="champ"><label>Unité</label><select name="unite">${UNITES.map(u => `<option ${u === p.unite ? "selected" : ""}>${u}</option>`).join("")}</select></div>
        <div class="champ"><label>Prix HT €</label><input type="number" step="0.01" inputmode="decimal" name="prix_ht" value="${esc(p.prix_ht)}"></div>
      </div>
      <div class="actions-doc"><button class="btn">Enregistrer</button>${p.id ? `<button type="button" class="btn danger" id="arch">${ICO.poubelle}Retirer</button>` : ""}</div>
    </form>`);
  f.el.querySelector("#fp").onsubmit = async e => {
    e.preventDefault();
    const o = lireForm(e.target, { ...p }); o.prix_ht = Number(o.prix_ht) || 0;
    if (!o.designation) return toast("La désignation est obligatoire.");
    try { await db.enregistrer("prestations", o); f.fermer(); toast("Prestation enregistrée ✓"); vuePrestations(); } catch (er) { erreur(er); }
  };
  const a = f.el.querySelector("#arch");
  if (a) a.onclick = async () => { await db.enregistrer("prestations", { ...p, archive: true }); f.fermer(); toast("Prestation retirée"); vuePrestations(); };
}

/* =================== Abonnements du mois =================== */
async function vueAbonnements() {
  const [clients, docs] = await Promise.all([db.lister("clients", { ordre: "nom", desc: false }), db.lister("documents")]);
  const abonnes = clients.filter(c => !c.archive && Number(c.abonnement_mensuel) > 0);
  const factureDe = c => factureAbo(docs, c, periodeAbo(c));
  const aFaire = abonnes.filter(c => periodeAbo(c) && !factureDe(c));
  const total = abonnes.reduce((a, c) => a + Number(c.abonnement_mensuel), 0), encaisse = abonnes.filter(c => factureDe(c)?.statut === "paye").reduce((a, c) => a + Number(c.abonnement_mensuel), 0);
  vue.innerHTML = `
    <div class="entete"><div><div class="petit">Abonnements</div><h1>À ce jour</h1></div></div>
    <p class="gris" style="font-size:14px;margin:-6px 0 14px">Chaque abonnement court à partir de la mise en ligne du site : la date se met dans la fiche du client.</p>
    <div class="stats"><div class="stat"><span class="petit">Chaque mois</span><b>${eur(total)} €</b><small class="gris">${abonnes.length} abonné${abonnes.length > 1 ? "s" : ""}</small></div>
      <div class="stat"><span class="petit">Périodes en cours payées</span><b>${eur(encaisse)} €</b><small class="gris">reste ${eur(total - encaisse)} €</small></div></div>
    ${aFaire.length ? `<button class="btn" id="facturesMois" style="width:100%;margin-bottom:16px">Faire les factures dues (${aFaire.length})</button>` : abonnes.length ? `<p class="gris" style="margin-bottom:14px">✓ Les factures dues sont faites.</p>` : ""}
    <div class="liste">${abonnes.map(c => { const d = factureDe(c);
      return `<div class="ligne-liste" style="flex-wrap:wrap;gap:8px"><a href="#/client/${c.id}" style="text-decoration:none;flex:1 1 100%"><b>${esc(nomClient(c))}</b><small style="display:block">${eur(c.abonnement_mensuel)} € par mois · ${c.abonnement_debut ? `le ${periodeAbo(c)?.jour || Number(c.abonnement_debut.slice(8, 10))} de chaque mois` : "date de mise en ligne à mettre"}</small><small style="display:block">${periodeAbo(c) ? esc(periodeTxt(periodeAbo(c))) : "pas encore en ligne"}${d ? " · facture " + esc(d.numero) : ""}</small></a>
        <div class="droite" style="flex:1 1 100%;text-align:left">${d ? `<span class="badge ${esc(d.statut)}">${esc(libelleStatut("facture", d.statut))}</span><div class="actions-doc" style="margin:6px 0 0;justify-content:flex-start">
          <a class="btn discret petit-btn" href="#/document/${d.id}">Ouvrir</a>${d.statut !== "paye" ? `<button class="btn discret petit-btn" data-envoyer="${d.id}">Envoyer</button><button class="btn clair petit-btn" data-paye="${d.id}">Payé</button><button class="btn discret petit-btn" data-rappel-abo="${c.id}">Rappel</button>` : ""}</div>` : periodeAbo(c) ? '<small class="gris">pas encore de facture</small>' : ""}</div></div>`; }).join("")
      || '<p class="vide">Aucun abonné pour l\'instant. L\'abonnement se règle dans la fiche du client.</p>'}</div>`;
  const fm = document.getElementById("facturesMois");
  if (fm) fm.onclick = async () => {
    fm.disabled = true; let n = 0;
    try {
      for (const c of aFaire) {
        const p = periodeAbo(c), per = periodeTxt(p);
        const f = { type: "facture", numero: numeroSuivant("facture"), date: aujourdhui(), statut: "brouillon", client_id: c.id, client: instantane(c), objet: `Abonnement ${per}`,
          sections: [{ titre: "Abonnement", lignes: [{ designation: `${c.abonnement_libelle || P.abonnement_libelle || "Abonnement du site"} · ${per}`, qte: 1, unite: "mois", pu: Number(c.abonnement_mensuel) }] }],
          acompte_pct: 0, deja_regle: 0, abo: p.cle, notes: "" };
        await enregistrerNouveau(f); n++;
      }
      toast(`${n} facture${n > 1 ? "s" : ""} faite${n > 1 ? "s" : ""} ✓`);
    } catch (e) { erreur(e); }
    vueAbonnements();
  };
  vue.onclick = async e => {
    const b = e.target.closest("[data-paye],[data-envoyer],[data-rappel-abo]"); if (!b) return;
    if (b.dataset.rappelAbo) { const c = abonnes.find(x => x.id === b.dataset.rappelAbo); const m = messagesClient(c, { abonnementDu: Number(c.abonnement_mensuel) }).find(x => x[0] === "Rappel d'abonnement"); return envoyerMessage({ client: c }, m[2], m[1]); }
    const d = docs.find(x => x.id === (b.dataset.paye || b.dataset.envoyer));
    try {
      if (b.dataset.envoyer) { envoyerPDF(d, async () => { if (d.statut === "brouillon") { d.statut = "envoye"; await db.enregistrer("documents", d); } vueAbonnements(); }); return; }
      d.statut = "paye"; d.deja_regle = totaux(d).ttc; await db.enregistrer("documents", d); toast("Abonnement payé ✓"); vueAbonnements();
    } catch (er) { if (er.name !== "AbortError") erreur(er); }
  };
}

/* =================== Visites du site : le compteur fait maison =================== */
let periodeVisites = 30;
const nomPage = p => p === "/" || p === "/index.html" ? "Accueil" : p === "/questionnaire.html" ? "Questionnaire"
  : (t => t.charAt(0).toUpperCase() + t.slice(1))(decodeURIComponent(p).replace(/^\/|\/$|\.html$/g, "").replace(/-/g, " "));
async function vueVisites() {
  let v;
  try { v = await db.listerVisites(periodeVisites); }
  catch (e) { vue.innerHTML = `<div class="entete"><h1>Visites du site</h1></div><p class="gris">${typeof db.listerVisites !== "function" ? "L'appli se met à jour : fermez-la et rouvrez-la dans quelques minutes." : "Les visites ne sont pas lisibles pour l'instant. Réessayez dans un moment."}</p>`; return; }
  const pages = v.filter(x => !x.evenement), visites = v.filter(x => x.nouvelle), envoyes = v.filter(x => x.evenement === "questionnaire envoyé");
  const compte = (l, f) => Object.entries(l.reduce((o, x) => { const k = f(x); if (k) o[k] = (o[k] || 0) + 1; return o; }, {})).sort((a, b) => b[1] - a[1]);
  const pct = (n, t) => t ? Math.round(n * 100 / t) + " %" : "–";
  // une barre par jour
  const jours = [...Array(periodeVisites)].map((_, i) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - (periodeVisites - 1 - i)); return d.toISOString().slice(0, 10); });
  const parJour = jours.map(j => visites.filter(x => new Date(x.created_at).toISOString().slice(0, 10) === j).length), max = Math.max(1, ...parJour);
  const liste = (titre, l, total) => `<div class="carte" style="margin-bottom:12px"><label>${titre}</label>${l.length ? l.slice(0, 10).map(([k, n]) =>
    `<div class="ligne-bilan"><span>${esc(k)}</span><span><b>${n}</b> <small class="gris">${pct(n, total)}</small></span></div>`).join("") : '<p class="gris" style="font-size:14px">Pas encore de visites.</p>'}</div>`;
  const appareils = { telephone: "Téléphone", tablette: "Tablette", ordinateur: "Ordinateur" };
  vue.innerHTML = `
    <div class="entete"><div><div class="petit">Votre site</div><h1>Visites</h1></div></div>
    <div class="onglets" style="margin-bottom:14px">${[[7, "7 jours"], [30, "30 jours"], [90, "3 mois"], [365, "12 mois"]].map(([n, t]) => `<a href="" data-periode="${n}" class="${periodeVisites === n ? "actif" : ""}">${t}</a>`).join("")}</div>
    <div class="stats">
      <div class="stat"><span class="petit">Visiteurs</span><b>${visites.length}</b></div>
      <div class="stat"><span class="petit">Pages vues</span><b>${pages.length}</b></div>
      <div class="stat"><span class="petit">Questionnaires envoyés</span><b>${envoyes.length}</b><small class="gris">${pct(envoyes.length, visites.length)} des visiteurs</small></div>
      <div class="stat"><span class="petit">Sur téléphone</span><b>${pct(visites.filter(x => x.appareil === "telephone").length, visites.length)}</b></div>
    </div>
    <div class="carte" style="margin-bottom:12px"><label>Visiteurs par jour</label>
      <div style="display:flex;align-items:flex-end;gap:2px;height:90px;margin-top:8px">${parJour.map((n, i) => `<div title="${new Date(jours[i] + "T12:00").toLocaleDateString("fr-FR")} : ${n}" style="flex:1;min-width:2px;height:${Math.max(2, n * 100 / max)}%;background:${n ? "var(--violet)" : "var(--sable)"};border-radius:3px 3px 0 0"></div>`).join("")}</div>
      <div class="ligne-bilan" style="border:0;padding-top:4px"><small class="gris">${new Date(jours[0] + "T12:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</small><small class="gris">aujourd'hui</small></div></div>
    ${liste("D'où ils viennent", compte(visites, x => x.source === "interne" ? "" : x.source || "Accès direct"), visites.length)}
    ${liste("Les pages les plus vues", compte(pages, x => nomPage(x.page)), pages.length)}
    ${liste("Les pages d'arrivée", compte(visites, x => nomPage(x.page)), visites.length)}
    ${liste("Téléphone ou ordinateur", compte(visites, x => appareils[x.appareil] || ""), visites.length)}
    <p class="gris" style="font-size:13px;margin-top:6px">Sans cookie : on compte les pages vues, rien qui identifie les visiteurs. Les robots et vos propres visites, sur les téléphones où votre appli est ouverte, ne sont pas comptés.</p>`;
  vue.querySelectorAll("[data-periode]").forEach(a => a.onclick = e => { e.preventDefault(); periodeVisites = Number(a.dataset.periode); vueVisites(); });
}

/* =================== Agenda : les rendez-vous de tous les clients =================== */
async function vueAgenda() {
  const [rdvs, clients, demandes] = await Promise.all([db.listerDepenses(["rdv"]).catch(() => []), db.lister("clients"), listerDemandes()]);
  const clientDe = r => clients.find(c => c.id === r.client_id);
  const avenir = rdvs.filter(r => new Date(r.created_at) >= Date.now() - 3600000).sort((a, b) => a.created_at < b.created_at ? -1 : 1);
  const rappels = (demandes || []).filter(aRappelerDem);
  const jours = []; avenir.forEach(r => { const j = new Date(r.created_at).toDateString(); let g = jours.find(x => x.j === j); if (!g) jours.push(g = { j, l: [] }); g.l.push(r); });
  vue.innerHTML = `
    <div class="entete"><h1>Agenda</h1><button class="btn" id="nvRdv">${ICO.plus}Rendez-vous</button></div>
    ${rappels.length ? `<div class="carte" style="margin-bottom:16px"><h2 style="margin-bottom:6px">À rappeler aujourd'hui</h2>${rappels.map(x => `<a class="ligne-bilan" href="#/demande/${x.id}" style="text-decoration:none"><span>${esc(x.nom)}</span><span class="gris">${esc(x.tel || "")}</span></a>`).join("")}</div>` : ""}
    <div id="agenda">${jours.map(g => `<div class="petit" style="margin:16px 0 4px">${esc(jourRdv(g.l[0].created_at))}</div>${g.l.map(r => carteRdv(r, esc, { client: clientDe(r) })).join("")}`).join("")
      || '<p class="vide">Aucun rendez-vous à venir.</p>'}</div>`;
  lierRdv(document.getElementById("agenda"), avenir, clientDe, envoyerMessage);
  document.getElementById("nvRdv").onclick = () => choisirClient(c => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    const f = fenetre("Rendez-vous avec " + nomClient(c), `<div class="champ"><label>Rendez-vous</label><select id="rObjet">${OBJETS_RDV.map(o => `<option>${o}</option>`).join("")}</select></div>
      <div class="deux"><div class="champ"><label>Date</label><input type="date" id="rDate" value="${d.toISOString().slice(0, 10)}"></div><div class="champ"><label>Heure</label><input type="time" id="rHeure" value="10:00"></div></div>
      <div class="champ"><label>Précision (facultatif)</label><input type="text" id="rTexte" maxlength="200"></div>${champVisio("rVisio", P.lien_visio, esc)}<button class="btn" id="rOk" style="width:100%">Enregistrer</button>`);
    f.el.querySelector("#rOk").onclick = async () => {
      const quand = new Date(`${f.el.querySelector("#rDate").value}T${f.el.querySelector("#rHeure").value || "10:00"}`); if (isNaN(quand)) return toast("Indiquez la date et l'heure.");
      const objet = f.el.querySelector("#rObjet").value, t = f.el.querySelector("#rTexte").value.trim();
      try { await db.ajouterCarnet({ client_id: c.id, etape: "pendant", type: "rdv", texte: avecLien(t ? `${objet} · ${t}` : objet, f.el.querySelector("#rVisio").value), created_at: quand.toISOString() }); f.fermer(); toast("Rendez-vous noté ✓"); vueAgenda(); } catch (e) { erreur(e); }
    };
  });
}

/* =================== Notifications sur le téléphone =================== */
const b64 = t => { const p = (t + "===".slice((t.length + 3) % 4)).replace(/-/g, "+").replace(/_/g, "/"); return Uint8Array.from(atob(p), c => c.charCodeAt(0)); };
const pushPossible = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
async function notifsActives() { if (!pushPossible() || Notification.permission !== "granted") return false; const r = await navigator.serviceWorker.ready; return !!(await r.pushManager.getSubscription()); }
async function activerNotifications() {
  if (!pushPossible()) return fenetre("Notifications", /iphone|ipad/i.test(navigator.userAgent)
    ? "<p>Sur iPhone, les notifications marchent une fois l'appli sur l'écran d'accueil : mettez-la sur l'écran, ouvrez-la depuis son icône, puis revenez ici.</p>"
    : "<p>Ce navigateur ne prend pas en charge les notifications. Ouvrez l'appli dans Chrome ou Safari.</p>");
  if (Notification.permission === "denied") return toast("Les notifications sont bloquées : autorisez-les dans les réglages du téléphone.");
  if (await Notification.requestPermission() !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const ab = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(window.NORA_SB.vapid) });
    await db.abonnerTelephone(ab.toJSON()); toast("Ce téléphone sera prévenu ✓"); vuePlus();
  } catch (e) { erreur(e); }
}

/* =================== Plus / Réglages =================== */
// installer l'appli : Android propose l'installation, l'iPhone passe par Safari
let invitationInstall = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); invitationInstall = e; });
const dejaInstallee = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone;
function installerAppli() {
  if (invitationInstall) { invitationInstall.prompt(); invitationInstall.userChoice.finally(() => { invitationInstall = null; }); return; }
  const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
  fenetre("Mettre l'appli sur le téléphone", iphone
    ? `<ol class="etapes-install"><li>Ouvrez cette page dans <b>Safari</b>.</li><li>Touchez le bouton <b>Partager</b> (le carré avec une flèche vers le haut).</li><li>Choisissez <b>Sur l'écran d'accueil</b>, puis <b>Ajouter</b>.</li></ol><p class="gris" style="font-size:14px">L'icône Nora apparaît à côté de vos applis : un toucher, et l'appli s'ouvre en plein écran.</p>`
    : `<ol class="etapes-install"><li>Ouvrez cette page dans <b>Chrome</b>.</li><li>Touchez les <b>trois points</b> en haut à droite.</li><li>Choisissez <b>Ajouter à l'écran d'accueil</b> (ou <b>Installer l'application</b>), puis <b>Installer</b>.</li></ol><p class="gris" style="font-size:14px">L'icône Nora apparaît à côté de vos applis : un toucher, et l'appli s'ouvre en plein écran.</p>`);
}

async function vuePlus() {
  const notifs = await notifsActives().catch(() => false);
  vue.innerHTML = `
    <div class="entete"><h1>Plus</h1></div>
    <div class="liste">
      <a class="ligne-liste" href="#/abonnements"><div><b>Abonnements</b><small>Chaque abonnement à sa date, ses factures et les rappels</small></div><span class="gris">›</span></a>
      <a class="ligne-liste" href="#/visites"><div><b>Visites du site</b><small>Visiteurs, pages vues, d'où ils viennent, questionnaires envoyés</small></div><span class="gris">›</span></a>
      <a class="ligne-liste" href="#/prestations"><div><b>Mes prestations et tarifs</b><small>Votre catalogue, utilisé dans chaque devis</small></div><span class="gris">›</span></a>
      ${dejaInstallee() ? "" : `<button class="ligne-liste" id="installer" style="border:0;text-align:left;width:100%;cursor:pointer"><div><b>Mettre l'appli sur le téléphone</b><small>Une icône Nora sur l'écran d'accueil</small></div><span class="gris">›</span></button>`}
      ${db.MODE_ESSAI ? "" : notifs ? `<div class="ligne-liste"><div><b>Notifications</b><small>✓ Ce téléphone sonne à chaque nouvelle demande, et le matin quand un abonnement revient ou reste à payer</small></div></div>`
        : `<button class="ligne-liste" id="notifs" style="border:0;text-align:left;width:100%;cursor:pointer"><div><b>Recevoir les notifications</b><small>À chaque nouvelle demande, et pour les abonnements à encaisser</small></div><span class="gris">›</span></button>`}
      <a class="ligne-liste" href="#/reglages"><div><b>Réglages</b><small>Entreprise, RIB, numérotation, conditions</small></div><span class="gris">›</span></a>
      <button class="ligne-liste" id="sauve" style="border:0;text-align:left;width:100%;cursor:pointer"><div><b>Sauvegarde</b><small>Télécharger toutes les données (fichier)</small></div><span class="gris">›</span></button>
      <a class="ligne-liste" href="/" target="_blank"><div><b>Voir le site</b><small>creation-site-internet.noraeditions.fr</small></div><span class="gris">›</span></a>
      ${db.MODE_ESSAI ? "" : `<button class="ligne-liste" id="deco" style="border:0;text-align:left;width:100%;cursor:pointer"><div><b>Se déconnecter</b></div><span class="gris">›</span></button>`}
    </div>`;
  const ins = document.getElementById("installer");
  if (ins) ins.onclick = installerAppli;
  const no = document.getElementById("notifs");
  if (no) no.onclick = activerNotifications;
  document.getElementById("sauve").onclick = async () => {
    const data = await db.exporterTout();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = `sauvegarde-nora-editions-${aujourdhui()}.json`; a.click();
  };
  const d = document.getElementById("deco");
  if (d) d.onclick = async () => { await db.deconnexion(); location.reload(); };
}

const CHAMPS_P = [
  ["Entreprise", [["entreprise", "Nom"], ["forme", "Forme juridique"], ["adresse", "Adresse"], ["cp", "Code postal"], ["ville", "Ville"], ["tel", "Téléphone"], ["email", "E-mail"], ["site", "Site"]]],
  ["Mentions légales", [["siret", "SIRET"], ["ape", "Code APE"], ["tva_intra", "N° TVA"]]],
  ["TVA", [["tva_taux", "Taux de TVA par défaut (%)", "number"]]],
  ["Paiement", [["iban", "IBAN"], ["bic", "BIC"], ["titulaire", "Titulaire du compte"], ["moyen_paiement", "Moyen de paiement"], ["acompte_pct", "Acompte par défaut (%)", "number"], ["validite_jours", "Validité des devis (jours)", "number"], ["echeance_jours", "Échéance (jours)", "number"]]],
  ["Numérotation", [["prochain_devis", "Prochain n° de devis", "number"], ["prochain_facture", "Prochain n° de facture", "number"]]],
  ["Divers", [["taux_horaire", "Coût d'une heure de travail (€)", "number"], ["lien_avis", "Lien de vos avis Google"], ["lien_visio", "Votre lien de visio habituel (Google Meet, Zoom…)"], ["abonnement_libelle", "Libellé de l'abonnement sur les factures"]]]
];
function vueReglages() {
  vue.innerHTML = `
    <div class="entete"><h1>Réglages</h1></div>
    <form id="fr" class="carte">
      ${CHAMPS_P.map(([titre, champs]) => `<fieldset><legend>${titre}</legend>${champs.map(([k, l, t]) => `<div class="champ"><label>${l}</label><input type="${t || "text"}" name="${k}" value="${esc(P[k])}"></div>`).join("")}</fieldset>`).join("")}
      <fieldset><legend>Régime de TVA</legend>
        <div class="champ"><label>Vos devis et factures</label><select name="regime_tva"><option value="tva" ${P.regime_tva !== "franchise" ? "selected" : ""}>Avec TVA (société, SASU…)</option><option value="franchise" ${P.regime_tva === "franchise" ? "selected" : ""}>Sans TVA (franchise, art. 293 B)</option></select></div>
        <div class="champ"><label>Mention si sans TVA</label><input type="text" name="mention_tva" value="${esc(P.mention_tva)}"></div>
      </fieldset>
      <fieldset><legend>Textes des documents</legend>
        <div class="champ"><label>Conditions générales (devis)</label><textarea name="conditions" rows="8">${esc(P.conditions)}</textarea></div>
        <div class="champ"><label>Conditions de paiement (factures)</label><textarea name="penalites" rows="4">${esc(P.penalites)}</textarea></div>
      </fieldset>
      <button class="btn" style="width:100%">Enregistrer les réglages</button>
    </form>`;
  document.getElementById("fr").onsubmit = async e => {
    e.preventDefault();
    const o = lireForm(e.target, { ...P });
    ["acompte_pct", "validite_jours", "echeance_jours", "prochain_devis", "prochain_facture", "taux_horaire", "tva_taux"].forEach(k => { o[k] = Number(o[k]) || 0; });
    try { await db.enregistrerParametres(o); P = o; toast("Réglages enregistrés ✓"); } catch (er) { erreur(er); }
  };
}

/* =================== Connexion & routeur =================== */
function vueConnexion() {
  nav.hidden = true;
  vue.innerHTML = `
    <form class="connexion" id="fl">
      <div class="marque-cnx"><img src="/medias/icone-site-512.png" alt=""><div><b>NORA ÉDITIONS</b><span>Création de site internet</span></div></div>
      <div class="champ"><label>E-mail</label><input type="email" name="email" autocomplete="username" value="contact@noraeditions.com"></div>
      <div class="champ"><label>Mot de passe</label><input type="password" name="mdp" autocomplete="current-password"></div>
      <button class="btn" style="width:100%">Se connecter</button>
      <p style="text-align:center;margin-top:16px"><a href="#" id="oubli" class="gris">Mot de passe oublié ?</a></p>
    </form>`;
  document.getElementById("fl").onsubmit = async e => {
    e.preventDefault();
    try { await db.connexion(e.target.email.value, e.target.mdp.value); demarrer(); } catch (er) { toast(er.message); }
  };
  document.getElementById("oubli").onclick = async e => {
    e.preventDefault();
    const email = document.querySelector("#fl [name=email]").value.trim();
    try { await db.motDePasseOublie(email); toast("Un lien vous a été envoyé par e-mail."); } catch (er) { toast(er.message); }
  };
}

function vueNouveauMotDePasse() {
  nav.hidden = true;
  vue.innerHTML = `
    <form class="connexion" id="fm">
      <div class="marque-cnx"><img src="/medias/icone-site-512.png" alt=""><div><b>NORA ÉDITIONS</b><span>Nouveau mot de passe</span></div></div>
      <div class="champ"><label>Mot de passe</label><input type="password" name="mdp" autocomplete="new-password" minlength="8" required></div>
      <button class="btn" style="width:100%">Enregistrer</button>
    </form>`;
  document.getElementById("fm").onsubmit = async e => {
    e.preventDefault();
    try { await db.changerMotDePasse(e.target.mdp.value); toast("Mot de passe changé ✓"); location.hash = "#/accueil"; demarrer(); } catch (er) { toast(er.message); }
  };
}
db.surRecuperation(vueNouveauMotDePasse);

async function routeur() {
  const [chemin, requete] = (location.hash.slice(2) || "accueil").split("?");
  const params = new URLSearchParams(requete || "");
  const [r, a, b] = chemin.split("/");
  nav.querySelectorAll("a").forEach(x => x.classList.toggle("actif", x.dataset.r === r || (r === "document" && x.dataset.r === "documents") || (r === "client" && x.dataset.r === "clients") || (r === "demande" && x.dataset.r === "demandes") || (["reglages", "abonnements", "prestations", "visites"].includes(r) && x.dataset.r === "plus")));
  window.scrollTo(0, 0);
  try {
    if (r === "accueil") await vueAccueil();
    else if (r === "documents") await vueDocuments(a === "facture" ? "facture" : "devis");
    else if (r === "document") await vueDocument(a, b || "devis", params);
    else if (r === "clients") await vueClients();
    else if (r === "demandes") await vueDemandes();
    else if (r === "demande") await vueDemande(a);
    else if (r === "client") await vueClient(a, params);
    else if (r === "prestations") await vuePrestations();
    else if (r === "plus") await vuePlus();
    else if (r === "reglages") vueReglages();
    else if (r === "abonnements") await vueAbonnements();
    else if (r === "agenda") await vueAgenda();
    else if (r === "visites") await vueVisites();
    else await vueAccueil();
  } catch (e) { erreur(e); }
}

async function demarrer() {
  const s = await db.session();
  if (!s) return vueConnexion();
  nav.hidden = false;
  try { localStorage.setItem("nora_moi", "1"); } catch (e) {} // vos visites du site ne comptent pas, sur ce téléphone
  document.getElementById("etat").innerHTML = db.MODE_ESSAI ? '<span class="mode" title="Les données restent dans ce navigateur">Mode essai</span>' : "";
  await db.amorcerPrestations();
  await db.ajouterNouvellesPrestations().catch(() => {});
  P = await db.parametres(); reglerSignature(P);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/espace-patron/sw.js").catch(() => {});
  // une notification ouvre directement la demande
  const dem = new URLSearchParams(location.search).get("d");
  if (dem) { history.replaceState(null, "", location.pathname + "#/demande/" + dem); }
  window.onhashchange = routeur;
  routeur();
  listerDemandes().then(l => {
    const n = (l || []).filter(x => x.statut === "nouvelle").length;
    const a = nav.querySelector('[data-r="demandes"]');
    if (a && n) a.insertAdjacentHTML("beforeend", `<span class="compte-nav">${n}</span>`);
  });
}
demarrer().catch(erreur);
