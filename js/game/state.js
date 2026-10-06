/* Game state + serialisation. Pure data/logic - no drawing, no DOM. */
(function () {
  const W = window.WOTC;
  const U = W.util;
  const emptyUnits = () => ({ soldier: 0, knight: 0, catapult: 0 });

  class GameState {
    constructor(rs, playerLordId, adjacency) {
      this.rs = rs;
      this.year = rs.start.year;
      this.month = rs.start.month;
      this.turn = 0;
      this.playerId = playerLordId;
      this.lords = {};
      this.terr = {};
      this.order = rs.territories.map((t) => t.id);
      this.flags = {};
      this.log = [];
      rs.territories.forEach((t) => {
        this.terr[t.id] = { id: t.id, name: t.name, seed: t.seed, gold: t.gold, vassals: t.vassals, owner: null, castle: 0, garrison: emptyUnits(), adj: (adjacency && adjacency[t.id]) || [] };
      });
      rs.lords.forEach((l) => {
        const isP = l.id === playerLordId;
        this.lords[l.id] = Object.assign({}, l, { isPlayer: isP, fame: 0, gold: isP ? rs.start.gold : 50, alive: true, lastTournament: -99, bannedUntil: -1, bonus: 0 });
        const home = this.terr[l.home];
        home.owner = l.id; home.castle = 1;
        Object.assign(home.garrison, isP ? rs.startArmy : rs.aiStartArmy);
      });
      this.campaign = { at: this.lords[playerLordId].home, units: emptyUnits() };
    }
    get player() { return this.lords[this.playerId]; }
    get homeId() { return this.player.home; }
    ownedBy(lordId) { return this.order.map((i) => this.terr[i]).filter((t) => t.owner === lordId); }
    income(lordId) { return this.ownedBy(lordId).reduce((s, t) => s + t.gold + (t.castle ? this.rs.income.castleBonus : 0), 0); }
    neighbors(id) { return this.terr[id].adj.map((i) => this.terr[i]); }
    isAdj(a, b) { return this.terr[a].adj.indexOf(b) >= 0; }
    lord(id) { return id ? this.lords[id] : null; }
    aliveLords() { return Object.values(this.lords).filter((l) => l.alive); }
    power(units) { const u = this.rs.units; return units.knight * u.knight.power + units.soldier * u.soldier.power; }
    men(units) { return units.knight + units.soldier; }
    /** defenders of a territory: its garrison (neutral land: militia from vassals) */
    defenders(tid) {
      const t = this.terr[tid];
      if (t.owner) return Object.assign(emptyUnits(), t.garrison);
      const u = emptyUnits(); u.soldier = Math.max(2, Math.round(t.vassals * this.rs.neutralDefenders)); return u;
    }
    wallHp(tid) { const t = this.terr[tid]; return this.rs.castle.wallHp + this.rs.castle.wallHpPerLevel * (t.castle - 1); }
    monthName() { return W.t('month.' + this.rs.months[this.month]); }
    advanceMonth() { this.turn++; this.month++; if (this.month >= 12) { this.month = 0; this.year++; } }
    transferTerritory(tid, newOwner) { const t = this.terr[tid]; t.owner = newOwner; }
    /** the player's capital must hold a castle; relocate if lost */
    fixHome() {
      const p = this.player; const mine = this.ownedBy(p.id);
      if (mine.length === 0 || !mine.some((t) => t.castle)) return false;
      if (!(this.terr[p.home].owner === p.id && this.terr[p.home].castle)) {
        const best = mine.filter((t) => t.castle).sort((a, b) => this.power(b.garrison) - this.power(a.garrison))[0];
        p.home = best.id;
      }
      return true;
    }
    // ---- save / load ----
    toJSON() { const { rs, ...rest } = this; return rest; }
    static fromJSON(rs, data) {
      const s = new GameState(rs, data.playerId, null);
      Object.assign(s, data); s.rs = rs; return s;
    }
  }
  GameState.emptyUnits = emptyUnits;
  W.GameState = GameState;
})();
