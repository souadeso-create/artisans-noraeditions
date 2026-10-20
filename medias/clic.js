// Petit « pop » doux quand on clique sur un bouton ou un lien (fabriqué par le navigateur, sans fichier son).
(function () {
  var ctx = null;
  function pop() {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      // une note ronde de marimba (do aigu), avec une harmonique légère qui s'éteint vite
      var t = ctx.currentTime;
      [[1046.5, 0.14, 0.32], [4186, 0.02, 0.06], [2093, 0.03, 0.12]].forEach(function (n) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(n[0], t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(n[1], t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + n[2]);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + n[2] + 0.02);
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
    if (e.target.closest && e.target.closest("a, button, summary, label, .btn, [role=button], input[type=checkbox], input[type=radio]")) pop();
  }, true);
})();
