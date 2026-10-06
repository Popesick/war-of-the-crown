/*
 * Image assets. Scenes ask for  WOTC.assets.get('bg_joust'). If assets/img/<key>.png exists it is
 * used, otherwise the scene's procedural fallback (js/gfx/draw.js) is drawn. This lets generated
 * artwork be dropped in later without touching code. Optional overrides: WOTC.assets.manifest.
 */
(function () {
  const W = window.WOTC;
  const images = {};
  const assets = {
    manifest: {}, // key -> path override
    path: (key) => assets.manifest[key] || 'assets/img/' + key + '.png',
    /** returns HTMLImageElement when loaded, else null (and starts loading once) */
    get(key) {
      let e = images[key];
      if (!e) {
        e = images[key] = { img: new Image(), ok: false };
        e.img.onload = () => { e.ok = true; W.events.emit('asset', key); };
        e.img.onerror = () => { e.ok = false; e.failed = true; };
        e.img.src = assets.path(key);
      }
      return e.ok ? e.img : null;
    },
    failed: (key) => !!(images[key] && images[key].failed),
    preload(keys) { keys.forEach((k) => assets.get(k)); },
  };
  W.assets = assets;
})();
