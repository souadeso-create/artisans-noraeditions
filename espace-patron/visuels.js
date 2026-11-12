// Les visuels du prospecteur (11/11/2026) : de quoi créer et faire vivre ses comptes Instagram et Facebook au nom de la maison.
// La vignette (photo de profil) et la couverture Facebook, à son prénom, puis une série de publications, chacune avec sa légende à
// copier, et les vidéos de présentation. Tout est dessiné dans le navigateur, aux couleurs de Nora Éditions.
// Chaque publication dit d'abord de quoi il s'agit (« Création de site internet pour artisans et indépendants »), montre quelque chose
// (un site déjà fait, un écran de téléphone, les étapes), dit ce qu'on obtient et à quel prix, et comment écrire.
// Elles ne disent que ce que le site dit : les prix des formules, le paiement, ce que chaque formule comprend.
const NUIT = "#0f1240", VIOLET = "#5b4bff", JAUNE = "#ffd426", PIERRE = "#f0f1fa", ENCRE = "#14152e", GRIS = "#5f6482";
const SITE = "creation-site-internet.noraeditions.fr", METIER = "Création de site internet pour artisans et indépendants";
const image = src => new Promise((ok, non) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => non(new Error("image introuvable : " + src)); i.src = src; });
const police = () => getComputedStyle(document.body).fontFamily || "Arial, sans-serif";
// découpe un texte en lignes qui tiennent dans la largeur
function couper(x, texte, large) {
  const l = []; let ligne = "";
  for (const mot of texte.split(" ")) { const essai = ligne ? ligne + " " + mot : mot; if (ligne && x.measureText(essai).width > large) { l.push(ligne); ligne = mot; } else ligne = essai; }
  if (ligne) l.push(ligne); return l;
}
// écrit un texte sur plusieurs lignes ; rend la hauteur occupée
function lignes(x, texte, gx, y, large, interligne, alignement = "left") {
  x.textAlign = alignement; const l = couper(x, texte, large); l.forEach((t, i) => x.fillText(t, gx, y + i * interligne)); return l.length * interligne;
}
const toile = (l, h) => { const c = document.createElement("canvas"); c.width = l; c.height = h; return [c, c.getContext("2d")]; };
function rond(x, gx, gy, l, h, r) { x.beginPath(); x.moveTo(gx + r, gy); x.arcTo(gx + l, gy, gx + l, gy + h, r); x.arcTo(gx + l, gy + h, gx, gy + h, r); x.arcTo(gx, gy + h, gx, gy, r); x.arcTo(gx, gy, gx + l, gy, r); x.closePath(); }
const boite = (x, couleur, gx, gy, l, h, r) => { x.fillStyle = couleur; rond(x, gx, gy, l, h, r); x.fill(); };
// une coche dans une pastille ronde
function coche(x, cx, cy, r, fond, trait) {
  x.fillStyle = fond; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  x.strokeStyle = trait; x.lineWidth = r * .28; x.lineCap = "round"; x.lineJoin = "round";
  x.beginPath(); x.moveTo(cx - r * .45, cy + r * .02); x.lineTo(cx - r * .12, cy + r * .36); x.lineTo(cx + r * .48, cy - r * .32); x.stroke();
}

// La vignette : 1080 × 1080, tout tient dans le rond que découpent Instagram et Facebook
// Sans prénom (12/11/2026, « c'est inutile ») : la même pour tous les prospecteurs.
async function vignette() {
  const [c, x] = toile(1080, 1080), f = police(), icone = await image("/medias/icone-site-512.png");
  x.fillStyle = NUIT; x.fillRect(0, 0, 1080, 1080);
  x.drawImage(icone, 350, 230, 380, 380);
  x.textAlign = "center"; x.textBaseline = "alphabetic";
  x.fillStyle = JAUNE; x.font = `800 64px ${f}`; x.fillText("Nora Éditions", 540, 712);
  x.fillStyle = "#fff"; x.font = `500 42px ${f}`; x.fillText("Création de site internet", 540, 780);
  return c;
}
// La couverture Facebook : 1640 × 624, l'essentiel au centre (le téléphone rogne les côtés)
async function couverture(prenom) {
  const [c, x] = toile(1640, 624), f = police(), logo = await image("/medias/logo-pdf-nora.png");
  x.fillStyle = PIERRE; x.fillRect(0, 0, 1640, 624);
  x.fillStyle = JAUNE; x.fillRect(0, 0, 1640, 14);
  const lh = 96, ll = lh * logo.width / logo.height; x.drawImage(logo, 820 - ll / 2, 96, ll, lh);
  x.fillStyle = ENCRE; x.font = `800 62px ${f}`; x.textBaseline = "alphabetic";
  const h = lignes(x, "Sites internet sur mesure pour les artisans et les indépendants", 820, 300, 1000, 76, "center");
  x.fillStyle = GRIS; x.font = `500 34px ${f}`; x.fillText(prenom ? `${prenom} · Service commercial` : "Service commercial", 820, 300 + h + 26);
  x.fillStyle = VIOLET; x.font = `700 36px ${f}`; x.fillText(SITE, 820, 300 + h + 86);
  return c;
}

