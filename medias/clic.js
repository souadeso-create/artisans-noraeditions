// Petit « pop » doux quand on clique sur un bouton ou un lien (fabriqué par le navigateur, sans fichier son).
(function () {
  var ctx = null;
  function pop() {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      // deux petites notes qui montent (do puis mi), rondes et gaies
      var t0 = ctx.currentTime;
      [[523.25, 0], [659.25, 0.07]].forEach(function (n) {
        var t = t0 + n[1];
        [["triangle", n[0], 0.16], ["sine", n[0] * 2, 0.03]].forEach(function (v) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = v[0];
          o.frequency.setValueAtTime(v[1], t);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(v[2], t + 0.006);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
          o.connect(g); g.connect(ctx.destination);
          o.start(t); o.stop(t + 0.25);
        });
      });
    } catch (e) {}
  }
  // Petit « tac » de touche à chaque lettre tapée dans les formulaires
  function tac() {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      var t = ctx.currentTime, n = Math.floor(ctx.sampleRate * 0.03);
      var b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = b;
      f.type = "bandpass"; f.frequency.value = 1800 + Math.random() * 900; f.Q.value = 1.2;
      g.gain.value = 0.35;
      s.connect(f); f.connect(g); g.connect(ctx.destination);
      s.start(t);
    } catch (e) {}
  }
  document.addEventListener("input", function (e) {
    var el = e.target;
    if (el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && /^(text|email|tel|number|search|url|)$/.test(el.type)))) tac();
  }, true);
  document.addEventListener("pointerdown", function (e) {
    // dans le questionnaire : la note seulement sur les boutons et les liens, pas sur les cases
    if (/questionnaire/.test(location.pathname)) { if (e.target.closest && e.target.closest("a, button, .btn, summary")) pop(); return; }
    if (e.target.closest && e.target.closest("a, button, summary, label, .btn, [role=button], input[type=checkbox], input[type=radio]")) pop();
  }, true);
})();
