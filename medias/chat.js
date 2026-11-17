// Le chat du site, sans IA (17/11/2026) : une bulle en bas de page. Le visiteur écrit, le message arrive dans l'appli de Nora Éditions
// (Plus › Messages du site) et fait sonner le téléphone ; la réponse, écrite à la main, s'affiche ici.
// Rien n'est lu ni écrit directement dans la base : trois fonctions seulement (chat_envoyer, chat_lire, chat_coordonnees),
// et l'identifiant de la discussion, gardé sur l'appareil du visiteur, sert de clé.
(function () {
  if (window.noraChat || navigator.webdriver && !/^(localhost|127\.)/.test(location.hostname)) return;
  var BASE = "https://olsqmrsyerdsyfkameab.supabase.co", CLE = "sb_publishable_nHTOBhRB-oKfl795VPVaAA_ujwUnkCn";
  var garde = {}; try { garde = JSON.parse(localStorage.getItem("nora_chat") || "{}"); } catch (e) {}
  var retenir = function () { try { localStorage.setItem("nora_chat", JSON.stringify(garde)); } catch (e) {} };
  // l'essai sur l'ordinateur (localhost) ne touche pas la vraie base : les messages restent dans le navigateur
  var ESSAI = /^(localhost|127\.)/.test(location.hostname);
  function appel(nom, corps) {
    if (ESSAI) return essai(nom, corps);
    return fetch(BASE + "/rest/v1/rpc/" + nom, { method: "POST", headers: { "Content-Type": "application/json", apikey: CLE }, body: JSON.stringify(corps) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d && d.message || "Le message n'est pas parti."); return d; }); });
  }
  function essai(nom, c) {
    var l = []; try { l = JSON.parse(localStorage.getItem("nora_chat_essai") || "[]"); } catch (e) {}
    if (nom === "chat_envoyer") { l.push({ id: l.length + 1, de: "visiteur", texte: c.p_texte, created_at: new Date().toISOString() }); localStorage.setItem("nora_chat_essai", JSON.stringify(l)); return Promise.resolve("essai"); }
    if (nom === "chat_lire") return Promise.resolve(l.filter(function (m) { return m.id > (c.p_apres || 0); }));
    return Promise.resolve(true);
  }

  var css = document.createElement("style");
  css.textContent = ".nchat-b{position:fixed;right:16px;bottom:18px;z-index:70;width:58px;height:58px;border-radius:50%;border:0;cursor:pointer;background:#5b4bff;color:#fff;box-shadow:0 10px 24px rgba(15,18,64,.35);display:flex;align-items:center;justify-content:center}" +
    ".nchat-b svg{width:28px;height:28px}.nchat-b i{position:absolute;top:2px;right:2px;width:16px;height:16px;border-radius:50%;background:#ffd426;border:2px solid #fff;display:none}.nchat-b.neuf i{display:block}" +
    ".nchat-haut .nchat-b{bottom:calc(84px + env(safe-area-inset-bottom))}" +
    ".nchat-p{position:fixed;right:16px;bottom:88px;z-index:71;width:min(370px,calc(100vw - 24px));height:min(540px,calc(100vh - 120px));background:#fff;color:#14152e;border-radius:20px;box-shadow:0 24px 60px rgba(15,18,64,.35);display:none;flex-direction:column;overflow:hidden;font:15px/1.45 Inter,system-ui,sans-serif}" +
    ".nchat-p.ouvert{display:flex}.nchat-haut .nchat-p{bottom:calc(154px + env(safe-area-inset-bottom));height:min(540px,calc(100vh - 190px))}" +
    ".nchat-t{background:#0f1240;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.nchat-t b{display:block;font-size:16px}.nchat-t small{opacity:.8;font-size:13px}" +
    ".nchat-t button{background:none;border:0;color:#fff;font-size:24px;line-height:1;cursor:pointer;padding:0 4px}" +
    ".nchat-m{flex:1;overflow-y:auto;padding:14px;background:#f4f5fc;display:flex;flex-direction:column;gap:8px}" +
    ".nchat-m p{margin:0;max-width:84%;padding:9px 12px;border-radius:16px;white-space:pre-wrap;overflow-wrap:anywhere}.nchat-m .v{align-self:flex-end;background:#5b4bff;color:#fff;border-bottom-right-radius:5px}" +
    ".nchat-m .n{align-self:flex-start;background:#fff;border:1px solid #e2e4f3;border-bottom-left-radius:5px}.nchat-m .s{align-self:center;max-width:100%;background:none;color:#5f6482;font-size:13px;text-align:center;padding:2px 6px}" +
    ".nchat-c{display:grid;grid-template-columns:1fr 1fr auto;gap:6px;padding:0 14px 10px;background:#f4f5fc}.nchat-c input{min-width:0;border:1px solid #d6d9ee;border-radius:10px;padding:8px 10px;font:inherit;font-size:14px}" +
    ".nchat-c button,.nchat-e button{border:0;border-radius:10px;background:#0f1240;color:#fff;font:inherit;font-weight:600;padding:8px 12px;cursor:pointer}" +
    ".nchat-e{display:flex;gap:8px;padding:10px;border-top:1px solid #e2e4f3;background:#fff}.nchat-e textarea{flex:1;min-width:0;resize:none;border:1px solid #d6d9ee;border-radius:12px;padding:9px 11px;font:inherit;height:44px;max-height:110px}" +
    ".nchat-e button{background:#5b4bff;border-radius:12px;padding:0 16px}.nchat-e button:disabled{opacity:.5}" +
    "@media (max-width:600px){.nchat-p{right:8px;left:8px;width:auto}}";
  document.head.appendChild(css);
  // sur téléphone, la barre « Je veux mon site » occupe le bas de l'écran : la bulle se place au-dessus
  var barre = document.querySelector(".barre"); if (barre && getComputedStyle(barre).display !== "none") document.documentElement.classList.add("nchat-haut");

  var bulle = document.createElement("button"); bulle.type = "button"; bulle.className = "nchat-b"; bulle.setAttribute("aria-label", "Écrire à Nora Éditions");
  bulle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12.500h5"/></svg><i></i>';
  var p = document.createElement("div"); p.className = "nchat-p"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "Discussion avec Nora Éditions");
  p.innerHTML = '<div class="nchat-t"><div><b>Nora Éditions</b><small>Une question ? Écrivez-nous, nous vous répondons ici, par écrit.</small></div><button type="button" aria-label="Fermer">×</button></div>' +
    '<div class="nchat-m" aria-live="polite"></div><form class="nchat-c" hidden><input name="nom" placeholder="Votre prénom" autocomplete="given-name"><input name="email" type="email" placeholder="Votre e-mail" autocomplete="email"><button>OK</button></form>' +
    '<form class="nchat-e"><textarea placeholder="Votre message" aria-label="Votre message" maxlength="1500"></textarea><button>Envoyer</button></form>';
  document.body.appendChild(bulle); document.body.appendChild(p);
  var zone = p.querySelector(".nchat-m"), ecrire = p.querySelector(".nchat-e"), champ = ecrire.querySelector("textarea"), coord = p.querySelector(".nchat-c");
  var dernier = 0, vus = {}, ouvert = false, minuterie = null;

  function ligne(classe, texte) { var e = document.createElement("p"); e.className = classe; e.textContent = texte; zone.appendChild(e); zone.scrollTop = zone.scrollHeight; return e; }
  function accueil() { if (!zone.children.length) ligne("s", "Bonjour. Dites-nous ce que vous cherchez : un site, un prix, un délai, une question sur votre projet."); }
  function lire() {
    if (!garde.id) return Promise.resolve();
    return appel("chat_lire", { p_discussion: garde.id, p_apres: dernier }).then(function (l) {
      (l || []).forEach(function (m) { if (vus[m.id]) return; vus[m.id] = 1; dernier = Math.max(dernier, m.id); ligne(m.de === "nora" ? "n" : "v", m.texte);
        if (m.de === "nora" && m.id > (garde.lu || 0)) { if (ouvert) garde.lu = m.id; else bulle.classList.add("neuf"); } });
      if (ouvert) { garde.lu = Math.max(garde.lu || 0, dernier); bulle.classList.remove("neuf"); } retenir();
    }).catch(function () {});
  }
  // la discussion se relit toutes les 5 secondes quand la fenêtre est ouverte, toutes les 25 secondes sinon ; jamais quand l'onglet est caché
  function rythme() { clearInterval(minuterie); if (garde.id) minuterie = setInterval(function () { if (!document.hidden) lire(); }, ouvert ? 5000 : 25000); }
  function ouvrir(o) { ouvert = o; p.classList.toggle("ouvert", o); if (o) { accueil(); lire(); bulle.classList.remove("neuf"); setTimeout(function () { champ.focus(); }, 50); } rythme(); }
  bulle.onclick = function () { ouvrir(!ouvert); };
  p.querySelector(".nchat-t button").onclick = function () { ouvrir(false); };
  champ.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ecrire.requestSubmit(); } });
  ecrire.onsubmit = function (e) {
    e.preventDefault(); var t = champ.value.trim(), b = ecrire.querySelector("button"); if (!t) return;
    b.disabled = true;
    appel("chat_envoyer", { p_discussion: garde.id || null, p_texte: t, p_page: location.pathname }).then(function (id) {
      var premier = !garde.id; garde.id = id; retenir(); champ.value = "";
      return lire().then(function () { if (premier || !garde.coord) { if (!garde.note) { ligne("s", "Message bien reçu. Nous vous répondons ici. Pour recevoir la réponse si vous quittez la page, laissez votre e-mail :"); garde.note = 1; retenir(); } coord.hidden = !!garde.coord; } rythme(); });
    }).catch(function (er) { ligne("s", "Le message n'est pas parti : " + (er.message || "réessayez dans un instant") + "."); }).then(function () { b.disabled = false; champ.focus(); });
  };
  coord.onsubmit = function (e) {
    e.preventDefault(); var nom = coord.nom.value.trim(), mail = coord.email.value.trim(); if (!mail) return coord.email.focus();
    appel("chat_coordonnees", { p_discussion: garde.id, p_nom: nom, p_email: mail }).then(function () { garde.coord = 1; retenir(); coord.hidden = true; ligne("s", "C'est noté. Nous vous écrirons à " + mail + " si vous n'êtes plus sur la page."); }).catch(function () {});
  };
  window.noraChat = { ouvrir: function () { ouvrir(true); } };
  // un visiteur qui revient retrouve sa discussion, et voit s'il a une réponse
  if (garde.id) { lire(); rythme(); }
})();
