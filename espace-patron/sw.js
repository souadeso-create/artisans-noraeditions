// Rend l'espace installable comme une appli, et affiche les notifications des nouvelles demandes.
// Rien n'est gardé en cache : les demandes se lisent toujours en direct.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
self.addEventListener("push", e => {
  let m = { titre: "Nouvelle demande", texte: "", id: "" };
  try { m = Object.assign(m, e.data.json()); } catch (err) {}
  const o = { body: m.texte, icon: "/medias/icone-site-192.png", badge: "/medias/icone-site-192.png",
    tag: m.url ? "message-" + (m.discussion || "du-site") : "demande-" + m.id, data: { url: m.url || "/espace-patron/" + (m.id ? "?d=" + m.id : ""), jeton: m.jeton || "" } };
  // un message du site : on peut répondre dans la notification elle-même (là où le téléphone le permet)
  if (m.jeton) o.actions = [{ action: "repondre", type: "text", title: "Répondre", placeholder: "Votre réponse" }];
  e.waitUntil(self.registration.showNotification(m.titre, o));
});
const BASE = "https://olsqmrsyerdsyfkameab.supabase.co", CLE = "sb_publishable_nHTOBhRB-oKfl795VPVaAA_ujwUnkCn";
self.addEventListener("notificationclick", e => {
  e.notification.close();
  // la réponse tapée dans la notification part tout de suite ; la base l'accepte contre le jeton de la discussion
  const d = e.notification.data || {};
  if (e.action === "repondre" && e.reply && d.jeton) {
    e.waitUntil(fetch(BASE + "/rest/v1/rpc/chat_repondre", { method: "POST", headers: { "Content-Type": "application/json", apikey: CLE }, body: JSON.stringify({ p_jeton: d.jeton, p_texte: e.reply }) })
      .then(r => r.ok ? r.json() : false).catch(() => false)
      .then(ok => ok ? null : self.registration.showNotification("La réponse n'est pas partie", { body: "Touchez pour ouvrir la discussion et répondre.", icon: "/medias/icone-site-192.png", tag: "reponse-ratee", data: { url: d.url } })));
    return;
  }
  const url = (e.notification.data && e.notification.data.url) || "/espace-patron/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(l => {
    for (const c of l) if (c.url.includes("/espace-patron/")) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
