// La proposition commerciale en PDF (11/11/2026), à partir de la fiche d'un prospect : qui est Nora Éditions, son besoin, la solution, ce que
// la formule comprend, le prix, les conditions, le délai et la suite. Aux couleurs de Nora Éditions, comme les devis (jsPDF, déjà chargé).
// Les prix et le contenu des formules sont ceux du site ; rien n'est inventé sur le prospect : son besoin vient de sa fiche.
const NUIT = [15, 18, 64], VIOLET = [91, 75, 255], JAUNE = [255, 212, 38], GRIS = [95, 100, 130], PIERRE = [240, 241, 250], ENCRE = [20, 21, 46];
const FORMULES = {
  Essentiel: { prix: "190 €", puis: "puis 25 € par an (hébergement et maintenance)", points: ["Un site internet dessiné sur mesure, à votre image", "Facile à lire sur téléphone, tablette et ordinateur",
    "Le référencement de votre site sur Google", "Votre fiche Google, créée ou reprise, reliée à votre site", "Un formulaire de demande de devis", "Votre nom de domaine en .fr"] },
  Pro: { prix: "490 €", puis: "puis 29 € par mois", points: ["Tout ce que comprend la formule Essentiel", "Votre identité visuelle : logo, couleurs, typographies", "100 cartes de visite recto verso offertes",
    "La retouche de vos photos", "Votre tableau de bord : demandes, clients, devis signés en ligne, factures, paiements, agenda, dépenses", "Vos devis et vos factures générés automatiquement en PDF",
    "La prise de rendez-vous en ligne", "Le paiement en ligne, avec acompte"] },
  "Pro + IA": { prix: "990 €", puis: "puis 49 € par mois", points: ["Tout ce que comprend la formule Pro", "Un assistant sur votre site, qui répond aux visiteurs et prend leurs demandes",
    "Vos devis préparés à partir de la demande du client", "Les réponses à vos avis Google, préparées pour vous", "Deux articles par mois, écrits pour Google"] },
};
const propre = s => String(s ?? "").replace(/[  ]/g, " ").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/[–—]/g, "-");
let logoCache = null;
async function logo() {
  if (logoCache) return logoCache;
  const b = await (await fetch("/medias/logo-pdf-nora.png")).blob();
  return logoCache = await new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); });
}

