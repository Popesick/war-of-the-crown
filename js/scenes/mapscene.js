/* Map scene: read the map, or pick a territory (conquest target, raid target, tournament stakes). */
(function () {
  const W = window.WOTC, E = W.Engine, t = W.t;
  const OX = 8, OY = 0; // map origin on the 640x400 screen

  class MapScene extends W.Scene {
    // opts: {state, mode:'view'|'pick', prompt, valid:(tid)=>bool, cancelable:true}
    enter() {
      this.s = this.opts.state; this.hover = null; this.dirty = true; this.lastKey = '';
      W.audio.music('map');
      this.addButton({ x: 440, y: 356, w: 180, h: 30, label: () => (this.opts.mode === 'pick' ? t('ui.cancel') : t('build.done')), key: 'escape', onClick: () => this.done(null) });
    }
    wrapText(g, text, x, y, w, lh) {
      g.save(); g.font = 'bold 15px Georgia, serif'; let line = '', yy = y;
      text.split(' ').forEach((wd) => { const tst = line ? line + ' ' + wd : wd; if (g.measureText(tst).width > w && line) { E.text(line, x, yy, { font: g.font, align: 'center', color: '#ffd', base: 'middle' }); line = wd; yy += lh; } else line = tst; });
      E.text(line, x, yy, { font: g.font, align: 'center', color: '#ffd', base: 'middle' }); g.restore();
    }
    onMove(x, y) { const id = W.GameMap.idAt(x - OX, y - OY); if (id !== this.hover) { this.hover = id; this.dirty = true; } }
    onClick(x, y) {
      const id = W.GameMap.idAt(x - OX, y - OY); if (!id) return;
      if (this.opts.mode === 'pick') { if (!this.opts.valid || this.opts.valid(id)) this.done(id); else W.audio.sfx('error'); }
      else { W.audio.sfx('click'); this.speakInfo(id); }
    }
    speakInfo(id) { const tr = this.s.terr[id]; W.voice.speak(tr.name + '. ' + this.ownerText(tr)); }
    ownerText(tr) { return !tr.owner ? t('map.not_owned') : tr.owner === this.s.playerId ? t('map.owned_you') : t('map.owned_by', { lord: this.s.lords[tr.owner].name }); }
    draw(g) {
      W.gfx.bg(g, 'bg_map', (g) => W.gfx.parchment(g));
      const key = (W.GameMap.textures(400, 400) ? 'T' : 'F') + this.hover + '|' + this.s.turn + '|' + JSON.stringify(Object.values(this.s.terr).map((x) => x.owner));
      if (this.dirty || key !== this.lastKey) {
        const dim = this.opts.mode === 'pick' && this.opts.valid ? (id) => !this.opts.valid(id) : null;
        W.GameMap.render(this.s, { highlight: this.hover, dim }); this.dirty = false; this.lastKey = key;
      }
      g.drawImage(W.GameMap.canvas, OX, OY);
      const c = W.GameMap.cache;
      // castles + names
      this.s.order.forEach((id) => {
        const tr = this.s.terr[id], [cx, cy] = c.centers[id];
        const x = OX + cx, y = OY + cy;
        if (tr.castle) {
          g.fillStyle = '#e8e2d0'; g.fillRect(x - 6, y - 5, 12, 9); g.fillRect(x - 8, y - 9, 4, 6); g.fillRect(x + 4, y - 9, 4, 6); g.fillRect(x - 2, y - 8, 4, 4);
          g.fillStyle = '#222'; g.fillRect(x - 2, y - 1, 4, 5);
          g.strokeStyle = '#000'; g.lineWidth = 1; g.strokeRect(x - 6.5, y - 5.5, 13, 10);
        }
        E.text(tr.name, x, y + 16, { font: 'bold 10px Georgia, serif', align: 'center', color: '#fff', shadow: '#000' });
      });
      // campaign army marker
      const cp = this.s.campaign;
      if (this.s.men(cp.units) > 0 || cp.at !== this.s.homeId) {
        const [cx, cy] = c.centers[cp.at]; const x = OX + cx + 14, y = OY + cy - 12;
        g.fillStyle = '#222'; g.fillRect(x, y - 12, 2, 18); g.fillStyle = this.s.player.color; g.fillRect(x + 2, y - 12, 10, 7);
      }
      // right panel
      g.fillStyle = 'rgba(30,18,6,.82)'; g.fillRect(420, 12, 212, 376); g.strokeStyle = '#d8a526'; g.lineWidth = 2; g.strokeRect(420, 12, 212, 376);
      E.text(this.s.player.name, 526, 36, { font: 'bold 14px Georgia, serif', align: 'center', color: '#f5d77a' });
      E.text(t('date.line', { month: this.s.monthName(), year: this.s.year }), 526, 56, { font: '14px Georgia, serif', align: 'center', color: '#fff' });
      E.text(t('status.line', { gold: this.s.player.gold, lands: this.s.ownedBy(this.s.playerId).length }), 526, 76, { font: '13px Georgia, serif', align: 'center', color: '#f1e4b0' });
      const sel = this.hover && this.s.terr[this.hover];
      if (this.opts.mode === 'pick' && !sel) this.wrapText(g, this.opts.prompt || t('map.select'), 526, 120, 150, 19);
      if (sel) {
        E.text(sel.name, 526, 128, { font: 'bold 20px Georgia, serif', align: 'center', color: '#fff' });
        E.text(this.ownerText(sel), 526, 152, { font: '14px Georgia, serif', align: 'center', color: sel.owner ? this.s.lords[sel.owner].color === '#555555' ? '#ccc' : '#fff' : '#bba' });
        E.text(t('ui.per_month', { n: sel.gold + (sel.castle ? this.s.rs.income.castleBonus : 0) }), 526, 176, { font: '14px Georgia, serif', align: 'center', color: '#f5d77a' });
        E.text(t('ui.vassals', { n: sel.vassals }), 526, 196, { font: '14px Georgia, serif', align: 'center', color: '#f5d77a' });
        E.text(sel.castle ? t('map.castle') : t('map.no_castle'), 526, 216, { font: '14px Georgia, serif', align: 'center', color: '#ddd' });
        if (sel.owner === this.s.playerId) { E.text(this.s.men(sel.garrison) + ' ' + t('unit.soldier') + '/' + t('unit.knight'), 526, 238, { font: '13px Georgia, serif', align: 'center', color: '#9fd' }); }
      }
      // prompt is shown in the side panel
    }
  }
  W.scenes.MapScene = MapScene;
})();
