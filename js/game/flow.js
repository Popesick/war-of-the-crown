/* Game flow: the monthly loop and every action, written as plain async/await on top of scenes + ui. */
(function () {
  const W = window.WOTC, E = W.Engine, ui = W.ui, U = W.util, t = W.t;
  const SAVE_KEY = 'wotc.save.v1';

  // Persistent backdrop while menus are shown: hall + status line
  class HomeScene extends W.Scene {
    draw(g) {
      const s = W.flow.state;
      W.gfx.bg(g, 'bg_castle_hall', (g) => { W.gfx.hallBg(g, this.t); });
      if (!s) return;
      g.fillStyle = 'rgba(30,18,6,.82)'; g.fillRect(8, 8, 300, 50); g.strokeStyle = '#d8a526'; g.lineWidth = 2; g.strokeRect(8, 8, 300, 50);
      E.text(s.player.name, 16, 28, { font: 'bold 14px Georgia, serif', color: '#f5d77a' });
      E.text(t('date.line', { month: s.monthName(), year: s.year }) + '   ' + t('status.line', { gold: s.player.gold, lands: s.ownedBy(s.playerId).length }), 16, 48, { font: '12px Georgia, serif', color: '#fff' });
      W.gfx.portrait(g, s.player, 250, 100, 140, 150);
    }
  }

  const flow = {
    state: null, rs: null, customOrders: {},
    hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
    canSave() { return !!flow.state; },
    save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(flow.state)); } catch (e) { console.warn(e); } },
    quitToTitle() { location.reload(); },

    async boot() {
      W.mods.initAll();
      for (;;) {
        const choice = await E.run(new W.scenes.TitleScene());
        if (choice === 'settings') { await ui.settings(); continue; }
        if (choice === 'credits') { await ui.say(t('credits'), { silent: true }); continue; }
        if (choice === 'load') { if (flow.load()) break; else continue; }
        if (choice === 'new') { await flow.newGame(); break; }
      }
      flow.home = new HomeScene(); E.run(flow.home);
      if (flow.intro) { const lord = flow.state.player; for (const k of ['intro.1', 'intro.2', 'intro.3']) await ui.say(t(k, { year: flow.rs.start.year, lord: lord.name }), { title: t('game.title') }); }
      await flow.mainLoop();
    },

    load() {
      try {
        const data = JSON.parse(localStorage.getItem(SAVE_KEY));
        flow.rs = W.mods.buildRuleset(); W.GameMap.build(flow.rs);
        flow.state = W.GameState.fromJSON(flow.rs, data);
        return true;
      } catch (e) { console.error(e); return false; }
    },

    async newGame() {
      const rs = (flow.rs = W.mods.buildRuleset());
      const cache = W.GameMap.build(rs);
      const lordId = await E.run(new W.scenes.LordSelectScene({ rs }));
      flow.state = new W.GameState(rs, lordId, cache.adj);
      W.events.emit('game:new', flow.state);
      flow.intro = true;
    },

    async mainLoop() {
      const s = flow.state;
      for (;;) {
        await flow.payday();
        if (await flow.checkEnd()) return;
        await flow.playerTurn();
        if (await flow.checkEnd()) return;
        await flow.aiTurn();
        if (await flow.checkEnd()) return;
        s.advanceMonth();
        W.events.emit('turn:end', s);
        flow.save();
      }
    },

    async checkEnd() {
      const s = flow.state;
      if (!s.fixHome()) { await flow.ending(false); return true; }
      if (s.ownedBy(s.playerId).length === s.order.length) { await flow.ending(true); return true; }
      return false;
    },
    async ending(win) {
      W.audio.sfx(win ? 'fanfare' : 'sad');
      await E.run(new W.scenes.StoryScene({ bg: win ? 'bg_end_win' : 'bg_end_lose', fallback: win ? 'title' : 'hall', lines: [t(win ? 'end.win' : 'end.dead')], lord: win ? flow.state.player : null }));
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* */ }
      location.reload();
    },

    // ---------- month start ----------
    async payday() {
      const s = flow.state, rs = s.rs;
      W.events.emit('turn:start', s);
      s.aliveLords().forEach((l) => { l.gold += s.income(l.id); });
      await ui.say(t('payday', { n: s.income(s.playerId) }) + '  (' + t('date.line', { month: s.monthName(), year: s.year }) + ')', { silent: false });
      // random events
      if (U.chance(rs.events.robinChance)) {
        const n = U.int(6, 12); s.terr[s.homeId].garrison.soldier += n;
        W.audio.sfx('horn'); await ui.say(t('event.robin', { n }), { title: 'Robin' });
      }
    },

    // ---------- orders ----------
    async playerTurn() {
      const s = flow.state, rs = s.rs;
      for (;;) {
        const opts = [
          { id: 'tournament', label: t('orders.tournament'), sub: t('orders.sub.gold', { n: rs.tournament.cost }) },
          { id: 'conquest', label: t('orders.conquest') },
          { id: 'raid', label: t('orders.raid') },
          { id: 'build', label: t('orders.build') },
          { id: 'map', label: t('orders.map') },
          { id: 'wait', label: t('orders.wait') },
        ];
        const data = { options: opts, state: s };
        W.events.emit('orders:menu', data);
        const pick = await ui.choose(t('orders.title'), data.options);
        let used = false;
        W.audio.sfx('click');
        if (pick === 'map') await E.run(new W.scenes.MapScene({ state: s, mode: 'view' }));
        else if (pick === 'build') await flow.buildArmy();
        else if (pick === 'wait') used = true;
        else if (pick === 'conquest') used = await flow.conquest();
        else if (pick === 'raid') used = await flow.raid();
        else if (pick === 'tournament') used = await flow.tournament();
        else if (pick) { const h = W.flow.customOrders && W.flow.customOrders[pick]; if (h) used = await h(s); }
        if (used) break;
        if (await flow.checkEnd()) break;
      }
    },

    // ---------- build army ----------
    async buildArmy() {
      const s = flow.state, rs = s.rs, home = s.terr[s.homeId], cp = s.campaign;
      await ui.custom('center', (d, close, setCancel) => {
        setCancel(true);
        const kinds = ['soldier', 'knight', 'catapult'];
        function render() {
          const atHome = cp.at === s.homeId;
          let h = '<h2>' + ui.esc(t('build.title')) + '</h2><div class="stat"><b>' + ui.esc(t('ui.gold')) + '</b><b>' + s.player.gold + '</b></div>';
          h += '<table style="width:100%;border-collapse:collapse;margin:.5em 0"><tr><th></th><th>' + ui.esc(t('build.home')) + '</th><th></th><th>' + ui.esc(t('build.campaign')) + '</th><th>' + ui.esc(t('build.buyshort')) + '</th></tr>';
          kinds.forEach((k) => {
            h += '<tr><td>' + ui.esc(t('unit.' + k)) + '</td><td align="center">' + home.garrison[k] + '</td><td align="center"><button class="btn" style="display:inline;width:auto;padding:.1em .5em" data-a="to" data-k="' + k + '" ' + (atHome && home.garrison[k] > 0 ? '' : 'disabled') + '>▶</button> <button class="btn" style="display:inline;width:auto;padding:.1em .5em" data-a="from" data-k="' + k + '" ' + (atHome && cp.units[k] > 0 ? '' : 'disabled') + '>◀</button></td><td align="center">' + cp.units[k] + '</td><td><button class="btn" style="margin:0;padding:.15em .5em" data-a="buy" data-k="' + k + '" ' + (s.player.gold >= rs.units[k].cost ? '' : 'disabled') + '>+1 <small>' + rs.units[k].cost + '</small></button></td></tr>';
          });
          h += '</table>';
          if (!atHome) h += '<p style="font-size:.8em;opacity:.8">' + ui.esc(t('build.at_home')) + '</p>';
          h += '<button class="btn" data-a="castle">' + ui.esc(t('unit.castle')) + '…</button><button class="btn" style="text-align:center" data-a="done">' + ui.esc(t('build.done')) + '</button>';
          d.innerHTML = h;
          d.querySelectorAll('button').forEach((b) => b.addEventListener('click', async () => {
            const a = b.dataset.a, k = b.dataset.k; W.audio.sfx('click');
            if (a === 'buy') { s.player.gold -= rs.units[k].cost; home.garrison[k]++; W.audio.sfx('coin'); }
            else if (a === 'to') { home.garrison[k]--; cp.units[k]++; }
            else if (a === 'from') { cp.units[k]--; home.garrison[k]++; }
            else if (a === 'castle') { d.style.visibility = 'hidden'; await flow.castleMenu(); d.style.visibility = ''; }
            else if (a === 'done') { close(); return; }
            render();
          }));
        }
        render();
      });
    },
    async castleMenu() {
      const s = flow.state, rs = s.rs;
      const mine = s.ownedBy(s.playerId);
      const opts = mine.map((tr) => {
        const lvl = tr.castle, cost = lvl ? 100 * lvl : rs.castleCost;
        return { id: tr.id, label: tr.name + ': ' + (lvl ? t('unit.castle') + ' ' + lvl + ' → ' + (lvl + 1) : t('build.castle_buy')), sub: cost + ' ' + t('ui.gold'), disabled: lvl >= 3 || s.player.gold < cost, cost };
      });
      opts.push({ id: null, label: t('ui.back') });
      const r = await ui.choose(t('unit.castle'), opts, { cancelable: true, speak: false });
      if (!r) return;
      const o = opts.find((x) => x.id === r); s.player.gold -= o.cost; s.terr[r].castle++; W.audio.sfx('coin');
    },

    // ---------- conquest ----------
    async conquest() {
      const s = flow.state, rs = s.rs, cp = s.campaign;
      if (s.men(cp.units) <= 0 && cp.units.catapult <= 0) { await ui.say(t('conq.noarmy')); return false; }
      await ui.say(t('conq.where'), { pos: 'top' });
      const to = await E.run(new W.scenes.MapScene({ state: s, mode: 'pick', prompt: t('conq.where'), valid: (id) => s.isAdj(cp.at, id) }));
      if (!to) return false;
      const tr = s.terr[to];
      if (tr.owner === s.playerId) { cp.at = to; await ui.say(t('conq.moved', { t: tr.name })); return true; }
      const defLord = tr.owner ? s.lords[tr.owner] : null;
      if (tr.castle && cp.units.catapult < 1) { await ui.say(t('conq.catapults')); return false; }
      if (defLord) await ui.say(t('conq.lord_army', { lord: defLord.name }));
      W.events.emit('battle:before', { kind: 'conquest', state: s, target: tr });
      // siege
      if (tr.castle) {
        await ui.say(t('conq.siege'));
        const shots = Math.min(cp.units.catapult * rs.siege.shotsPerCatapult, rs.siege.maxShots);
        const r = await E.run(new W.scenes.SiegeScene({ shots, wallHp: s.wallHp(to), castleName: tr.name }));
        if (!r.breached) { await ui.say(t('siege.failed')); return true; }
        await ui.say(t('siege.breach'));
      }
      const att = { units: Object.assign({}, cp.units), lord: s.player };
      const def = { units: s.defenders(to), lord: defLord, castle: !!tr.castle };
      const battle = new W.Battle(rs, att, def);
      const res = await E.run(new W.scenes.BattleScene({ state: s, battle, playerSide: 'att', title: tr.name, attName: s.player.name.split(' ')[0], defName: defLord ? defLord.name.split(' ')[0] : t('battle.enemy') }));
      W.events.emit('battle:after', { kind: 'conquest', state: s, target: tr, result: res });
      if (res.winner === 'att') {
        const surv = res.att;
        cp.units = { soldier: surv.soldier, knight: surv.knight, catapult: cp.units.catapult };
        const prevOwner = tr.owner;
        tr.owner = s.playerId; tr.garrison = Object.assign({ soldier: 0, knight: 0, catapult: 0 }, rs.occupationGarrison);
        cp.at = to;
        W.audio.sfx('fanfare');
        await ui.say(s.men(cp.units) < 3 ? t('conq.won_laid_waste') : t('conq.won', { t: tr.name }));
        W.events.emit('conquest', { state: s, territory: tr, from: prevOwner });
        if (prevOwner) flow.checkLordFall(prevOwner);
        if (tr.castle && U.chance(rs.events.maidenChance)) await flow.maiden();
      } else if (res.fled) {
        cp.units = { soldier: res.att.soldier, knight: res.att.knight, catapult: cp.units.catapult };
        await ui.say(t('conq.fled'));
      } else {
        cp.units = { soldier: 0, knight: 0, catapult: 0 }; cp.at = s.homeId;
        await ui.say(t('conq.allDead'));
      }
      return true;
    },
    checkLordFall(lordId) {
      const s = flow.state; const l = s.lords[lordId];
      if (l && l.alive && s.ownedBy(lordId).length === 0) { l.alive = false; flow.news = (flow.news || []); flow.news.push(t('news.lordfell', { lord: l.name })); }
    },
    async maiden() {
      const s = flow.state; const n = U.int(20, 50);
      await E.run(new W.scenes.StoryScene({ bg: 'bg_love', fallback: 'hall', hearts: true, title: t('event.maiden.title'), lines: [t('event.maiden'), t('event.maidenBoost'), t('event.maiden2', { n })] }));
      s.player.gold += n; s.player.bonus = Math.min(3, (s.player.bonus || 0) + 1); s.player.fame++;
    },

    // ---------- raid ----------
    async raid() {
      const s = flow.state, rs = s.rs;
      await ui.say(t('raid.select'), { pos: 'top' });
      let msg = null;
      const id = await E.run(new W.scenes.MapScene({ state: s, mode: 'pick', prompt: t('raid.select'), valid: (id) => { const tr = s.terr[id]; return tr.owner && tr.owner !== s.playerId && tr.castle; } }));
      if (!id) { await ui.say(t('raid.abandon')); return false; }
      const tr = s.terr[id], lord = s.lords[tr.owner];
      await ui.say(t('raid.go', { lord: lord.name }));
      const r = await E.run(new W.scenes.DuelScene({ me: s.player, foe: { id: lord.id, name: lord.name.split(' ')[0], sword: lord.sword, color: lord.color } }));
      if (r.won) {
        const loot = U.clamp(Math.floor(lord.gold * rs.raid.lootFraction), rs.raid.minLoot, 160);
        lord.gold = Math.max(0, lord.gold - loot); s.player.gold += loot; W.audio.sfx('coin');
        await ui.say(t('duel.win') + ' ' + t('raid.win', { n: loot }));
      } else { s.player.fame = Math.max(0, s.player.fame - rs.raid.fameLoss); W.audio.sfx('sad'); await ui.say(t('duel.lose') + ' ' + t('raid.lose')); }
      W.events.emit('raid:after', { state: s, target: tr, won: r.won });
      return true;
    },

    // ---------- tournament ----------
    async tournament() {
      const s = flow.state, rs = s.rs, p = s.player, tc = rs.tournament;
      if (p.bannedUntil > s.turn) { await ui.say(t('tour.banned')); return false; }
      if (s.turn - p.lastTournament < tc.cooldown) { await ui.say(t('tour.cooldown')); return false; }
      if (p.gold < tc.cost) { await ui.say(t('tour.nogold')); return false; }
      p.gold -= tc.cost; p.lastTournament = s.turn;
      W.audio.sfx('horn');
      await E.run(new W.scenes.StoryScene({ bg: 'bg_tournament', fallback: 'field', lines: [t('tour.announce', { lord: p.name }), t('tour.begins')] }));
      // opponent
      const opps = s.aliveLords().filter((l) => l.id !== p.id);
      const oid = await ui.choose(t('tour.opponent'), opps.map((l) => ({ id: l.id, label: l.name, sub: '⚔'.repeat(l.joust) })));
      const opp = s.lords[oid];
      // stakes
      const myLand = s.ownedBy(p.id).filter((x) => x.id !== p.home), hisLand = s.ownedBy(opp.id).filter((x) => x.id !== opp.home);
      const stakeOpts = [{ id: 'fame', label: t('tour.stake.fame') }];
      if (p.gold >= tc.ransom && opp.gold >= tc.ransom) stakeOpts.push({ id: 'gold', label: t('tour.stake.gold', { n: tc.ransom }) });
      if (myLand.length && hisLand.length) stakeOpts.push({ id: 'land', label: t('tour.stake.land') });
      else await ui.say(t(!myLand.length ? 'tour.noland.me' : 'tour.noland.him'));
      let stake = stakeOpts.length === 1 ? 'fame' : await ui.choose(t('tour.stakes'), stakeOpts);
      let win = null, lose = null;
      if (stake === 'land') {
        await ui.say(t('tour.pickhis'), { pos: 'top' });
        const wid = await E.run(new W.scenes.MapScene({ state: s, mode: 'pick', prompt: t('tour.pickhis'), valid: (id) => hisLand.some((x) => x.id === id) }));
        win = wid || hisLand[0].id;
        lose = U.pick(myLand).id;
        await ui.say(t('tour.hewins') + ': ' + s.terr[lose].name);
      }
      W.events.emit('joust:before', { state: s, opponent: opp, stake });
      const r = await E.run(new W.scenes.JoustScene({ me: s.player, opp }));
      W.events.emit('joust:after', { state: s, opponent: opp, stake, result: r });
      if (r.horse) {
        p.bannedUntil = s.turn + tc.bannedMonths; W.audio.sfx('sad');
        await ui.say(t('tour.horse')); await ui.say(t('tour.banished'));
        if (tc.bannedLosesAll) { s.ownedBy(p.id).forEach((x) => { if (x.id !== p.home) x.owner = null; }); await ui.say(t('lord.stripped')); }
        else if (stake === 'land') { s.terr[lose].owner = opp.id; }
        else if (stake === 'gold') { p.gold -= tc.ransom; opp.gold += tc.ransom; }
        return true;
      }
      if (r.won) {
        W.audio.sfx('fanfare'); p.fame += tc.fame;
        await ui.say(t('tour.win') + ' ' + t('tour.champion'));
        if (stake === 'land') { s.terr[win].owner = p.id; s.terr[win].garrison = Object.assign({ soldier: 0, knight: 0, catapult: 0 }, rs.occupationGarrison); await ui.say(t('tour.gotland', { t: s.terr[win].name })); }
        if (stake === 'gold') { p.gold += tc.ransom; opp.gold = Math.max(0, opp.gold - tc.ransom); await ui.say(t('tour.gotgold', { n: tc.ransom })); }
        flow.checkLordFall(opp.id);
      } else {
        W.audio.sfx('sad');
        await ui.say(t('tour.lose') + ' ' + t('tour.notchamp'));
        if (stake === 'land') { s.terr[lose].owner = opp.id; await ui.say(t('tour.lostland', { t: s.terr[lose].name })); }
        if (stake === 'gold') { p.gold -= tc.ransom; opp.gold += tc.ransom; await ui.say(t('tour.lostgold', { n: tc.ransom })); }
      }
      W.events.emit('tournament:after', { state: s, opponent: opp, result: r });
      return true;
    },

    // ---------- computer lords ----------
    async aiTurn() {
      const s = flow.state, rs = s.rs;
      flow.news = [];
      for (const lord of s.aliveLords()) {
        if (lord.isPlayer) continue;
        W.ai.buy(s, lord);
        const act = W.ai.plan(s, lord);
        if (!act) continue;
        const to = s.terr[act.to];
        if (to.owner === s.playerId) { await flow.defend(act); }
        else {
          W.ai.commit(s, act);
          const prev = to.owner;
          const r = W.ai.resolve(s, act);
          if (r.won) { flow.news.push(t('news.conq', { lord: lord.name, t: to.name })); if (prev) flow.checkLordFall(prev); }
          else { // survivors return home
            const back = s.terr[act.from].garrison; const sv = r.survivors || act.units;
            back.soldier += sv.soldier || 0; back.knight += sv.knight || 0; back.catapult += sv.catapult || 0;
          }
        }
        if (await flow.checkEnd()) return;
      }
      for (const n of (flow.news || []).slice(0, 4)) await ui.say(n, { silent: false });
    },

    /** an AI lord attacks the player's territory: interactive defence */
    async defend(act) {
      const s = flow.state, rs = s.rs, to = s.terr[act.to], lord = act.lord;
      W.ai.commit(s, act);
      const isHome = to.id === s.homeId, cp = s.campaign, merged = cp.at === to.id && s.men(cp.units) > 0;
      await ui.say(isHome ? t('battle.homeattack') : merged ? t('battle.campattack') : t('battle.landattack', { lord: lord.name, t: to.name }), { title: lord.name });
      W.audio.sfx('horn');
      // siege (automatic for the defender)
      if (to.castle) {
        let hp = s.wallHp(to.id); const shots = Math.min(act.units.catapult * rs.siege.shotsPerCatapult, rs.siege.maxShots);
        for (let i = 0; i < shots; i++) hp -= U.chance(0.6) ? U.int(1, 3) : 0;
        if (hp > 0) { await ui.say(t('enemy.repelled', { lord: lord.name, t: to.name })); const b = s.terr[act.from].garrison; b.soldier += act.units.soldier; b.knight += act.units.knight; b.catapult += act.units.catapult; return; }
      }
      const defUnits = Object.assign({}, to.garrison); if (merged) { defUnits.soldier += cp.units.soldier; defUnits.knight += cp.units.knight; }
      defUnits.catapult = 0;
      if (s.men(defUnits) <= 0) { // undefended
        to.owner = lord.id; to.garrison = Object.assign({ soldier: 0, knight: 0, catapult: 0 }, act.units); await ui.say(t('enemy.won', { lord: lord.name, t: to.name })); return;
      }
      const battle = new W.Battle(rs, { units: Object.assign({}, act.units), lord }, { units: defUnits, lord: s.player, castle: !!to.castle });
      const res = await E.run(new W.scenes.BattleScene({ state: s, battle, playerSide: 'def', title: to.name, attName: lord.name.split(' ')[0], defName: s.player.name.split(' ')[0] }));
      if (res.winner === 'att') {
        to.owner = lord.id; to.garrison = Object.assign({ soldier: 0, knight: 0, catapult: 0 }, res.att);
        if (merged) { cp.units = { soldier: 0, knight: 0, catapult: cp.units.catapult }; cp.at = s.player.home === to.id ? to.id : s.player.home; }
        await ui.say(t('battle.lostland', { t: to.name }));
        s.fixHome();
        if (cp.at === to.id) cp.at = s.player.home;
      } else {
        const sv = res.def;
        if (merged) { cp.units.soldier = sv.soldier; cp.units.knight = sv.knight; to.garrison.soldier = 0; to.garrison.knight = 0; }
        else { to.garrison.soldier = sv.soldier; to.garrison.knight = sv.knight; }
        const back = s.terr[act.from].garrison; back.soldier += res.att.soldier; back.knight += res.att.knight; back.catapult += act.units.catapult;
        await ui.say(t('battle.defended'));
      }
    },
  };
  W.flow = flow;
})();
