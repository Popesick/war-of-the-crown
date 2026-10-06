/* Siege: loose catapult stones at the castle wall. Angle = mouse height, power = oscillating gauge. */
(function () {
  const W = window.WOTC, E = W.Engine, t = W.t, U = W.util;
  const GROUND = 318, CX = 100, WALL_X = 430, WALL_W = 170;

  class SiegeScene extends W.Scene {
    // opts: {shots, wallHp, castleName}
    enter() {
      W.audio.music('siege');
      this.shots = this.opts.shots; this.hp = this.opts.wallHp; this.maxHp = this.opts.wallHp;
      this.angle = 45; this.power = 0; this.proj = null; this.cooldown = 0; this.msg = ''; this.fx = []; this.shake = 0; this.end = false;
      W.voice.speak(t('conq.siege'));
      this.hitCount = 0; this.scars = []; this.puffs = [];
    }
    onMove(x, y) { this.angle = U.clamp(80 - (y / 400) * 80, 15, 75); }
    onKey(e) { if (e.key === 'ArrowUp') this.angle = Math.min(75, this.angle + 3); if (e.key === 'ArrowDown') this.angle = Math.max(15, this.angle - 3); if (e.key === ' ' || e.key === 'Enter') this.fire(); }
    onClick() { this.fire(); }
    fire() {
      if (this.proj || this.shots <= 0 || this.end) return;
      const a = this.angle * Math.PI / 180, v = 160 + this.power * 300;
      this.proj = { x: CX + 62, y: GROUND - 112, vx: Math.cos(a) * v, vy: -Math.sin(a) * v, trail: [] };
      this.shots--; W.audio.sfx('catapult'); this.arm = 0.5;
    }
    update(dt) {
      this.power = (Math.sin(this.t * 2.2) + 1) / 2;
      if (this.arm > 0) this.arm -= dt; this.shake = Math.max(0, this.shake - dt * 3);
      this.puffs = this.puffs.filter((q) => (q.life -= dt) > 0);
      this.fx = this.fx.filter((f) => (f.life -= dt) > 0); this.fx.forEach((f) => { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 400 * dt; });
      const p = this.proj;
      if (p) {
        p.trail.push([p.x, p.y]); if (p.trail.length > 18) p.trail.shift();
        p.vy += 380 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x >= WALL_X && p.x < WALL_X + WALL_W && p.y > GROUND - 130 && p.y < GROUND) { this.hitWall(p); this.proj = null; }
        else if (p.y >= GROUND) { this.msg = '…'; W.audio.sfx('stone'); this.puff(p.x, GROUND); this.proj = null; this.check(); }
        else if (p.x > WALL_X + WALL_W) { this.msg = '…'; this.proj = null; this.check(); }
      }
    }
    puff(x, y) { this.puffs.push({ x, y, life: 0.7, max: 0.7 }); for (let i = 0; i < 12; i++) this.fx.push({ x, y, vx: U.rnd() * 120 - 60, vy: -U.rnd() * 120, life: 0.7, c: '#8a7a50' }); }
    hitWall(p) {
      const h = GROUND - p.y; // height above ground
      const dmg = h < 50 ? 3 : h < 100 ? 2 : 1;
      this.hp -= dmg; this.hitCount++; this.scars.push({ x: p.x, y: p.y, r: 5 + dmg * 3, a: U.rnd() * 6 }); this.shake = 1; W.audio.sfx('stone'); this.puff(p.x, p.y);
      this.msg = '-' + dmg;
      this.check();
    }
    check() {
      if (this.hp <= 0) { this.end = true; setTimeout(() => this.done({ breached: true }), 900); }
      else if (this.shots <= 0) { this.end = true; setTimeout(() => this.done({ breached: false }), 1200); }
    }
    draw(g) {
      g.save(); if (this.shake > 0) g.translate(U.rnd() * 6 * this.shake - 3, U.rnd() * 6 * this.shake - 3);
      W.gfx.bg(g, 'bg_siege', (g) => W.gfx.siegeBg(g, this.t));
      const frac = Math.max(0, this.hp) / this.maxHp;
      // impact scars on the real castle wall
      this.scars.forEach((c) => {
        g.fillStyle = 'rgba(30,22,14,.75)'; g.beginPath(); g.arc(c.x, c.y, c.r, 0, 7); g.fill();
        g.strokeStyle = 'rgba(20,14,8,.8)'; g.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) { const an = c.a + i * 1.25; g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(c.x + Math.cos(an) * (c.r + 9), c.y + Math.sin(an) * (c.r + 9)); g.stroke(); }
      });
      // rubble at the wall foot grows with the damage
      const piles = Math.floor((1 - frac) * 4 + (frac <= 0 ? 1 : 0));
      for (let i = 0; i < piles; i++) if (!W.gfx.sprite(g, 'siege_rubble', WALL_X + 30 + i * 42, GROUND + 8 + (i % 2) * 6, 34 + i * 6)) { g.fillStyle = '#777'; g.fillRect(WALL_X + 20 + i * 42, GROUND - 6, 30, 10); }
      // catapult: 0 cocked, 1 swinging, 2 released
      const arm = this.arm > 0 ? 1 - this.arm / 0.5 : 0;
      const cf = this.arm > 0 ? (arm < 0.35 ? 1 : 2) : (this.proj ? 2 : 0);
      if (!W.gfx.frame(g, 'siege_catapult', 3, cf, CX, GROUND + 16, 130)) {
        g.fillStyle = '#5a3a1a'; g.fillRect(CX - 20, GROUND - 24, 80, 10); g.fillRect(CX + 6, GROUND - 52, 8, 40);
        g.save(); g.translate(CX + 10, GROUND - 52); g.rotate(-(this.angle * Math.PI / 180) * (this.arm > 0 ? 0.6 + arm * 0.4 : 1) + 0.3); g.fillStyle = '#7a5a2a'; g.fillRect(-4, -50, 8, 50); g.restore();
      }
      // aim guide
      if (!this.proj && this.shots > 0 && !this.end) {
        const a = this.angle * Math.PI / 180, v = 160 + this.power * 300; let x = CX + 62, y = GROUND - 112, vx = Math.cos(a) * v, vy = -Math.sin(a) * v;
        g.fillStyle = 'rgba(255,255,255,.55)';
        for (let i = 0; i < 14; i++) { vy += 380 * 0.06; x += vx * 0.06; y += vy * 0.06; if (y > GROUND) break; g.fillRect(x, y, 3, 3); }
      }
      const p = this.proj;
      if (p) { p.trail.forEach(([x, y], i) => { g.fillStyle = 'rgba(60,60,60,' + i / 20 + ')'; g.fillRect(x, y, 3, 3); }); if (!W.gfx.sprite(g, 'siege_stone', p.x, p.y + 7, 14)) { g.fillStyle = '#333'; g.beginPath(); g.arc(p.x, p.y, 6, 0, 7); g.fill(); } }
      this.puffs.forEach((q) => { const k = 1 - q.life / q.max; g.globalAlpha = Math.min(1, q.life / q.max * 1.4); W.gfx.sprite(g, 'siege_dust', q.x, q.y + 20, 50 + k * 36); g.globalAlpha = 1; });
      this.fx.forEach((f) => { g.fillStyle = f.c; g.fillRect(f.x, f.y, 4, 4); });
      g.restore();
      // HUD
      g.fillStyle = 'rgba(30,18,6,.82)'; g.fillRect(8, 8, 230, 78); g.strokeStyle = '#d8a526'; g.lineWidth = 2; g.strokeRect(8, 8, 230, 78);
      E.text(t('siege.title') + ': ' + (this.opts.castleName || ''), 16, 28, { font: 'bold 13px Georgia, serif', color: '#f5d77a' });
      E.text(t('siege.shots', { n: this.shots }), 16, 46, { font: '13px Georgia, serif', color: '#fff' });
      g.fillStyle = '#400'; g.fillRect(16, 54, 214, 10); g.fillStyle = '#c93'; g.fillRect(16, 54, 214 * frac, 10); E.text(t('siege.wall'), 16, 78, { font: '11px Georgia, serif', color: '#ddd' });
      // power gauge
      g.fillStyle = '#000a'; g.fillRect(250, 12, 140, 18); g.fillStyle = '#e8c040'; g.fillRect(252, 14, 136 * this.power, 14); E.text(t('siege.power'), 252, 44, { font: '11px Georgia, serif', color: '#fff' });
      E.text(t('siege.aim'), 320, 385, { font: '12px Georgia, serif', align: 'center', color: '#fff' });
      if (this.msg) E.text(this.msg, 480, 120, { font: 'bold 24px Georgia, serif', color: '#fff3b0' });
    }
  }
  W.scenes.SiegeScene = SiegeScene;
})();