// offre : une formule, ou la liste des formules à présenter (dans l'ordre des prix)
export async function creerProposition(p, P, offre, constats = "") {
  const { jsPDF } = window.jspdf, pdf = new jsPDF({ unit: "mm", format: "a4" }), W = 210, M = 18, L = W - 2 * M;
  const offres = Object.keys(FORMULES).filter(k => [].concat(offre).includes(k)); if (!offres.length) offres.push("Essentiel");
  pdf.setLineHeightFactor(1.3);
  let y = 0;
  const place = h => { if (y + h > 272) { pdf.addPage(); y = 22; } };
  // bloc : la hauteur à garder d'un seul tenant (le titre ne reste pas seul en bas de page)
  const titre = (t, bloc = 16) => { place(bloc); y += 4; pdf.setFillColor(...JAUNE).rect(M, y - 3.2, 9, 1.2, "F"); pdf.setFont("helvetica", "bold").setFontSize(10).setTextColor(...VIOLET).text(propre(t).toUpperCase(), M + 12, y - 1.6, { charSpace: .4 }); y += 5; };
  const texte = (t, { gras = false, taille = 10.5, couleur = ENCRE, retrait = 0 } = {}) => { pdf.setFont("helvetica", gras ? "bold" : "normal").setFontSize(taille).setTextColor(...couleur);
    const l = pdf.splitTextToSize(propre(t), L - retrait), h = l.length * taille * .46; place(h); pdf.text(l, M + retrait, y); y += h + 2; };
  const puce = t => { pdf.setFont("helvetica", "normal").setFontSize(10.5); const l = pdf.splitTextToSize(propre(t), L - 7), h = l.length * 10.5 * .46; place(h);
    pdf.setFillColor(...VIOLET).circle(M + 1.6, y - 1.3, .9, "F"); pdf.setTextColor(...ENCRE).text(l, M + 7, y); y += h + 1.6; };

  // ── l'en-tête : le logo, « Proposition », la date, et pour qui
  try { pdf.addImage(await logo(), "PNG", M, 16, 56, 12.76, "logo", "FAST"); } catch (e) { /* sans logo */ }
  pdf.setFont("helvetica", "bold").setFontSize(20).setTextColor(...NUIT).text("PROPOSITION", W - M, 22, { align: "right" });
  const jour = new Date(), fin = new Date(); fin.setDate(fin.getDate() + (Number(P.validite_jours) || 30));
  pdf.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...GRIS).text(`Le ${jour.toLocaleDateString("fr-FR")} · valable jusqu'au ${fin.toLocaleDateString("fr-FR")}`, W - M, 28, { align: "right" });
  y = 40;
  const pour = [p.entreprise, p.nom, [p.metier, p.ville].filter(Boolean).join(" · ")].filter(Boolean).map(propre);
  pdf.setFillColor(...PIERRE).roundedRect(M, y, L, 9 + pour.length * 5.2, 2, 2, "F");
  pdf.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...GRIS).text("POUR", M + 5, y + 6, { charSpace: .4 });
  pour.forEach((l, i) => pdf.setFont("helvetica", i ? "normal" : "bold").setFontSize(i ? 10.5 : 12).setTextColor(...ENCRE).text(l, M + 22, y + 6.4 + i * 5.2));
  y += 9 + pour.length * 5.2 + 9;

  titre("Qui sommes-nous");
  texte(`${P.entreprise || "Nora Éditions"} crée des sites internet sur mesure pour les artisans, les indépendants et les petites entreprises, partout en France : conception, design, référencement sur Google, identité visuelle et tableau de bord. Tout se fait par écrit, à votre rythme.`);
  titre("Votre besoin");
  texte(p.besoin || "Un site internet qui vous fasse trouver par vos clients, et qui leur donne envie de vous écrire.");
  if (constats) texte(constats.trim());
  titre("Ce que nous vous proposons");
  if (offres.length > 1) texte(`${offres.length === 2 ? "Deux" : "Trois"} formules, au choix. Chacune reprend la précédente et y ajoute des services.`);
  offres.forEach((nom, i) => {
    const f = FORMULES[nom];
    if (offres.length > 1) {
      // plusieurs formules : un bandeau par formule, son nom à gauche et son prix à droite, puis ce qu'elle comprend
      place(40); y += i ? 4 : 1;
      pdf.setFillColor(...NUIT).roundedRect(M, y, L, 13, 2.5, 2.5, "F");
      pdf.setFont("helvetica", "bold").setFontSize(11).setTextColor(255, 255, 255).text(`FORMULE ${propre(nom).toUpperCase()}`, M + 6, y + 8.3, { charSpace: .4 });
      pdf.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(255, 255, 255).text(propre(f.puis), W - M - 6, y + 8.3, { align: "right" });
      const largeurPuis = pdf.getTextWidth(propre(f.puis));
      pdf.setFont("helvetica", "bold").setFontSize(15).setTextColor(...JAUNE).text(propre(f.prix), W - M - 6 - largeurPuis - 3, y + 8.8, { align: "right" });
      y += 13 + 7;
      f.points.forEach(puce); y += 2;
      return;
    }
    texte(`La formule ${nom}.`, { gras: true });
    f.points.forEach(puce);
    // ── son prix, dans un encadré
    place(28); y += 2;
    pdf.setFillColor(...NUIT).roundedRect(M, y, L, 22, 3, 3, "F");
    pdf.setFont("helvetica", "normal").setFontSize(9).setTextColor(255, 255, 255).text(`FORMULE ${propre(nom).toUpperCase()}`, M + 7, y + 7, { charSpace: .5 });
    pdf.setFont("helvetica", "bold").setFontSize(21).setTextColor(...JAUNE).text(propre(f.prix), M + 7, y + 17);
    const largeurPrix = pdf.getTextWidth(propre(f.prix));
    pdf.setFont("helvetica", "normal").setFontSize(11).setTextColor(255, 255, 255).text(propre(f.puis), M + 7 + largeurPrix + 4, y + 17);
    y += 22 + 6;
  });
  texte("En option : le nom de domaine en .com (0,60 € de plus par mois), une adresse e-mail professionnelle (1,50 € de plus par mois), une boutique en ligne (sur devis).", { taille: 9.5, couleur: GRIS });

  titre("Les conditions", 40);
  [`Un acompte de ${Number(P.acompte_pct) || 10} % lance le travail.`, "Nous vous montrons le résultat avant la mise en ligne, et vous demandez vos ajustements.",
    "Le solde se règle après votre validation finale, en une fois ou en 3 fois sans frais.", "L'abonnement est sans engagement."].forEach(puce);
  titre("Le délai", 26);
  texte("Votre site est mis en ligne environ une semaine après réception de vos textes et de vos photos. Ce délai est indicatif.");
  titre("La suite", 52);
  [offres.length > 1 ? "Vous nous répondez en nous disant la formule que vous choisissez." : "Vous répondez « d'accord » à ce message.", "Nous vous envoyons un court questionnaire, pour préparer votre site.", "Vous recevez votre devis, à signer en ligne.",
    "L'acompte lance le travail.", "Nous vous montrons le résultat, et nous faisons vos ajustements.", "Vous validez : votre site est mis en ligne."].forEach((t, i) => {
    pdf.setFont("helvetica", "normal").setFontSize(10.5); const l = pdf.splitTextToSize(propre(t), L - 9), h = l.length * 10.5 * .46; place(h);
    pdf.setFont("helvetica", "bold").setTextColor(...VIOLET).text(String(i + 1), M + 1, y); pdf.setFont("helvetica", "normal").setTextColor(...ENCRE).text(l, M + 9, y); y += h + 1.6; });

  // ── le pied de chaque page : comment nous écrire
  const n = pdf.getNumberOfPages();
  for (let i = 1; i <= n; i++) { pdf.setPage(i); pdf.setDrawColor(...PIERRE).setLineWidth(.3).line(M, 281, W - M, 281);
    pdf.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...GRIS).text(propre([P.entreprise || "Nora Éditions", P.site, P.email].filter(Boolean).join("  ·  ")), W / 2, 287, { align: "center" });
    if (n > 1) pdf.text(`${i} / ${n}`, W - M, 287, { align: "right" }); }
  return pdf;
}

// Télécharge la proposition ; sur téléphone, propose de la partager (e-mail, WhatsApp…)
export async function telechargerProposition(p, P, offre, constats) {
  const pdf = await creerProposition(p, P, offre, constats);
  const nom = "Proposition_" + String(p.entreprise || p.nom || "prospect").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "_") + ".pdf";
  const fichier = new File([pdf.output("blob")], nom, { type: "application/pdf" });
  if (navigator.canShare && navigator.canShare({ files: [fichier] })) { try { await navigator.share({ files: [fichier], title: nom }); return "partagee"; } catch (e) { if (e.name === "AbortError") return "annulee"; } }
  pdf.save(nom); return "telechargee";
}
