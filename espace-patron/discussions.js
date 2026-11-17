// Les messages du site (17/11/2026) : le chat sans IA. Les visiteurs écrivent dans la bulle du site ; ici, on lit et on répond à la main.
// Plus › Messages du site : la liste des discussions (les non lues en tête), puis le fil de l'une d'elles.
// La base : tables « discussions » et « chat_messages » (nora-schema-11-chat.sql).
const SQL = "nora-schema-11-chat.sql";
const AUTO_DEFAUT = "Bonjour, merci pour votre message. Nous ne sommes pas disponibles pour le moment : nous vous répondons ici dès notre retour. Laissez votre e-mail ci-dessous pour recevoir la réponse.";
const case_ = "display:flex;gap:10px;align-items:flex-start;margin:10px 0 0;text-transform:none;letter-spacing:0;font-weight:400;font-size:15px;color:inherit";
const heure = d => { const x = new Date(d), auj = new Date().toDateString() === x.toDateString();
  return auj ? x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : x.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + " · " + x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); };
const qui = d => d.nom || d.email || "Visiteur du site";
let veille = null;   // la relecture automatique du fil ouvert
const arreter = () => { clearInterval(veille); veille = null; };

export async function vueDiscussions(c) {
  const { db, vue, esc } = c; arreter();
  let l;
  try { l = await db.listerDiscussions(); }
  catch (e) { vue.innerHTML = `<div class="entete"><h1>Messages du site</h1></div><div class="carte"><b>Le chat n'est pas encore installé dans votre base.</b><p class="gris" style="margin-top:6px">Passez une fois le fichier ${SQL} dans l'éditeur SQL de Supabase, puis rouvrez cette page.</p></div>`; return; }
  const visibles = l.filter(d => !d.archive), rangees = l.filter(d => d.archive);
  const ligne = d => `<a class="ligne-liste" href="#/discussion/${d.id}"><div><b>${esc(qui(d))}</b>${d.non_lus ? ` <span class="badge refuse">${d.non_lus} non lu${d.non_lus > 1 ? "s" : ""}</span>` : ""}
    <small style="display:block">${esc(d.dernier_texte || "")}</small><small class="gris" style="display:block">${esc(d.page || "")}</small></div><div class="droite"><small class="gris">${esc(heure(d.dernier_at))}</small></div></a>`;
  const P = c.P || {}, horaires = P.chat_horaires ?? true, allumee = !!(P.chat_absente || horaires);   // ses horaires : de 8 h à minuit, réponse automatique en dehors, sauf si elle l'éteint
  vue.innerHTML = `<div class="entete"><h1>Messages du site</h1></div>
    <p class="gris" style="margin:0 0 12px">Ce que les visiteurs écrivent dans la bulle du site. Votre réponse s'affiche chez eux, sur la page.</p>
    <details class="carte" style="margin-bottom:14px"><summary style="cursor:pointer"><b>Réponse automatique</b> <span class="badge ${allumee ? "signe" : ""}">${P.chat_absente ? "Allumée : vous êtes absente" : horaires ? "Allumée en dehors de vos horaires" : "Éteinte"}</span></summary>
      <label style="${case_}"><input type="checkbox" id="cAbs" ${P.chat_absente ? "checked" : ""} style="width:20px;height:20px;flex:none;margin-top:2px"><span>Je ne suis pas disponible : répondre automatiquement aux nouveaux messages</span></label>
      <label style="${case_}"><input type="checkbox" id="cHor" ${horaires ? "checked" : ""} style="width:20px;height:20px;flex:none;margin-top:2px"><span>Répondre automatiquement en dehors de mes horaires</span></label>
      <p style="margin:10px 0 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap">Mes horaires : de <input type="number" id="cDe" min="0" max="23" value="${Number(P.chat_de ?? 8)}" style="width:72px"> h à <input type="number" id="cA" min="1" max="24" value="${Number(P.chat_a ?? 24)}" style="width:72px"> h <small class="gris">(heure de Paris)</small></p>
      <label style="margin-top:14px">Le texte de la réponse automatique</label><textarea id="cTxt" rows="4" maxlength="1500" style="width:100%;margin-top:6px">${esc(P.chat_auto_texte || AUTO_DEFAUT)}</textarea>
      <button class="btn" id="cOk" style="margin-top:10px">Enregistrer</button>
      <p class="gris" style="font-size:13px;margin:10px 0 0">Elle part une fois par visiteur et par demi-journée, et reste marquée « Réponse automatique » dans la discussion. Votre téléphone sonne quand même.</p></details>
    ${visibles.length ? `<div class="liste">${visibles.map(ligne).join("")}</div>` : '<p class="vide">Aucun message pour le moment. Ils arriveront ici, et votre téléphone sonnera.</p>'}
    ${rangees.length ? `<details style="margin-top:16px"><summary class="gris">Discussions rangées (${rangees.length})</summary><div class="liste" style="margin-top:8px">${rangees.map(ligne).join("")}</div></details>` : ""}`;
  document.getElementById("cOk").onclick = async () => { const g = i => document.getElementById(i);
    Object.assign(P, { chat_absente: g("cAbs").checked, chat_horaires: g("cHor").checked, chat_de: Math.min(23, Math.max(0, Number(g("cDe").value) || 0)), chat_a: Math.min(24, Math.max(1, Number(g("cA").value) || 24)), chat_auto_texte: g("cTxt").value.trim() || AUTO_DEFAUT });
    try { await db.enregistrerParametres(P); c.toast("Réponse automatique enregistrée ✓"); vueDiscussions(c); } catch (e) { c.erreur(e); } };
}

