// Génération des devis et factures en PDF (jsPDF + autoTable), aux couleurs de Nora Éditions (repris de l'appli Flex).
import { PARAMETRES_DEFAUT } from "./donnees.js";

const ENCRE = [20, 21, 46], GRIS = [107, 112, 144], PIERRE = [238, 240, 250], SABLE = [220, 223, 240], FILET = [91, 75, 255];

export const eur = n => (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[  ]/g, " ");
const dateFr = d => d ? new Date(d + (String(d).length === 10 ? "T12:00:00" : "")).toLocaleDateString("fr-FR") : "";
const propre = s => String(s ?? "").replace(/[  ]/g, " ").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/[–—]/g, "-");

let logoCache = null;
async function logo() {
  if (logoCache) return logoCache;
  const r = await fetch("/medias/logo-pdf-nora.png");
  const b = await r.blob();
  logoCache = await new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); });
  return logoCache;
}

export const TAUX_TVA = [10, 20, 5.5];
const arrondi = n => Math.round(n * 100) / 100;
export const tauxTxt = r => String(r).replace(".", ",") + " %";
// Un document porte la TVA dès qu'une de ses lignes a un taux. Les anciens documents (franchise 293 B) n'en ont pas.
export const avecTVA = doc => (doc.sections || []).some(s => (s.lignes || []).some(l => l.tva != null && l.tva !== ""));
// Donne le taux par défaut aux lignes qui n'en ont pas (nouveaux documents, nouvelles lignes).
export function poserTVA(doc, p) {
  if (!p || p.regime_tva === "franchise") return doc;
  const taux = Number(p.tva_taux) || 10;
  for (const s of doc.sections || []) for (const l of s.lignes || []) if (l.tva == null || l.tva === "") l.tva = taux;
  return doc;
}
export function totaux(doc) {
  let ht = 0; const parTaux = {};
  for (const s of doc.sections || []) for (const l of s.lignes || []) {
    const m = (Number(l.qte) || 0) * (Number(l.pu) || 0); ht += m;
    if (l.tva != null && l.tva !== "") { const r = Number(l.tva); parTaux[r] = (parTaux[r] || 0) + m * r / 100; }
  }
  ht = arrondi(ht);
  const tva = Object.entries(parTaux).map(([r, v]) => [Number(r), arrondi(v)]).sort((a, b) => b[0] - a[0]);
  const ttc = arrondi(ht + tva.reduce((a, [, v]) => a + v, 0));
  const acompte = Math.round(ttc * (Number(doc.acompte_pct) || 0)) / 100;
  const regle = Number(doc.deja_regle) || 0;
  return { ht, tva, ttc, avecTVA: tva.length > 0, acompte, regle, reste: arrondi(ttc - regle) };
}
// La mention à imprimer : franchise pour les anciens documents, attestation du client quand un taux réduit est appliqué.
export function mentionTVA(doc, p) {
  if (!avecTVA(doc)) return p.mention_tva || "";
  const reduit = totaux(doc).tva.some(([r]) => r < 20);
  return reduit ? (p.mention_attestation || PARAMETRES_DEFAUT.mention_attestation) : "";
}

/* Un avenant est un devis numéroté comme le devis d'origine suivi de -AV1, -AV2… */
export function avenantDe(d) {
  const m = d && d.type === "devis" && /^(.*)-AV(\d+)$/.exec(d.numero || "");
  return m ? { devis: m[1], n: Number(m[2]) } : null;
}

