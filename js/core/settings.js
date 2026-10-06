/* Persistent user settings: music / sfx / voice (on/off + volume), language, etc. */
(function () {
  const W = window.WOTC;
  const KEY = 'wotc.settings.v1';
  const defaults = {
    lang: 'de',
    master: 1,
    music: { on: true, vol: 0.6 },
    sfx: { on: true, vol: 0.8 },
    voice: { on: true, vol: 1, rate: 1, voiceURI: '' },
    textSpeed: 1,
  };
  let data = W.util.clone(defaults);
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) W.util.deepMerge(data, s); } catch (e) { /* ignore */ }
  const settings = {
    data,
    save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ } },
    /** settings.set('music.vol', 0.4) */
    set(path, value) {
      const parts = path.split('.'); let o = data;
      while (parts.length > 1) o = o[parts.shift()];
      o[parts[0]] = value;
      settings.save();
      W.events.emit('settings', { path, value });
    },
    get(path) { return path.split('.').reduce((o, k) => (o ? o[k] : undefined), data); },
  };
  W.settings = settings;
  W.i18n.set(data.lang);
})();
