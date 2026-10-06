/*
 * Audio manager. Three independent channels: music, sfx, voice.
 * Each has on/off + volume (see settings). Real files are optional:
 *   assets/audio/music/<key>.mp3|ogg   assets/audio/sfx/<key>.mp3|ogg
 * Register them in WOTC.audio.manifest. Missing files are ignored; for sfx a
 * tiny synthesized fallback is played so the sliders can be tested right now.
 */
(function () {
  const W = window.WOTC;
  const S = W.settings;
  let ctx = null;
  const cache = {};
  let musicEl = null, musicKey = null;

  // Declare available files here (or via a mod). key -> path
  const manifest = {
    music: { /* title: 'assets/audio/music/title.mp3', map: 'assets/audio/music/map.mp3', joust: ..., battle: ... */ },
    sfx: { /* hit: 'assets/audio/sfx/hit.mp3' */ },
  };

  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // synthesized fallbacks: [freq, dur, type, slideTo, delay]
  const synth = {
    click: [[660, .05, 'square']],
    hit: [[140, .12, 'sawtooth', 60], [90, .1, 'square', 50, .05]],
    clash: [[900, .06, 'square', 500], [1300, .05, 'square', 700, .04], [300, .08, 'sawtooth', 120, .07]],
    lance: [[200, .08, 'sawtooth', 80], [1500, .04, 'square', 300, .02]],
    fall: [[300, .35, 'sawtooth', 50]],
    gallop: [[110, .05, 'square'], [110, .05, 'square', 0, .12], [110, .05, 'square', 0, .24], [110, .05, 'square', 0, .36]],
    catapult: [[100, .25, 'sawtooth', 400], [500, .15, 'triangle', 80, .25]],
    stone: [[80, .3, 'sawtooth', 30]],
    coin: [[1200, .07, 'square'], [1700, .12, 'square', 0, .07]],
    fanfare: [[523, .15, 'square'], [659, .15, 'square', 0, .15], [784, .3, 'square', 0, .3]],
    sad: [[392, .25, 'triangle'], [330, .25, 'triangle', 0, .25], [262, .5, 'triangle', 0, .5]],
    bell: [[880, .6, 'sine'], [1320, .5, 'sine', 0, .02]],
    horn: [[220, .5, 'sawtooth', 330]],
    sword: [[2000, .05, 'square', 900], [1200, .07, 'square', 600, .03]],
    error: [[200, .12, 'square'], [150, .15, 'square', 0, .12]],
  };

  function blip(spec, vol) {
    const c = ac(); if (!c) return;
    spec.forEach(([f, d, type, slide, delay]) => {
      const t0 = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(f, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + d);
      g.gain.setValueAtTime(0.18 * vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + d + 0.02);
    });
  }

  const audio = {
    manifest,
    synth,
    unlock() { ac(); },
    /** effective volume 0..1 for a channel (0 if switched off) */
    vol(ch) { const c = S.data[ch]; return c && c.on ? W.util.clamp(c.vol * S.data.master, 0, 1) : 0; },

    sfx(key) {
      const v = audio.vol('sfx'); if (v <= 0) return;
      const path = manifest.sfx[key];
      if (path) {
        const a = new Audio(path); a.volume = v;
        a.onerror = () => synth[key] && blip(synth[key], v);
        a.play().catch(() => synth[key] && blip(synth[key], v));
      } else if (synth[key]) blip(synth[key], v);
    },

    music(key, opts) {
      opts = opts || {};
      if (key === musicKey && musicEl && !musicEl.paused) return;
      audio.stopMusic();
      musicKey = key;
      const path = manifest.music[key];
      if (!path) return;
      musicEl = new Audio(path); musicEl.loop = opts.loop !== false;
      musicEl.volume = audio.vol('music');
      musicEl.onerror = () => { musicEl = null; };
      musicEl.play().catch(() => { /* needs user gesture; retried on next music() call */ });
    },
    stopMusic() { if (musicEl) { musicEl.pause(); musicEl = null; } musicKey = null; },
    refresh() { // called when settings change
      if (musicEl) { musicEl.volume = audio.vol('music'); if (audio.vol('music') <= 0) musicEl.pause(); else if (musicEl.paused) musicEl.play().catch(() => {}); }
      else if (musicKey && audio.vol('music') > 0) { const k = musicKey; musicKey = null; audio.music(k); }
    },
  };
  W.audio = audio;
  W.events.on('settings', (e) => { if (e.path.startsWith('music') || e.path === 'master') audio.refresh(); });
  window.addEventListener('pointerdown', () => ac(), { once: true });
})();
