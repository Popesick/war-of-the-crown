/* Battle model shared by the interactive BattleScene and the AI auto-resolver. */
(function () {
  const W = window.WOTC;
  const U = W.util;

  function leadMult(lord) { return lord ? 1 + 0.07 * (lord.lead - 3) + (lord.bonus || 0) * 0.04 : 1; }

  class Battle {
    /**
     * att/def: {units, lord, castle:bool (defender inside castle walls)}
     */
    constructor(rs, att, def) {
      this.rs = rs; this.att = att; this.def = def;
      this.round = 0; this.over = false; this.winner = null; this.fled = false;
      this.start = { att: Object.assign({}, att.units), def: Object.assign({}, def.units) };
    }
    power(side) { const u = this.rs.units; return side.units.knight * u.knight.power + side.units.soldier * u.soldier.power; }
    men(side) { return side.units.knight + side.units.soldier; }
    static kill(units, dmg, rs) {
      const pw = rs.units;
      while (dmg > 0 && units.knight + units.soldier > 0) {
        const kp = units.knight * pw.knight.power, sp = units.soldier * pw.soldier.power;
        const pickKnight = Math.random() < kp / (kp + sp + 0.001) * 0.8;
        if (pickKnight && units.knight > 0) { units.knight--; dmg -= pw.knight.power; } else if (units.soldier > 0) { units.soldier--; dmg -= pw.soldier.power; } else { units.knight--; dmg -= pw.knight.power; }
      }
    }
    /** stance: 'ferocious' | 'stand' | 'retreat' for each side. returns round report */
    step(attStance, defStance) {
      if (this.over) return null;
      this.round++;
      const cfg = this.rs.battle;
      const mods = (s) => (s === 'ferocious' ? { dmg: cfg.ferocious.dmg, take: cfg.ferocious.taken } : s === 'retreat' ? { dmg: 0.25, take: 1.1 } : { dmg: cfg.stand.dmg, take: cfg.stand.taken });
      const ma = mods(attStance), md = mods(defStance);
      const pa = this.power(this.att) * leadMult(this.att.lord), pd = this.power(this.def) * leadMult(this.def.lord);
      const castleMul = this.def.castle ? 1 - this.rs.castle.defenseBonus : 1;
      const rnd = () => 0.8 + Math.random() * 0.4;
      const dmgToDef = pa * 0.2 * ma.dmg * md.take * castleMul * rnd();
      const dmgToAtt = pd * 0.2 * md.dmg * ma.take * rnd();
      const before = { att: this.men(this.att), def: this.men(this.def) };
      Battle.kill(this.def.units, dmgToDef, this.rs);
      Battle.kill(this.att.units, dmgToAtt, this.rs);
      const rep = { attLoss: before.att - this.men(this.att), defLoss: before.def - this.men(this.def) };
      // retreat
      if (attStance === 'retreat' || defStance === 'retreat') {
        const fleer = attStance === 'retreat' ? 'att' : 'def';
        if (Math.random() < cfg.retreatEscape) { this.over = true; this.fled = true; this.winner = fleer === 'att' ? 'def' : 'att'; rep.fled = fleer; return rep; }
      }
      if (this.men(this.def) <= 0 && this.men(this.att) > 0) { this.over = true; this.winner = 'att'; }
      else if (this.men(this.att) <= 0) { this.over = true; this.winner = 'def'; }
      else if (this.round >= cfg.rounds) { this.over = true; this.winner = this.power(this.att) > this.power(this.def) * 1.25 ? 'att' : 'def'; rep.exhausted = true; }
      return rep;
    }
    /** how the AI picks a stance */
    static aiStance(mine, theirs, rs) {
      const pm = mine.units.knight * 3 + mine.units.soldier, pt = theirs.units.knight * 3 + theirs.units.soldier;
      const r = pm / Math.max(1, pt);
      if (r > 1.5) return 'ferocious';
      if (r < 0.35 && Math.random() < 0.5) return 'retreat';
      return r > 0.9 && Math.random() < 0.5 ? 'ferocious' : 'stand';
    }
    auto() {
      while (!this.over) {
        this.step(Battle.aiStance(this.att, this.def), Battle.aiStance(this.def, this.att));
      }
      return this;
    }
  }
  W.Battle = Battle;
})();
