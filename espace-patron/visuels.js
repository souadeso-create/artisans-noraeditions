// Les visuels du prospecteur (11/11/2026) : de quoi créer ses comptes Instagram et Facebook au nom de la maison.
// Trois images dessinées dans le navigateur, à son prénom : la vignette (photo de profil), la couverture Facebook et une première
// publication. Plus le texte de présentation à copier. Rien n'est envoyé nulle part : les images se téléchargent sur l'appareil.
const NUIT = "#0f1240", VIOLET = "#5b4bff", JAUNE = "#ffd426", PIERRE = "#f0f1fa", ENCRE = "#14152e", GRIS = "#5f6482";
const SITE = "creation-site-internet.noraeditions.fr";
const image = src => new Promise((ok, non) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => non(new Error("image introuvable : " + src)); i.src = src; });
const police = () => getComputedStyle(document.body).fontFamily || "Arial, sans-serif";
// écrit un texte sur plusieurs lignes, sans dépasser la largeur ; rend la hauteur occupée
function lignes(x, texte, gx, y, large, interligne, alignement = "left") {
  x.textAlign = alignement; let ligne = "", n = 0;
  for (const mot of texte.split(" ")) { const essai = ligne ? ligne + " " + mot : mot;
    if (ligne && x.measureText(essai).width > large) { x.fillText(ligne, gx, y + n * interligne); ligne = mot; n++; } else ligne = essai; }
  if (ligne) { x.fillText(ligne, gx, y + n * interligne); n++; }
  return n * interligne;
}
const toile = (l, h) => { const c = document.createElement("canvas"); c.width = l; c.height = h; return [c, c.getContext("2d")]; };

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
// Une première publication : 1080 × 1350 (le format portrait d'Instagram, accepté par Facebook)
async function publication() {
  const [c, x] = toile(1080, 1350), f = police(), icone = await image("/medias/icone-site-512.png");
  x.fillStyle = NUIT; x.fillRect(0, 0, 1080, 1350);
  x.drawImage(icone, 90, 90, 130, 130);
  x.fillStyle = "#fff"; x.textBaseline = "alphabetic"; x.font = `600 40px ${f}`; x.textAlign = "left"; x.fillText("Nora Éditions", 250, 172);
  x.font = `800 92px ${f}`; let y = 400; y += lignes(x, "Votre site internet sur mesure", 90, y, 900, 106);
  x.fillStyle = JAUNE; x.fillRect(90, y - 40, 120, 10); y += 60;
  x.font = `500 46px ${f}`;
  for (const t of ["Bien placé sur Google", "Vos demandes, vos devis et vos factures depuis votre téléphone", "Vous voyez le résultat avant de régler le solde"]) {
    x.fillStyle = JAUNE; x.beginPath(); x.arc(108, y - 16, 11, 0, 7); x.fill();
    x.fillStyle = "#fff"; y += lignes(x, t, 150, y, 840, 60) + 34; }
  x.fillStyle = "#fff"; x.font = `700 40px ${f}`; x.fillText(SITE, 90, 1260);
  return c;
}

const VISUELS = [["vignette", "La vignette", "Votre photo de profil, sur Instagram comme sur Facebook.", vignette],
  ["couverture-facebook", "La couverture Facebook", "L'image du haut de votre page.", couverture],
  ["premiere-publication", "Une première publication", "Pour que la page ne soit pas vide quand un professionnel la visite.", publication]];

export async function vueVisuels(c, nom) {
  const { esc, toast, erreur } = c, prenom = String(nom || "").trim().split(" ")[0];
  const bio = `${prenom ? prenom + " · " : ""}Service commercial de Nora Éditions. Sites internet sur mesure pour les artisans et les indépendants. ${SITE}`;
  const f = c.fenetre("Mes visuels pour les réseaux", `<p class="gris" style="font-size:14px;margin:0 0 12px">${prenom ? `Au prénom de ${esc(prenom)}.` : "Choisissez d'abord votre nom dans « Sur ce téléphone, je suis » pour avoir les visuels à votre prénom."} Les images se téléchargent sur cet appareil.</p>
    <div id="visuels"><p class="gris">Préparation des images…</p></div>
    <div class="carte" style="box-shadow:none;background:var(--pierre);margin-top:14px"><label>Le texte de présentation du compte</label>
      <p id="bio" style="margin:6px 0 10px">${esc(bio)}</p><button class="btn clair petit-btn" id="copierBio">Copier ce texte</button>
      <p class="gris" style="font-size:13px;margin:10px 0 0">Nom du compte conseillé : ${esc(prenom ? prenom + " · Nora Éditions" : "Nora Éditions")}.</p></div>`);
  f.el.querySelector("#copierBio").onclick = () => navigator.clipboard.writeText(bio).then(() => toast("Texte copié ✓"), () => toast("Sélectionnez le texte et copiez-le à la main"));
  try {
    await document.fonts?.ready;
    const zone = f.el.querySelector("#visuels"); zone.innerHTML = "";
    for (const [cle, titre, aide, dessiner] of VISUELS) {
      const toileV = await dessiner(prenom), blob = await new Promise(ok => toileV.toBlob(ok, "image/png")), url = URL.createObjectURL(blob);
      const fichier = `nora-editions-${cle}${prenom && cle !== "premiere-publication" ? "-" + prenom.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "") : ""}.png`;
      const bloc = document.createElement("div"); bloc.style.cssText = "display:flex;gap:12px;align-items:center;margin-bottom:14px";
      bloc.innerHTML = `<img src="${url}" alt="${esc(titre)}" style="width:96px;height:96px;object-fit:contain;border-radius:12px;background:var(--pierre);flex:none">
        <div><b>${esc(titre)}</b><small class="gris" style="display:block;margin:2px 0 8px">${esc(aide)}</small><a class="btn petit-btn" href="${url}" download="${fichier}">Télécharger</a></div>`;
      zone.appendChild(bloc);
    }
  } catch (e) { erreur(e); }
}