export async function creerPDF(d, p) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 15, estDevis = d.type === "devis";
  const av = avenantDe(d);
  const titre = av ? "AVENANT" : estDevis ? "DEVIS" : "FACTURE";
  const t = totaux(d);
  const c = d.client || {};
  pdf.setLineHeightFactor(1.25);

  // --- En-tête : logo + titre
  try { pdf.addImage(await logo(), "PNG", M, 15, 56, 12.76, "logo", "FAST"); } catch { /* pas de logo */ }
  pdf.setTextColor(...ENCRE).setFont("helvetica", "bold").setFontSize(17);
  pdf.text(`${titre} N° ${propre(d.numero)}`, 112, 21);
  pdf.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...GRIS);
  let y = 28;
  pdf.text(`Date : ${dateFr(d.date)}`, 112, y);
  if (estDevis) {
    const v = new Date(d.date + "T12:00:00"); v.setDate(v.getDate() + (Number(p.validite_jours) || 90));
    pdf.text(`Validité : jusqu'au ${v.toLocaleDateString("fr-FR")}`, 112, y + 5);
    if (av) pdf.text(`Avenant n° ${av.n} au devis N° ${propre(av.devis)}${d.devis_date ? " du " + dateFr(d.devis_date) : ""}`, 112, y + 10);
  } else {
    const e = new Date(d.date + "T12:00:00"); e.setDate(e.getDate() + (Number(p.echeance_jours) || 30));
    pdf.text(`Échéance : ${e.toLocaleDateString("fr-FR")}`, 112, y + 5);
    if (d.devis_numero) pdf.text(`Devis N° ${propre(d.devis_numero)}${d.devis_date ? " du " + dateFr(d.devis_date) : ""}`, 112, y + 10);
  }

  // --- Entreprise (gauche)
  y = 46;
  pdf.setTextColor(...ENCRE).setFont("helvetica", "bold").setFontSize(11).text(propre(p.entreprise), M, y);
  pdf.setFont("helvetica", "normal").setFontSize(9.5);
  // seulement ce qui est rempli dans les réglages
  const ent = [p.adresse, [p.cp, p.ville].filter(Boolean).join(" "), p.tel ? `Tél. ${p.tel}` : "", [p.email, p.site].filter(Boolean).join(" | "), p.siret ? `SIRET ${p.siret}` : ""].filter(Boolean).map(propre);
  ent.forEach((l, i) => pdf.text(l, M, y + 5 + i * 4.6));
  let yg = y + 5 + ent.length * 4.6 + 2;
  if (d.date_debut || d.duree) {
    pdf.setDrawColor(...SABLE).setLineWidth(.2).line(M, yg, M + 22, yg);
    pdf.setTextColor(...GRIS).text(propre([d.date_debut ? `Date de début : ${dateFr(d.date_debut)}` : "", d.duree ? `Durée estimée : ${d.duree}` : ""].filter(Boolean).join(" | ")), M, yg + 5);
  }

  // --- Client (encadré droite)
  const cx = 112, cw = W - M - cx;
  const lignesClient = [
    [c.adresse, [c.cp, c.ville].filter(Boolean).join(" ")].filter(Boolean),
    [c.email, c.tel].filter(Boolean)
  ].flat().map(propre);
  const nomClient = propre([c.civilite, c.nom, c.prenom].filter(Boolean).join(" ") + (c.societe ? ` · ${c.societe}` : ""));
  const hBox = 10 + lignesClient.length * 4.6 + 2;
  pdf.setFillColor(...PIERRE).roundedRect(cx, y - 5, cw, hBox, 1.5, 1.5, "F");
  pdf.setTextColor(...ENCRE).setFont("helvetica", "bold").setFontSize(10.5).text(nomClient, cx + 4, y + 1);
  pdf.setFont("helvetica", "normal").setFontSize(9.5);
  lignesClient.forEach((l, i) => pdf.text(l, cx + 4, y + 6 + i * 4.6));

  // --- Objet
  y = Math.max(yg + 12, y - 5 + hBox + 10);
  const lib = `Objet ${estDevis ? "du devis" : "de la facture"} : `;
  pdf.setTextColor(...ENCRE).setFont("helvetica", "bold").setFontSize(10).text(lib, M, y);
  const lw = pdf.getTextWidth(lib);
  pdf.setFont("helvetica", "normal").text(propre(d.objet || ""), M + lw + 1, y);

  // --- Tableau des prestations
  const corps = [];
  (d.sections || []).forEach((s, i) => {
    const st = (s.lignes || []).reduce((a, l) => a + (Number(l.qte) || 0) * (Number(l.pu) || 0), 0);
    corps.push([{ content: String(i + 1), styles: { fontStyle: "bold" } },
      { content: propre(s.titre || ""), colSpan: 3, styles: { fontStyle: "bold" } },
      { content: eur(st), styles: { fontStyle: "bold", halign: "right" } }, ""].map(x => typeof x === "string" ? x : x));
    corps[corps.length - 1].section = true;
    (s.lignes || []).forEach(l => {
      const txt = propre(l.designation) + (l.description ? "\n" + propre(l.description) : "");
      corps.push(["", txt, `${String(l.qte).replace(".", ",")} ${l.unite || ""}`.trim(), eur(l.pu), eur((Number(l.qte) || 0) * (Number(l.pu) || 0)), l.tva != null && l.tva !== "" ? tauxTxt(l.tva) : "0 %"]);
    });
  });
  pdf.autoTable({
    startY: y + 5,
    head: [["N°", "Désignation", "Qté", "PU HT", "Total HT", "TVA"]],
    body: corps,
    theme: "plain",
    margin: { left: M, right: M, bottom: 24, top: 18 },
    styles: { font: "helvetica", fontSize: 9, textColor: ENCRE, cellPadding: { top: 2.6, bottom: 2.6, left: 2, right: 2 }, lineColor: SABLE, lineWidth: { bottom: .15 } },
    headStyles: { fillColor: ENCRE, textColor: [255, 255, 255], fontStyle: "normal", fontSize: 8.5 },
    columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 22, halign: "center" }, 3: { cellWidth: 22, halign: "right" }, 4: { cellWidth: 24, halign: "right" }, 5: { cellWidth: 14, halign: "right" } },
    didParseCell: h => {
      if (h.section === "body" && h.row.raw.section) { h.cell.styles.fillColor = PIERRE; }
      if (h.section === "head" && h.column.index >= 3) h.cell.styles.halign = "right";
      if (h.section === "head" && h.column.index === 2) h.cell.styles.halign = "center";
    }
  });
  y = pdf.lastAutoTable.finalY + 8;

  const place = h => { if (y + h > 297 - 26) { pdf.addPage(); y = 22; } };

  // --- Totaux
  const lignesTot = [["Total HT", eur(t.ht) + " €"]];
  if (t.avecTVA) { t.tva.forEach(([r, v]) => lignesTot.push([`TVA ${tauxTxt(r)}`, eur(v) + " €"])); lignesTot.push(["Total TTC", eur(t.ttc) + " €"]); }
  if (estDevis) { lignesTot.push([t.avecTVA ? "Net à payer TTC" : "Net à payer", eur(t.ttc) + " €", true]); if (Number(d.acompte_pct)) lignesTot.push([`Acompte (${d.acompte_pct} %)`, eur(t.acompte) + " €"]); }
  else { if (t.regle) lignesTot.push(["Déjà réglé", eur(t.regle) + " €"]); lignesTot.push(["Reste à payer", eur(t.reste) + " €", true]); }
  place(lignesTot.length * 7 + 12);
  const tx = 122;
  pdf.setDrawColor(...FILET).setLineWidth(.4).line(tx, y - 3, W - M, y - 3);
  lignesTot.forEach(([a, b, fort], i) => {
    pdf.setFont("helvetica", fort ? "bold" : "normal").setFontSize(fort ? 11 : 9.5).setTextColor(...ENCRE);
    pdf.text(a, tx, y + 3 + i * 7); pdf.text(b, W - M, y + 3 + i * 7, { align: "right" });
  });
  pdf.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...GRIS);
  const mTVA = mentionTVA(d, p);
  const mentions = [mTVA ? `${t.avecTVA ? "Attestation du client (TVA à taux réduit)" : "Mention"} : ${propre(mTVA)}` : "", `Moyen de paiement : ${propre(p.moyen_paiement || "Virement")} · Échéance : ${p.echeance_jours || 15} jours`];
  if (!estDevis && p.iban) mentions.push(`IBAN : ${propre(p.iban)}${p.bic ? "  ·  BIC : " + propre(p.bic) : ""}`, p.titulaire ? `Titulaire : ${propre(p.titulaire)}` : "");
  let ym = y;
  mentions.filter(Boolean).forEach(m => { const l = pdf.splitTextToSize(m, tx - M - 6); pdf.text(l, M, ym); ym += l.length * 3.8 + 1.2; });
  y = Math.max(y + lignesTot.length * 7 + 8, ym + 4);

  // --- Conditions / pénalités
  const bloc = (titreBloc, texte) => {
    const l = pdf.splitTextToSize(propre(texte), W - 2 * M);
    place(l.length * 3.7 + 10);
    pdf.setFont("helvetica", "bold").setFontSize(8.8).setTextColor(...ENCRE).text(titreBloc, M, y);
    pdf.setFont("helvetica", "normal").setFontSize(8.2).setTextColor(...GRIS).text(l, M, y + 4.5);
    y += l.length * 3.7 + 9;
  };
  if (d.notes) bloc("Note :", d.notes);
  if (estDevis) bloc("Conditions générales :", p.conditions);
  else bloc("Conditions de paiement :", p.penalites);

  // --- Signature (devis)
  if (estDevis) {
    place(36);
    const sx = 112, sw = W - M - sx;
    pdf.setDrawColor(...SABLE).setLineWidth(.3).roundedRect(sx, y, sw, 32, 1.5, 1.5);
    pdf.setFont("helvetica", "bold").setFontSize(9).setTextColor(...ENCRE).text("Signature du client", sx + 4, y + 6);
    pdf.setFont("helvetica", "normal").setFontSize(7.8).setTextColor(...GRIS);
    pdf.text(pdf.splitTextToSize("Datée et précédée de la mention « Bon pour accord pour un net à payer de", sw - 8), sx + 4, y + 11);
    pdf.setFont("helvetica", "bold").setFontSize(9).setTextColor(...ENCRE).text(`${eur(t.ttc)} €${t.avecTVA ? " TTC" : ""} »`, sx + 4, y + 20.5);
    if (d.signe_le) {
      const quand = new Date(d.signe_le);
      pdf.setFont("helvetica", "normal").setFontSize(7.8).setTextColor(...GRIS)
        .text(pdf.splitTextToSize(propre(`Signé en ligne le ${quand.toLocaleDateString("fr-FR")} à ${quand.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} par ${d.signe_nom || ""}`), sw - 8).slice(0, 2), sx + 4, y + 25.5);
    } else pdf.setFont("helvetica", "normal").setFontSize(7.8).setTextColor(...GRIS).text("Le : ......./......./.......", sx + 4, y + 27.5);
    y += 38;
  }

  // --- Pied de page sur chaque page
  const n = pdf.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...GRIS);
    pdf.text(`${av ? "Avenant" : estDevis ? "Devis" : "Facture"} page ${i} / ${n}`, M, 9);
    pdf.text(`Numéro : ${propre(d.numero)}`, W - M, 9, { align: "right" });
    pdf.setDrawColor(...SABLE).setLineWidth(.2).line(M, 297 - 19, W - M, 297 - 19);
    pdf.setFontSize(6.8);
    const siege = [p.adresse, [p.cp, p.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const legal = pdf.splitTextToSize(propre([[p.entreprise, p.forme].filter(Boolean).join(" "), siege ? "Siège social : " + siege : "", p.siret ? `SIRET ${p.siret}${p.ape ? ` (APE : ${p.ape})` : ""}` : "", p.tva_intra ? "N° TVA : " + p.tva_intra : ""].filter(Boolean).join(" - ")), W - 2 * M);
    legal.slice(0, 3).forEach((l, k) => pdf.text(l, W / 2, 297 - 15 + k * 3.3, { align: "center" }));
  }
  return pdf;
}

export function nomFichier(d) {
  const c = d.client || {};
  const nom = [c.nom, c.prenom].filter(Boolean).join("_").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "_");
  return `${avenantDe(d) ? "Avenant" : d.type === "devis" ? "Devis" : "Facture"}_${nom || "client"}_${d.numero}.pdf`;
}

// Télécharge le PDF ; sur téléphone, propose aussi de le partager (WhatsApp, e-mail…), avec son message.
export async function telechargerPDF(d, p, { partager = false, texte = "" } = {}) {
  const pdf = await creerPDF(d, p);
  const nom = nomFichier(d);
  if (partager) {
    const fichier = new File([pdf.output("blob")], nom, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
      // certaines applications ne reprennent pas le texte avec un fichier : il est aussi copié, prêt à coller
      if (texte) { try { await navigator.clipboard.writeText(texte); } catch (e) {} }
      await navigator.share(texte ? { files: [fichier], title: nom, text: texte } : { files: [fichier], title: nom });
      return true;
    }
  }
  pdf.save(nom);
}
