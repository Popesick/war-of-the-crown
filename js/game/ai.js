/*
 * Computer lords. plan(state, lord) -> action | null. The game flow executes the action; fights against
 * the player are interactive, everything else is auto-resolved here (resolveAI).
 */
(function () {
  const W = window.WOTC;
  const U = W.util;
  const ai = {
    /** spend gold on troops, return text list (not shown) */
    buy(state, lord) {
      const rs = state.rs; const mine = state.ownedBy(lord.id); if (!mine.length) return;
      const caps = mine.filter((t) => t.castle);
      if (!caps.length || lord.gold < rs.units.soldier.cost || !U.chance(rs.ai.buyChance)) return;
      const home = state.terr[lord.home].owner === lord.id ? state.terr[lord.home] : caps[0];
      let tries = 0;
      while (lord.gold >= rs.units.soldier.cost && tries++ < 6) {
        const r = Math.random();
        if (r < 0.15 && lord.gold >= rs.units.catapult.cost + 20) { home.garrison.catapult++; lord.gold -= rs.units.catapult.cost; }
        else if (r < 0.45 && lord.gold >= rs.units.knight.cost) { home.garrison.knight++; lord.gold -= rs.units.knight.cost; }
        else { home.garrison.soldier += 2; lord.gold -= 2 * rs.units.soldier.cost; }
      }
      // spread some men to the borders
      const others = mine.filter((t) => t !== home);
      if (others.length && U.chance(0.4)) {
        const to = U.pick(others), mv = Math.floor(home.garrison.soldier * 0.25);
        home.garrison.soldier -= mv; to.garrison.soldier += mv;
      }
    },
    /** choose an attack: {from, to, units} or null */
    plan(state, lord) {
      const rs = state.rs; if (!U.chance(rs.ai.attackChance)) return null;
      const mine = state.ownedBy(lord.id);
      let best = null;
      mine.forEach((from) => {
        const pw = state.power(from.garrison);
        if (pw < 8) return;
        from.adj.forEach((tid) => {
          const to = state.terr[tid]; if (to.owner === lord.id) return;
          if (to.castle && from.garrison.catapult < 1) return;
          const def = state.power(state.defenders(tid)) * (to.castle ? 1.4 : 1) * (to.owner === state.playerId ? 1.0 : 1);
          const send = pw * 0.75;
          const score = send / Math.max(1, def) + (to.owner === state.playerId ? 0.3 : 0) + Math.random() * 0.4;
          if (send > def * 1.05 && (!best || score > best.score)) best = { from, to, score };
        });
      });
      if (!best) return null;
      const g = best.from.garrison;
      const units = { soldier: Math.floor(g.soldier * 0.75), knight: Math.floor(g.knight * 0.75), catapult: best.to.castle ? Math.max(1, Math.min(g.catapult, 2)) : 0 };
      if (state.men(units) < 3) return null;
      return { type: 'attack', lord, from: best.from.id, to: best.to.id, units };
    },
    /** remove the attacking units from the source garrison */
    commit(state, act) {
      const g = state.terr[act.from].garrison;
      g.soldier -= act.units.soldier; g.knight -= act.units.knight; g.catapult -= act.units.catapult;
    },
    /** auto-resolve AI vs (AI or neutral). returns {won, survivors} and applies the result. */
    resolve(state, act) {
      const to = state.terr[act.to];
      const defLord = to.owner ? state.lords[to.owner] : null;
      const defUnits = state.defenders(act.to);
      let breached = true;
      if (to.castle) {
        const shots = Math.min(act.units.catapult * state.rs.siege.shotsPerCatapult, state.rs.siege.maxShots);
        let hp = state.wallHp(act.to);
        for (let i = 0; i < shots; i++) hp -= U.chance(0.6) ? U.int(1, 3) : 0;
        breached = hp <= 0;
      }
      if (!breached) { act.units.catapult = Math.max(0, act.units.catapult - 1); return { won: false, survivors: act.units, siegeFailed: true }; }
      const b = new W.Battle(state.rs, { units: Object.assign({}, act.units), lord: act.lord }, { units: defUnits, lord: defLord, castle: !!to.castle });
      b.auto();
      if (b.winner === 'att') {
        const surv = b.att.units;
        if (defLord) { to.garrison = { soldier: 0, knight: 0, catapult: 0 }; }
        to.owner = act.lord.id; to.garrison = Object.assign({ soldier: 0, knight: 0, catapult: 0 }, surv, { catapult: act.units.catapult });
        if (to.garrison.soldier + to.garrison.knight < 2) to.garrison.soldier += 2;
        return { won: true, survivors: surv };
      }
      // attackers fall; defenders keep survivors
      if (to.owner) Object.assign(to.garrison, { soldier: b.def.units.soldier, knight: b.def.units.knight });
      return { won: false, survivors: b.att.units };
    },
  };
  W.ai = ai;
})();
