/* Field battle: two armies clash; every round the player picks a stance (when taking part). */
(function () {
  const W = window.WOTC, E = W.Engine, t = W.t, U = W.util;

  class BattleScene extends W.Scene {
    // opts: {state, battle:W.Battle, playerSide:'att'|'def', title, attName, defName}
    enter() {
      W.audio.music('battle');
      this.b = this.opts.battle; this.ps = this.opts.playerSide; this.s = this.opts.state;
      this.phase = 'choose'; this.timer = 0; this.clash = 0; this.last = null; this.msg = t('battle.how');
      this.shown = { att: this.men('att'), def: this.men('def') };
      this.build();
      W.voice.speak(this.opts.title ? this.opts.title + ' ' + this.msg : this.msg);
    }
    men(side) { return this.b[side].units.knight + this.b[side].units.soldier; }
    build() {
      this.clearButtons();
      [['ferocious', 'battle.ferocious'], ['stand', 'battle.stand'], ['retreat', 'battle.retreat']].forEach(([id, key], i) =>
        this.addButton({ x: 24 + i * 200, y: 356, w: 190, h: 32, label: () => t(key), key: String(i + 1), onClick: () => this.go(id) }));
    }
    go(stance) {
      if (this.phase !== 'choose') return;
      const me = this.ps, foe = me === 'att' ? 'def' : 'att';
      const foeStance = W.Battle.aiStance(this.b[foe], this.b[me], this.s.rs);
      const a = me === 'att' ? stance : foeStance, d = me === 'att' ? foeStance : stance;
      this.last = this.b.step(a, d); this.phase = 'clash'; this.timer = 1.3; this.clearButtons();
      W.audio.sfx('clash'); this.msg = t('battle.havatyou');
      this.stances = { a, d };
    }
    update(dt) {
      if (this.phase === 'clash') {
        this.timer -= dt; this.clash = Math.sin((1.3 - this.timer) / 1.3 * Math.PI);
        if (Math.random() < 0.15) W.audio.sfx('sword');
        if (this.timer <= 0) {
          this.shown = { att: this.men('att'), def: this.men('def') };
          this.clash = 0;
          if (this.b.over) { this.phase = 'end'; this.timer = 1.4; W.audio.sfx(this.b.winner === this.ps ? 'fanfare' : 'sad'); }
          else { this.phase = 'choose'; this.msg = t('battle.how'); this.build(); }
        }
      } else if (this.phase === 'end') { this.timer -= dt; if (this.timer <= 0) this.done({ winner: this.b.winner, fled: this.b.fled, att: this.b.att.units, def: this.b.def.units }); }
    }
    drawArmy(g, side) {
      const army = this.b[side]; const total = this.shown[side];
      const scale = Math.max(1, Math.ceil(this.b.start[side].soldier / 18 + this.b.start[side].knight / 8));
      const kn = Math.min(army.units.knight, 14), so = Math.ceil(army.units.soldier / scale);
      const facing = side === 'att' ? 1 : -1;
      const base = side === 'att' ? 180 : 460;
      const col = army.lord ? army.lord.color : '#6a5a3a';
      const items = []; for (let i = 0; i < so; i++) items.push(false); for (let i = 0; i < kn; i++) items.push(true);
      items.forEach((k, i) => {
        const row = i % 3, colN = Math.floor(i / 3);
        const x = base - facing * (colN * 22) + facing * this.clash * 70, y = 285 + row * 28 - colN % 2 * 4;
        W.gfx.footman(g, x, y, 1.15, { facing, color: col, color2: '#ddd', knight: k, step: Math.round(Math.sin(this.t * 6 + i)), swing: -0.9 + (this.phase === 'clash' ? Math.sin(this.t * 14 + i) * 0.9 : 0) });
      });
    }
    draw(g) {
      W.gfx.bg(g, 'bg_battle', (g) => W.gfx.battleBg(g, this.t));
      if (this.b.def.castle) { W.gfx.castle(g, 560, 260, 1.0, '#8c8577', '#7a1f1f'); }
      this.drawArmy(g, 'att'); this.drawArmy(g, 'def');
      g.fillStyle = 'rgba(30,18,6,.82)'; g.fillRect(8, 8, 624, 54); g.strokeStyle = '#d8a526'; g.lineWidth = 2; g.strokeRect(8, 8, 624, 54);
      const nA = this.opts.attName || t('battle.yours'), nD = this.opts.defName || t('battle.enemy');
      E.text(nA, 20, 28, { font: 'bold 14px Georgia, serif', color: '#f5d77a' }); E.text(t('battle.remaining') + ': ' + this.shown.att, 20, 50, { font: '13px Georgia, serif', color: '#fff' });
      E.text(nD, 620, 28, { font: 'bold 14px Georgia, serif', color: '#f5d77a', align: 'right' }); E.text(t('battle.remaining') + ': ' + this.shown.def, 620, 50, { font: '13px Georgia, serif', align: 'right', color: '#fff' });
      if (this.opts.title) E.text(this.opts.title, 320, 36, { font: 'bold 15px Georgia, serif', align: 'center', color: '#ffd' });
      E.text(this.msg, 320, 110, { font: 'bold 22px Georgia, serif', align: 'center', color: '#fff3b0' });
    }
  }
  W.scenes.BattleScene = BattleScene;
})();