export async function vueDiscussion(c, id) {
  const { db, vue, esc, toast, erreur, confirmer } = c; arreter();
  const d = await db.lire("discussions", id);
  if (!d) { location.hash = "#/discussions"; return; }
  vue.innerHTML = `<div class="entete"><h1>${esc(qui(d))}</h1></div>
    <p class="gris" style="margin:0 0 10px"><a href="#/discussions">‹ Tous les messages</a>${d.page ? ` · écrit depuis la page ${esc(d.page)}` : ""}</p>
    ${d.email ? `<div class="carte" style="margin-bottom:12px"><label>Son e-mail, pour lui répondre s'il a quitté la page</label><p style="margin:6px 0 10px">${esc(d.email)}</p>
      <div class="actions-doc" style="margin:0"><a class="btn petit-btn" href="mailto:${esc(d.email)}">Lui écrire par e-mail</a><button class="btn clair petit-btn" id="cMail">Copier l'adresse</button></div></div>`
      : '<p class="gris" style="font-size:13px;margin:0 0 10px">Il n\'a pas laissé d\'e-mail : il ne verra votre réponse que sur le site, s\'il y est encore ou s\'il y revient.</p>'}
    <div class="carte" id="fil" style="display:flex;flex-direction:column;gap:8px;max-height:52vh;overflow-y:auto;margin-bottom:12px"></div>
    <form id="rep" class="carte"><label>Votre réponse</label><textarea id="repTxt" rows="3" maxlength="1500" placeholder="Écrivez votre réponse" style="width:100%;margin-top:6px"></textarea>
      <div class="actions-doc" style="margin:10px 0 0"><button class="btn">Envoyer</button><button type="button" class="btn clair" id="ranger">${d.archive ? "Ressortir la discussion" : "Ranger la discussion"}</button><button type="button" class="btn discret" id="suppr">Supprimer</button></div></form>`;
  const fil = document.getElementById("fil"); let dernier = 0;
  const bulle = m => { const p = document.createElement("div"), moi = m.de === "nora";
    p.style.cssText = `align-self:${moi ? "flex-end" : "flex-start"};max-width:86%;padding:9px 12px;border-radius:16px;white-space:pre-wrap;overflow-wrap:anywhere;${moi ? "background:var(--violet);color:#fff" : "background:var(--pierre)"}`;
    p.innerHTML = `${esc(m.texte)}<small style="display:block;opacity:.7;font-size:11px;margin-top:3px">${m.auto ? "Réponse automatique" : moi ? "Vous" : "Visiteur"} · ${esc(heure(m.created_at))}</small>`; fil.appendChild(p); };
  const charger = async () => { const l = await db.listerChat(id, dernier); if (!l.length) return;
    l.forEach(m => { dernier = Math.max(dernier, m.id); bulle(m); }); fil.scrollTop = fil.scrollHeight;
    if (l.some(m => m.de === "visiteur")) db.chatLu(id).then(() => c.pastille && c.pastille()).catch(() => {}); };
  try { await charger(); await db.chatLu(id); c.pastille && c.pastille(); } catch (e) { erreur(e); }
  // le fil se relit toutes les 5 secondes tant qu'on est dessus
  veille = setInterval(() => { if (!document.getElementById("fil")) return arreter(); if (!document.hidden) charger().catch(() => {}); }, 5000);
  const m = document.getElementById("cMail"); if (m) m.onclick = () => navigator.clipboard.writeText(d.email).then(() => toast("Adresse copiée ✓"), () => {});
  document.getElementById("rep").onsubmit = async e => { e.preventDefault(); const z = document.getElementById("repTxt"), t = z.value.trim(); if (!t) return;
    const b = e.target.querySelector("button"); b.disabled = true;
    try { await db.repondreChat(id, t); z.value = ""; await charger(); } catch (er) { erreur(er); } b.disabled = false; };
  document.getElementById("ranger").onclick = async () => { try { await db.enregistrer("discussions", { id, archive: !d.archive }); toast(d.archive ? "Discussion ressortie ✓" : "Discussion rangée ✓"); location.hash = "#/discussions"; } catch (er) { erreur(er); } };
  document.getElementById("suppr").onclick = async () => { if (!(await confirmer("Supprimer cette discussion et tous ses messages ? C'est définitif."))) return;
    try { await db.supprimer("discussions", id); toast("Discussion supprimée"); location.hash = "#/discussions"; } catch (er) { erreur(er); } };
}
