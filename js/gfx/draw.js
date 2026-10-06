/*
 * Procedural placeholder art (all original). Every scene background goes through gfx.bg(g, key, fallback):
 * if assets/img/<key>.png exists it is stretched over the screen, otherwise the fallback draws it.
 * Planned image keys: bg_title, bg_map, bg_joust, bg_siege, bg_battle, bg_duel, bg_castle_hall, bg_end_win, bg_end_lose
 */
(function () {
  const W = window.WOTC;
  const gfx = {};
  const SW = 640, SH = 400;

  gfx.bg = function (g, key, fallback) {
    const im = W.assets.get(key);
    if (im) { g.imageSmoothingEnabled = true; g.drawImage(im, 0, 0, SW, SH); g.imageSmoothingEnabled = false; return true; }
    fallback(g); return false;
  };
  gfx.hasImage = (key) => !!W.assets.get(key);

  /** Draw frame i of n from a horizontal sprite strip, bottom-centred at (x,y) with height h. Returns false if the strip is not available. */
  gfx.frame = function (g, key, n, i, x, y, h, flip) {
    const im = W.assets.get(key); if (!im) return false;
    const fw = im.width / n, w = h * fw / im.height;
    g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
    g.drawImage(im, Math.floor(i) % n * fw, 0, fw, im.height, -w / 2, -h, w, h);
    g.restore(); return true;
  };
  /** Draw a single sprite bottom-centred at (x,y) with height h. */
  gfx.sprite = function (g, key, x, y, h) { return gfx.frame(g, key, 1, 0, x, y, h); };
  gfx.rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

  gfx.sky = function (g, top, bot, h) {
    const gr = g.createLinearGradient(0, 0, 0, h || SH);
    gr.addColorStop(0, top); gr.addColorStop(1, bot);
    g.fillStyle = gr; g.fillRect(0, 0, SW, h || SH);
  };

  gfx.hills = function (g, y, color, amp, seed, freq) {
    g.fillStyle = color; g.beginPath(); g.moveTo(0, SH);
    for (let x = 0; x <= SW; x += 8) g.lineTo(x, y + Math.sin(x * (freq || 0.01) + seed) * amp + Math.sin(x * 0.027 + seed * 2) * amp * 0.5);
    g.lineTo(SW, SH); g.closePath(); g.fill();
  };

  gfx.clouds = function (g, t) {
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 6; i++) {
      const x = ((i * 137 + t * (4 + i)) % (SW + 120)) - 60, y = 30 + (i * 29) % 90;
      g.beginPath(); g.ellipse(x, y, 34, 9, 0, 0, 7); g.ellipse(x + 20, y - 5, 22, 8, 0, 0, 7); g.fill();
    }
  };

  gfx.castle = function (g, x, y, s, wall, roof) {
    // x,y = bottom-center, s = scale
    wall = wall || '#8c8577'; roof = roof || '#7a1f1f';
    const R = (a, b, w, h, c) => gfx.rect(g, x + a * s, y + b * s, w * s, h * s, c);
    R(-60, -50, 120, 50, wall);
    for (let i = -60; i < 60; i += 12) R(i, -58, 7, 8, wall);
    R(-80, -90, 28, 90, wall); R(52, -90, 28, 90, wall);
    for (let i = -80; i < -52; i += 9) R(i, -98, 6, 8, wall);
    for (let i = 52; i < 80; i += 9) R(i, -98, 6, 8, wall);
    R(-16, -88, 32, 38, wall); g.fillStyle = roof; g.beginPath(); g.moveTo(x - 20 * s, y - 88 * s); g.lineTo(x, y - 118 * s); g.lineTo(x + 20 * s, y - 88 * s); g.fill();
    R(-12, -30, 24, 30, '#2a1f14'); g.fillStyle = '#2a1f14'; g.beginPath(); g.arc(x, y - 30 * s, 12 * s, Math.PI, 0); g.fill();
    R(-70, -70, 6, 12, '#222'); R(64, -70, 6, 12, '#222'); R(-4, -76, 8, 14, '#222');
    R(-60, -50, 120, 3, '#0003');
    // bricks
    g.fillStyle = '#0002';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 10; c++) g.fillRect(x + (-58 + c * 12 + (r % 2) * 6) * s, y + (-46 + r * 9) * s, 1, 8 * s);
    // flag
    R(-1, -138, 2, 24, '#3a2a14'); R(1, -138, 14, 8, roof);
  };

  gfx.shield = function (g, x, y, s, c1, c2, pat) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.beginPath(); g.moveTo(-14, -16); g.lineTo(14, -16); g.lineTo(14, 4); g.quadraticCurveTo(14, 18, 0, 24); g.quadraticCurveTo(-14, 18, -14, 4); g.closePath();
    g.fillStyle = c1; g.fill(); g.save(); g.clip();
    g.fillStyle = c2;
    if (pat === 1) g.fillRect(-15, -4, 30, 8); else if (pat === 2) { g.fillRect(-4, -17, 8, 42); g.fillRect(-15, -5, 30, 8); } else if (pat === 3) { g.beginPath(); g.moveTo(-15, -17); g.lineTo(15, 25); g.lineTo(15, 12); g.lineTo(-15, -30); g.fill(); } else g.fillRect(-15, -16, 15, 45);
    g.restore(); g.lineWidth = 2; g.strokeStyle = '#1a1208'; g.stroke(); g.restore();
  };

  gfx.portrait = function (g, lord, x, y, w, h) {
    const pim = W.assets.get('portrait_' + lord.id);
    if (pim) {
      const sc = Math.max(w / pim.width, h / pim.height), sw = w / sc, sh = h / sc;
      g.drawImage(pim, (pim.width - sw) / 2, (pim.height - sh) * 0.1, sw, sh, x, y, w, h);
      g.strokeStyle = '#000'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
      return;
    }
    const idx = Math.max(0, W.baseRuleset.lords.findIndex((l) => l.id === lord.id));
    gfx.rect(g, x, y, w, h, '#1b2a44'); gfx.rect(g, x, y + h * 0.72, w, h * 0.28, '#2a3a24');
    const cx = x + w / 2;
    // body
    g.fillStyle = lord.color; g.fillRect(cx - w * 0.3, y + h * 0.62, w * 0.6, h * 0.4);
    gfx.shield(g, cx, y + h * 0.82, w / 70, lord.color, '#f1e4b0', idx % 4);
    // head + helm
    g.fillStyle = '#e0b48c'; g.beginPath(); g.ellipse(cx, y + h * 0.4, w * 0.16, h * 0.17, 0, 0, 7); g.fill();
    g.fillStyle = '#9aa3ad'; g.beginPath(); g.ellipse(cx, y + h * 0.33, w * 0.19, h * 0.15, 0, Math.PI, 0); g.fill(); g.fillRect(cx - w * 0.19, y + h * 0.33, w * 0.38, h * 0.05);
    g.fillStyle = '#2a1a0a'; g.fillRect(cx - w * 0.1, y + h * 0.4, w * 0.05, h * 0.02); g.fillRect(cx + w * 0.05, y + h * 0.4, w * 0.05, h * 0.02);
    g.fillStyle = lord.side === 'saxon' ? '#c9a24a' : '#8a1c1c'; g.fillRect(cx - 2, y + h * 0.12, 4, h * 0.12);
    g.strokeStyle = '#000'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
  };

  /** side-view knight on horse, facing +1 (right) or -1. */
  gfx.rider = function (g, x, y, s, o) {
    o = o || {}; const f = o.facing || 1;
    g.save(); g.translate(x, y); g.scale(f * s, s);
    const bob = o.gallop ? Math.sin(o.t * 18) * 1.5 : 0; g.translate(0, bob);
    const horse = o.horse || '#6b4a2b';
    // legs
    g.fillStyle = horse;
    const lp = o.gallop ? Math.sin(o.t * 18) * 5 : 0;
    g.fillRect(-18 + lp, 4, 5, 20); g.fillRect(-8 - lp, 4, 5, 20); g.fillRect(10 + lp, 4, 5, 20); g.fillRect(20 - lp, 4, 5, 20);
    // body
    g.beginPath(); g.ellipse(2, -2, 26, 12, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(22, -8); g.lineTo(34, -26); g.lineTo(42, -20); g.lineTo(34, 0); g.fill(); // neck/head
    g.fillRect(36, -26, 10, 8);
    g.fillStyle = '#1b130a'; g.fillRect(-28, -6, 6, 4); // tail
    // caparison
    g.fillStyle = o.color || '#b22222'; g.fillRect(-12, -10, 28, 16);
    g.fillStyle = o.color2 || '#f1e4b0'; g.fillRect(-12, -4, 28, 4);
    // rider
    g.fillStyle = o.color || '#b22222'; g.fillRect(-4, -34, 12, 24);
    g.fillStyle = '#9aa3ad'; g.fillRect(-2, -46, 10, 12); g.fillStyle = '#000'; g.fillRect(4, -42, 4, 2);
    g.fillStyle = o.color2 || '#f1e4b0'; g.fillRect(0, -52, 3, 6);
    // lance
    if (o.lance !== false) {
      g.save(); g.translate(6, -26); g.rotate(o.lanceAngle || -0.08);
      g.fillStyle = '#d9c9a0'; g.fillRect(0, -1.5, 70, 3); g.fillStyle = '#ccc'; g.beginPath(); g.moveTo(70, -2.5); g.lineTo(82, 0); g.lineTo(70, 2.5); g.fill();
      g.fillStyle = o.color || '#b22222'; g.fillRect(14, -3, 10, 6);
      g.restore();
    }
    gfx.shield(g, 10, -26, 0.55, o.color || '#b22222', o.color2 || '#f1e4b0', o.pat || 1);
    g.restore();
  };

  gfx.footman = function (g, x, y, s, o) {
    o = o || {}; const f = o.facing || 1;
    if (o.lordId) {
      const attacking = o.attack != null, fr = attacking ? 4 + (o.attack > 0 ? 1 : 0) : Math.floor(o.walk || 0) % 4;
      if (gfx.frame(g, (o.knight ? 'knightfoot_' : 'soldier_') + o.lordId, 6, fr, x, y + 16 * s, (o.knight ? 52 : 46) * s / 1.15, f < 0)) return;
    }
    g.save(); g.translate(x, y); g.scale(f * s, s);
    const st = o.step || 0;
    g.fillStyle = '#3a2a1a'; g.fillRect(-4, 6, 3, 10 + st); g.fillRect(1, 6, 3, 10 - st);
    g.fillStyle = o.color || '#555'; g.fillRect(-5, -8, 10, 15);
    g.fillStyle = o.knight ? '#aab' : '#e0b48c'; g.fillRect(-3, -15, 7, 7);
    if (o.knight) { g.fillStyle = '#334'; g.fillRect(1, -12, 4, 1); g.fillStyle = o.color || '#b22222'; g.fillRect(-1, -19, 3, 5); }
    g.fillStyle = '#ccc'; g.save(); g.translate(5, -4); g.rotate(o.swing || -0.9); g.fillRect(0, -1, 14, 2); g.restore();
    g.fillStyle = o.color2 || '#ddd'; g.beginPath(); g.arc(-6, 0, 5, 0, 7); g.fill();
    g.restore();
  };

  // ---- backgrounds ----
  gfx.titleBg = function (g, t) {
    gfx.sky(g, '#1a1030', '#e07a3a', 260);
    g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(470, 205, 38, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,200,120,.25)'; g.beginPath(); g.arc(470, 205, 70, 0, 7); g.fill();
    gfx.hills(g, 270, '#3a2a40', 14, 1, 0.012);
    gfx.hills(g, 300, '#1f1f2a', 12, 3, 0.017);
    gfx.castle(g, 200, 330, 1.7, '#2a2a38', '#4a1018');
    gfx.hills(g, 345, '#0f0f15', 8, 5, 0.02);
    for (let i = 0; i < 40; i++) { const x = (i * 97) % SW, y = (i * 53) % 120; g.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.4 * Math.sin(t * 2 + i)) + ')'; g.fillRect(x, y, 1, 1); }
  };

  gfx.parchment = function (g) {
    gfx.sky(g, '#c9ad72', '#a98a4e');
    g.fillStyle = 'rgba(80,50,10,.08)';
    for (let i = 0; i < 90; i++) g.fillRect((i * 83) % SW, (i * 47) % SH, 30 + (i % 5) * 10, 1);
    g.strokeStyle = '#4a2f0e'; g.lineWidth = 4; g.strokeRect(6, 6, SW - 12, SH - 12);
    g.strokeStyle = '#4a2f0e88'; g.lineWidth = 1; g.strokeRect(12, 12, SW - 24, SH - 24);
  };

  gfx.jousting = function (g, t) {
    gfx.sky(g, '#6aa8e8', '#cfe8f8', 190); gfx.clouds(g, t);
    gfx.hills(g, 150, '#6a9a5a', 10, 2, 0.01);
    // crowd stand far away
    for (let i = 0; i < 40; i++) { g.fillStyle = ['#b22222', '#2c5fd0', '#e0c040', '#3aa05a', '#8a5acd'][i % 5]; g.fillRect(80 + i * 12, 120 + (i % 3) * 3, 8, 14); }
    gfx.rect(g, 60, 134, 520, 6, '#6b4a2b');
    gfx.rect(g, 0, 190, SW, 210, '#9bb860');
    // perspective ground bands
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.04)'; g.fillRect(0, 190 + i * i * 1.5, SW, 12 + i * 2); }
  };

  gfx.siegeBg = function (g, t) {
    gfx.sky(g, '#7a8fb8', '#e8d8b8', 260); gfx.clouds(g, t);
    gfx.hills(g, 230, '#5b7a45', 12, 4, 0.011);
    gfx.rect(g, 0, 300, SW, 100, '#7a6a3a');
    g.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 30; i++) g.fillRect((i * 71) % SW, 300 + (i * 29) % 100, 24, 2);
  };

  gfx.battleBg = function (g, t) {
    gfx.sky(g, '#8aa6c8', '#e9e2c8', 230); gfx.clouds(g, t);
    gfx.hills(g, 200, '#6d8f55', 14, 6, 0.008);
    gfx.hills(g, 235, '#5a7a45', 10, 2, 0.013);
    gfx.rect(g, 0, 262, SW, 138, '#76934a');
    g.fillStyle = 'rgba(0,0,0,.07)'; for (let i = 0; i < 60; i++) g.fillRect((i * 53) % SW, 262 + (i * 31) % 138, 18, 2);
  };

  gfx.hallBg = function (g, t) {
    gfx.rect(g, 0, 0, SW, SH, '#2a1c12');
    for (let i = 0; i < 8; i++) gfx.rect(g, i * 80, 0, 78, 300, i % 2 ? '#3a2a1c' : '#352418');
    gfx.rect(g, 0, 300, SW, 100, '#4a3a2a');
    for (let i = 0; i < 4; i++) { const x = 90 + i * 150; gfx.rect(g, x - 3, 70, 6, 22, '#222'); const fl = 6 + Math.sin(t * 9 + i) * 2; g.fillStyle = '#ffb030'; g.beginPath(); g.ellipse(x, 64, 5, fl, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,170,50,.12)'; g.beginPath(); g.arc(x, 66, 60, 0, 7); g.fill(); }
  };

  gfx.duelBg = function (g, t) {
    gfx.rect(g, 0, 0, SW, SH, '#1a1410');
    for (let i = 0; i < 6; i++) gfx.rect(g, i * 110, 0, 106, 280, i % 2 ? '#2a2420' : '#26201c');
    gfx.rect(g, 0, 280, SW, 120, '#3b3028');
    for (let i = 0; i < 3; i++) { const x = 100 + i * 220; gfx.rect(g, x - 3, 80, 6, 22, '#222'); g.fillStyle = '#ffb030'; g.beginPath(); g.ellipse(x, 74, 5, 7 + Math.sin(t * 8 + i) * 2, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,170,50,.10)'; g.beginPath(); g.arc(x, 76, 70, 0, 7); g.fill(); }
  };

  W.gfx = gfx;
})();
