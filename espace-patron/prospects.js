// L'assistant commercial (11/11/2026) : le suivi des prospects, les messages prêts par métier et par situation, et la lecture d'un
// message reçu. Tout se fait par écrit : rien ne part tout seul, chaque message se relit, se modifie, puis se copie ou s'ouvre dans la
// messagerie. Un prospect qui ne veut plus être contacté est bloqué pour de bon. Aucune coordonnée n'est inventée : elles se saisissent.
// Sans IA : des modèles et des règles simples (une IA pourra s'y brancher plus tard, côté serveur).

export const ETAPES = [["nouveau", "Nouveau prospect"], ["contacte", "Premier contact envoyé"], ["reponse", "Réponse reçue"], ["besoin", "Besoin identifié"],
  ["proposition", "Proposition envoyée"], ["decision", "En attente de décision"], ["gagne", "Client gagné"], ["perdu", "Client perdu"]];
const NOM_ETAPE = Object.fromEntries(ETAPES);
const OFFRES = ["Essentiel", "Pro", "Pro + IA"];
const PRIX = { Essentiel: "190 €, puis 25 € par an pour l'hébergement et la maintenance", Pro: "490 €, puis 29 € par mois", "Pro + IA": "990 €, puis 49 € par mois" };
const CONTENU = {
  Essentiel: "le site sur mesure, son référencement sur Google, la fiche Google, le formulaire de devis et le nom de domaine en .fr",
  Pro: "le site, l'identité visuelle (logo, couleurs, typographies), 100 cartes de visite offertes, et un tableau de bord pour vos demandes, vos devis signés en ligne, vos factures et vos rendez-vous",
  "Pro + IA": "tout le Pro, plus un assistant sur votre site qui répond aux visiteurs et prend leurs demandes, et vos devis préparés à partir de la demande du client" };
// ce qu'on a constaté en regardant sa présence en ligne (coché à la main : rien n'est supposé)
const CONSTATS = [["pas_de_site", "Pas de site internet", "nous n'avons pas trouvé de site internet pour votre entreprise"],
  ["pas_mobile", "Site peu lisible sur téléphone", "votre site est difficile à lire sur un téléphone"],
  ["pas_fiche", "Pas de fiche Google", "nous n'avons pas trouvé de fiche Google à jour pour votre entreprise"],
  ["pas_devis", "Pas de demande de devis en ligne", "vos clients ne peuvent pas vous envoyer une demande de devis depuis votre site"],
  ["site_ancien", "Site ancien", "votre site semble dater un peu"],
  ["pas_reseaux", "Pas de page sur les réseaux sociaux", "nous n'avons pas trouvé de page de votre entreprise sur les réseaux sociaux"],
  ["reseaux_endormis", "Réseaux sociaux peu actifs", "vos pages sur les réseaux sociaux n'ont pas été mises à jour depuis un moment"],
  ["reseaux_seuls", "Présent seulement sur les réseaux sociaux", "votre entreprise est sur les réseaux sociaux, mais sans site internet qui lui appartienne"]];
// l'accroche propre au métier (les métiers prioritaires, puis une phrase qui vaut pour tous)
const METIERS = [
  [/plomb|chauffag/i, "Quand on a une fuite ou une chaudière en panne, on cherche un plombier sur son téléphone, et on écrit à celui qui inspire confiance."],
  [/electric|électric/i, "Pour une panne ou une mise aux normes, on cherche un électricien près de chez soi, et on compare les sites avant d'écrire."],
  [/couvr|toit|charpent/i, "Après une tempête ou une tuile tombée, on cherche un couvreur sur Google, photos et avis à l'appui."],
  [/peint/i, "Avant de confier ses murs, on regarde les chantiers déjà faits : des photos avant et après valent mieux qu'un long discours."],
  [/renov|rénov|corps d|maçon|macon|carrel|plaqu|menuis|façad|facad/i, "Pour des travaux, on compare plusieurs artisans : celui qui montre ses chantiers et répond vite part avec une longueur d'avance."],
  [/nettoy|ménage|menage|vitre|concierg/i, "Un syndic ou un chef d'entreprise qui change de prestataire commence par chercher sur Google, puis demande plusieurs devis."],
];
const accroche = m => (METIERS.find(x => x[0].test(m || "")) || [0, "Aujourd'hui, on cherche un professionnel sur son téléphone, et on écrit à celui dont le site inspire confiance."])[1];

const jour = () => new Date().toISOString().slice(0, 10);
// le prospecteur qui se sert de ce téléphone (retenu ici), et la liste de tous les prospecteurs (dans les réglages de l'appli)
export const moi = () => { try { return localStorage.getItem("nora_prospecteur") || ""; } catch (e) { return ""; } };
const jeSuis = n => { try { n ? localStorage.setItem("nora_prospecteur", n) : localStorage.removeItem("nora_prospecteur"); } catch (e) {} };
const equipe = P => Array.isArray(P.prospecteurs) ? P.prospecteurs : [];
// la colonne « prospecteur » manque encore dans la base : on enregistre sans elle, et on le dit
let sansColonne = false;   // vrai quand la base n'a pas (encore) la colonne « prospecteur » : l'appli le dit dans un encadré qui reste
const SQL_PROSPECTEUR = "alter table prospects add column if not exists prospecteur text;" + String.fromCharCode(10) + "notify pgrst, 'reload schema';";
const encadreColonne = esc => !sansColonne ? "" : `<div class="carte" style="margin-bottom:12px;border-left:3px solid #a3261f"><b>Le prospecteur ne peut pas être enregistré pour l'instant.</b>
  <p class="gris" style="font-size:14px;margin:6px 0 10px">La colonne « prospecteur » manque dans votre base, ou la base ne l'a pas encore prise en compte. Passez cette commande dans l'éditeur SQL de Supabase, puis rouvrez cette page :</p>
  <pre style="white-space:pre-wrap;background:var(--pierre);border-radius:10px;padding:10px;font-size:13px;margin:0 0 10px">${esc(SQL_PROSPECTEUR)}</pre><button class="btn petit-btn" data-copier-sql>Copier la commande</button></div>`;