/* ---------- Les publications : 1080 × 1350 (le format portrait d'Instagram, accepté par Facebook) ---------- */
// quatre habillages, pour que la page ne soit pas monotone
const HABITS = {
  nuit: { fond: NUIT, titre: "#ffffff", texte: "#e2e4fa", accent: JAUNE, surAccent: NUIT, bande: JAUNE, surBande: NUIT },
  violet: { fond: VIOLET, titre: "#ffffff", texte: "#f0efff", accent: JAUNE, surAccent: NUIT, bande: NUIT, surBande: "#ffffff" },
  clair: { fond: PIERRE, titre: ENCRE, texte: "#2d3156", accent: VIOLET, surAccent: "#ffffff", bande: NUIT, surBande: "#ffffff" },
  jaune: { fond: JAUNE, titre: NUIT, texte: NUIT, accent: NUIT, surAccent: "#ffffff", bande: NUIT, surBande: "#ffffff" },
};
// ce qu'on voit dans le téléphone dessiné à droite : la capture d'un site déjà fait, ou un écran dessiné (aucun nom de personne, rien d'inventé sur un client)
const ECRANS = {
  async site(x, l, h) { const i = await image("/medias/portfolio/ka.jpg"), e = l / i.width; x.drawImage(i, 0, 0, l, i.height * e); },
  async recherche(x, l, h, f) {
    x.fillStyle = "#fff"; x.fillRect(0, 0, l, h);
    boite(x, "#eef0f6", 18, 26, l - 36, 54, 27); x.fillStyle = ENCRE; x.font = `500 24px ${f}`; x.textAlign = "left"; x.fillText("plombier près de chez moi", 40, 62);
    // le premier résultat : le site de l'entreprise
    x.strokeStyle = VIOLET; x.lineWidth = 4; rond(x, 14, 108, l - 28, 190, 18); x.stroke();
    x.fillStyle = "#1a7f37"; x.font = `500 19px ${f}`; x.fillText("votre-entreprise.fr", 32, 144);
    x.fillStyle = "#1a3fd4"; x.font = `700 27px ${f}`; lignes(x, "Votre entreprise · votre métier, votre ville", 32, 180, l - 64, 32);
    boite(x, "#d9dcea", 32, 256, l - 100, 12, 6);
    boite(x, VIOLET, 14, 318, 150, 40, 20); x.fillStyle = "#fff"; x.font = `700 19px ${f}`; x.fillText("Votre site", 38, 345);
    for (let i = 0; i < 3; i++) { const y = 396 + i * 108; boite(x, "#d9dcea", 32, y, 150, 12, 6); boite(x, "#c3c8de", 32, y + 26, l - 90, 20, 8); boite(x, "#e3e6f1", 32, y + 60, l - 130, 12, 6); }
  },
  async tableau(x, l, h, f) {
    x.fillStyle = PIERRE; x.fillRect(0, 0, l, h); x.fillStyle = NUIT; x.fillRect(0, 0, l, 84);
    x.fillStyle = "#fff"; x.font = `800 26px ${f}`; x.textAlign = "left"; x.fillText("Tableau de bord", 22, 54);
    [["Nouvelle demande", "reçue à l'instant", JAUNE], ["Devis signé en ligne", "par votre client", VIOLET], ["Facture en PDF", "générée automatiquement", "#19a974"], ["Rendez-vous", "noté dans l'agenda", "#ff7a59"], ["Paiement reçu", "acompte encaissé", VIOLET]].forEach(([t, d, c], i) => {
      const y = 106 + i * 112; boite(x, "#fff", 16, y, l - 32, 96, 18); boite(x, c, 32, y + 26, 44, 44, 22);
      x.fillStyle = ENCRE; x.font = `700 23px ${f}`; x.fillText(t, 92, y + 44); x.fillStyle = GRIS; x.font = `500 19px ${f}`; x.fillText(d, 92, y + 72); });
  },
  async discussion(x, l, h, f) {
    x.fillStyle = "#fff"; x.fillRect(0, 0, l, h); x.fillStyle = VIOLET; x.fillRect(0, 0, l, 84);
    x.fillStyle = "#fff"; x.font = `800 24px ${f}`; x.textAlign = "left"; x.fillText("Assistant du site", 22, 54);
    const bulle = (texte, y, moi) => { x.font = `500 21px ${f}`; const t = couper(x, texte, l - 110), hb = t.length * 28 + 30, gx = moi ? 62 : 18;
      boite(x, moi ? VIOLET : "#eef0f6", gx, y, l - 80, hb, 20); x.fillStyle = moi ? "#fff" : ENCRE; t.forEach((s, i) => x.fillText(s, gx + 18, y + 38 + i * 28)); return y + hb + 18; };
    let y = 110; y = bulle("Bonjour, faites-vous les salles de bain ?", y, false);
    y = bulle("Oui. Dites-moi votre ville et votre projet : je transmets votre demande.", y, true);
    y = bulle("Une douche à l'italienne, à Lyon.", y, false);
    bulle("C'est noté. Vous recevrez une réponse par écrit.", y, true);
  },
};
async function telephone(x, gx, gy, l, h, ecran, f) {
  boite(x, "#07081f", gx, gy, l, h, 52);
  x.save(); rond(x, gx + 14, gy + 14, l - 28, h - 28, 40); x.clip(); x.translate(gx + 14, gy + 14); await ECRANS[ecran](x, l - 28, h - 28, f); x.restore();
}
export const PUBLICATIONS = [
  { cle: "presentation", habit: "nuit", titre: "Nous créons le site internet de votre entreprise", ecran: "site",
    points: ["Dessiné sur mesure, à votre image", "Référencé sur Google", "Agréable à lire sur téléphone", "Mis en ligne en une semaine environ"], prix: "À partir de 190 €", puis: "payable en 3 fois sans frais",
    legende: "Nora Éditions crée des sites internet sur mesure pour les artisans et les indépendants, partout en France. Votre site est dessiné à votre image, référencé sur Google, agréable à lire sur téléphone, et mis en ligne environ une semaine après réception de vos textes et de vos photos. À partir de 190 €, payable en 3 fois sans frais. Écrivez-nous pour en parler." },
  { cle: "google", habit: "clair", titre: "Vos clients vous cherchent sur Google. Vous trouvent-ils ?", ecran: "recherche",
    points: ["Votre site référencé sur Google", "Votre fiche Google créée ou reprise", "Un formulaire de demande de devis"], prix: "Compris dans toutes les formules", puis: "dès 190 €",
    legende: "Quand on a besoin d'un professionnel, on le cherche sur son téléphone, et on écrit à celui qu'on trouve. Nous créons votre site internet, nous le référençons sur Google et nous créons ou reprenons votre fiche Google. C'est compris dans toutes nos formules, dès 190 €." },
  { cle: "formules", habit: "jaune", titre: "Un site internet pour votre entreprise : trois formules",
    formules: [["Essentiel", "190 €", "puis 25 € par an", "Le site sur mesure, son référencement sur Google, votre fiche Google, votre nom de domaine"],
      ["Pro", "490 €", "puis 29 € par mois", "Le site, votre identité visuelle, 100 cartes de visite, le tableau de bord pour vos devis et factures"],
      ["Pro + IA", "990 €", "puis 49 € par mois", "Tout le Pro, plus un assistant sur votre site qui répond aux visiteurs"]],
    prix: "Payable en 3 fois sans frais", puis: "abonnement sans engagement, premier mois offert",
    legende: "Nos trois formules pour le site internet de votre entreprise. Essentiel, 190 € puis 25 € par an : le site sur mesure, son référencement sur Google, votre fiche Google et votre nom de domaine en .fr. Pro, 490 € puis 29 € par mois : le site, votre identité visuelle, 100 cartes de visite offertes et un tableau de bord pour vos demandes, vos devis et vos factures. Pro + IA, 990 € puis 49 € par mois : tout le Pro, plus un assistant sur votre site. La création se règle en 3 fois sans frais, l'abonnement est sans engagement et son premier mois est offert." },
  { cle: "devis", habit: "violet", titre: "Votre site, et vos devis et factures depuis votre téléphone", ecran: "tableau",
    points: ["Les demandes de vos clients arrivent ici", "Le devis se signe en ligne", "La facture se génère en PDF", "Vos rendez-vous et vos paiements au même endroit"], prix: "Formule Pro : 490 €", puis: "puis 29 € par mois, sans engagement",
    legende: "Avec la formule Pro, votre site internet vient avec un tableau de bord sur votre téléphone : les demandes de vos clients, vos devis signés en ligne, vos factures générées automatiquement en PDF, vos rendez-vous et vos paiements. 490 €, puis 29 € par mois, sans engagement." },
  { cle: "resultat", habit: "clair", titre: "Votre site internet : vous le voyez avant de régler le solde",
    etapes: ["Un acompte de 10 % lance la création de votre site", "Nous vous montrons le site, et nous faisons vos ajustements", "Vous validez, puis vous réglez le solde, en une fois ou en 3 fois sans frais"], prix: "À partir de 190 €", puis: "payable en 3 fois sans frais",
    legende: "Pour la création de votre site internet, vous ne payez pas les yeux fermés. Un acompte de 10 % sur la création lance le travail. Nous vous montrons le résultat, nous faisons vos ajustements, et le solde se règle après votre validation finale, en une fois ou en 3 fois sans frais." },
  { cle: "identite", habit: "nuit", titre: "Votre site internet, votre logo et vos cartes de visite", carte: true,
    points: ["Votre identité visuelle : logo, couleurs, typographies", "100 cartes de visite recto verso offertes", "La même image sur votre site et vos devis"], prix: "Formule Pro : 490 €", puis: "puis 29 € par mois, sans engagement",
    legende: "La formule Pro ne s'arrête pas au site internet : elle comprend votre identité visuelle (logo, couleurs, typographies), qu'on retrouve sur votre site, vos devis, vos factures et vos 100 cartes de visite recto verso, offertes. 490 €, puis 29 € par mois, sans engagement." },
  { cle: "assistant", habit: "violet", titre: "Sur votre site, un assistant répond à vos visiteurs", ecran: "discussion",
    points: ["Il répond aux questions pendant que vous travaillez", "Il prend les demandes de devis", "Vous les retrouvez dans votre tableau de bord"], prix: "Formule Pro + IA : 990 €", puis: "puis 49 € par mois, sans engagement",
    legende: "Avec la formule Pro + IA, votre site internet a son assistant : il répond aux visiteurs et prend leurs demandes pendant que vous êtes occupé, et vous les retrouvez dans votre tableau de bord. Vos devis sont préparés à partir de la demande du client. 990 €, puis 49 € par mois, sans engagement." },
  { cle: "ecrit", habit: "jaune", titre: "Votre site internet en ligne, sans rendez-vous à caler",
    etapes: ["Vous répondez à un court questionnaire, quand vous avez un moment", "Vous signez votre devis en ligne", "Votre site est en ligne environ une semaine après vos textes et vos photos"], prix: "Tout se fait par écrit", puis: "à votre rythme",
    legende: "Pas de rendez-vous à caler entre deux chantiers. Pour créer votre site internet, vous répondez à un court questionnaire quand vous avez un moment, vous signez votre devis en ligne, et votre site est mis en ligne environ une semaine après réception de vos textes et de vos photos." },
];
export async function publication(p) {
  const [c, x] = toile(1080, 1350), f = police(), h = HABITS[p.habit], icone = await image("/medias/icone-site-512.png");
  x.fillStyle = h.fond; x.fillRect(0, 0, 1080, 1350); x.textBaseline = "alphabetic"; x.textAlign = "left";
  // l'en-tête : la maison, et de quoi il s'agit
  if (p.habit === "violet") boite(x, "#ffffff", 62, 52, 112, 112, 28);
  x.drawImage(icone, 70, 60, 96, 96);
  x.fillStyle = h.titre; x.font = `800 40px ${f}`; x.fillText("NORA ÉDITIONS", 192, 100);
  x.fillStyle = h.texte; x.font = `600 28px ${f}`; x.fillText(METIER, 192, 142);
  // le titre
  let taille = 76; x.font = `800 ${taille}px ${f}`;
  while (couper(x, p.titre, 940).length > 3 && taille > 58) { taille -= 4; x.font = `800 ${taille}px ${f}`; }
  x.fillStyle = h.titre; let y = 286; y += lignes(x, p.titre, 70, y, 940, Math.round(taille * 1.14));
  x.fillStyle = h.accent; x.fillRect(70, y - Math.round(taille * .6), 130, 12); y += 26;
  const bas = 1130;
  if (p.formules) {
    // les trois formules, chacune dans son encadré
    const hf = Math.floor((bas - y - 2 * 22) / 3);
    p.formules.forEach(([nom, prix, puis, quoi], i) => { const gy = y + i * (hf + 22);
      boite(x, "#ffffff", 70, gy, 940, hf, 28);
      x.fillStyle = VIOLET; x.font = `800 44px ${f}`; x.textAlign = "left"; x.fillText(nom, 104, gy + 62);
      x.fillStyle = NUIT; x.font = `800 50px ${f}`; x.textAlign = "right"; x.fillText(prix, 976, gy + 62);
      x.fillStyle = GRIS; x.font = `600 26px ${f}`; x.fillText(puis, 976, gy + 98);
      x.fillStyle = ENCRE; x.font = `500 27px ${f}`; lignes(x, quoi, 104, gy + 136, 860, 36); });
  } else if (p.etapes) {
    // les étapes, numérotées
    const he = Math.floor((bas - y) / p.etapes.length);
    p.etapes.forEach((t, i) => { const gy = y + i * he + 16;
      x.fillStyle = h.accent; x.beginPath(); x.arc(126, gy + 56, 56, 0, 7); x.fill();
      x.fillStyle = h.surAccent; x.font = `800 60px ${f}`; x.textAlign = "center"; x.fillText(String(i + 1), 126, gy + 78);
      x.fillStyle = h.titre; x.font = `600 46px ${f}`; lignes(x, t, 220, gy + 46, 790, 60); });
  } else {
    // ce qu'on obtient, à gauche ; ce que ça donne, à droite
    const large = p.carte ? 940 : 520; let py = y + 30;
    if (p.carte) { const i = await image("/medias/carte-visite-exemple-recto.jpg"), lc = 470, hc = lc * i.height / i.width;
      x.save(); rond(x, 305, y + 6, lc, hc, 22); x.clip(); x.drawImage(i, 305, y + 6, lc, hc); x.restore(); py = y + hc + 62; }
    x.font = `600 ${p.carte ? 37 : 42}px ${f}`;
    for (const t of p.points) { const il = p.carte ? 48 : 54, l = couper(x, t, large - 80), ht = l.length * il;
      coche(x, 100, py + 2, 28, h.accent, h.surAccent); x.fillStyle = h.titre; x.textAlign = "left"; l.forEach((s, i) => x.fillText(s, 150, py + 16 + i * il)); py += ht + (p.carte ? 26 : 34); }
    if (p.ecran) await telephone(x, 648, y - 6, 362, bas - y - 14, p.ecran, f);
  }
  // le pied : le prix, et comment écrire
  x.fillStyle = h.bande; x.fillRect(0, 1166, 1080, 184);
  x.fillStyle = h.surBande; x.textAlign = "left"; x.font = `800 50px ${f}`; x.fillText(p.prix, 70, 1238);
  x.font = `500 30px ${f}`; x.fillText(p.puis, 70, 1284);
  x.font = `700 28px ${f}`; x.fillText("Écrivez-nous : " + SITE, 70, 1328);
  return c;
}

