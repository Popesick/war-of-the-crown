/* Engine: 640x400 canvas, fixed-step-ish loop, scene stack, input, canvas buttons. */
(function () {
  const W = window.WOTC;
  const canvas = document.getElementById('screen');
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  const SW = canvas.width, SH = canvas.height;

  class Scene {
    constructor(opts) { this.opts = opts || {}; this.buttons = []; this.t = 0; this.mouse = { x: 0, y: 0 }; this._resolve = null; }
    enter() {} exit() {} update(dt) {} draw(g) {}
    onClick(x, y) {} onMove(x, y) {} onKey(e) {}
    addButton(b) { this.buttons.push(b); return b; }
    clearButtons() { this.buttons = []; }
    done(result) { Engine._finish(this, result); }
  }

  const stack = [];
  const Engine = {
    Scene, canvas, g, W: SW, H: SH, paused: false, time: 0,
    /** Run a scene on top of the stack; resolves with whatever the scene passes to done(). */
    run(scene) {
      return new Promise((resolve) => {
        scene._resolve = resolve;
        stack.push(scene);
        scene.t = 0;
        scene.enter();
      });
    },
    _finish(scene, result) {
      const i = stack.indexOf(scene); if (i < 0) return;
      stack.splice(i, 1);
      try { scene.exit(); } catch (e) { console.error(e); }
      const r = scene._resolve; scene._resolve = null;
      if (r) r(result);
    },
    get top() { return stack[stack.length - 1]; },
  };
  W.Engine = Engine;
  W.Scene = Scene;

  // ---------- input ----------
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * SW, y: ((e.clientY - r.top) / r.height) * SH };
  }
  function hit(b, x, y) { return !b.disabled && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h; }
  canvas.addEventListener('mousemove', (e) => {
    const s = Engine.top; if (!s || Engine.paused) return;
    const p = pos(e); s.mouse = p;
    s.buttons.forEach((b) => { b.hover = hit(b, p.x, p.y); });
    canvas.style.cursor = s.buttons.some((b) => b.hover) ? 'pointer' : 'default';
    s.onMove(p.x, p.y);
  });
  canvas.addEventListener('mousedown', (e) => {
    const s = Engine.top; if (!s || Engine.paused) return;
    W.audio.unlock();
    const p = pos(e); s.mouse = p;
    const b = s.buttons.find((b) => hit(b, p.x, p.y));
    if (b) { W.audio.sfx('click'); b.onClick && b.onClick(b); return; }
    s.onClick(p.x, p.y, e.button);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => {
    const s = Engine.top; if (!s || Engine.paused) return;
    if (W.ui && W.ui.keyCaptured()) return;
    const b = s.buttons.find((b) => b.key && b.key === e.key.toLowerCase() && !b.disabled);
    if (b) { b.onClick && b.onClick(b); return; }
    s.onKey(e);
  });

  // ---------- drawing helpers for canvas buttons ----------
  Engine.drawButtons = function (s) {
    g.save();
    g.font = 'bold 14px Georgia, serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
    s.buttons.forEach((b) => {
      if (b.hidden || b.ghost) return;
      g.fillStyle = b.disabled ? '#6a5a3a' : b.hover ? '#f6e4a0' : '#d9bf7a';
      g.fillRect(b.x, b.y, b.w, b.h);
      g.strokeStyle = '#3a2208'; g.lineWidth = 2; g.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      g.strokeStyle = '#fff6'; g.lineWidth = 1; g.strokeRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
      g.fillStyle = b.disabled ? '#2a2010aa' : '#2a1a0a';
      g.fillText(typeof b.label === 'function' ? b.label() : b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
    });
    g.restore();
  };

  // text helpers
  Engine.text = function (str, x, y, o) {
    o = o || {};
    g.save();
    g.font = (o.font || 'bold 16px Georgia, serif');
    g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
    if (o.shadow !== false) { g.fillStyle = o.shadow || '#000'; g.fillText(str, x + 1, y + 1); }
    g.fillStyle = o.color || '#fff';
    g.fillText(str, x, y);
    g.restore();
  };

  // ---------- main loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const s = Engine.top;
    if (s && !Engine.paused) {
      s.t += dt; Engine.time += dt;
      try { s.update(dt); } catch (e) { console.error('update', e); }
    }
    const s2 = Engine.top;
    g.imageSmoothingEnabled = false;
    if (s2) {
      try { s2.draw(g); Engine.drawButtons(s2); } catch (e) { console.error('draw', e); }
    } else { g.fillStyle = '#000'; g.fillRect(0, 0, SW, SH); }
    requestAnimationFrame(frame);
  }
  Engine.start = function () { requestAnimationFrame(frame); };

  // ---------- responsive UI font scale ----------
  function resize() {
    const st = document.getElementById('stage');
    document.getElementById('ui').style.setProperty('--s', (st.clientWidth / 700).toFixed(3));
  }
  window.addEventListener('resize', resize); resize();
  Engine.resize = resize;
})();
