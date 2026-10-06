/* DOM overlay UI: dialogs (with voice), choice menus, settings panel, pause menu. */
(function () {
  const W = window.WOTC;
  const root = document.getElementById('ui');
  const layers = []; // active interactive layers (top captures keys)
  const t = (k, p) => W.i18n.t(k, p);

  function el(html, cls) {
    const d = document.createElement('div'); d.className = 'panel ' + (cls || ''); d.innerHTML = html;
    root.appendChild(d); return d;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  const ui = {
    esc, el,
    keyCaptured() { return layers.length > 0; },

    /** Narration dialog. Speaks the text via voice channel. Resolves on click / Enter / Space. */
    say(text, o) {
      o = o || {};
      return new Promise((resolve) => {
        const d = el((o.title ? '<h2>' + esc(o.title) + '</h2>' : '') + '<p>' + esc(text).replace(/\n/g, '<br>') + '</p><div class="hint">' + esc(t('ui.continue')) + '</div>', 'dialog');
        if (o.pos === 'top') { d.style.bottom = 'auto'; d.style.top = '5%'; }
        if (o.silent !== true) W.voice.speak(o.voiceText || text, { id: o.id });
        const layer = { onKey(e) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); close(); } } };
        function close() { d.remove(); layers.splice(layers.indexOf(layer), 1); W.voice.cancel(); W.audio.sfx('click'); resolve(); }
        d.addEventListener('mousedown', close);
        layers.push(layer);
      });
    },

    /** Show a menu. options: [{id,label,sub,disabled}]. Resolves with id (or null when cancelable & Esc). */
    choose(title, options, o) {
      o = o || {};
      return new Promise((resolve) => {
        const d = el('<h2>' + esc(title) + '</h2>', 'center ' + (o.cls || ''));
        if (o.pos) Object.assign(d.style, o.pos);
        if (o.speak !== false && title) W.voice.speak(title, { id: o.id });
        const btns = [];
        options.forEach((op, i) => {
          const b = document.createElement('button'); b.className = 'btn';
          b.innerHTML = esc(op.label) + (op.sub ? '<small>' + esc(op.sub) + '</small>' : '');
          if (op.disabled) b.disabled = true;
          b.addEventListener('click', () => close(op.id));
          d.appendChild(b); btns.push(b);
          if (i < 9) b.title = String(i + 1);
        });
        const first = btns.find((b) => !b.disabled); if (first) setTimeout(() => first.focus(), 0);
        const layer = {
          onKey(e) {
            if (e.key === 'Escape' && o.cancelable) { e.preventDefault(); close(null); return; }
            const n = parseInt(e.key, 10);
            if (n >= 1 && n <= btns.length && !btns[n - 1].disabled) { e.preventDefault(); close(options[n - 1].id); }
          },
        };
        function close(v) { d.remove(); layers.splice(layers.indexOf(layer), 1); W.voice.cancel(); W.audio.sfx('click'); resolve(v); }
        layers.push(layer);
      });
    },

    /** Generic custom panel. build(panelEl, close) - you fill it; resolves with value passed to close. */
    custom(cls, build) {
      return new Promise((resolve) => {
        const d = el('', cls || 'center');
        const layer = { onKey(e) { if (e.key === 'Escape' && d._cancel) close(null); } };
        function close(v) { d.remove(); layers.splice(layers.indexOf(layer), 1); resolve(v); }
        layers.push(layer);
        build(d, close, (cancelable) => { d._cancel = cancelable; });
      });
    },

    /** Settings: music / sfx / voice on-off and volumes, language, voice selection. */
    settings() {
      const S = W.settings;
      return ui.custom('center', (d, close, setCancel) => {
        setCancel(true);
        const rows = [['music', 'set.music'], ['sfx', 'set.sfx'], ['voice', 'set.voice']];
        function render() {
          d.innerHTML = '<h2>' + esc(t('set.title')) + '</h2>';
          const master = document.createElement('div'); master.className = 'row';
          master.innerHTML = '<label>' + esc(t('set.master')) + '</label><input type="range" min="0" max="100" value="' + Math.round(S.data.master * 100) + '"><span class="val">' + Math.round(S.data.master * 100) + '</span>';
          const mi = master.querySelector('input'); mi.oninput = () => { S.set('master', mi.value / 100); master.querySelector('.val').textContent = mi.value; };
          d.appendChild(master);
          rows.forEach(([ch, label]) => {
            const r = document.createElement('div'); r.className = 'row';
            const c = S.data[ch];
            r.innerHTML = '<label><input type="checkbox" ' + (c.on ? 'checked' : '') + '> ' + esc(t(label)) + '</label><input type="range" min="0" max="100" value="' + Math.round(c.vol * 100) + '"><span class="val">' + Math.round(c.vol * 100) + '</span>';
            const cb = r.querySelector('input[type=checkbox]'), sl = r.querySelector('input[type=range]');
            cb.onchange = () => { S.set(ch + '.on', cb.checked); if (cb.checked && ch === 'sfx') W.audio.sfx('coin'); if (cb.checked && ch === 'voice') W.voice.speak(t('set.voicetest')); };
            sl.oninput = () => { S.set(ch + '.vol', sl.value / 100); r.querySelector('.val').textContent = sl.value; };
            sl.onchange = () => { if (ch === 'sfx') W.audio.sfx('coin'); if (ch === 'voice') W.voice.speak(t('set.voicetest')); };
            d.appendChild(r);
          });
          // voice rate + voice picker
          const rr = document.createElement('div'); rr.className = 'row';
          rr.innerHTML = '<label>' + esc(t('set.voicerate')) + '</label><input type="range" min="50" max="150" value="' + Math.round(S.data.voice.rate * 100) + '"><span class="val">' + S.data.voice.rate.toFixed(1) + '</span>';
          const ri = rr.querySelector('input'); ri.oninput = () => { S.set('voice.rate', ri.value / 100); rr.querySelector('.val').textContent = (ri.value / 100).toFixed(1); };
          d.appendChild(rr);
          const vs = W.voice.voicesForLang(S.data.lang);
          if (vs.length) {
            const vr = document.createElement('div'); vr.className = 'row';
            vr.innerHTML = '<label>' + esc(t('set.voicepick')) + '</label><select>' + '<option value="">auto</option>' + vs.map((v) => '<option value="' + esc(v.voiceURI) + '"' + (v.voiceURI === S.data.voice.voiceURI ? ' selected' : '') + '>' + esc(v.name) + '</option>').join('') + '</select>';
            vr.querySelector('select').onchange = (e) => { S.set('voice.voiceURI', e.target.value); W.voice.speak(t('set.voicetest')); };
            d.appendChild(vr);
          }
          const lr = document.createElement('div'); lr.className = 'row';
          lr.innerHTML = '<label>' + esc(t('set.lang')) + '</label><select>' + W.i18n.languages().map((l) => '<option value="' + l + '"' + (l === S.data.lang ? ' selected' : '') + '>' + (W.i18n.t('lang.name', null) && ({ de: 'Deutsch', en: 'English' }[l] || l)) + '</option>').join('') + '</select>';
          lr.querySelector('select').onchange = (e) => { S.set('lang', e.target.value); W.i18n.set(e.target.value); render(); };
          d.appendChild(lr);
          const b = document.createElement('button'); b.className = 'btn'; b.style.textAlign = 'center'; b.textContent = t('ui.close');
          b.onclick = () => close(); d.appendChild(b);
        }
        render();
      });
    },

    /** In-game pause menu (Esc / gear). */
    async pauseMenu() {
      if (W.Engine.paused) return;
      W.Engine.paused = true;
      try {
        for (;;) {
          const opts = [
            { id: 'resume', label: t('pause.resume') },
            { id: 'settings', label: t('pause.settings') },
          ];
          if (W.flow && W.flow.canSave()) { opts.push({ id: 'save', label: t('pause.save') }); }
          opts.push({ id: 'quit', label: t('pause.quit') });
          const r = await ui.choose(t('pause.title'), opts, { cancelable: true, speak: false });
          if (r === 'settings') { await ui.settings(); continue; }
          if (r === 'save') { W.flow.save(); await ui.say(t('pause.saved'), { silent: true }); continue; }
          if (r === 'quit') { if (W.flow) W.flow.quitToTitle(); }
          break;
        }
      } finally { W.Engine.paused = false; }
    },
  };
  W.ui = ui;

  // global keys / gear
  window.addEventListener('keydown', (e) => {
    const top = layers[layers.length - 1];
    if (top) { top.onKey(e); return; }
    if (e.key === 'Escape') ui.pauseMenu();
  });
  document.getElementById('gear').addEventListener('click', () => { W.audio.unlock(); if (!layers.length) ui.pauseMenu(); });
  if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => {};
})();
