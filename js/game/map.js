/*
 * Procedural map: territories are a distorted Voronoi partition of an island outline, computed once.
 * Gives an id-map (for hit testing), adjacency, label anchors and a renderer. A different map for an
 * Extended edition = different outline/seeds in the ruleset, nothing else to change.
 */
(function () {
  const W = window.WOTC;
  const GameMap = (W.GameMap = { cache: null });

  function inside(poly, x, y) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }

  GameMap.build = function (rs) {
    const { w, h, outline } = rs.map;
    const ids = new Uint8Array(w * h).fill(255);
    const seeds = rs.territories.map((t) => t.seed);
    const sum = rs.territories.map(() => [0, 0, 0]);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!inside(outline, x + 0.5, y + 0.5)) continue;
        // domain warp -> organic borders
        const wx = x + Math.sin(y * 0.09 + x * 0.03) * 5 + Math.sin(y * 0.23) * 2;
        const wy = y + Math.cos(x * 0.08 - y * 0.04) * 5 + Math.cos(x * 0.21) * 2;
        let best = 0, bd = 1e9;
        for (let i = 0; i < seeds.length; i++) {
          const dx = wx - seeds[i][0], dy = wy - seeds[i][1];
          const d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = i; }
        }
        ids[y * w + x] = best;
        sum[best][0] += x; sum[best][1] += y; sum[best][2]++;
      }
    }
    // adjacency
    const adjSet = rs.territories.map(() => new Set());
    for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
      const a = ids[y * w + x];
      if (a === 255) continue;
      [ids[y * w + x + 1], ids[(y + 1) * w + x]].forEach((b) => { if (b !== 255 && b !== a) { adjSet[a].add(b); adjSet[b].add(a); } });
    }
    const adj = {}, centers = {};
    rs.territories.forEach((t, i) => {
      adj[t.id] = [...adjSet[i]].map((j) => rs.territories[j].id);
      centers[t.id] = sum[i][2] ? [sum[i][0] / sum[i][2], sum[i][1] / sum[i][2]] : t.seed.slice();
    });
    GameMap.cache = { ids, w, h, adj, centers, rs };
    return GameMap.cache;
  };

  GameMap.idAt = function (x, y) {
    const c = GameMap.cache; x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= c.w || y >= c.h) return null;
    const i = c.ids[y * c.w + x]; return i === 255 ? null : c.rs.territories[i].id;
  };

  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }

  /** pixel data of the painted sea / land textures (null until both images are loaded) */
  GameMap.textures = function (w, h) {
    if (GameMap._tex) return GameMap._tex;
    const sea = W.assets.get('map_sea'), land = W.assets.get('map_land');
    if ((!sea && !W.assets.failed('map_sea')) || (!land && !W.assets.failed('map_land'))) return null; // still loading
    if (!sea && !land) return null;
    const grab = (im) => { const c = Object.assign(document.createElement('canvas'), { width: w, height: h }), x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h); return x.getImageData(0, 0, w, h).data; };
    return (GameMap._tex = { sea: sea && grab(sea), land: land && grab(land) });
  };

  /** render the 400x400 map into an offscreen canvas. opts: highlight (id), dim (fn id->bool) */
  GameMap.render = function (state, opts) {
    opts = opts || {};
    const c = GameMap.cache, { w, h, ids, rs } = c;
    const cv = GameMap.canvas || (GameMap.canvas = Object.assign(document.createElement('canvas'), { width: w, height: h }));
    const g = cv.getContext('2d');
    const img = g.createImageData(w, h), d = img.data;
    const tex = GameMap.textures(w, h);
    const colors = rs.territories.map((t) => {
      const tr = state.terr[t.id]; const own = tr.owner ? state.lords[tr.owner].color : '#b8a874';
      return hex(own);
    });
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, id = ids[y * w + x];
      if (id === 255 && tex && tex.sea) { d[o] = tex.sea[o]; d[o + 1] = tex.sea[o + 1]; d[o + 2] = tex.sea[o + 2]; d[o + 3] = 255; continue; }
      if (id === 255) { // sea with gentle wave pattern
        const v = Math.sin(x * 0.2 + y * 0.12) * Math.sin(y * 0.17 - x * 0.05);
        d[o] = 28 + v * 6; d[o + 1] = 62 + v * 8; d[o + 2] = 112 + v * 10; d[o + 3] = 255; continue;
      }
      const tid = rs.territories[id].id;
      const tr = state.terr[tid];
      const n = Math.sin(x * 0.31) * Math.sin(y * 0.27) * 0.5 + Math.sin(x * 0.07 + y * 0.11) * 0.5;
      let f = 0.78 + n * 0.1;
      if (tr.owner) f = 0.62 + n * 0.08 + 0.18; // owned land more saturated
      let [r, gg, b] = colors[id];
      if (tex && tex.land) { // painted terrain tinted by the owner's colour
        const tr0 = tex.land[o], tg0 = tex.land[o + 1], tb0 = tex.land[o + 2], lum = (tr0 * 0.3 + tg0 * 0.59 + tb0 * 0.11) / 150;
        const m = tr.owner ? 0.5 : 0.12;
        r = tr0 * (1 - m) + r * lum * m * 1.3; gg = tg0 * (1 - m) + gg * lum * m * 1.3; b = tb0 * (1 - m) + b * lum * m * 1.3;
      } else {
      const base = tr.owner ? 0.35 : 0.0;
      r = r * (0.5 + base) * f + 70 * (1 - base); gg = gg * (0.5 + base) * f + 80 * (1 - base); b = b * (0.5 + base) * f + 30 * (1 - base);
      }
      if (opts.dim && opts.dim(tid)) { r *= 0.45; gg *= 0.45; b *= 0.45; }
      if (opts.highlight === tid) { r = Math.min(255, r * 1.35 + 30); gg = Math.min(255, gg * 1.35 + 30); b = Math.min(255, b * 1.2 + 20); }
      // borders
      const r1 = x + 1 < w ? ids[y * w + x + 1] : 255, d1 = y + 1 < h ? ids[(y + 1) * w + x] : 255, l1 = x > 0 ? ids[y * w + x - 1] : 255, u1 = y > 0 ? ids[(y - 1) * w + x] : 255;
      if (r1 === 255 || d1 === 255 || l1 === 255 || u1 === 255) { r = 30; gg = 24; b = 14; }
      else if (r1 !== id || d1 !== id) { r *= 0.35; gg *= 0.3; b *= 0.25; }
      d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return cv;
  };
})();
