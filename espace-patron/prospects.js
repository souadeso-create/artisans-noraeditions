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
const CONSTATS = [["pas_de_site", "Pas de site internet", "je n'ai pas trouvé de site internet pour votre entreprise"],
  ["pas_mobile", "Site peu lisible sur téléphone", "votre site est difficile à lire sur un téléphone"],
  ["pas_fiche", "Pas de fiche Google", "je n'ai pas trouvé de fiche Google à jour pour votre entreprise"],
  ["pas_devis", "Pas de demande de devis en ligne", "vos clients ne peuvent pas vous envoyer une demande de devis depuis votre site"],
  ["site_ancien", "Site ancien", "votre site semble dater un peu"]];
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
async function garder(c, ligne) {
  try { return await c.db.enregistrer("prospects", ligne); }
  catch (e) { if (!/prospecteur/.test(String(e?.message || e))) throw e; const { prospecteur, ...sans } = ligne; c.toast("Enregistré sans le prospecteur : la colonne manque dans la base (nora-schema-7-prospecteurs.sql)"); return await c.db.enregistrer("prospects", sans); }
}
const depuis = d => d ? Math.max(0, Math.round((new Date(jour() + "T12:00") - new Date(String(d).slice(0, 10) + "T12:00")) / 864e5)) : 999;   // en jours entiers, de date à date
const dateCourte = d => new Date(String(d).slice(0, 10) + "T12:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const prenom = p => String(p.nom || "").trim().split(" ")[0];
const bonjour = p => p.nom ? `Bonjour ${prenom(p)},` : "Bonjour,";
const offreConseillee = p => p.offre || (/appli|devis|factur|rendez|agenda|tableau/i.test(p.besoin || "") ? "Pro" : /assistant|ia\b|intelligence/i.test(p.besoin || "") ? "Pro + IA" : "Essentiel");
const dernierContact = p => (p.historique || []).filter(h => h.t === "envoi").map(h => h.d).sort().pop() || null;
const nbRelances = p => (p.historique || []).filter(h => h.t === "envoi" && /relance/i.test(h.texte || "")).length;

/* ---------- Les messages ---------- */
function signature(P) { return `${P.entreprise || "Nora Éditions"}\n${P.site || "creation-site-internet.noraeditions.fr"}${P.email ? "\n" + P.email : ""}`; }
const REFUS = "Si vous ne souhaitez plus recevoir de message de ma part, dites-le-moi simplement : je n'insisterai pas.";
function constatsTxt(p) {
  const l = CONSTATS.filter(c => (p.constats || []).includes(c[0])).map(c => c[2]);
  return l.length ? `En regardant votre présence en ligne, j'ai remarqué que ${l.join(", et que ")}. ` : "";
}
export function messages(p, P) {
  const o = offreConseillee(p), ent = p.entreprise ? ` pour ${p.entreprise}` : "", sig = signature(P), m = (p.metier || "votre métier").toLowerCase();
  return [
    ["premier", "Premier e-mail", `Un site internet${ent}`,
      `${bonjour(p)}\n\nJe m'appelle Nora, je crée des sites internet pour les artisans et les indépendants. ${accroche(p.metier)}\n\n${constatsTxt(p)}Je peux vous préparer un site sur mesure, bien référencé sur Google, à partir de 190 €. Tout se fait par écrit, à votre rythme : vous voyez le résultat avant de payer le solde.\n\nSi cela vous intéresse, répondez simplement à ce message et je vous envoie un exemple.\n\n${REFUS}\n\n${sig}`],
    ["whatsapp", "Message WhatsApp (en réponse à quelqu'un qui vous a écrit)", "",
      `${bonjour(p)} merci pour votre message ! Je crée des sites internet pour les professionnels comme vous (${m}), à partir de 190 €. Dites-moi ce dont vous avez besoin, et je vous réponds par écrit avec un exemple. ${P.entreprise || "Nora Éditions"}`],
    ["relance1", "Première relance", `Votre site internet${ent}`,
      `${bonjour(p)}\n\nJe me permets de revenir vers vous au sujet de mon message de l'autre jour, sur la création d'un site internet${ent}. Peut-être n'était-ce pas le bon moment.\n\nSi vous voulez voir à quoi cela ressemble, je vous envoie une courte vidéo de démonstration : il suffit de me répondre.\n\n${REFUS}\n\n${sig}`],
    ["relance2", "Deuxième relance", `Un exemple de site${ent}`,
      `${bonjour(p)}\n\nUn dernier mot avant de vous laisser tranquille : je peux vous montrer un exemple de site pour ${m}, sans engagement. Il n'y a rien à préparer de votre côté.\n\nUn simple « oui » en réponse suffit.\n\n${REFUS}\n\n${sig}`],
    ["relance3", "Dernière relance, courtoise", `Je ne vous dérange plus`,
      `${bonjour(p)}\n\nSans réponse de votre part, je ne vous écrirai plus. Si un jour vous avez besoin d'un site internet, vous savez où me trouver : ${P.site || "creation-site-internet.noraeditions.fr"}.\n\nJe vous souhaite une belle continuation.\n\n${sig}`],
    ["prix", "Réponse : il demande le prix", "Nos tarifs",
      `${bonjour(p)}\n\nMerci pour votre message. Voici nos formules :\n\n• Essentiel : ${PRIX.Essentiel}. C'est ${CONTENU.Essentiel}.\n• Pro : ${PRIX.Pro}. C'est ${CONTENU.Pro}.\n• Pro + IA : ${PRIX["Pro + IA"]}. C'est ${CONTENU["Pro + IA"]}.\n\nUn acompte de 10 % lance le travail, et le solde se règle après votre validation finale, en une fois ou en 3 fois sans frais. L'abonnement est sans engagement.\n\nPour ${m}, je vous conseillerais la formule ${o}. Dites-moi ce qui compte le plus pour vous, et je vous prépare une proposition.\n\n${sig}`],
    ["cher", "Réponse : il trouve cela trop cher", "Votre site internet",
      `${bonjour(p)}\n\nJe comprends tout à fait, c'est une dépense qui se réfléchit. La formule Essentiel est à ${PRIX.Essentiel} : elle comprend ${CONTENU.Essentiel}. Le solde se règle après votre validation, en 3 fois sans frais si vous le souhaitez, et vous pourrez passer à une formule plus complète plus tard.\n\nSi cela vous aide, je vous montre d'abord un exemple, sans engagement.\n\n${sig}`],
    ["reflechir", "Réponse : il veut réfléchir", "Votre projet de site",
      `${bonjour(p)}\n\nBien sûr, prenez le temps qu'il vous faut. Pour vous aider à décider, je peux vous envoyer une courte vidéo de démonstration et une proposition écrite, que vous lirez quand vous voudrez.\n\nJe reste disponible par écrit pour toutes vos questions.\n\n${sig}`],
    ["compare", "Réponse : il compare plusieurs prestataires", "Votre projet de site",
      `${bonjour(p)}\n\nVous avez raison de comparer. Voici ce que nous faisons, pour que vous puissiez juger : un site dessiné sur mesure, son référencement sur Google et la fiche Google dans toutes les formules, les rendus montrés avant la mise en ligne, le solde réglé après votre validation finale, et un abonnement sans engagement.\n\nJe vous envoie une proposition écrite si vous le souhaitez : vous la comparerez tranquillement.\n\n${sig}`],
    ["vitrine", "Réponse : il veut seulement un site vitrine", "Votre site vitrine",
      `${bonjour(p)}\n\nC'est exactement la formule Essentiel : ${CONTENU.Essentiel}, pour ${PRIX.Essentiel}.\n\nPour commencer, il me faut seulement quelques informations sur votre activité. Je vous envoie un court questionnaire si vous êtes d'accord.\n\n${sig}`],
    ["appli", "Réponse : il veut une application métier", "Votre tableau de bord",
      `${bonjour(p)}\n\nC'est la formule Pro : ${CONTENU.Pro}, pour ${PRIX.Pro}. Vos devis et vos factures se génèrent automatiquement en PDF, et vos clients signent en ligne.\n\nJe peux vous envoyer une courte vidéo qui montre le tableau de bord sur un téléphone. Dites-moi ce que vous aimeriez y trouver pour ${m}.\n\n${sig}`],
    ["proposition", "Proposition commerciale (texte)", `Votre proposition${ent}`,
      `${bonjour(p)}\n\nSuite à nos échanges, voici ma proposition${ent}.\n\nVotre besoin : ${p.besoin || "un site internet qui vous fasse trouver par vos clients"}.\n\nCe que je vous propose : la formule ${o}, soit ${CONTENU[o]}.\n\nLe prix : ${PRIX[o]}.\n\nLa suite : vous remplissez un court questionnaire, je vous envoie le devis à signer en ligne, un acompte de 10 % lance le travail, je vous montre le résultat, vous demandez vos ajustements, puis vous validez. Le solde se règle à ce moment-là, en une fois ou en 3 fois sans frais. L'abonnement est sans engagement.\n\nLe délai : environ une semaine après réception de vos textes et de vos photos.\n\nSi cette proposition vous convient, répondez-moi simplement « d'accord » et je vous envoie le questionnaire.\n\n${sig}`],
  ];
}

/* ---------- Lire un message reçu : ce qu'il cherche, son intérêt, ses objections, la réponse, la suite ---------- */
const SITUATIONS = [
  ["stop", /\bne (plus |pas )?(me |nous |m.)?\s?(plus |pas )?(re)?(contacte|écri|ecri|relance|dérange|derange|sollicite|envoye)[a-zé]* (plus|pas)\b|\bne (plus|pas) (me |nous |m.)?\s?(re)?(contacte|écri|ecri|relance|dérange|derange|sollicite)|^\s*stop\b|\bstop\s*[.!]*\s*$|désinscri|desinscri|plus (de|aucun) (message|mail|e-mail|courriel)|pas int[ée]ress|arr[êe]te(z)? de|cessez|retire(z|r)[- ](moi|mon|mes)|laisse(z)?[- ]moi tranquille|m.oppose/i, "Il ne veut plus être contacté", "Respecter son refus tout de suite, et ne plus lui écrire."],
  ["cher", /trop cher|cher pour|pas les moyens|budget|hors de prix|moins cher|co[ûu]te trop/i, "Il trouve l'offre trop chère", "Proposer la formule Essentiel et le paiement en 3 fois, puis un exemple."],
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
export async function vueProspects(c) {
  const { db, vue, esc, eur, toast, erreur, fenetre, ICO } = c;
  let prospects;
  try { prospects = await db.lister("prospects"); }
  catch (e) { vue.innerHTML = `<div class="entete"><h1>Prospects</h1></div><div class="carte"><b>La table des prospects n'existe pas encore dans votre base.</b><p class="gris" style="margin-top:6px">Passez une fois le fichier nora-schema-6-prospects.sql dans l'éditeur SQL de Supabase, puis revenez ici.</p></div>`; return; }
  const docs = await db.lister("documents").catch(() => []);
  const tous = prospects, noms = equipe(c.P), sans = tous.some(p => !p.prospecteur);
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
    <div class="carte" style="margin-bottom:16px"><label>Que dois-je faire aujourd'hui pour trouver un client ?</label>
      ${actions.map((a, i) => `<${a.id ? `a href="#/prospect/${a.id}"` : `button type="button" data-gen="${a.lien || ""}"`} class="choix" style="margin-top:8px;text-decoration:none;color:inherit"><span><b>${i + 1}. ${esc(a.texte)}</b><small class="gris" style="display:block">${esc(a.pourquoi)}</small></span><span>›</span></${a.id ? "a" : "button"}>`).join("")}</div>
    <div class="actions-doc" style="margin-top:0"><button class="btn clair" id="recu">Répondre à un message reçu</button></div>
    <div class="carte" style="margin-bottom:16px"><label>Les prospecteurs</label>
      <div class="deux"><div class="champ"><label>Sur ce téléphone, je suis</label><select id="pMoi"><option value="">Personne en particulier</option>${connus.map(n => `<option ${moi() === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></div>
        <div class="champ"><label>Voir les prospects de</label><select id="pFiltre"><option value="">Tous les prospecteurs</option>${connus.map(n => `<option ${filtreP === n ? "selected" : ""}>${esc(n)}</option>`).join("")}${sans && connus.length ? `<option value="—" ${filtreP === "—" ? "selected" : ""}>Sans prospecteur</option>` : ""}</select></div></div>
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
  document.getElementById("pMoi").onchange = e => { jeSuis(e.target.value); toast(e.target.value ? `Les nouveaux prospects seront au nom de ${e.target.value}` : "Les nouveaux prospects n'auront pas de prospecteur"); };
  document.getElementById("pFiltre").onchange = e => { filtreP = e.target.value; vueProspects(c); };
  document.getElementById("pEquipe").onclick = () => gererEquipe(c, () => vueProspects(c));
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
          <button class="btn" id="msg">Préparer un message</button><button class="btn clair" id="recu">Il m'a répondu</button>
          ${p.client_id ? `<a class="btn clair" href="#/client/${p.client_id}">Sa fiche client</a>` : `<button class="btn clair" id="versClient">Passer en client</button>`}</div>`}</div>
      <div class="carte" style="margin-bottom:12px"><label>Où en est-il</label>
        <div class="palette">${ETAPES.map(([k, nom]) => `<button class="btn ${p.etape === k ? "" : "discret"} petit-btn" data-etape="${k}">${nom}</button>`).join("")}</div></div>
      <div class="carte" style="margin-bottom:12px"><label>Ce que vous notez pour la suite</label>
        <div class="champ"><input type="text" id="pAction" value="${esc(p.prochaine_action || "")}" placeholder="ex. envoyer la vidéo de démonstration"></div>
        <div class="champ" style="margin-bottom:0"><label>Pour le</label><input type="date" id="pDate" value="${esc(p.prochaine_date || "")}"></div></div>
      <div class="carte" style="margin-bottom:12px"><label>Sa présence en ligne, d'après ce que vous avez vu</label>
        ${CONSTATS.map(([k, nom]) => `<label style="display:flex;gap:10px;align-items:center;margin:8px 0 0;text-transform:none;letter-spacing:0;font-weight:400;font-size:15px;color:inherit"><input type="checkbox" data-constat="${k}" ${p.constats.includes(k) ? "checked" : ""} style="width:20px;height:20px">${nom}</label>`).join("")}
        <p class="gris" style="font-size:13px;margin:10px 0 0">Offre conseillée : <b>${esc(offreConseillee(p))}</b>${p.offre ? "" : " (d'après son besoin ; se règle dans la fiche)"}</p></div>
    </div><div>
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
  if (el("opp")) el("opp").onclick = () => maj({ opposition: true, etape_avant: p.etape, etape: "perdu", historique: [...p.historique, { par: moi(), d: jour(), t: "note", texte: "Ne veut plus être contacté." }] }, "Noté : plus aucun message pour lui");
  if (el("annOpp")) el("annOpp").onclick = () => maj({ opposition: false, etape: p.etape_avant || "contacte" }, "Annulé");
  el("pQui").onchange = e => maj({ prospecteur: e.target.value || null }, e.target.value ? `Confié à ${e.target.value} ✓` : "Sans prospecteur");
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
    <div class="actions-doc" style="margin:12px 0 0"><button class="btn" id="copier">Copier</button><button class="btn clair" id="modifier">Modifier</button>
      ${p.email ? '<button class="btn clair" id="mail">Ouvrir dans mes e-mails</button>' : ""}${cle === "whatsapp" && tel.length >= 10 ? '<button class="btn clair" id="wa">Ouvrir WhatsApp</button>' : ""}</div>
    ${p.id ? `<button class="btn discret" id="envoye" style="width:100%;margin-top:10px">Je l'ai envoyé : le noter dans l'historique</button>` : ""}
    <p class="gris" style="font-size:13px;margin:10px 0 0">Rien ne part tout seul : c'est vous qui envoyez.</p>`);
  const t = f.el.querySelector("#txt"), q = s => f.el.querySelector(s);
  q("#modifier").onclick = () => { t.readOnly = false; t.style.background = "#fff"; t.focus(); };
  q("#copier").onclick = () => navigator.clipboard.writeText(t.value).then(() => toast("Message copié ✓"), () => { t.readOnly = false; t.select(); toast("Sélectionné : copiez-le à la main"); });
  if (q("#mail")) q("#mail").onclick = () => { location.href = `mailto:${p.email}?subject=${encodeURIComponent(sujet || "")}&body=${encodeURIComponent(t.value)}`; };
  if (q("#wa")) q("#wa").onclick = () => window.open(`https://wa.me/${tel}?text=${encodeURIComponent(t.value)}`, "_blank");
  if (q("#envoye")) q("#envoye").onclick = async () => {
    const relance = /^relance/.test(cle), etape = cle === "premier" && p.etape === "nouveau" ? "contacte" : cle === "proposition" ? "proposition" : p.etape;
    try { await garder(c, { ...p, etape, historique: [...(p.historique || []), { par: moi(), d: jour(), t: "envoi", texte: nom }], ...(relance ? { derniere_relance: jour() } : {}) }); f.fermer(); toast("Noté dans l'historique ✓"); apres && apres(); } catch (e) { erreur(e); }
  };
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
    f.el.querySelector("#analyse").innerHTML = `<div class="carte" style="box-shadow:none;background:var(--pierre)">
      ${ligne("Ce qu'il recherche", a.situation)}${ligne("Son intérêt", a.interet)}${ligne("Ses objections", a.objections.join(" ; ") || "aucune repérée")}${ligne("La suite", a.suite)}
      <div class="actions-doc" style="margin:12px 0 0">${a.stop ? (qui ? '<button class="btn" id="bloquer">Noter son refus : plus aucun message</button>' : "") : `<button class="btn" id="rep">${a.cle ? "Préparer la réponse" : "Choisir une réponse"}</button>`}
        ${qui ? '<button class="btn clair" id="garder">Garder ce message dans l\'historique</button>' : ""}</div>
      <p class="gris" style="font-size:13px;margin:10px 0 0">Cette lecture repère des mots, elle peut se tromper : relisez le message, c'est vous qui décidez.</p></div>`;
    const q = s => f.el.querySelector(s), recu = { par: moi(), d: jour(), t: "recu", texte: texte.slice(0, 2000) };
    const garde = async plus => { try { await garder(c, { ...qui, historique: [...(qui.historique || []), recu], etape: ["nouveau", "contacte"].includes(qui.etape) ? "reponse" : qui.etape, ...plus }); return true; } catch (e) { erreur(e); return false; } };
    if (q("#garder")) q("#garder").onclick = async () => { if (await garde({})) { f.fermer(); toast("Message gardé ✓"); apres && apres(); } };
    if (q("#bloquer")) q("#bloquer").onclick = async () => { if (await garde({ opposition: true, etape_avant: qui.etape, etape: "perdu" })) { f.fermer(); toast("Noté : plus aucun message pour lui"); apres ? apres() : (location.hash = "#/prospect/" + qui.id); } };
    if (q("#rep")) q("#rep").onclick = async () => { const cible = qui || { nom: "", metier: "", historique: [] }; if (qui) await garde({}); f.fermer();
      choisir(c, qui ? { ...qui, historique: [...(qui.historique || []), recu] } : cible, apres, a.cle || undefined); };
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
