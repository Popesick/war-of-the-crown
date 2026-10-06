/* Minimal i18n. Tables live in js/data/texts.js. Mods can add languages/keys via WOTC.i18n.add(lang, {...}). */
(function () {
  const W = window.WOTC;
  const tables = {};
  let lang = 'de';
  const i18n = {
    add(l, obj) { tables[l] = Object.assign(tables[l] || {}, obj); },
    set(l) { lang = l; W.events.emit('lang', l); },
    get lang() { return lang; },
    languages() { return Object.keys(tables); },
    /** t('key', {name:'x'}) - falls back en -> key */
    t(key, params) {
      let s = (tables[lang] && tables[lang][key]);
      if (s === undefined) s = tables.en && tables.en[key];
      if (s === undefined) s = key;
      if (Array.isArray(s)) s = W.util.pick(s);
      if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
      return s;
    },
    has(key) { return !!((tables[lang] && tables[lang][key] !== undefined) || (tables.en && tables.en[key] !== undefined)); },
  };
  W.i18n = i18n;
  W.t = i18n.t;
})();
