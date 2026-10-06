/* Joust: aim the lance at the opponent's shield while he thunders towards you. Best of N passes. */
(function () {
  const W = window.WOTC, E = W.Engine, t = W.t, U = W.util;

  class JoustScene extends W.Scene {
    // opts: {me, opp, passes:3}
    enter() {
      W.audio.music('joust');
      this.me = this.opts.me; this.opp = this.opts.opp;
      this.pass = 0; this.scoreMe = 0; this.scoreOpp = 0; this.phase = 'ready'; this.p = 0; this.msg = '';
      this.aim = { x: 320, y: 250 }; this.target = { x: 320, y: 250 }; this.keys = {};
      this.result = { won: false, horse: false, unhorsedOpp: false, unhorsedMe: false };
      this.fx = []; this.shake = 0; this.fall = 0;
      this.addButton({ x: 250, y: 360, w: 140, h: 28, label: () => (this.phase === 'ready' ? t('joust.pass', { n: this.pass + 1 }) + ' ▶' : '...'), key: ' ', disabled: false, onClick: () => this.go() });
      W.voice.speak(t('joust.aim'));
    }
    go() { if (this.phase !== 'ready') return; this.phase = 'charge'; this.p = 0; this.msg = ''; this.pass++; W.audio.sfx('gallop'); this.gal = 0; }
    onMove(x, y) { this.target.x = x; this.target.y = y; }
    onClick() { this.go(); }
    onKey(e) {
      const k = e.key; const d = 14;
      if (k === 'ArrowLeft') this.target.x -= d; if (k === 'ArrowRight') this.target.x += d; if (k === 'ArrowUp') this.target.y -= d; if (k === 'ArrowDown') this.target.y += d;
      if (k === 'Enter') this.go();
    }
    // opponent geometry at progress p (0..1)
    geo(p) { const k = 0.3 + 1.9 * p; const sp = !!W.assets.get('rider_front_' + this.opp.id); return { k, gx: 320, gy: 212 + 150 * p, sx: 320 + (sp ? 32 : -14) * k, sy: 212 + 150 * p - (sp ? 93 : 86) * k }; }
    update(dt) {
      this.shake = Math.max(0, this.shake - dt * 4);
      this.fx = this.fx.filter((f) => (f.life -= dt) > 0); this.fx.forEach((f) => { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 300 * dt; });
      if (this.phase === 'charge') {
        this.p += dt / 3.0; this.gal += dt; if (this.gal > 0.5) { this.gal = 0; W.audio.sfx('gallop'); }
        const A = (6 - this.me.joust) * (1.5 + 6 * this.p);
        const wob = this.t * 6;
        this.aim.x = U.clamp(this.target.x + Math.sin(wob * 1.3) * A + Math.sin(wob * 2.9) * A * 0.5, 40, 600);
        this.aim.y = U.clamp(this.target.y + Math.cos(wob * 1.1) * A + Math.sin(wob * 3.7) * A * 0.4, 100, 390);
        if (this.p >= 1) this.impact();
      } else if (this.phase === 'result') {
        this.fall += dt;
        if (this.t > this.resumeAt) {
          if (this.over) { this.finish(); } else { this.phase = 'ready'; this.fall = 0; }
        }
      } else { this.aim.x += (this.target.x - this.aim.x) * 0.3; this.aim.y += (this.target.y - this.aim.y) * 0.3; }
    }
    classify(dx, dy) {
      if (dy > 30 && Math.abs(dx) < 34) return 'horse';
      const d = Math.hypot(dx, dy);
      return d < 11 ? 'solid' : d < 24 ? 'body' : d < 42 ? 'glance' : 'miss';
    }
    impact() {
      const gm = this.geo(1);
      const dx = (this.aim.x - gm.sx) / gm.k, dy = (this.aim.y - gm.sy) / gm.k;
      const mine = this.classify(dx, dy);
      const sigma = 34 - 4.5 * this.opp.joust;
      const theirs = this.classify(U.gauss() * sigma, U.gauss() * sigma * 0.8);
      const pts = { solid: 3, body: 2, glance: 1, miss: 0, horse: 0 };
      let lines = [];
      let over = false;
      this.phase = 'result'; this.resumeAt = this.t + 2.2; this.shake = 1;
      W.audio.sfx(mine === 'miss' ? 'lance' : 'clash');
      if (mine === 'horse') {
        this.result.horse = true; over = true; lines.push(t('joust.horse')); W.audio.sfx('error');
      } else {
        this.scoreMe += pts[mine]; lines.push(t('joust.' + mine));
        if (mine === 'solid' && U.chance(0.30 + 0.07 * (this.me.joust - this.opp.joust)) ) { this.result.unhorsedOpp = true; over = true; lines.push(t('joust.unhorsed_him')); W.audio.sfx('fall'); }
        else if (mine === 'body' && U.chance(0.07)) { this.result.unhorsedOpp = true; over = true; lines.push(t('joust.unhorsed_him')); W.audio.sfx('fall'); }
      }
      if (!over) {
        this.scoreOpp += pts[theirs];
        if (theirs === 'solid' && U.chance(0.30 + 0.07 * (this.opp.joust - this.me.joust))) { this.result.unhorsedMe = true; over = true; lines.push(t('joust.unhorsed_me')); W.audio.sfx('fall'); }
        else if (theirs === 'body' && U.chance(0.07)) { this.result.unhorsedMe = true; over = true; lines.push(t('joust.unhorsed_me')); }
      }
      for (let i = 0; i < 22; i++) this.fx.push({ x: this.aim.x, y: this.aim.y, vx: U.rnd() * 240 - 120, vy: -U.rnd() * 220, life: 0.8, c: i % 3 ? '#d9c9a0' : '#b22222' });
      this.msg = lines.join(' ');
      const passesMax = this.opts.passes || 3;
      if (!over && this.pass >= passesMax && this.scoreMe !== this.scoreOpp) over = true;
      if (!over && this.pass >= passesMax + 2) over = true;
      this.over = over;
      W.voice.speak(this.msg);
    }
    finish() {
      const r = this.result;
      r.scoreMe = this.scoreMe; r.scoreOpp = this.scoreOpp;
      if (r.horse) r.won = false;
      else if (r.unhorsedOpp) r.won = true;
      else if (r.unhorsedMe) r.won = false;
      else r.won = this.scoreMe > this.scoreOpp;
      this.done(r);
    }
    drawKnight(g, p, dead) {
      const gm = this.geo(p), k = gm.k; const c = this.opp.color;
      {
        const fr = dead ? (this.fall < 0.6 ? 2 : 3) : (this.phase === 'charge' ? Math.floor(this.t * 9) % 2 : 0);
        if (W.gfx.frame(g, 'rider_front_' + this.opp.id, 4, fr, gm.gx, gm.gy + 6 * k, 138 * k)) return;
      }
      g.save(); g.translate(gm.gx, gm.gy); g.scale(k, k);
      if (dead) { g.rotate(Math.min(1.4, this.fall * 2.2)); g.translate(0, this.fall * 40); }
      // horse
      g.fillStyle = '#5b3d24'; g.fillRect(-20, -28, 6, 30); g.fillRect(14, -28, 6, 30);
      g.beginPath(); g.ellipse(0, -48, 26, 22, 0, 0, 7); g.fill();
      g.fillStyle = '#6b4a2b'; g.beginPath(); g.moveTo(-9, -62); g.lineTo(9, -62); g.lineTo(7, -92); g.lineTo(-7, -92); g.fill();
      g.fillRect(-6, -76, 12, 9);
      g.fillStyle = c; g.fillRect(-26, -50, 52, 26); g.fillStyle = '#f1e4b0'; g.fillRect(-26, -40, 52, 5);
      // rider
      g.fillStyle = c; g.fillRect(-12, -102, 24, 32);
      g.fillStyle = '#9aa3ad'; g.fillRect(-8, -122, 16, 20); g.fillStyle = '#000'; g.fillRect(-6, -114, 12, 3);
      g.fillStyle = '#f1e4b0'; g.fillRect(-2, -132, 4, 10);
      // lance
      g.strokeStyle = '#d9c9a0'; g.lineWidth = 3; g.beginPath(); g.moveTo(12, -92); g.lineTo(-70, -78); g.stroke();
      g.fillStyle = '#bbb'; g.beginPath(); g.moveTo(-70, -81); g.lineTo(-90, -77); g.lineTo(-70, -75); g.fill();
      W.gfx.shield(g, -14, -86, 0.95, c, '#f1e4b0', 1 + (this.opp.joust % 3));
      g.restore();
    }
    draw(g) {
      g.save();
      if (this.shake > 0) g.translate(U.rnd() * 8 * this.shake - 4 * this.shake, U.rnd() * 8 * this.shake - 4 * this.shake);
      W.gfx.bg(g, 'bg_joust', (g) => W.gfx.jousting(g, this.t));
      // tilt barrier (perspective rail)
      g.strokeStyle = '#d9c9a0'; g.lineWidth = 6; g.beginPath(); g.moveTo(316, 210); g.lineTo(240, 400); g.stroke();
      g.strokeStyle = '#7a5a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(316, 210); g.lineTo(240, 400); g.stroke();
      const p = this.phase === 'charge' ? this.p : this.phase === 'result' ? 1 : 0;
      if (this.phase !== 'ready' || true) this.drawKnight(g, this.phase === 'ready' ? 0.02 : p, this.result.unhorsedOpp && this.phase === 'result');
      // own horse (point of view) bobbing with the gallop
      { const ph = this.phase === 'charge' ? [0, 1, 2, 1][Math.floor(this.t * 8) % 4] : (this.phase === 'result' ? 0 : Math.floor(this.t * 1.2) % 2);
        W.gfx.frame(g, 'pov_' + this.me.id, 3, ph, 320, 408 + (this.phase === 'charge' ? Math.sin(this.t * 16) * 3 : 0), 220); }
      // own lance + reticle
      const ax = this.aim.x, ay = this.aim.y;
      g.strokeStyle = '#d9c9a0'; g.lineWidth = 7; g.beginPath(); g.moveTo(620, 420); g.lineTo(ax + 6, ay + 6); g.stroke();
      g.strokeStyle = '#7a5a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(620, 420); g.lineTo(ax + 6, ay + 6); g.stroke();
      g.fillStyle = '#bbb'; g.beginPath(); g.arc(ax, ay, 5, 0, 7); g.fill();
      g.strokeStyle = '#ff3030'; g.lineWidth = 2; g.beginPath(); g.arc(ax, ay, 14, 0, 7); g.moveTo(ax - 20, ay); g.lineTo(ax - 8, ay); g.moveTo(ax + 8, ay); g.lineTo(ax + 20, ay); g.moveTo(ax, ay - 20); g.lineTo(ax, ay - 8); g.moveTo(ax, ay + 8); g.lineTo(ax, ay + 20); g.stroke();
      this.fx.forEach((f) => { g.fillStyle = f.c; g.fillRect(f.x, f.y, 4, 4); });
      g.restore();
      // HUD
      g.fillStyle = 'rgba(30,18,6,.8)'; g.fillRect(8, 8, 190, 70); g.strokeStyle = '#d8a526'; g.lineWidth = 2; g.strokeRect(8, 8, 190, 70);
      E.text(t('joust.title') + ' – ' + t('joust.pass', { n: Math.max(1, this.pass) }), 16, 28, { font: 'bold 13px Georgia, serif', color: '#f5d77a' });
      E.text(t('joust.you') + ' ' + this.me.name.split(' ')[0] + ': ' + this.scoreMe, 16, 46, { font: '13px Georgia, serif', color: '#fff' });
      E.text(t('joust.him') + ' ' + this.opp.name.split(' ')[0] + ': ' + this.scoreOpp, 16, 64, { font: '13px Georgia, serif', color: '#fff' });
      if (this.msg && this.phase === 'result') E.text(this.msg, 320, 90, { font: 'bold 22px Georgia, serif', align: 'center', color: '#fff3b0' });
    }
  }
  W.scenes.JoustScene = JoustScene;
})();
