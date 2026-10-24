// Le compteur de visites du site, fait maison (24/10/2026) : une ligne par page vue dans la base de Nora Éditions.
// Sans cookie et sans rien qui identifie le visiteur : la page, d'où il vient, téléphone ou ordinateur.
// Les robots ne sont pas comptés, ni les visites de la patronne (son appli le note sur son téléphone).
(function () {
  try {
    if (navigator.webdriver || /bot|crawl|spider|slurp|lighthouse|headless|preview/i.test(navigator.userAgent)) return;
    if (localStorage.getItem("nora_moi") === "1") return;
    if (/^(localhost|127\.|\[::1\])/.test(location.hostname)) return; // les essais sur l'ordinateur ne comptent pas
  } catch (e) {}
  var BASE = "https://olsqmrsyerdsyfkameab.supabase.co", CLE = "sb_publishable_nHTOBhRB-oKfl795VPVaAA_ujwUnkCn";

  function source() {
    var s = new URLSearchParams(location.search).get("utm_source");
    if (s) return s.slice(0, 60);
    var r = document.referrer; if (!r) return "Accès direct";
    try {
      var h = new URL(r).hostname.replace(/^www\./, "");
      if (h === location.hostname) return "interne";
      var connus = [[/google\./, "Google"], [/bing\./, "Bing"], [/(^|\.)qwant\./, "Qwant"], [/duckduckgo/, "DuckDuckGo"], [/ecosia/, "Ecosia"], [/yahoo\./, "Yahoo"],
        [/facebook|fb\.|messenger/, "Facebook"], [/instagram/, "Instagram"], [/tiktok/, "TikTok"], [/linkedin|lnkd/, "LinkedIn"], [/youtube|youtu\.be/, "YouTube"],
        [/whatsapp|wa\.me/, "WhatsApp"], [/pinterest/, "Pinterest"], [/(^|\.)t\.co$|twitter|x\.com/, "X (Twitter)"], [/noraeditions/, "noraeditions"]];
      for (var i = 0; i < connus.length; i++) if (connus[i][0].test(h)) return connus[i][1];
      return h.slice(0, 60);
    } catch (e) { return "Autre site"; }
  }
  var ua = navigator.userAgent;
  var appareil = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? "tablette" : /Mobi|iPhone|Android/i.test(ua) ? "telephone" : "ordinateur";
  var nouvelle = false;
  try { nouvelle = !sessionStorage.getItem("nora_visite"); sessionStorage.setItem("nora_visite", "1"); } catch (e) {}

  function envoyer(evenement) {
    var corps = JSON.stringify({ p_page: location.pathname.slice(0, 200), p_source: source(), p_appareil: appareil,
      p_nouvelle: evenement ? false : nouvelle, p_evenement: evenement || null });
    try { fetch(BASE + "/rest/v1/rpc/compter", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", apikey: CLE }, body: corps }).catch(function () {}); } catch (e) {}
  }
  // pour compter un geste : window.noraCompter("questionnaire envoyé")
  window.noraCompter = envoyer;
  if (document.visibilityState === "prerender") {
    document.addEventListener("visibilitychange", function f() { if (document.visibilityState === "visible") { document.removeEventListener("visibilitychange", f); envoyer(); } });
  } else envoyer();
})();
