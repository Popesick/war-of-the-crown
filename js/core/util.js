/* War of the Crown - core utilities. Global namespace: WOTC */
(function () {
  const W = (window.WOTC = window.WOTC || {});
  W.VERSION = '0.1.0';

  // seeded RNG (mulberry32) for deterministic map generation
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const util = {
    mulberry32,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    rnd: () => Math.random(),
    int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
    chance: (p) => Math.random() < p,
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    gauss() { // approx N(0,1)
      let s = 0; for (let i = 0; i < 6; i++) s += Math.random();
      return (s - 3) * 1.414;
    },
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    deepMerge(t, s) {
      for (const k of Object.keys(s)) {
        if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) {
          t[k] = t[k] && typeof t[k] === 'object' ? t[k] : {};
          util.deepMerge(t[k], s[k]);
        } else t[k] = s[k];
      }
      return t;
    },
    clone: (o) => JSON.parse(JSON.stringify(o)),
  };
  W.util = util;

  // tiny event bus - the main extension point for mods
  const handlers = {};
  W.events = {
    on(name, fn) { (handlers[name] = handlers[name] || []).push(fn); return () => W.events.off(name, fn); },
    off(name, fn) { handlers[name] = (handlers[name] || []).filter((f) => f !== fn); },
    emit(name, data) { (handlers[name] || []).slice().forEach((f) => { try { f(data); } catch (e) { console.error('[event ' + name + ']', e); } }); },
    // async variant: handlers may return promises and may mutate `data`
    async emitAsync(name, data) {
      for (const f of (handlers[name] || []).slice()) { try { await f(data); } catch (e) { console.error('[event ' + name + ']', e); } }
      return data;
    },
  };
})();
