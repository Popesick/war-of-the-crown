/*
 * Mod / Extended-edition API.
 *
 *   WOTC.mods.register({
 *     id: 'extended',
 *     ruleset(rs) { rs.territories.push({...}); },     // patch data before a new game starts
 *     texts: { en: {...}, de: {...} },                  // extra translations
 *     scenes: { myscene: SceneClass },                  // extra scenes (WOTC.mods.scene('myscene'))
 *     init(W) { W.events.on('turn:start', ...) }        // subscribe to game events
 *   });
 *
 * Game events (see js/game/flow.js): game:new, turn:start, turn:end, orders:menu (mutate data.options),
 * battle:before/after, joust:before/after, conquest, raid:after, tournament:after, game:over ...
 */
(function () {
  const W = window.WOTC;
  const list = [];
  const sceneReg = {};
  W.mods = {
    list,
    register(mod) {
      list.push(mod);
      if (mod.texts) Object.keys(mod.texts).forEach((l) => W.i18n.add(l, mod.texts[l]));
      if (mod.scenes) Object.assign(sceneReg, mod.scenes);
    },
    scene: (name) => sceneReg[name],
    registerScene: (name, cls) => { sceneReg[name] = cls; },
    /** build the effective ruleset: deep copy of base, then every mod's ruleset() patch */
    buildRuleset() {
      const rs = W.util.clone(W.baseRuleset);
      list.forEach((m) => m.ruleset && m.ruleset(rs));
      return rs;
    },
    initAll() { list.forEach((m) => m.init && m.init(W)); },
  };
})();
