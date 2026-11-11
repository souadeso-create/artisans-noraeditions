// Accès aux données : Supabase quand il est configuré, sinon le navigateur (mode essai).
import { PARAMETRES_DEFAUT, PRESTATIONS_DEFAUT, AJOUTS_PRESTATIONS, CORRECTIONS_PRESTATIONS, REPRISE_REGLAGES, REPRISE_ABO } from "./donnees.js";

const cfg = window.NORA_SB && window.NORA_SB.url ? { supabaseUrl: window.NORA_SB.url, supabaseKey: window.NORA_SB.cle } : {};
export const MODE_ESSAI = !(cfg.supabaseUrl && cfg.supabaseKey);
const sb = MODE_ESSAI ? null : window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16);
    }));

/* ---------- Mode essai : localStorage ---------- */
const CLE = t => "nora_admin_" + t;
function lireLocal(t) {
  try { return JSON.parse(localStorage.getItem(CLE(t))) || []; } catch { return []; }
}
function ecrireLocal(t, lignes) { localStorage.setItem(CLE(t), JSON.stringify(lignes)); }

function amorcerLocal() {
  if (localStorage.getItem(CLE("amorce"))) return;
  ecrireLocal("prestations", PRESTATIONS_DEFAUT.map(([categorie, designation, unite, prix_ht]) =>
    ({ id: uuid(), created_at: new Date().toISOString(), categorie, designation, unite, prix_ht, archive: false })));
  ecrireLocal("parametres", [{ id: 1, data: PARAMETRES_DEFAUT }]);
  localStorage.setItem(CLE("amorce"), "1");
}

/* ---------- Connexion ---------- */
export async function session() {
  if (MODE_ESSAI) { amorcerLocal(); return { user: { email: "mode essai" } }; }
  const { data } = await sb.auth.getSession();
  return data.session;
}
export async function connexion(email, motdepasse) {
  const { error } = await sb.auth.signInWithPassword({ email, password: motdepasse });
  if (error) throw new Error(error.message === "Invalid login credentials" ? "E-mail ou mot de passe incorrect." : error.message);
}
export async function deconnexion() { if (sb) await sb.auth.signOut(); }
export async function motDePasseOublie(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  if (error) throw error;
}
export function surRecuperation(rappel) {
  if (sb) sb.auth.onAuthStateChange(ev => { if (ev === "PASSWORD_RECOVERY") rappel(); });
}
export async function changerMotDePasse(mdp) {
  const { error } = await sb.auth.updateUser({ password: mdp });
  if (error) throw error;
}

/* ---------- Lecture / écriture ---------- */
export async function lister(table, { ordre = "created_at", desc = true } = {}) {
  if (MODE_ESSAI) {
    const l = lireLocal(table);
    return l.sort((a, b) => (String(a[ordre] ?? "") < String(b[ordre] ?? "") ? -1 : 1) * (desc ? -1 : 1));
  }
  const { data, error } = await sb.from(table).select("*").order(ordre, { ascending: !desc });
  if (error) throw error;
  return data;
}