const brancherColonne = (vue, toast) => vue.querySelectorAll("[data-copier-sql]").forEach(b => b.onclick = () => navigator.clipboard.writeText(SQL_PROSPECTEUR).then(() => toast("Commande copiée ✓"), () => toast("Sélectionnez la commande et copiez-la à la main")));
async function garder(c, ligne) {
  try { const r = await c.db.enregistrer("prospects", ligne); if ("prospecteur" in ligne && ligne.prospecteur) sansColonne = false; return r; }
  catch (e) { if (!/prospecteur/.test(String(e?.message || e))) throw e; sansColonne = true; const { prospecteur, ...sans } = ligne; return await c.db.enregistrer("prospects", sans); }
}
const depuis = d => d ? Math.max(0, Math.round((new Date(jour() + "T12:00") - new Date(String(d).slice(0, 10) + "T12:00")) / 864e5)) : 999;   // en jours entiers, de date à date
const dateCourte = d => new Date(String(d).slice(0, 10) + "T12:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const prenom = p => String(p.nom || "").trim().split(" ")[0];
const bonjour = p => p.nom ? `Bonjour ${prenom(p)},` : "Bonjour,";
// la formule conseillée : celle de la fiche ; sinon le Pro, que le site recommande ; l'Essentiel seulement pour qui veut un simple site vitrine
const offreConseillee = p => p.offre || (/assistant|\bia\b|intelligence/i.test(p.besoin || "") ? "Pro + IA" : /vitrine|simple site|juste un site|seulement un site|petit site|petit budget/i.test(p.besoin || "") ? "Essentiel" : "Pro");
const dernierContact = p => (p.historique || []).filter(h => h.t === "envoi").map(h => h.d).sort().pop() || null;
const nbRelances = p => (p.historique || []).filter(h => h.t === "envoi" && /relance/i.test(h.texte || "")).length;

/* ---------- L'assistant IA (facultatif) : absent tant que la fonction « assistant » n'est pas installée ---------- */
let iaPrete = null;
async function iaDispo(db) { if (iaPrete === null) { try { iaPrete = !!(await db.assistant({ action: "etat" })).pret; } catch (e) { iaPrete = false; } } return iaPrete; }
const CONDITIONS = "Un acompte de 10 % lance le travail. Le solde se règle après la validation finale, en une fois ou en 3 fois sans frais. L'abonnement est sans engagement. Délai : environ une semaine après réception des textes et des photos.";
const INTERETS = { fort: "Fort : il veut avancer", moyen: "Moyen : il se renseigne", faible: "Faible ou incertain", aucun: "Aucun : il refuse d'être contacté" };
// ni nom de personne, ni e-mail, ni téléphone : seulement ce qui sert à écrire
const ficheIA = p => ({ entreprise: p.entreprise || "", metier: p.metier || "", ville: p.ville || "", etape: (ETAPES.find(e => e[0] === p.etape) || [])[1] || "", besoin: p.besoin || "",
  constats: CONSTATS.filter(c => (p.constats || []).includes(c[0])).map(c => c[1]), derniers_echanges: (p.historique || []).slice(-6).map(h => ({ date: h.d, sens: h.t === "recu" ? "reçu" : h.t === "envoi" ? "envoyé" : h.t, texte: h.texte || "" })) });
const donneesIA = (p, P) => { const o = offreConseillee(p); return { formules: Object.keys(PRIX).map(k => ({ nom: k, prix: PRIX[k], contenu: CONTENU[k] })), formule_conseillee: o, conditions: CONDITIONS,
  demonstration_en_video: demoPour(p, o), signature: signature(P), phrase_pour_ne_plus_recevoir_de_message: REFUS }; };

/* ---------- L'envoi par e-mail depuis l'appli (facultatif) : absent tant que la fonction « courrier » n'est pas installée ---------- */
let courrierPret = null;
async function courrierDispo(db) { if (courrierPret === null) { try { courrierPret = !!(await db.courrier({ action: "etat" })).pret; } catch (e) { courrierPret = false; } } return courrierPret; }

/* ---------- Les messages ---------- */
function signature(P) { return `${P.entreprise || "Nora Éditions"}\n${P.site || "creation-site-internet.noraeditions.fr"}${P.email ? "\n" + P.email : ""}`; }
const REFUS = "Si vous ne souhaitez plus recevoir de message de notre part, dites-le-nous simplement.";
function constatsTxt(p) {
  const l = CONSTATS.filter(c => (p.constats || []).includes(c[0])).map(c => c[2]);
  return l.length ? `En regardant votre présence en ligne : ${l.join(" ; ")}. ` : "";
}
// la page des démonstrations, et la vidéo qui va avec la formule conseillée
const DEMO = "https://creation-site-internet.noraeditions.fr/demonstrations/";
const demoPour = (p, o) => /plomb|electric|électric|couvr|peint|maçon|macon|carrel|menuis|renov|rénov|charpent|façad|facad|plaqu/i.test(p.metier || "") ? DEMO + "#artisans" : o === "Essentiel" ? DEMO + "#site" : DEMO + "#tableau-de-bord";
export function messages(p, P) {
  const o = offreConseillee(p), ent = p.entreprise ? ` pour ${p.entreprise}` : "", sig = signature(P), m = (p.metier || "votre métier").toLowerCase(), demo = demoPour(p, o);
  const autres = Object.keys(PRIX).filter(k => k !== o).map(k => `• ${k} : ${PRIX[k]}. Elle comprend ${CONTENU[k]}.`).join("\n");
  const paiement = "Un acompte de 10 % lance le travail, et le solde se règle après votre validation finale, en une fois ou en 3 fois sans frais. L'abonnement est sans engagement.";
  return [
    ["premier", "Premier e-mail", `Un site internet${ent}`,
      `${bonjour(p)}\n\nNora Éditions crée des sites internet pour les artisans et les indépendants. ${accroche(p.metier)}\n\n${constatsTxt(p)}Nous pouvons vous préparer un site sur mesure, bien placé sur Google, avec un tableau de bord pour recevoir vos demandes et faire vos devis depuis votre téléphone. Vous voyez le résultat avant de régler le solde, et tout se fait par écrit, à votre rythme.\n\nSouhaitez-vous voir un exemple en vidéo ? Répondez simplement « oui » à ce message.\n\n${REFUS}\n\n${sig}`],
    ["whatsapp", "Message WhatsApp (en réponse à quelqu'un qui vous a écrit)", "",
      `${bonjour(p)} merci pour votre message ! Nora Éditions crée des sites internet pour les professionnels comme vous (${m}), avec un tableau de bord pour les demandes et les devis. Dites-nous ce dont vous avez besoin, et nous vous répondons par écrit avec un exemple. ${P.entreprise || "Nora Éditions"}`],
    ["demo", "Démonstration en vidéo", `Une démonstration en vidéo${ent}`,
      `${bonjour(p)}\n\nComme convenu, voici une courte vidéo qui montre ce que nous faisons :\n${demo}\n\nElle se lit sur téléphone, sans rien installer. Les autres démonstrations sont sur la même page.\n\nDites-nous ce que vous en pensez, et ce que vous aimeriez pour votre activité : nous vous préparons une proposition écrite.\n\n${sig}`],
    ["relance1", "Première relance", `Votre site internet${ent}`,
      `${bonjour(p)}\n\nNous nous permettons de revenir vers vous au sujet de notre message de l'autre jour, sur la création d'un site internet${ent}. Peut-être n'était-ce pas le bon moment.\n\nPour vous faire une idée sans y passer de temps, voici une courte vidéo :\n${demo}\n\n${REFUS}\n\n${sig}`],
    ["relance2", "Deuxième relance", `Un exemple de site${ent}`,
      `${bonjour(p)}\n\nUn dernier mot avant de vous laisser tranquille : nous pouvons vous montrer un exemple de site pour ${m}, sans engagement. Il n'y a rien à préparer de votre côté.\n\nUn simple « oui » en réponse suffit.\n\n${REFUS}\n\n${sig}`],
    ["relance3", "Dernière relance, courtoise", `Nous ne vous dérangeons plus`,
      `${bonjour(p)}\n\nSans réponse de votre part, nous ne vous écrirons plus. Si un jour vous avez besoin d'un site internet, vous savez où nous trouver : ${P.site || "creation-site-internet.noraeditions.fr"}.\n\nNous vous souhaitons une belle continuation.\n\n${sig}`],
    ["prix", "Réponse : il demande le prix", "Nos tarifs",
      `${bonjour(p)}\n\nMerci pour votre message. Pour votre activité, nous vous conseillons la formule ${o} : ${PRIX[o]}. Elle comprend ${CONTENU[o]}.\n\nLes deux autres formules, pour comparer :\n${autres}\n\n${paiement}\n\nDites-nous ce qui compte le plus pour vous, et nous vous préparons une proposition écrite.\n\n${sig}`],
    ["cher", "Réponse : il trouve cela trop cher", "Votre site internet",
      `${bonjour(p)}\n\nNous comprenons tout à fait, c'est une dépense qui se réfléchit. Quelques précisions qui peuvent aider : vous voyez le résultat avant de régler le solde, il se paie en 3 fois sans frais si vous le souhaitez, et l'abonnement est sans engagement.\n\n${o === "Essentiel" ? "" : "Si le budget est serré, il existe aussi une formule plus légère, que vous pourrez faire évoluer ensuite. "}Dites-nous le budget que vous aviez en tête : nous vous dirons franchement ce qui est possible.\n\n${sig}`],
    ["reflechir", "Réponse : il veut réfléchir", "Votre projet de site",
      `${bonjour(p)}\n\nBien sûr, prenez le temps qu'il vous faut. Pour vous aider à décider, voici une courte vidéo de démonstration :\n${demo}\n\nNous pouvons aussi vous envoyer une proposition écrite, que vous lirez quand vous voudrez. Nous restons disponibles par écrit pour toutes vos questions.\n\n${sig}`],
    ["compare", "Réponse : il compare plusieurs prestataires", "Votre projet de site",
      `${bonjour(p)}\n\nVous avez raison de comparer. Voici ce que nous faisons, pour que vous puissiez juger : un site dessiné sur mesure, son référencement sur Google et la fiche Google dans toutes les formules, les rendus montrés avant la mise en ligne, le solde réglé après votre validation finale, et un abonnement sans engagement.\n\nNous vous envoyons une proposition écrite si vous le souhaitez : vous la comparerez tranquillement.\n\n${sig}`],
    ["vitrine", "Réponse : il veut seulement un site vitrine", "Votre site vitrine",
      `${bonjour(p)}\n\nC'est la formule Essentiel : ${CONTENU.Essentiel}, pour ${PRIX.Essentiel}. Vous pourrez passer à une formule plus complète plus tard, si vous voulez un jour faire vos devis et vos factures depuis votre téléphone.\n\nPour commencer, il nous faut seulement quelques informations sur votre activité. Nous vous envoyons un court questionnaire si vous êtes d'accord.\n\n${sig}`],
    ["appli", "Réponse : il veut une application métier", "Votre tableau de bord",
      `${bonjour(p)}\n\nC'est la formule Pro : ${CONTENU.Pro}, pour ${PRIX.Pro}. Vos devis et vos factures se génèrent automatiquement en PDF, et vos clients signent en ligne.\n\nVoici une courte vidéo qui montre le tableau de bord sur un téléphone :\n${DEMO}#tableau-de-bord\n\nDites-nous ce que vous aimeriez y trouver pour votre activité.\n\n${sig}`],
    ["proposition", "Proposition commerciale (texte)", `Votre proposition${ent}`,
      `${bonjour(p)}\n\nSuite à nos échanges, voici notre proposition${ent}.\n\nVotre besoin : ${p.besoin || "un site internet qui vous fasse trouver par vos clients"}.\n\nCe que nous vous proposons : la formule ${o}, soit ${CONTENU[o]}.\n\nLe prix : ${PRIX[o]}.\n\nLa suite : vous remplissez un court questionnaire, nous vous envoyons le devis à signer en ligne, un acompte de 10 % lance le travail, nous vous montrons le résultat, vous demandez vos ajustements, puis vous validez. Le solde se règle à ce moment-là, en une fois ou en 3 fois sans frais. L'abonnement est sans engagement.\n\nLe délai : environ une semaine après réception de vos textes et de vos photos.\n\nSi cette proposition vous convient, répondez-nous simplement « d'accord » et nous vous envoyons le questionnaire.\n\n${sig}`],
  ];
}

/* ---------- Lire un message reçu : ce qu'il cherche, son intérêt, ses objections, la réponse, la suite ---------- */
const SITUATIONS = [
  ["stop", /\bne (plus |pas )?(me |nous |m.)?\s?(plus |pas )?(re)?(contacte|écri|ecri|relance|dérange|derange|sollicite|envoye)[a-zé]* (plus|pas)\b|\bne (plus|pas) (me |nous |m.)?\s?(re)?(contacte|écri|ecri|relance|dérange|derange|sollicite)|^\s*stop\b|\bstop\s*[.!]*\s*$|désinscri|desinscri|plus (de|aucun) (message|mail|e-mail|courriel)|pas int[ée]ress|arr[êe]te(z)? de|cessez|retire(z|r)[- ](moi|mon|mes)|laisse(z)?[- ]moi tranquille|m.oppose/i, "Il ne veut plus être contacté", "Respecter son refus tout de suite, et ne plus lui écrire."],
  ["cher", /trop cher|cher pour|pas les moyens|budget|hors de prix|moins cher|co[ûu]te trop/i, "Il trouve l'offre trop chère", "Rappeler le paiement après validation, en 3 fois, et lui demander son budget."],
  ["compare", /compar|autre(s)? (devis|prestataire|agence|offre)|concurren|ailleurs|plusieurs devis/i, "Il compare plusieurs prestataires", "Envoyer une proposition écrite qu'il pourra comparer."],
  ["reflechir", /r[ée]fl[ée]ch|voir plus tard|pas tout de suite|plus tard|je vous redis|reviens vers vous|en parler/i, "Il veut réfléchir", "Envoyer la vidéo de démonstration, et noter une relance dans une semaine."],
  ["appli", /appli|logiciel|devis en ligne|factur|rendez-vous en ligne|agenda|tableau de bord|gestion/i, "Il veut une application métier", "Présenter la formule Pro et la vidéo du tableau de bord."],
  ["vitrine", /vitrine|simple site|juste un site|seulement un site|petit site|une page/i, "Il veut seulement un site vitrine", "Présenter la formule Essentiel et envoyer le questionnaire."],
  ["prix", /prix|tarif|combien|co[ûu]t|devis/i, "Il demande le prix", "Envoyer les trois formules, et lui demander ce qui compte le plus pour lui."],
];
export function analyser(texte) {
  const t = String(texte || ""), trouve = SITUATIONS.filter(s => s[1].test(t));
  const stop = trouve.some(s => s[0] === "stop");
  const chaud = /int[ée]ress|d'accord|ok pour|on peut|quand (peut|pouv)|comment (faire|proc)|envoyez|je veux|j'aimerais|je souhaite|commencer|urgent|rapidement/i.test(t) && !stop;
  const question = /\?/.test(t);
  const interet = stop ? "Aucun : il refuse d'être contacté" : chaud ? "Fort : il veut avancer" : trouve.some(s => ["prix", "appli", "vitrine"].includes(s[0])) || question ? "Moyen : il se renseigne" : "Faible ou incertain";
  const objections = trouve.filter(s => ["cher", "compare", "reflechir"].includes(s[0])).map(s => s[2]);
  const principale = trouve[0] || null;
  return { stop, interet, objections, situation: principale ? principale[2] : "Rien de précis : il faut lui demander ce qu'il recherche", cle: principale ? principale[0] : null,
    suite: principale ? principale[3] : "Répondre en lui demandant son métier et ce qu'il attend de son site." };
}

/* ---------- Ce qu'il faut faire aujourd'hui : trois actions concrètes ---------- */
const DELAIS = [4, 7, 7];   // jours avant la première relance, puis la deuxième, puis la dernière
export function aRelancer(p) {
  if (p.opposition || !["contacte", "proposition", "decision"].includes(p.etape)) return false;
  const n = nbRelances(p); if (n >= 3) return false;
  return depuis(dernierContact(p) || p.created_at) >= DELAIS[n];
}
export function actionsDuJour(prospects) {
  const vivants = prospects.filter(p => !p.opposition && !["gagne", "perdu"].includes(p.etape)), l = [];
  const pousse = (p, texte, pourquoi) => l.push({ id: p.id, texte, pourquoi });
  vivants.filter(p => p.prochaine_date && p.prochaine_date <= jour() && p.prochaine_action).forEach(p => pousse(p, `${p.prochaine_action} · ${p.entreprise || p.nom}`, "c'est l'action que vous aviez notée"));
  vivants.filter(p => ["reponse", "besoin"].includes(p.etape)).forEach(p => pousse(p, `Répondre à ${p.entreprise || p.nom}`, p.etape === "besoin" ? "son besoin est connu : il attend votre proposition" : "il vous a répondu"));
  vivants.filter(aRelancer).forEach(p => pousse(p, `Relancer ${p.entreprise || p.nom}`, `sans nouvelles depuis ${depuis(dernierContact(p) || p.created_at)} jours`));
  vivants.filter(p => p.etape === "nouveau").forEach(p => pousse(p, `Écrire à ${p.entreprise || p.nom}`, "premier contact à envoyer"));
  const vus = new Set(), uniques = l.filter(a => !vus.has(a.id) && vus.add(a.id)).slice(0, 3);
  const generales = [{ texte: "Trouver des entreprises à contacter", pourquoi: "un métier, une ville : l'annuaire officiel vous donne la liste", lien: "trouver" },
    { texte: "Regarder la présence en ligne d'un prospect", pourquoi: "cocher ce que vous constatez rend votre premier message plus juste" },
    { texte: "Demander un avis Google à un client livré", pourquoi: "les avis rassurent les prospects suivants" }];
  for (const g of generales) if (uniques.length < 3) uniques.push(g);
  return uniques.slice(0, 3);
}

/* ---------- Les chiffres ---------- */
function chiffres(prospects, docs, eur) {
  const contactes = prospects.filter(p => p.etape !== "nouveau"), gagnes = prospects.filter(p => p.etape === "gagne");
  const devis = docs.filter(d => d.type === "devis" && !/-AV\d+$/.test(d.numero || "")), an = jour().slice(0, 4);
  const encaisse = docs.filter(d => d.type === "facture" && d.statut === "paye" && String(d.paye_le || d.date || "").slice(0, 4) === an).reduce((a, d) => a + (Number(d.total_ht) || 0), 0);
  return [["Prospects", prospects.length, `${prospects.filter(p => !["gagne", "perdu"].includes(p.etape)).length} en cours`],
    ["Nouveaux contacts", prospects.filter(p => depuis(p.created_at) <= 7).length, "depuis 7 jours"],
    ["À relancer", prospects.filter(aRelancer).length, "relance prête"],
    ["Devis envoyés", devis.filter(d => ["envoye", "signe"].includes(d.statut)).length, "dont signés"],
    ["Devis acceptés", devis.filter(d => d.statut === "signe").length, "signés en ligne"],
    ["Clients signés", gagnes.length, "prospects gagnés"],
    ["Chiffre d'affaires", eur(encaisse) + " €", `encaissé en ${an}`],
    ["Taux de conversion", contactes.length ? Math.round(gagnes.length * 100 / contactes.length) + " %" : "—", "des prospects contactés"]];
}

/* ---------- La liste ---------- */
let filtre = "tous", filtreP = "";   // filtreP : "" = tous les prospecteurs, sinon un nom, ou "—" pour les prospects sans prospecteur
let filtreChoisi = false;
export async function vueProspects(c) {
  const { db, vue, esc, eur, toast, erreur, fenetre, ICO } = c;
  let prospects;
  try { prospects = await db.lister("prospects"); }
  catch (e) { vue.innerHTML = `<div class="entete"><h1>Prospects</h1></div><div class="carte"><b>La table des prospects n'existe pas encore dans votre base.</b><p class="gris" style="margin-top:6px">Passez une fois le fichier nora-schema-6-prospects.sql dans l'éditeur SQL de Supabase, puis revenez ici.</p></div>`; return; }
  const docs = await db.lister("documents").catch(() => []);
  if (!db.MODE_ESSAI && prospects.length) sansColonne = !("prospecteur" in prospects[0]);
  const tous = prospects, noms = equipe(c.P), sans = tous.some(p => !p.prospecteur);
  // à la première ouverture, la page s'ouvre sur les prospects de celui qui tient le téléphone
  if (!filtreChoisi) { filtreChoisi = true; if (moi()) filtreP = moi(); }
  if (filtreP && filtreP !== "—" && !noms.includes(filtreP) && !tous.some(p => p.prospecteur === filtreP)) filtreP = "";
  if (filtreP) prospects = tous.filter(p => filtreP === "—" ? !p.prospecteur : p.prospecteur === filtreP);
  const connus = [...new Set(noms.concat(tous.map(p => p.prospecteur).filter(Boolean)))];
  const parTete = connus.map(n => { const l = tous.filter(p => p.prospecteur === n); return [n, l.length, l.filter(p => p.etape !== "nouveau").length, l.filter(p => p.etape === "gagne").length]; });
  const actions = actionsDuJour(prospects), compte = k => prospects.filter(p => p.etape === k).length;
  const ligne = p => `<a class="ligne-liste" href="#/prospect/${p.id}"><div><b>${esc(p.entreprise || p.nom || "Sans nom")}</b><small>${esc([p.entreprise ? p.nom : "", p.metier, p.ville].filter(Boolean).join(" · "))}</small>${p.prospecteur && !filtreP ? `<small style="display:block">Prospecteur : ${esc(p.prospecteur)}</small>` : ""}</div>
    <div class="droite">${p.opposition ? '<span class="badge refuse">Ne plus contacter</span>' : aRelancer(p) ? '<span class="badge refuse">À relancer</span>' : ""} <span class="badge ${p.etape === "gagne" ? "signe" : p.etape === "perdu" ? "annule" : "envoye"}">${esc(NOM_ETAPE[p.etape] || p.etape)}</span></div></a>`;
  const liste = prospects.filter(p => filtre === "tous" ? !["gagne", "perdu"].includes(p.etape) : p.etape === filtre);
  vue.innerHTML = `
    <div class="entete"><h1>Prospects</h1><div class="actions-doc" style="margin:0"><a class="btn" href="#/prospects/trouver">Trouver des entreprises</a><button class="btn clair" id="nvP">${ICO.plus}Ajouter</button></div></div>
    ${connus.length ? `<div class="onglets defile" style="margin-bottom:12px"><a href="" data-qui="" class="${filtreP ? "" : "actif"}">Tous</a>${connus.map(n => `<a href="" data-qui="${esc(n)}" class="${filtreP === n ? "actif" : ""}">${esc(n)}</a>`).join("")}${sans ? `<a href="" data-qui="—" class="${filtreP === "—" ? "actif" : ""}">Sans prospecteur</a>` : ""}</div>` : ""}
    ${filtreP ? `<div class="carte" style="margin-bottom:16px"><label>${filtreP === "—" ? "Les prospects sans prospecteur" : "Où en est " + esc(filtreP)}</label>
      ${prospects.length ? `<div class="ligne-bilan"><span><b>Prospects</b></span><span><b>${prospects.length}</b></span></div>${ETAPES.filter(([k]) => compte(k)).map(([k, n]) => `<div class="ligne-bilan"><span>${n}</span><span>${compte(k)}</span></div>`).join("")}
      <div class="ligne-bilan"><span>À relancer aujourd'hui</span><span>${prospects.filter(aRelancer).length}</span></div>` : '<p class="gris" style="font-size:14px;margin:0">Aucun prospect pour l\'instant.</p>'}</div>` : ""}
    <div class="carte" style="margin-bottom:16px"><label>Que dois-je faire aujourd'hui pour trouver un client ?</label>
      ${actions.map((a, i) => `<${a.id ? `a href="#/prospect/${a.id}"` : `button type="button" data-gen="${a.lien || ""}"`} class="choix" style="margin-top:8px;text-decoration:none;color:inherit"><span><b>${i + 1}. ${esc(a.texte)}</b><small class="gris" style="display:block">${esc(a.pourquoi)}</small></span><span>›</span></${a.id ? "a" : "button"}>`).join("")}</div>
    <div class="actions-doc" style="margin-top:0"><button class="btn clair" id="recu">Répondre à un message reçu</button></div>
    ${encadreColonne(esc)}
    <div class="carte" style="margin-bottom:16px"><label>Les prospecteurs</label>
      <div><div class="champ"><label>Sur ce téléphone, je suis</label><select id="pMoi"><option value="">Personne en particulier</option>${connus.map(n => `<option ${moi() === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></div></div>
      ${parTete.length ? `<div class="ligne-bilan"><span class="gris">Prospecteur</span><span class="gris">prospects · contactés · gagnés</span></div>${parTete.map(([n, a, b, g]) => `<div class="ligne-bilan"><span>${esc(n)}</span><span>${a} · ${b} · ${g}</span></div>`).join("")}` : '<p class="gris" style="font-size:14px;margin:0 0 10px">Ajoutez le nom de chaque personne qui prospecte : ses prospects seront rangés à son nom.</p>'}
      <button class="btn discret petit-btn" id="pEquipe" style="margin-top:10px">Gérer les prospecteurs</button></div>
    <div class="stats">${chiffres(prospects, docs, eur).map(([n, v, s]) => `<div class="stat"><span class="petit">${n}</span><b>${v}</b><small class="gris">${s}</small></div>`).join("")}</div>
    <div class="onglets defile"><a href="" data-f="tous" class="${filtre === "tous" ? "actif" : ""}">En cours</a>${ETAPES.map(([k, n]) => `<a href="" data-f="${k}" class="${filtre === k ? "actif" : ""}">${n}${compte(k) ? " · " + compte(k) : ""}</a>`).join("")}</div>
    <div class="liste">${liste.map(ligne).join("") || `<p class="vide">${prospects.length ? "Aucun prospect à cette étape." : "Aucun prospect pour l'instant. Commencez par « Trouver des entreprises » : un métier, une ville, et vous choisissez qui contacter."}</p>`}</div>`;
  vue.querySelectorAll("[data-f]").forEach(a => a.onclick = e => { e.preventDefault(); filtre = a.dataset.f; vueProspects(c); });
  const ajouter = () => formulaire(c, {}, p => { location.hash = "#/prospect/" + p.id; });
  document.getElementById("nvP").onclick = ajouter;
  vue.querySelectorAll('[data-gen="trouver"]').forEach(b => b.onclick = () => { location.hash = "#/prospects/trouver"; });
  document.getElementById("recu").onclick = () => lireMessage(c, null, prospects);
  document.getElementById("pMoi").onchange = e => { jeSuis(e.target.value); filtreP = e.target.value; toast(e.target.value ? `Les nouveaux prospects seront au nom de ${e.target.value}` : "Les nouveaux prospects n'auront pas de prospecteur"); vueProspects(c); };
  vue.querySelectorAll("[data-qui]").forEach(a => a.onclick = e => { e.preventDefault(); filtreP = a.dataset.qui; vueProspects(c); });
  document.getElementById("pEquipe").onclick = () => gererEquipe(c, () => vueProspects(c));
  brancherColonne(vue, toast);
}

/* ---------- Le formulaire d'un prospect ---------- */
function formulaire(c, p, apres) {
  const { db, esc, toast, erreur, fenetre } = c;
  const champ = (n, l, t = "text", attr = "") => `<div class="champ"><label>${l}</label><input type="${t}" name="${n}" value="${esc(p[n] || "")}" ${attr}></div>`;
  const f = fenetre(p.id ? "Modifier le prospect" : "Nouveau prospect", `<form id="fp">
    ${champ("entreprise", "Entreprise")}${champ("nom", "Nom de la personne")}${champ("metier", "Métier", "text", 'placeholder="ex. plombier, peintre, nettoyage"')}
    ${champ("email", "E-mail", "email")}${champ("tel", "Téléphone (facultatif)", "tel")}${champ("site", "Site internet", "text", 'placeholder="s\'il en a un"')}${champ("ville", "Ville")}
    ${champ("source", "D'où vient ce prospect ?", "text", 'placeholder="ex. recherche Google, bouche-à-oreille, Instagram"')}
    <div class="champ"><label>Besoin identifié</label><textarea name="besoin" rows="2">${esc(p.besoin || "")}</textarea></div>
    <div class="champ"><label>Offre recommandée</label><select name="offre"><option value="">À voir</option>${OFFRES.map(o => `<option ${p.offre === o ? "selected" : ""}>${o}</option>`).join("")}</select></div>
    <p class="gris" style="font-size:13px;margin:-2px 0 12px">Ne notez que des coordonnées que l'entreprise a rendues publiques ou qu'elle vous a données.</p>
    <button class="btn" style="width:100%">Enregistrer</button></form>`);
  f.el.querySelector("#fp").onsubmit = async e => {
    e.preventDefault(); const o = {}; e.target.querySelectorAll("[name]").forEach(i => { o[i.name] = i.value.trim() || null; });
    if (!o.entreprise && !o.nom) return toast("Indiquez au moins l'entreprise ou le nom.");
    try { const n = await garder(c, { etape: "nouveau", historique: [], constats: [], opposition: false, ...(p.id || !moi() ? {} : { prospecteur: moi() }), ...p, ...o }); f.fermer(); toast("Prospect enregistré ✓"); apres(n); } catch (er) { erreur(er); }
  };
}

/* ---------- La fiche ---------- */
export async function vueProspect(c, id) {
  const { db, vue, esc, toast, erreur, P, ICO } = c;
  const p = await db.lire("prospects", id);
  if (!p) { vue.innerHTML = '<p class="vide">Ce prospect n\'existe plus.</p>'; return; }
  if (!db.MODE_ESSAI) sansColonne = !("prospecteur" in p);
  p.historique = p.historique || []; p.constats = p.constats || [];
  const maj = async (champs, msg) => { Object.assign(p, champs); try { await garder(c, { ...p }); if (msg) toast(msg); } catch (e) { erreur(e); } vueProspect(c, id); };
  const noms = [...new Set(equipe(P).concat(p.prospecteur ? [p.prospecteur] : []))];
  const n = nbRelances(p), relance = aRelancer(p);
  const conseil = p.opposition ? "Ne plus le contacter : il l'a demandé." : p.etape === "nouveau" ? "Envoyer le premier e-mail."
    : p.etape === "contacte" ? (relance ? `Envoyer la ${["première", "deuxième", "dernière"][n]} relance.` : n >= 3 ? "Trois relances sans réponse : le classer en « Client perdu »." : (j => `Attendre sa réponse (relance possible ${j <= 1 ? "demain" : "dans " + j + " jours"}).`)(DELAIS[n] - depuis(dernierContact(p) || p.created_at)))
    : p.etape === "reponse" ? "Lire sa réponse et comprendre son besoin." : p.etape === "besoin" ? "Envoyer la proposition commerciale."
    : p.etape === "proposition" || p.etape === "decision" ? (relance ? "Le relancer avec courtoisie." : "Attendre sa décision.") : p.etape === "gagne" ? "Créer sa fiche client et préparer son devis." : "Rien : ce prospect est classé.";
  const histo = [...p.historique].reverse();
  vue.innerHTML = `
    <div class="entete"><div><div class="petit">Prospect${p.source ? " · " + esc(p.source) : ""}</div><h1>${esc(p.entreprise || p.nom || "Sans nom")}</h1>
      <p class="gris">${esc([p.entreprise ? p.nom : "", p.metier, p.ville].filter(Boolean).join(" · "))}</p></div><span class="badge ${p.etape === "gagne" ? "signe" : p.etape === "perdu" ? "annule" : "envoye"}">${esc(NOM_ETAPE[p.etape] || p.etape)}</span></div>
    <div class="deux-col"><div>
      <div class="carte" style="margin-bottom:12px;border-left:3px solid var(--violet)"><label>Prochaine action</label><p style="margin:4px 0 12px"><b>${esc(conseil)}</b></p>
        ${p.opposition ? `<button class="btn discret petit-btn" id="annOpp">Annuler : il accepte de nouveau les messages</button>` : `<div class="actions-doc" style="margin:0">
          <button class="btn" id="msg">Préparer un message</button><button class="btn clair" id="recu">Il m'a répondu</button><button class="btn clair" id="propo">Proposition en PDF</button>
          ${p.client_id ? `<a class="btn clair" href="#/client/${p.client_id}">Sa fiche client</a>` : `<button class="btn clair" id="versClient">Passer en client</button>`}</div>`}</div>
      <div class="carte" style="margin-bottom:12px"><label>Où en est-il</label>
        <div class="palette">${ETAPES.map(([k, nom]) => `<button class="btn ${p.etape === k ? "" : "discret"} petit-btn" data-etape="${k}">${nom}</button>`).join("")}</div></div>
      <div class="carte" style="margin-bottom:12px"><label>Ce que vous notez pour la suite</label>
        <div class="champ"><input type="text" id="pAction" value="${esc(p.prochaine_action || "")}" placeholder="ex. envoyer la vidéo de démonstration"></div>
        <div class="champ" style="margin-bottom:0"><label>Pour le</label><input type="date" id="pDate" value="${esc(p.prochaine_date || "")}"></div></div>
      <div class="carte" style="margin-bottom:12px"><label>Sa présence en ligne (site, fiche Google, réseaux sociaux), d'après ce que vous avez vu</label>
        ${CONSTATS.map(([k, nom]) => `<label style="display:flex;gap:10px;align-items:center;margin:8px 0 0;text-transform:none;letter-spacing:0;font-weight:400;font-size:15px;color:inherit"><input type="checkbox" data-constat="${k}" ${p.constats.includes(k) ? "checked" : ""} style="width:20px;height:20px">${nom}</label>`).join("")}
        <p class="gris" style="font-size:13px;margin:10px 0 0">Offre conseillée : <b>${esc(offreConseillee(p))}</b>${p.offre ? "" : " (d'après son besoin ; se règle dans la fiche)"}</p></div>
    </div><div>
      ${encadreColonne(esc)}
      <div class="carte" style="margin-bottom:12px"><label>Son prospecteur</label><select id="pQui"><option value="">Personne en particulier</option>${noms.map(n => `<option ${p.prospecteur === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></div>
      <div class="carte" style="margin-bottom:12px"><div class="entete" style="margin:0 0 6px"><label style="margin:0">Sa fiche</label><button class="btn discret petit-btn" id="modif">Modifier</button></div>
        ${[["E-mail", p.email], ["Téléphone", p.tel], ["Site internet", p.site], ["Besoin", p.besoin], ["Offre recommandée", p.offre], ["Dernière relance", p.derniere_relance ? dateCourte(p.derniere_relance) : ""]].filter(x => x[1]).map(([k, v]) => `<div class="ligne-bilan"><span class="gris">${k}</span><span style="text-align:right;white-space:pre-line">${esc(v)}</span></div>`).join("") || '<p class="gris">Aucune coordonnée pour l\'instant.</p>'}</div>
      <div class="carte" style="margin-bottom:12px"><div class="entete" style="margin:0 0 6px"><label style="margin:0">Historique des échanges</label><button class="btn discret petit-btn" id="note">Ajouter une note</button></div>
        ${histo.map(h => `<div class="ligne-bilan"><span><small class="gris">${dateCourte(h.d)} · ${h.t === "envoi" ? "envoyé" : h.t === "recu" ? "reçu" : "note"}${h.par ? " · " + esc(h.par) : ""}</small><span style="display:block;white-space:pre-line">${esc(h.texte)}</span></span></div>`).join("") || '<p class="gris">Rien pour l\'instant.</p>'}</div>
      <div class="actions-doc">${p.opposition ? "" : `<button class="btn discret" id="opp">Il ne veut plus être contacté</button>`}<button class="btn danger" id="suppr">${ICO.poubelle}Supprimer</button></div>
    </div></div>`;
  const el = i => document.getElementById(i);
  vue.querySelectorAll("[data-etape]").forEach(b => b.onclick = () => maj({ etape: b.dataset.etape }, `Passé en « ${NOM_ETAPE[b.dataset.etape]} » ✓`));
  vue.querySelectorAll("[data-constat]").forEach(b => b.onchange = () => maj({ constats: [...vue.querySelectorAll("[data-constat]:checked")].map(x => x.dataset.constat) }));
  el("pAction").onchange = e => maj({ prochaine_action: e.target.value.trim() || null }, "Noté ✓");
  el("pDate").onchange = e => maj({ prochaine_date: e.target.value || null }, "Noté ✓");
  el("modif").onclick = () => formulaire(c, p, () => vueProspect(c, id));
  el("note").onclick = () => { const f = c.fenetre("Ajouter une note", `<textarea id="nt" rows="4" style="width:100%"></textarea><button class="btn" id="ok" style="width:100%;margin-top:12px">Enregistrer</button>`);
    f.el.querySelector("#ok").onclick = () => { const t = f.el.querySelector("#nt").value.trim(); f.fermer(); if (t) maj({ historique: [...p.historique, { par: moi(), d: jour(), t: "note", texte: t }] }, "Note ajoutée ✓"); }; };
  if (el("msg")) el("msg").onclick = () => choisir(c, p, () => vueProspect(c, id));
  if (el("recu")) el("recu").onclick = () => lireMessage(c, p, null, () => vueProspect(c, id));
  // la proposition en PDF : la formule conseillée (ou celle de la fiche), son besoin, et ce qui a été constaté de sa présence en ligne
  if (el("propo")) el("propo").onclick = async () => { el("propo").disabled = true;
    try { const m = await import(`./proposition.js?v=${c.V || ""}`), r = await m.telechargerProposition(p, P, offreConseillee(p), constatsTxt(p));
      if (r !== "annulee") toast(r === "partagee" ? "Proposition partagée ✓" : "Proposition téléchargée ✓"); } catch (e) { erreur(e); }
    el("propo").disabled = false; };
  if (el("opp")) el("opp").onclick = () => maj({ opposition: true, etape_avant: p.etape, etape: "perdu", historique: [...p.historique, { par: moi(), d: jour(), t: "note", texte: "Ne veut plus être contacté." }] }, "Noté : plus aucun message pour lui");
  if (el("annOpp")) el("annOpp").onclick = () => maj({ opposition: false, etape: p.etape_avant || "contacte" }, "Annulé");
  el("pQui").onchange = async e => { const n = e.target.value || null; Object.assign(p, { prospecteur: n });
    try { await garder(c, { ...p }); toast(sansColonne ? "Le prospecteur n'a pas pu être enregistré : voyez l'encadré" : n ? `Confié à ${n} ✓` : "Sans prospecteur"); } catch (er) { erreur(er); }
    vueProspect(c, id); };
  brancherColonne(vue, toast);
  // « Passer en client » : sa fiche client est créée, il est classé en « Client gagné », et les deux fiches sont reliées
  if (el("versClient")) el("versClient").onclick = async () => { try { const cl = await db.enregistrer("clients", { nom: p.nom || p.entreprise, societe: p.entreprise || null, tel: p.tel || null, email: p.email || null, ville: p.ville || null, notes: [p.metier, p.besoin].filter(Boolean).join(" · ") || null, archive: false });
    await maj({ client_id: cl.id, etape_avant: p.etape === "gagne" ? p.etape_avant : p.etape, etape: "gagne", historique: [...p.historique, { par: moi(), d: jour(), t: "note", texte: "Passé en client." }] }, "Il est maintenant dans vos clients ✓"); } catch (e) { erreur(e); } };
  el("suppr").onclick = async () => { if (!(await c.confirmer(`Supprimer ${p.entreprise || p.nom} ? Son historique sera perdu.`, "Supprimer"))) return;
    try { await db.supprimer("prospects", id); toast("Prospect supprimé"); location.hash = "#/prospects"; } catch (e) { erreur(e); } };
}

/* ---------- Choisir, relire, modifier, copier ---------- */
function choisir(c, p, apres, cle) {
  const l = messages(p, c.P);
  if (cle) return montrer(c, p, l.find(m => m[0] === cle) || l[0], apres);
  const suggere = p.etape === "nouveau" ? "premier" : aRelancer(p) ? ["relance1", "relance2", "relance3"][nbRelances(p)] : p.etape === "besoin" ? "proposition" : null;
  const f = c.fenetre("Quel message ?", l.map(m => `<button class="choix" data-m="${m[0]}"><span><b>${c.esc(m[1])}</b>${m[0] === suggere ? '<small class="gris" style="display:block">conseillé maintenant</small>' : ""}</span><span>›</span></button>`).join(""));
  f.el.onclick = e => { const b = e.target.closest("[data-m]"); if (!b) return; f.fermer(); montrer(c, p, l.find(m => m[0] === b.dataset.m), apres); };
}
function montrer(c, p, [cle, nom, sujet, texte], apres) {
  const { esc, toast, db, erreur } = c, tel = String(p.tel || "").replace(/\D/g, "").replace(/^0/, "33");
  const f = c.fenetre(nom, `${sujet ? `<p class="gris" style="font-size:13px;margin:0 0 6px">Objet : <b id="suj">${esc(sujet)}</b></p>` : ""}
    <textarea id="txt" rows="12" readonly style="width:100%;font:inherit;background:var(--pierre)">${esc(texte)}</textarea>
    <div class="actions-doc" style="margin:12px 0 0">${p.id && p.email && !p.opposition && cle !== "whatsapp" ? '<button class="btn" id="partir" hidden>Envoyer par e-mail</button>' : ""}<button class="btn" id="copier">Copier</button><button class="btn clair" id="modifier">Modifier</button>
      ${p.email ? '<button class="btn clair" id="mail">Ouvrir dans mes e-mails</button>' : ""}${cle === "whatsapp" && tel.length >= 10 ? '<button class="btn clair" id="wa">Ouvrir WhatsApp</button>' : ""}
      ${cle === "ia" ? "" : '<button class="btn clair" id="ia" hidden>Adapter avec l\'assistant IA</button><button class="btn discret" id="iaRetour" hidden>Revenir au message type</button>'}</div>
    ${p.id ? `<button class="btn discret" id="envoye" style="width:100%;margin-top:10px">Je l'ai envoyé : le noter dans l'historique</button>` : ""}
    <p class="gris" style="font-size:13px;margin:10px 0 0">Rien ne part tout seul : c'est vous qui envoyez.</p>`);
  const t = f.el.querySelector("#txt"), q = s => f.el.querySelector(s);
  q("#modifier").onclick = () => { t.readOnly = false; t.style.background = "#fff"; t.focus(); };
  q("#copier").onclick = () => navigator.clipboard.writeText(t.value).then(() => toast("Message copié ✓"), () => { t.readOnly = false; t.select(); toast("Sélectionné : copiez-le à la main"); });
  if (q("#mail")) q("#mail").onclick = () => { location.href = `mailto:${p.email}?subject=${encodeURIComponent(sujet || "")}&body=${encodeURIComponent(t.value)}`; };
  if (q("#wa")) q("#wa").onclick = () => window.open(`https://wa.me/${tel}?text=${encodeURIComponent(t.value)}`, "_blank");
  if (q("#ia")) { const type = { sujet, texte }, objet = v => { sujet = v; if (q("#suj")) q("#suj").textContent = v; };
    iaDispo(db).then(ok => { if (ok && q("#ia")) q("#ia").hidden = false; });
    q("#ia").onclick = async e => { const b = e.currentTarget; b.disabled = true; b.textContent = "L'assistant écrit…";
      try { const r = await db.assistant({ action: "ecrire", objet: sujet || "", texte: t.value, prospect: ficheIA(p), donnees: donneesIA(p, c.P) });
        t.value = r.texte; if (r.objet && type.sujet) objet(r.objet); q("#iaRetour").hidden = false; toast("Adapté par l'assistant IA : relisez avant d'envoyer"); }
      catch (er) { toast(er.message || "L'assistant IA ne répond pas."); }
      b.disabled = false; b.textContent = "Adapter avec l'assistant IA"; };
    q("#iaRetour").onclick = () => { t.value = type.texte; objet(type.sujet); q("#iaRetour").hidden = true; toast("Message type remis"); }; }
  // noter l'envoi dans l'historique, et faire avancer l'étape
  const noter = async (comment, dit) => {
    const relance = /^relance/.test(cle), etape = cle === "premier" && p.etape === "nouveau" ? "contacte" : cle === "proposition" ? "proposition" : p.etape;
    try { await garder(c, { ...p, etape, historique: [...(p.historique || []), { par: moi(), d: jour(), t: "envoi", texte: nom + comment }], ...(relance ? { derniere_relance: jour() } : {}) }); f.fermer(); toast(dit); apres && apres(); } catch (e) { erreur(e); }
  };
  if (q("#envoye")) q("#envoye").onclick = () => noter("", "Noté dans l'historique ✓");
  if (q("#partir")) { courrierDispo(db).then(ok => { if (ok && q("#partir")) { q("#partir").hidden = false; q("#copier").classList.add("clair"); } });
    q("#partir").onclick = async e => { const b = e.currentTarget, objet = sujet || "Votre site internet";
      if (!t.value.trim()) return toast("Le message est vide.");
      if (!await c.confirmer(`Envoyer ce message à ${p.email}, depuis la boîte de Nora Éditions ?`, "Envoyer")) return;
      b.disabled = true; b.textContent = "Envoi…";
      try { await db.courrier({ action: "envoyer", a: p.email, objet, texte: t.value }); await noter(" (envoyé par e-mail)", "Message envoyé ✓"); }
      catch (er) { b.disabled = false; b.textContent = "Envoyer par e-mail"; toast(er.message || "Le message n'est pas parti."); } }; }
}

/* ---------- « Il m'a répondu » : coller le message, lire l'analyse, préparer la réponse ---------- */
function lireMessage(c, p, prospects, apres) {
  const { esc, toast, db, erreur } = c;
  const f = c.fenetre("Message reçu", `${p ? "" : `<div class="champ"><label>De quel prospect ?</label><select id="qui"><option value="">Je ne sais pas encore</option>${(prospects || []).filter(x => !["gagne", "perdu"].includes(x.etape)).map(x => `<option value="${x.id}">${esc(x.entreprise || x.nom)}</option>`).join("")}</select></div>`}
    <div class="champ"><label>Collez ici le message que vous avez reçu</label><textarea id="recuTxt" rows="6" style="width:100%"></textarea></div>
    <button class="btn" id="lire" style="width:100%">Lire ce message</button><div id="analyse" style="margin-top:14px"></div>`);
  f.el.querySelector("#lire").onclick = () => {
    const texte = f.el.querySelector("#recuTxt").value.trim(); if (!texte) return toast("Collez d'abord le message.");
    const qui = p || (prospects || []).find(x => x.id === f.el.querySelector("#qui")?.value) || null, a = analyser(texte);
    const ligne = (k, v) => `<div class="ligne-bilan"><span class="gris">${k}</span><span style="text-align:right">${esc(v)}</span></div>`;
    const q = s => f.el.querySelector(s), recu = { par: moi(), d: jour(), t: "recu", texte: texte.slice(0, 2000) };
    const garde = async plus => { try { await garder(c, { ...qui, historique: [...(qui.historique || []), recu], etape: ["nouveau", "contacte"].includes(qui.etape) ? "reponse" : qui.etape, ...plus }); return true; } catch (e) { erreur(e); return false; } };
    // l : la lecture à montrer ; ia : la réponse de l'assistant IA, quand c'est lui qui a lu
    const afficher = (l, ia) => {
      q("#analyse").innerHTML = `<div class="carte" style="box-shadow:none;background:var(--pierre)">
      ${ligne("Ce qu'il recherche", l.situation)}${ligne("Son intérêt", l.interet)}${ligne("Ses objections", l.objections.join(" ; ") || "aucune repérée")}${ligne("La suite", l.suite)}
      <div class="actions-doc" style="margin:12px 0 0">${l.stop ? (qui ? '<button class="btn" id="bloquer">Noter son refus : plus aucun message</button>' : "") : `<button class="btn" id="rep">${ia ? "Voir la réponse proposée" : l.cle ? "Préparer la réponse" : "Choisir une réponse"}</button>`}
        ${qui ? '<button class="btn clair" id="garder">Garder ce message dans l\'historique</button>' : ""}${ia ? "" : '<button class="btn clair" id="iaLire" hidden>Demander à l\'assistant IA</button>'}</div>
      <p class="gris" style="font-size:13px;margin:10px 0 0">${ia ? "Lecture faite par l'assistant IA, qui peut se tromper : relisez le message, c'est vous qui décidez." : "Cette lecture repère des mots, elle peut se tromper : relisez le message, c'est vous qui décidez."}</p></div>`;
      if (q("#garder")) q("#garder").onclick = async () => { if (await garde({})) { f.fermer(); toast("Message gardé ✓"); apres && apres(); } };
      if (q("#bloquer")) q("#bloquer").onclick = async () => { if (await garde({ opposition: true, etape_avant: qui.etape, etape: "perdu" })) { f.fermer(); toast("Noté : plus aucun message pour lui"); apres ? apres() : (location.hash = "#/prospect/" + qui.id); } };
      if (q("#rep")) q("#rep").onclick = async () => { const cible = qui ? { ...qui, historique: [...(qui.historique || []), recu] } : { nom: "", metier: "", historique: [] }; if (qui) await garde({}); f.fermer();
        ia ? montrer(c, cible, ["ia", "Réponse proposée par l'assistant IA", ia.objet || "", ia.reponse], apres) : choisir(c, cible, apres, l.cle || undefined); };
      if (q("#iaLire")) { iaDispo(db).then(ok => { if (ok && q("#iaLire")) q("#iaLire").hidden = false; });
        q("#iaLire").onclick = async e => { const b = e.currentTarget; b.disabled = true; b.textContent = "L'assistant lit le message…";
          try { const r = await db.assistant({ action: "lire", texte, prospect: ficheIA(qui || {}), donnees: donneesIA(qui || {}, c.P) });
            afficher({ stop: !!r.refus, situation: r.recherche || "", interet: INTERETS[r.interet] || r.interet || "", objections: r.objections || [], suite: r.suite || "", cle: null }, r); }
          catch (er) { b.disabled = false; b.textContent = "Demander à l'assistant IA"; toast(er.message || "L'assistant IA ne répond pas."); } }; }
    };
    afficher(a, null);
  };
}

/* ---------- Les prospecteurs : leurs noms (retirer un nom ne touche pas à ses prospects) ---------- */
function gererEquipe(c, apres) {
  const { esc, toast, erreur, db, P } = c;
  const f = c.fenetre("Les prospecteurs", '<div id="eq"></div><div class="champ" style="margin-top:12px"><label>Ajouter un prospecteur</label><input type="text" id="eqNom" placeholder="Son prénom, ou son nom"></div><button class="btn" id="eqOk" style="width:100%">Ajouter</button>');
  const dessiner = () => { f.el.querySelector("#eq").innerHTML = equipe(P).map((n, i) => `<div class="ligne-bilan" style="align-items:center"><span>${esc(n)}</span><button class="btn discret petit-btn" data-retirer="${i}">Retirer</button></div>`).join("") || '<p class="gris">Aucun prospecteur pour l\'instant.</p>'; };
  const sauver = async l => { P.prospecteurs = l; try { await db.enregistrerParametres(P); } catch (e) { erreur(e); } dessiner(); apres && apres(); };
  f.el.querySelector("#eqOk").onclick = () => { const z = f.el.querySelector("#eqNom"), n = z.value.trim(); if (!n) return; if (equipe(P).includes(n)) return toast("Ce nom est déjà dans la liste."); z.value = ""; sauver([...equipe(P), n]); };
  f.el.querySelector("#eq").onclick = e => { const b = e.target.closest("[data-retirer]"); if (!b) return; const l = equipe(P), n = l[+b.dataset.retirer]; if (moi() === n) jeSuis(""); sauver(l.filter((x, i) => i !== +b.dataset.retirer)); };
  dessiner();
}
