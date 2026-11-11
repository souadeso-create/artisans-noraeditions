// Les visuels du prospecteur (11/11/2026) : de quoi créer et faire vivre ses comptes Instagram et Facebook au nom de la maison.
// La vignette (photo de profil) et la couverture Facebook, à son prénom, puis une série de publications, chacune avec sa légende à
// copier. Tout est dessiné dans le navigateur, aux couleurs de Nora Éditions ; les images se téléchargent sur l'appareil.
// Les publications ne disent que ce que le site dit : les prix des formules, le paiement, ce que chaque formule comprend.
const NUIT = "#0f1240", VIOLET = "#5b4bff", JAUNE = "#ffd426", PIERRE = "#f0f1fa", ENCRE = "#14152e", GRIS = "#5f6482";
const SITE = "creation-site-internet.noraeditions.fr";
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

// La vignette : 1080 × 1080, tout tient dans le rond que découpent Instagram et Facebook
async function vignette(prenom) {
  const [c, x] = toile(1080, 1080), f = police(), icone = await image("/medias/icone-site-512.png");
  x.fillStyle = NUIT; x.fillRect(0, 0, 1080, 1080);
  x.drawImage(icone, 350, prenom ? 230 : 290, 380, 380);
  x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "alphabetic";
  if (prenom) { x.font = `800 104px ${f}`; x.fillText(prenom, 540, 760); }
  x.fillStyle = JAUNE; x.font = `600 46px ${f}`; x.fillText("Nora Éditions", 540, prenom ? 836 : 790);
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

// Les publications : 1080 × 1350 (le format portrait d'Instagram, accepté par Facebook). Quatre habillages, pour que la page ne soit pas monotone.
const HABITS = {
  nuit: { fond: NUIT, titre: "#ffffff", texte: "#d9dcf7", trait: JAUNE, pastille: [JAUNE, NUIT], pied: "#ffffff" },
  violet: { fond: VIOLET, titre: "#ffffff", texte: "#ecebff", trait: JAUNE, pastille: ["#ffffff", VIOLET], pied: "#ffffff" },
  clair: { fond: PIERRE, titre: ENCRE, texte: "#3b3f63", trait: VIOLET, pastille: [VIOLET, "#ffffff"], pied: ENCRE },
  jaune: { fond: JAUNE, titre: NUIT, texte: NUIT, trait: NUIT, pastille: [NUIT, "#ffffff"], pied: NUIT },
};
const PUBLICATIONS = [
  { cle: "google", habit: "nuit", pastille: "Référencement", titre: "Vos clients vous cherchent sur Google. Vous y êtes ?",
    texte: "Un site sur mesure, référencé sur Google, relié à votre fiche Google.",
    legende: "Quand on a besoin d'un professionnel, on le cherche sur son téléphone, et on écrit à celui qu'on trouve. Nous créons votre site sur mesure, nous le référençons sur Google et nous créons ou reprenons votre fiche Google. Écrivez-nous pour en parler." },
  { cle: "prix", habit: "jaune", pastille: "Formule Essentiel", titre: "Votre site internet à partir de 190 €",
    texte: "Sur mesure, référencé sur Google, avec votre nom de domaine en .fr. Payable en 3 fois sans frais.",
    legende: "La formule Essentiel : un site dessiné sur mesure, son référencement sur Google, votre fiche Google, un formulaire de demande de devis et votre nom de domaine en .fr, pour 190 €, puis 25 € par an pour l'hébergement et la maintenance. Le paiement se fait en une fois ou en 3 fois sans frais." },
  { cle: "devis", habit: "violet", pastille: "Formule Pro", titre: "Vos devis et vos factures depuis votre téléphone",
    texte: "Les demandes arrivent dans votre tableau de bord. Le devis se signe en ligne, la facture se génère en PDF.",
    legende: "Avec la formule Pro, votre site vient avec un tableau de bord : les demandes de vos clients, vos devis signés en ligne, vos factures générées automatiquement en PDF, vos rendez-vous et vos paiements. 490 €, puis 29 € par mois, sans engagement." },
  { cle: "resultat", habit: "clair", pastille: "Paiement", titre: "Vous voyez le résultat avant de régler le solde",
    texte: "Un acompte de 10 % lance le travail. Nous vous montrons le site, vous demandez vos ajustements, vous validez.",
    legende: "Chez nous, vous ne payez pas les yeux fermés. Un acompte de 10 % sur la création lance le travail. Nous vous montrons le résultat, nous faisons vos ajustements, et le solde se règle après votre validation finale, en une fois ou en 3 fois sans frais." },
  { cle: "identite", habit: "nuit", pastille: "Formule Pro", titre: "Un logo, des couleurs, une image qui vous ressemble",
    texte: "Votre identité visuelle est comprise, avec 100 cartes de visite offertes.",
    legende: "La formule Pro comprend votre identité visuelle : logo, couleurs, typographies. Elle se retrouve sur votre site, vos devis, vos factures et vos 100 cartes de visite recto verso, offertes." },
  { cle: "assistant", habit: "violet", pastille: "Formule Pro + IA", titre: "Un assistant répond à vos visiteurs pendant que vous travaillez",
    texte: "Il répond aux questions sur votre site et prend les demandes. Vous les retrouvez dans votre tableau de bord.",
    legende: "Avec la formule Pro + IA, un assistant sur votre site répond aux visiteurs et prend leurs demandes pendant que vous êtes occupé. Vos devis sont préparés à partir de la demande du client, et les réponses à vos avis Google sont préparées pour vous. 990 €, puis 49 € par mois, sans engagement." },
  { cle: "offert", habit: "jaune", pastille: "Abonnement", titre: "Le premier mois d'abonnement est offert",
    texte: "L'abonnement commence un mois après la mise en ligne. Il est sans engagement.",
    legende: "L'abonnement couvre l'hébergement, la maintenance et, avec les formules Pro et Pro + IA, votre tableau de bord. Il commence un mois après la mise en ligne de votre site : le premier mois est offert. Et il est sans engagement." },
  { cle: "ecrit", habit: "clair", pastille: "Comment ça se passe", titre: "Tout se fait par écrit, à votre rythme",
    texte: "Un court questionnaire, un devis à signer en ligne, votre site en ligne environ une semaine après vos textes et vos photos.",
    legende: "Pas de rendez-vous à caler entre deux chantiers. Vous répondez à un court questionnaire quand vous avez un moment, vous signez votre devis en ligne, et votre site est mis en ligne environ une semaine après réception de vos textes et de vos photos." },
];
// Les vidéos de présentation : celles de la page des démonstrations (ancre, titre, fichier, ce qu'elle montre)
const VIDEOS = [["site", "Le site et le tableau de bord, en action", "video-site-et-application", "Du site que voient les clients jusqu'au tableau de bord où arrivent leurs demandes."],
  ["tableau-de-bord", "Un aperçu du tableau de bord", "appli-flex", "Les demandes, les devis signés en ligne, les factures et les paiements, sur un téléphone."],
  ["artisans", "Pour les artisans du bâtiment", "pub-nora-artisans", "Ce que Nora Éditions fait pour un artisan du bâtiment."]];
async function publication(p) {
  const [c, x] = toile(1080, 1350), f = police(), h = HABITS[p.habit], icone = await image("/medias/icone-site-512.png");
  x.fillStyle = h.fond; x.fillRect(0, 0, 1080, 1350); x.textBaseline = "alphabetic"; x.textAlign = "left";
  // la pastille du haut
  x.font = `700 34px ${f}`; const lp = x.measureText(p.pastille).width + 56;
  x.fillStyle = h.pastille[0]; rond(x, 90, 96, lp, 68, 34); x.fill();
  x.fillStyle = h.pastille[1]; x.fillText(p.pastille, 118, 142);
  // le titre : il rétrécit s'il prend plus de cinq lignes
  let taille = 100; x.font = `800 ${taille}px ${f}`;
  while (couper(x, p.titre, 900).length > 5 && taille > 70) { taille -= 6; x.font = `800 ${taille}px ${f}`; }
  x.fillStyle = h.titre; let y = 330; y += lignes(x, p.titre, 90, y, 900, Math.round(taille * 1.13));
  x.fillStyle = h.trait; x.fillRect(90, y - Math.round(taille * .55), 130, 12); y += 56;
  x.fillStyle = h.texte; x.font = `500 48px ${f}`; lignes(x, p.texte, 90, y, 900, 66);
  // le pied : l'icône, la maison, l'adresse
  if (p.habit === "violet") { x.fillStyle = "#ffffff"; rond(x, 82, 1132, 136, 136, 34); x.fill(); }
  x.drawImage(icone, 90, 1140, 120, 120);
  x.fillStyle = h.pied; x.font = `800 40px ${f}`; x.fillText("Nora Éditions", 240, 1190);
  x.font = `500 32px ${f}`; x.fillText(SITE, 240, 1240);
  return c;
}

export async function vueVisuels(c, nom) {
  const { esc, toast, erreur } = c, prenom = String(nom || "").trim().split(" ")[0], pour = prenom ? "-" + prenom.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "") : "";
  const bio = `${prenom ? prenom + " · " : ""}Service commercial de Nora Éditions. Sites internet sur mesure pour les artisans et les indépendants. ${SITE}`;
  const f = c.fenetre("Mes visuels pour les réseaux", `<p class="gris" style="font-size:14px;margin:0 0 12px">${prenom ? `Au prénom de ${esc(prenom)}.` : "Choisissez d'abord votre nom dans « Sur ce téléphone, je suis » pour avoir la vignette et la couverture à votre prénom."} Les images se téléchargent sur cet appareil.</p>
    <label>Pour créer le compte</label><div id="vCompte" style="margin-top:8px"><p class="gris">Préparation des images…</p></div>
    <div class="carte" style="box-shadow:none;background:var(--pierre);margin:4px 0 18px"><label>Le texte de présentation du compte</label>
      <p style="margin:6px 0 10px">${esc(bio)}</p><button class="btn clair petit-btn" data-copier="${esc(bio)}">Copier ce texte</button>
      <p class="gris" style="font-size:13px;margin:10px 0 0">Nom du compte conseillé : ${esc(prenom ? prenom + " · Nora Éditions" : "Nora Éditions")}.</p></div>
    <label>Les publications</label><p class="gris" style="font-size:13px;margin:4px 0 10px">Une image et sa légende à coller dessous. Publiez-en une de temps en temps : une page qui vit inspire confiance.</p>
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
    await bloc(z1, await vignette(prenom), `nora-editions-vignette${pour}.png`, "La vignette", "Votre photo de profil, sur Instagram comme sur Facebook.");
    await bloc(z1, await couverture(prenom), `nora-editions-couverture-facebook${pour}.png`, "La couverture Facebook", "L'image du haut de votre page.");
    const z2 = f.el.querySelector("#vPubli"); z2.innerHTML = "";
    for (const p of PUBLICATIONS) await bloc(z2, await publication(p), `nora-editions-publication-${p.cle}.png`, p.titre, p.texte, `${p.legende}\n\n${SITE}`);
  } catch (e) { erreur(e); }
}