export async function lire(table, id) {
  if (MODE_ESSAI) return lireLocal(table).find(x => x.id === id) || null;
  const { data, error } = await sb.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function enregistrer(table, obj) {
  const ligne = { ...obj };
  if (table === "documents") {
    ligne.updated_at = new Date().toISOString();
    // la date du paiement : retenue quand la facture passe en « Payée », effacée si elle n'est plus payée
    if (ligne.type === "facture" && ligne.statut) ligne.paye_le = ligne.statut === "paye" ? (ligne.paye_le || ligne.updated_at.slice(0, 10)) : null;
  }
  if (MODE_ESSAI) {
    const l = lireLocal(table);
    if (!ligne.id) { ligne.id = uuid(); ligne.created_at = ligne.created_at || new Date().toISOString(); l.push(ligne); }
    else { const i = l.findIndex(x => x.id === ligne.id); if (i >= 0) l[i] = { ...l[i], ...ligne }; else l.push(ligne); }
    ecrireLocal(table, l);
    return ligne;
  }
  const { data, error } = await sb.from(table).upsert(ligne).select().single();
  if (error) throw error;
  return data;
}

export async function supprimer(table, id) {
  if (MODE_ESSAI) { ecrireLocal(table, lireLocal(table).filter(x => x.id !== id)); return; }
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Fichiers des demandes du questionnaire (dossier privé « questionnaires ») ---------- */
export async function photosDemande(chemins) {
  if (MODE_ESSAI || !chemins?.length) return chemins.map(() => "");
  const { data, error } = await sb.storage.from("questionnaires").createSignedUrls(chemins, 3600);
  if (error) throw error;
  return data.map(x => x.signedUrl || "");
}
export async function supprimerPhotosDemande(chemins) {
  if (MODE_ESSAI || !chemins?.length) return;
  const { error } = await sb.storage.from("questionnaires").remove(chemins);
  if (error) throw error;
}

/* ---------- Notifications : ce téléphone est prévenu à chaque nouvelle demande ---------- */
/* Les visites du site depuis tant de jours (compteur fait maison) */
export async function listerVisites(jours) {
  const depuis = new Date(Date.now() - jours * 864e5).toISOString();
  if (MODE_ESSAI) return lireLocal("visites").filter(v => v.created_at >= depuis);
  const { data, error } = await sb.from("visites").select("created_at, page, source, appareil, nouvelle, evenement").gte("created_at", depuis).order("created_at", { ascending: false }).limit(50000);
  if (error) throw error;
  return data;
}

export async function abonnerTelephone(j) {
  if (MODE_ESSAI) return;
  const { error } = await sb.from("abonnements").upsert({ endpoint: j.endpoint, cles: j.keys, appareil: navigator.userAgent.slice(0, 200) });
  if (error) throw error;
}

/* ---------- Carnet de chantier (photos dans le dossier privé « chantiers ») ---------- */
export async function listerCarnet(clientId) {
  if (MODE_ESSAI) return lireLocal("carnet").filter(x => x.client_id === clientId).sort((a, b) => a.created_at < b.created_at ? 1 : -1);
  const { data, error } = await sb.from("carnet").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
// enregistre une entrée ; photo = Blob JPEG (facultatif)
export async function ajouterCarnet(entree, photo) {
  const ligne = { ...entree };
  if (MODE_ESSAI) {
    if (photo) ligne.image = await new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(photo); });
    return enregistrer("carnet", ligne);
  }
  if (photo) {
    const chemin = `${entree.client_id || "hors-chantier"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await sb.storage.from("chantiers").upload(chemin, photo, { contentType: "image/jpeg" });
    if (error) throw error;
    ligne.chemin = chemin;
  }
  return enregistrer("carnet", ligne);
}
// les montants du carnet (dépenses, paiements reçus, avancement), tous chantiers confondus, sans les photos
export async function listerDepenses(types = ["depense"]) {
  if (MODE_ESSAI) return lireLocal("carnet").filter(x => types.includes(x.type)).map(({ image, ...x }) => x);
  let r = await sb.from("carnet").select("id,client_id,created_at,montant,categorie,texte,type").in("type", types);
  if (r.error) r = await sb.from("carnet").select("id,client_id,created_at,montant,texte,type").in("type", types);
  if (r.error) throw r.error;
  return r.data;
}
export async function urlsCarnet(lignes) {
  const out = {};
  if (MODE_ESSAI) { lignes.forEach(l => { if (l.image) out[l.id] = l.image; }); return out; }
  const avec = lignes.filter(l => l.chemin);
  if (!avec.length) return out;
  const { data, error } = await sb.storage.from("chantiers").createSignedUrls(avec.map(l => l.chemin), 3600);
  if (error) throw error;
  data.forEach((d, i) => { if (d.signedUrl) out[avec[i].id] = d.signedUrl; });
  return out;
}
export async function supprimerCarnet(ligne) {
  if (!MODE_ESSAI && ligne.chemin) { const { error } = await sb.storage.from("chantiers").remove([ligne.chemin]); if (error) throw error; }
  return supprimer("carnet", ligne.id);
}

/* ---------- Paramètres de l'entreprise ---------- */
export async function parametres() {
  let p;
  if (MODE_ESSAI) p = lireLocal("parametres")[0];
  else {
    const { data } = await sb.from("parametres").select("*").eq("id", 1).maybeSingle();
    p = data;
    if (!p) { p = { id: 1, data: PARAMETRES_DEFAUT }; await sb.from("parametres").upsert(p); }
  }
  return { ...PARAMETRES_DEFAUT, ...(p?.data || {}) };
}
export async function enregistrerParametres(data) {
  if (MODE_ESSAI) { ecrireLocal("parametres", [{ id: 1, data }]); return; }
  const { error } = await sb.from("parametres").upsert({ id: 1, data });
  if (error) throw error;
}

/* Première ligne dont le champ vaut la valeur (ou null) */
export async function chercher(table, champ, valeur) {
  if (MODE_ESSAI) return lireLocal(table).find(x => x[champ] === valeur) || null;
  const { data, error } = await sb.from(table).select("*").eq(champ, valeur).maybeSingle();
  if (error) throw error;
  return data;
}
/* Remplit la base des prestations la première fois (base Supabase vide). */
export async function amorcerPrestations() {
  if (MODE_ESSAI) return;
  const { count } = await sb.from("prestations").select("id", { count: "exact", head: true });
  if (count) return;
  await sb.from("prestations").insert(PRESTATIONS_DEFAUT.map(([categorie, designation, unite, prix_ht]) =>
    ({ categorie, designation, unite, prix_ht })));
}

/* Verse une fois les prestations ajoutées depuis (AJOUTS_PRESTATIONS) ; l'artisan peut ensuite les modifier ou les archiver. */
export async function ajouterNouvellesPrestations() {
  let brut;  // réglages tels qu'enregistrés, sans les valeurs par défaut
  if (MODE_ESSAI) brut = lireLocal("parametres")[0]?.data || {};
  else { const { data } = await sb.from("parametres").select("data").eq("id", 1).maybeSingle(); brut = data?.data || {}; }
  const faits = brut.ajouts_prestations || [];
  const reste = AJOUTS_PRESTATIONS.filter(a => !faits.includes(a.cle));
  const corr = (CORRECTIONS_PRESTATIONS || []).filter(c => !faits.includes(c.cle));
  if (!faits.includes("acompte-10-2026-10")) {
    if (brut.acompte_pct == null || Number(brut.acompte_pct) === 30) brut.acompte_pct = 10;
    if (brut.conditions) brut.conditions = brut.conditions.replace("Paiement : un acompte à la commande", "Paiement : un acompte de 10 % à la commande");
    faits.push("acompte-10-2026-10");
    if (!reste.length && !corr.length) { await enregistrerParametres({ ...brut, ajouts_prestations: faits }); return; }
  }
  // l'acompte sur la création seule, le premier mois d'abonnement offert : les deux phrases des conditions, si elles sont encore celles de départ
  if (!faits.includes(REPRISE_ABO.cle)) {
    for (const [ancien, nouveau] of REPRISE_ABO.remplacer) if (brut.conditions && brut.conditions.includes(ancien)) brut.conditions = brut.conditions.replace(ancien, nouveau);
    faits.push(REPRISE_ABO.cle);
    if (faits.includes(REPRISE_REGLAGES.cle) && !reste.length && !corr.length) { await enregistrerParametres({ ...brut, ajouts_prestations: faits }); return; }
  }
  // les conditions et le libellé d'abonnement : repris une fois, seulement s'ils sont encore ceux de départ
  if (!faits.includes(REPRISE_REGLAGES.cle)) {
    if (brut.conditions && brut.conditions.includes(REPRISE_REGLAGES.conditions.marqueur)) brut.conditions = REPRISE_REGLAGES.conditions.nouveau;
    if (brut.abonnement_libelle === REPRISE_REGLAGES.libelle.ancien) brut.abonnement_libelle = REPRISE_REGLAGES.libelle.nouveau;
    faits.push(REPRISE_REGLAGES.cle);
    if (!reste.length && !corr.length) { await enregistrerParametres({ ...brut, ajouts_prestations: faits }); return; }
  }
  if (!reste.length && !corr.length) return;
  const toutes = await lister("prestations");
  for (const c of corr) {
    for (const x of toutes) {
      if (!x.designation) continue;
      let d = x.designation;
      for (const [ancien, nouveau] of c.remplacer) d = d.replace(ancien, nouveau);
      if (d !== x.designation) { x.designation = d; await enregistrer("prestations", { id: x.id, designation: d }); }
      if ((c.archiver || []).some(m => m.test(x.designation)) && !x.archive) { x.archive = true; await enregistrer("prestations", { id: x.id, archive: true }); }
    }
  }
  const deja = new Set(toutes.map(x => x.designation));
  for (const a of reste)
    for (const [categorie, designation, unite, prix_ht] of a.lignes)
      if (!deja.has(designation)) await enregistrer("prestations", { categorie, designation, unite, prix_ht });
  await enregistrerParametres({ ...brut, ajouts_prestations: [...faits, ...reste.map(a => a.cle), ...corr.map(c => c.cle)] });
}

/* ---------- Sauvegarde complète (fichier) ---------- */
export async function exporterTout() {
  const tables = ["clients", "prestations", "documents"];
  try { out.prospects = await lister("prospects"); } catch (e) { /* table absente */ }
  const out = { exporte_le: new Date().toISOString(), parametres: await parametres() };
  for (const t of tables) out[t] = await lister(t);
  try { out.demandes = await lister("demandes"); } catch { /* table pas encore créée */ }
  try { out.carnet = await lister("carnet"); } catch { /* table pas encore créée */ }
  return out;
}

/* ---------- L'assistant IA : une fonction du serveur (la clé n'est jamais dans le site) ---------- */
export async function assistant(corps) {
  if (MODE_ESSAI) return window.NORA_IA_ESSAI ? window.NORA_IA_ESSAI(corps) : { pret: false };
  const { data, error } = await sb.functions.invoke("assistant", { body: corps });
  if (error) { let m = ""; try { m = (await error.context.json()).erreur; } catch { /* pas de détail */ } throw new Error(m || "L'assistant IA ne répond pas."); }
  return data;
}

/* ---------- L'envoi d'e-mails depuis la boîte de la maison : une fonction du serveur (le mot de passe n'est jamais dans le site) ---------- */
export async function courrier(corps) {
  if (MODE_ESSAI) return window.NORA_COURRIER_ESSAI ? window.NORA_COURRIER_ESSAI(corps) : { pret: false };
  const { data, error } = await sb.functions.invoke("courrier", { body: corps });
  if (error) { let m = ""; try { m = (await error.context.json()).erreur; } catch { /* pas de détail */ } throw new Error(m || `le serveur a refusé la demande (${error.context?.status || "pas de réponse"})`);  }
  return data;
}

/* ---------- Qui est connecté : la patronne, un prospecteur qui a son compte, ou un compte sans accès ---------- */
const PATRONNE = "contact@noraeditions.com";
export async function role() {
  if (MODE_ESSAI) { let n = ""; try { n = localStorage.getItem("nora_role_essai") || ""; } catch { /* rien */ } return n ? { prospecteur: n } : { patronne: true }; }
  const { data } = await sb.auth.getSession(), email = (data.session?.user?.email || "").toLowerCase();
  if (email === PATRONNE) return { patronne: true };
  const { data: l } = await sb.from("prospecteurs").select("nom, actif").eq("email", email).limit(1);
  return l?.[0]?.actif ? { prospecteur: l[0].nom } : { aucun: true };
}
/* ---------- Les comptes des prospecteurs : une fonction du serveur, pour la patronne seulement ---------- */
export async function comptes(corps) {
  if (MODE_ESSAI) return window.NORA_COMPTES_ESSAI ? window.NORA_COMPTES_ESSAI(corps) : { comptes: [] };
  const { data, error } = await sb.functions.invoke("comptes", { body: corps });
  if (error) { let m = ""; try { m = (await error.context.json()).erreur; } catch { /* pas de détail */ } throw new Error(m || `les comptes ne sont pas encore installés (${error.context?.status || "pas de réponse"})`); }
  return data;
}
