/* Swordplay: alternate strikes and parries across three zones (high / middle / low). */
(function () {
  const W = window.WOTC, E = W.Engine, t = W.t, U = W.util;
  const ZONES = ['high', 'mid', 'low'];

  class DuelScene extends W.Scene {
    // opts: {me (lord), foe:{name, sword}, intro}
    enter() {
      W.audio.music('duel');
      this.me = this.opts.me; this.foe = this.opts.foe;
      this.maxMe = 4 + this.me.sword; this.maxFoe = 3 + this.foe.sword;
      this.hpMe = this.maxMe; this.hpFoe = this.maxFoe;
      this.mode = 'attack'; this.state = 'input'; this.msg = t('duel.attack'); this.timer = 0;
      this.pose = { me: 1, foe: 1 }; this.flash = 0;
      this.buildButtons();
      W.voice.speak(this.msg);
    }
    buildButtons() {
      this.clearButtons();
      ZONES.forEach((z, i) => this.addButton({ x: 40 + i * 120, y: 350, w: 110, h: 34, label: () => t('duel.' + z), key: String(i + 1), onClick: () => this.pick(i) }));
    }
    pick(i) {
      if (this.state !== 'input') return;
      if (this.mode === 'attack') {
        const guess = U.clamp(0.28 + 0.07 * (this.foe.sword - this.me.sword), 0.12, 0.6);
        const g = U.chance(guess) ? i : U.pick(ZONES.map((_, k) => k).filter((k) => k !== i));
        this.pose.me = i; this.pose.foe = g;
        this.resolve(g === i ? 'blocked' : 'hit', 'foe');
      } else {
        this.pose.me = i; this.pose.foe = this.foeZone;
        this.resolve(i === this.foeZone ? 'blocked' : 'hit', 'me');
      }
    }
    resolve(kind, target) {
      this.state = 'anim'; this.timer = 0.9;
      if (kind === 'blocked') { W.audio.sfx('clash'); this.msg = '⚔'; }
      else {
        W.audio.sfx('hit'); this.flash = 0.4;
        if (target === 'foe') { this.hpFoe--; } else { this.hpMe--; }
        this.msg = target === 'foe' ? '✔' : '✖';
      }
      this.clearButtons();
    }
    update(dt) {
      if (this.flash > 0) this.flash -= dt;
      if (this.state !== 'anim' && this.state !== 'tell') return;
      this.timer -= dt;
      if (this.state === 'tell' && this.timer <= 0) { // too slow: enemy hits
        this.pose.foe = this.foeZone; this.pose.me = (this.foeZone + 1) % 3; this.resolve('hit', 'me'); return;
      }
      if (this.state === 'anim' && this.timer <= 0) {
        if (this.hpFoe <= 0 || this.hpMe <= 0) { this.finish(); return; }
        this.mode = this.mode === 'attack' ? 'defend' : 'attack';
        this.state = 'input'; this.buildButtons();
        if (this.mode === 'defend') {
          this.foeZone = U.int(0, 2);
          const tellOk = U.chance(U.clamp(0.55 + 0.08 * (this.me.sword - this.foe.sword), 0.3, 0.9));
          this.tell = tellOk ? this.foeZone : U.pick([0, 1, 2].filter((k) => k !== this.foeZone));
          this.pose.foe = this.tell; this.state = 'tell'; this.timer = 1.6 - 0.1 * this.foe.sword; this.msg = t('duel.guard');
          W.audio.sfx('sword');
        } else { this.msg = t('duel.attack'); this.pose.foe = 1; this.pose.me = 1; }
      }
    }
    onKey() {}
    pick2(i) { this.pick(i); }
    finish() { this.done({ won: this.hpFoe <= 0, hpLeft: this.hpMe }); }
    figure(g, x, facing, pose, col, hit) {
      g.save(); g.translate(x, 290); g.scale(facing, 1);
      if (hit) g.translate(-6, 0);
      g.fillStyle = '#2a1a10'; g.fillRect(-14, 0, 10, 50); g.fillRect(4, 0, 10, 50);
      g.fillStyle = col; g.fillRect(-18, -60, 36, 62);
      g.fillStyle = '#e0b48c'; g.fillRect(-9, -88, 18, 26);
      g.fillStyle = '#9aa3ad'; g.fillRect(-10, -92, 20, 12);
      const ang = [-1.2, -0.1, 0.9][pose];
      g.save(); g.translate(18, -38); g.rotate(ang); g.fillStyle = '#ddd'; g.fillRect(0, -2, 62, 4); g.fillStyle = '#a77a20'; g.fillRect(-2, -6, 4, 12); g.restore();
      g.restore();
    }
    draw(g) {
      W.gfx.bg(g, 'bg_duel', (g) => W.gfx.duelBg(g, this.t));
      const me = this.pose.me, foe = this.pose.foe;
      this.figure(g, 190, 1, me, this.me.color, this.state === 'anim' && this.mode === 'defend' && this.msg === '✖');
      this.figure(g, 450, -1, foe, this.opts.foe.color || '#6a1010', this.state === 'anim' && this.mode === 'attack' && this.msg === '✔');
      if (this.flash > 0) { g.fillStyle = 'rgba(255,255,255,' + this.flash + ')'; g.fillRect(0, 0, 640, 400); }
      const bar = (x, v, m, name) => { g.fillStyle = '#000a'; g.fillRect(x, 14, 220, 30); g.fillStyle = '#400'; g.fillRect(x + 4, 28, 212, 12); g.fillStyle = '#d33'; g.fillRect(x + 4, 28, 212 * Math.max(0, v) / m, 12); E.text(name, x + 6, 24, { font: 'bold 12px Georgia, serif', color: '#f5d77a' }); };
      bar(14, this.hpMe, this.maxMe, this.me.name); bar(406, this.hpFoe, this.maxFoe, this.foe.name);
      E.text(this.msg, 320, 90, { font: 'bold 26px Georgia, serif', align: 'center', color: '#fff3b0' });
      if (this.state === 'tell') { g.fillStyle = '#d8a526'; g.fillRect(220, 100, 200 * Math.max(0, this.timer) / 1.6, 5); }
    }
  }
  W.scenes.DuelScene = DuelScene;
})();
