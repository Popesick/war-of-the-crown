(function () {
  const W = window.WOTC, E = W.Engine, t = W.t;

  class TitleScene extends W.Scene {
    enter() {
      W.audio.music('title');
      const cx = 320, y0 = 215, bw = 220, bh = 30;
      const hasSave = W.flow && W.flow.hasSave();
      const mk = (i, label, id, dis) => this.addButton({ x: cx - bw / 2, y: y0 + i * 38, w: bw, h: bh, label: () => t(label), disabled: dis, onClick: () => this.done(id) });
      mk(0, 'title.new', 'new'); mk(1, 'title.continue', 'load', !hasSave); mk(2, 'title.settings', 'settings'); mk(3, 'title.credits', 'credits');
    }
    draw(g) {
      W.gfx.bg(g, 'bg_title', (g) => W.gfx.titleBg(g, this.t));
      E.text(t('game.title').toUpperCase(), 320, 105, { font: 'bold 54px Georgia, serif', align: 'center', color: '#f5d77a', shadow: '#2a0a0a' });
      E.text('— ' + t('title.sub') + ' —', 320, 140, { font: 'italic 16px Georgia, serif', align: 'center', color: '#fff0c8' });
    }
  }

  class LordSelectScene extends W.Scene {
    enter() {
      this.rs = this.opts.rs; this.sel = 0;
      this.lords = this.rs.lords.filter((l) => l.side === 'saxon');
      this.lords.forEach((l, i) => this.addButton({ x: 30 + i * 150, y: 70, w: 140, h: 150, label: '', ghost: true, onClick: () => { this.sel = i; W.voice.speak(this.lords[i].name + '. ' + t(this.lords[i].blurb)); } }));
      this.addButton({ x: 220, y: 350, w: 200, h: 34, label: () => t('ui.ok'), key: 'enter', onClick: () => this.done(this.lords[this.sel].id) });
    }
    draw(g) {
      W.gfx.bg(g, 'bg_story', (g) => W.gfx.parchment(g));
      E.text(t('pick.title'), 320, 48, { font: 'bold 28px Georgia, serif', align: 'center', color: '#4a1a0a', shadow: '#fff6' });
      this.lords.forEach((l, i) => {
        const x = 30 + i * 150;
        W.gfx.portrait(g, l, x, 70, 140, 150);
        if (i === this.sel) { g.strokeStyle = '#d8a526'; g.lineWidth = 4; g.strokeRect(x - 3, 67, 146, 156); }
      });
      const l = this.lords[this.sel];
      E.text(l.name, 320, 248, { font: 'bold 22px Georgia, serif', align: 'center', color: '#2a1008', shadow: '#fff6' });
      const stat = (label, v, x, y) => {
        E.text(label, x, y, { font: 'bold 14px Georgia, serif', color: '#2a1008', shadow: '#fff5' });
        for (let i = 0; i < 5; i++) { g.fillStyle = i < v ? '#8a1c1c' : '#00000033'; g.fillRect(x + 100 + i * 18, y - 11, 14, 12); }
      };
      stat(t('pick.joust'), l.joust, 80, 280); stat(t('pick.sword'), l.sword, 80, 300); stat(t('pick.lead'), l.lead, 80, 320);
      g.fillStyle = '#2a1008'; g.font = 'italic 15px Georgia, serif';
      this.wrap(g, t(l.blurb), 330, 276, 270, 19);
    }
    wrap(g, text, x, y, w, lh) {
      const words = text.split(' '); let line = '';
      words.forEach((wd) => { const test = line + wd + ' '; if (g.measureText(test).width > w) { g.fillText(line, x, y); line = wd + ' '; y += lh; } else line = test; });
      g.fillText(line, x, y);
    }
  }
  W.scenes = W.scenes || {};
  W.scenes.TitleScene = TitleScene; W.scenes.LordSelectScene = LordSelectScene;
})();
