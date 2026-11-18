// « Mohamed et Souad » : le service qui reçoit les notifications, même l'appli fermée. Rien n'est gardé en mémoire ici.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});   // présent pour que le téléphone propose l'installation

self.addEventListener("push", e => {
  let m = { titre: "Mohamed et Souad", texte: "Un nouveau message" };
  try { m = Object.assign(m, e.data.json()); } catch (err) {}
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(l => {
    // l'appli est ouverte sous les yeux : le message s'y affiche déjà, inutile de sonner
    if (l.some(c => c.visibilityState === "visible" && c.url.includes("/mohamed-et-souad/"))) return;
    return self.registration.showNotification(m.titre, { body: m.texte, icon: "/mohamed-et-souad/icone-192.png", badge: "/mohamed-et-souad/pastille.png", tag: "duo", renotify: true, data: { url: "/mohamed-et-souad/" } });
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(l => {
    const d = l.find(c => c.url.includes("/mohamed-et-souad/"));
    return d ? d.focus() : self.clients.openWindow("/mohamed-et-souad/");
  }));
});
