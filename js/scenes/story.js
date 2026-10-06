/* StoryScene: a background (image or procedural) + narration text(s) with voice. Used for intro/outro/events. */
(function () {
  const W = window.WOTC, E = W.Engine, t = W.t;
  class StoryScene extends W.Scene {
    // opts: {bg:'bg_end_win', fallback:'hall'|'castle'|'parch', lines:[string], title, lord}
    async enter() {
      for (const ln of this.opts.lines) await W.ui.say(ln, { title: this.opts.title });
      this.done();
    }
    draw(g) {
      const k = this.opts.fallback || 'hall';
      W.gfx.bg(g, this.opts.bg || 'bg_story', (g) => {
        if (k === 'hall') W.gfx.hallBg(g, this.t);
        else if (k === 'title') W.gfx.titleBg(g, this.t);
        else if (k === 'field') W.gfx.battleBg(g, this.t);
        else W.gfx.parchment(g);
      });
      if (this.opts.lord) W.gfx.portrait(g, this.opts.lord, 250, 40, 140, 150);
      if (this.opts.hearts) for (let i = 0; i < 8; i++) { const y = 380 - ((this.t * 40 + i * 50) % 340); E.text('♥', 120 + i * 60 + Math.sin(this.t * 2 + i) * 10, y, { font: '24px serif', color: '#e0405a' }); }
    }
  }
  W.scenes.StoryScene = StoryScene;
})();
