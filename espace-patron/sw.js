// Rend l'espace installable comme une appli, et affiche les notifications des nouvelles demandes.
// Rien n'est gardé en cache : les demandes se lisent toujours en direct.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
self.addEventListener("push", e => {
  let m = { titre: "Nouvelle demande", texte: "", id: "" };
  try { m = Object.assign(m, e.data.json()); } catch (err) {}
  e.waitUntil(self.registration.showNotification(m.titre, { body: m.texte, icon: "/medias/icone-site-192.png", badge: "/medias/icone-site-192.png",
    tag: "demande-" + m.id, data: { url: "/espace-patron/" + (m.id ? "?d=" + m.id : "") } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/espace-patron/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(l => {
    for (const c of l) if (c.url.includes("/espace-patron/")) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
