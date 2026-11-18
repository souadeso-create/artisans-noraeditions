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
    return self.registration.showNotification(m.titre, { body: m.texte, icon: ICONE, badge: PASTILLE, tag: "duo", renotify: true, data: { url: "/private/" },
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
