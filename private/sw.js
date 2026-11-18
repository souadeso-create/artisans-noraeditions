// « Private M et S » : le service qui reçoit les notifications, même l'appli fermée.
// On peut répondre dans la notification elle-même (là où le téléphone le permet : Chrome sur Android).
const BASE = "https://olsqmrsyerdsyfkameab.supabase.co", CLE = "sb_publishable_nHTOBhRB-oKfl795VPVaAA_ujwUnkCn";
const ICONE = "/private/icone-192.png", PASTILLE = "/private/pastille.png";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});   // présent pour que le téléphone propose l'installation

self.addEventListener("push", e => {
  let m = { titre: "Private M et S", texte: "Un nouveau message" };
  try { m = Object.assign(m, e.data.json()); } catch (err) {}
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(l => {
    // l'appli est ouverte sous les yeux : le message s'y affiche déjà, inutile de sonner
    if (l.some(c => c.visibilityState === "visible" && c.url.includes("/private/"))) return;
    // un appel : la notification reste à l'écran et vibre longtemps ; on la touche pour décrocher (pas de réponse écrite)
    // Appli fermée, un site ne peut pas faire sonner le téléphone en continu : la notification est donc redonnée toutes les quatre secondes
    // (son et vibration à chaque fois), pendant une demi-minute, ou jusqu'à ce qu'on ouvre l'appli ou qu'on écarte la notification.
    if (/^Appel /.test(m.texte)) {
      const sonne = () => self.registration.showNotification(m.titre, { body: m.texte, icon: ICONE, badge: PASTILLE, tag: "duo-appel", renotify: true, silent: false,
        requireInteraction: true, vibrate: [700, 250, 700, 250, 700], data: { url: "/private/" } });
      const attendre = ms => new Promise(r => setTimeout(r, ms));
      const encore = async () => {
        await sonne();
        for (let i = 0; i < 6; i++) {
          await attendre(4000);
          const fen = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
          if (fen.some(c => c.visibilityState === "visible" && c.url.includes("/private/"))) break;                    // l'appli est ouverte : elle sonne elle-même
          if (!(await self.registration.getNotifications({ tag: "duo-appel" })).length) return;                          // notification écartée : on se tait
          await sonne();
        }
        (await self.registration.getNotifications({ tag: "duo-appel" })).forEach(n => n.close());
        const vu = (await self.clients.matchAll({ type: "window", includeUncontrolled: true })).some(c => c.visibilityState === "visible" && c.url.includes("/private/"));
        if (!vu) return self.registration.showNotification(m.titre, { body: "Appel manqué", icon: ICONE, badge: PASTILLE, tag: "duo-manque", data: { url: "/private/" } });
      };
      return encore();
    }
    return self.registration.showNotification(m.titre, { body: m.texte, icon: ICONE, badge: PASTILLE, tag: "duo", renotify: true, silent: false, vibrate: [180, 90, 180], data: { url: "/private/" },
      actions: [{ action: "repondre", type: "text", title: "Répondre", placeholder: "Votre réponse" }] });
  }));
});

// qui tient ce téléphone, et son code : l'appli les range ici à l'entrée (le service ne peut pas lire la mémoire de la page)
const moi = () => caches.open("private-moi").then(c => c.match("/private/moi")).then(r => r ? r.json() : null).catch(() => null);

self.addEventListener("notificationclick", e => {
  e.notification.close();
  if (e.action === "repondre" && e.reply) {
    const rate = () => self.registration.showNotification("La réponse n'est pas partie", { body: "Touchez pour ouvrir la messagerie et répondre.", icon: ICONE, badge: PASTILLE, tag: "duo-rate", data: { url: "/private/" } });
    e.waitUntil(moi().then(m => {
      if (!m || !m.code || !m.qui) return rate();
      return fetch(BASE + "/rest/v1/rpc/duo_envoyer", { method: "POST", headers: { "Content-Type": "application/json", apikey: CLE }, body: JSON.stringify({ p_code: m.code, p_de: m.qui, p_texte: e.reply }) })
        .then(r => r.ok ? null : rate()).catch(rate);
    }));
    return;
  }
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(l => {
    const d = l.find(c => c.url.includes("/private/"));
    return d ? d.focus() : self.clients.openWindow("/private/");
  }));
});