// Les vidéos de présentation : celles de la page des démonstrations (ancre, titre, fichier, ce qu'elle montre)
const VIDEOS = [["site", "Le site et le tableau de bord, en action", "video-site-et-application", "Du site que voient les clients jusqu'au tableau de bord où arrivent leurs demandes."],
  ["tableau-de-bord", "Un aperçu du tableau de bord", "appli-flex", "Les demandes, les devis signés en ligne, les factures et les paiements, sur un téléphone."],
  ["artisans", "Pour les artisans du bâtiment", "pub-nora-artisans", "Ce que Nora Éditions fait pour un artisan du bâtiment."]];

export async function vueVisuels(c, nom) {
  const { esc, toast, erreur } = c, prenom = String(nom || "").trim().split(" ")[0], pour = prenom ? "-" + prenom.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "") : "";
  const bio = `${prenom ? prenom + " · " : ""}Service commercial de Nora Éditions. Création de sites internet sur mesure pour les artisans et les indépendants. ${SITE}`;
  const f = c.fenetre("Mes visuels pour les réseaux", `<p class="gris" style="font-size:14px;margin:0 0 12px">${prenom ? `La couverture est au prénom de ${esc(prenom)}.` : "Choisissez d'abord votre nom dans « Sur ce téléphone, je suis » pour avoir la couverture à votre prénom."} Les images se téléchargent sur cet appareil.</p>
    <label>Pour créer le compte</label><div id="vCompte" style="margin-top:8px"><p class="gris">Préparation des images…</p></div>
    <div class="carte" style="box-shadow:none;background:var(--pierre);margin:4px 0 18px"><label>Le texte de présentation du compte</label>
      <p style="margin:6px 0 10px">${esc(bio)}</p><button class="btn clair petit-btn" data-copier="${esc(bio)}">Copier ce texte</button>
      <p class="gris" style="font-size:13px;margin:10px 0 0">Nom du compte conseillé : ${esc(prenom ? prenom + " · Nora Éditions" : "Nora Éditions")}.</p></div>
    <label>Les publications</label><p class="gris" style="font-size:13px;margin:4px 0 10px">Une image et sa légende à coller dessous. Commencez par la première, qui présente la maison, puis publiez-en une de temps en temps.</p>
    <div id="vPubli"><p class="gris">Préparation des images…</p></div>
    <label style="margin-top:8px">Les vidéos de présentation</label><p class="gris" style="font-size:13px;margin:4px 0 10px">À publier sur votre page, ou à envoyer à un professionnel : le lien ouvre la vidéo sur le site.</p>
    ${VIDEOS.map(([ancre, titre, fichier, aide]) => `<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:16px">
      <img src="/medias/${fichier}.jpg" alt="${esc(titre)}" style="width:96px;height:120px;object-fit:cover;border-radius:12px;background:var(--pierre);flex:none">
      <div><b>${esc(titre)}</b><small class="gris" style="display:block;margin:2px 0 8px">${esc(aide)}</small>
        <div class="actions-doc" style="margin:0"><a class="btn petit-btn" href="/medias/${fichier}.mp4" download="nora-editions-${ancre}.mp4">Télécharger</a><button class="btn clair petit-btn" data-copier="https://${SITE}/demonstrations/#${ancre}">Copier le lien</button></div></div></div>`).join("")}`);
  f.el.addEventListener("click", e => { const b = e.target.closest("[data-copier]"); if (!b) return;
    navigator.clipboard.writeText(b.dataset.copier).then(() => toast("Texte copié ✓"), () => toast("Sélectionnez le texte et copiez-le à la main")); });
  const bloc = async (zone, toileV, fichier, titre, aide, legende) => {
    const blob = await new Promise(ok => toileV.toBlob(ok, "image/png")), url = URL.createObjectURL(blob), d = document.createElement("div");
    d.style.cssText = "display:flex;gap:12px;align-items:flex-start;margin-bottom:16px";
    d.innerHTML = `<img src="${url}" alt="${esc(titre)}" style="width:96px;height:${legende ? 120 : 96}px;object-fit:contain;border-radius:12px;background:var(--pierre);flex:none">
      <div><b>${esc(titre)}</b><small class="gris" style="display:block;margin:2px 0 8px">${esc(aide)}</small>
        <div class="actions-doc" style="margin:0"><a class="btn petit-btn" href="${url}" download="${fichier}">Télécharger</a>${legende ? `<button class="btn clair petit-btn" data-copier="${esc(legende)}">Copier la légende</button>` : ""}</div></div>`;
    zone.appendChild(d);
  };
  try {
    await document.fonts?.ready;
    const z1 = f.el.querySelector("#vCompte"); z1.innerHTML = "";
    await bloc(z1, await vignette(), "nora-editions-vignette.png", "La vignette", "Votre photo de profil, sur Instagram comme sur Facebook.");
    await bloc(z1, await couverture(prenom), `nora-editions-couverture-facebook${pour}.png`, "La couverture Facebook", "L'image du haut de votre page.");
    const z2 = f.el.querySelector("#vPubli"); z2.innerHTML = "";
    for (const p of PUBLICATIONS) await bloc(z2, await publication(p), `nora-editions-publication-${p.cle}.png`, p.titre, `${p.prix}, ${p.puis}`, `${p.legende}\n\n${SITE}`);
  } catch (e) { erreur(e); }
}
