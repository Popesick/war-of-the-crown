/*
 * Base ruleset ("Classic"): every number the game uses lives here, so an Extended edition can patch it
 * through WOTC.mods.register({ ruleset(rs){...} }).  Map outline/seeds are in a 400x400 map space.
 */
(function () {
  const W = window.WOTC;
  W.baseRuleset = {
    id: 'classic',
    title: 'War of the Crown',
    start: { year: 1150, month: 2, gold: 60 }, // month index 0=Jan
    months: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
    victory: { allTerritories: true },

    units: {
      soldier: { cost: 12, power: 1 },
      knight: { cost: 40, power: 3 },
      catapult: { cost: 70, power: 0 },
    },
    castleCost: 160,
    castle: { wallHp: 10, wallHpPerLevel: 4, defenseBonus: 0.35 },
    occupationGarrison: { soldier: 3 },
    neutralDefenders: 0.9,    // neutral land defenders = vassals * this (soldiers)
    income: { castleBonus: 4 },
    tournament: { cost: 25, cooldown: 3, bannedMonths: 6, bannedLosesAll: false, ransom: 60, fame: 1 },
    raid: { lootFraction: 0.35, minLoot: 15, fameLoss: 1 },
    battle: { rounds: 12, ferocious: { dmg: 1.45, taken: 1.35 }, stand: { dmg: 1.0, taken: 0.85 }, retreatEscape: 0.65 },
    siege: { shotsPerCatapult: 3, maxShots: 9 },
    ai: { attackChance: 0.30, buyChance: 0.8, tournamentChance: 0.0 },
    events: { robinChance: 0.06, maidenChance: 0.35 },

    // outline of the island (400x400 map space)
    map: {
      w: 400, h: 400,
      outline: [[205, 8], [250, 10], [290, 28], [302, 58], [286, 84], [300, 110], [322, 134], [346, 150], [332, 170], [356, 188], [374, 200], [370, 222], [352, 238], [358, 260], [352, 282], [346, 302], [312, 322], [272, 332], [226, 340], [182, 352], [142, 372], [92, 394], [56, 388], [66, 364], [100, 340], [150, 326], [160, 306], [126, 300], [90, 300], [60, 288], [48, 264], [80, 250], [70, 224], [58, 200], [44, 176], [76, 160], [112, 166], [132, 150], [150, 134], [158, 110], [164, 84], [180, 54], [190, 28]],
    },
    territories: [
      { id: 'cumbria', name: 'Cumbria', seed: [212, 48], gold: 8, vassals: 4 },
      { id: 'yorkshire', name: 'Yorkshire', seed: [262, 98], gold: 17, vassals: 7 },
      { id: 'lancashire', name: 'Lancashire', seed: [196, 118], gold: 13, vassals: 6 },
      { id: 'gwynedd', name: 'Gwynedd', seed: [98, 205], gold: 8, vassals: 4 },
      { id: 'lincolnshire', name: 'Lincolnshire', seed: [292, 154], gold: 16, vassals: 7 },
      { id: 'nottingham', name: 'Nottingham', seed: [232, 168], gold: 15, vassals: 6 },
      { id: 'norfolk', name: 'Norfolk', seed: [334, 200], gold: 18, vassals: 7 },
      { id: 'leicester', name: 'Leicester', seed: [236, 208], gold: 14, vassals: 6 },
      { id: 'cambridge', name: 'Cambridge', seed: [304, 232], gold: 19, vassals: 8 },
      { id: 'glamorgan', name: 'Glamorgan', seed: [112, 280], gold: 11, vassals: 5 },
      { id: 'gloucester', name: 'Gloucester', seed: [180, 262], gold: 15, vassals: 7 },
      { id: 'buckingham', name: 'Buckingham', seed: [250, 262], gold: 20, vassals: 8 },
      { id: 'sussex', name: 'Sussex', seed: [316, 304], gold: 15, vassals: 6 },
      { id: 'hampshire', name: 'Hampshire', seed: [256, 308], gold: 17, vassals: 7 },
      { id: 'dorset', name: 'Dorset', seed: [196, 328], gold: 12, vassals: 5 },
      { id: 'cornwall', name: 'Cornwall', seed: [112, 368], gold: 9, vassals: 4 },
    ],

    // side: 'saxon' (playable) | 'norman'. joust/sword/lead: 1..5
    lords: [
      { id: 'wilfred', name: 'Wilfred of Ivanhoe', side: 'saxon', home: 'gloucester', joust: 5, sword: 3, lead: 2, color: '#2c5fd0', blurb: 'lord.wilfred' },
      { id: 'geoffrey', name: 'Geoffrey Longsword', side: 'saxon', home: 'lincolnshire', joust: 2, sword: 5, lead: 3, color: '#2aa0b8', blurb: 'lord.geoffrey' },
      { id: 'cedric', name: 'Cedric of Rotherwood', side: 'saxon', home: 'yorkshire', joust: 3, sword: 2, lead: 5, color: '#3aa05a', blurb: 'lord.cedric' },
      { id: 'wolfric', name: 'Wolfric the Wild', side: 'saxon', home: 'dorset', joust: 3, sword: 4, lead: 3, color: '#8a5acd', blurb: 'lord.wolfric' },
      { id: 'brian', name: 'Brian de Bois-Guilbert', side: 'norman', home: 'lancashire', joust: 5, sword: 4, lead: 2, color: '#b22222', blurb: '' },
      { id: 'philip', name: 'Philip Malvoisin', side: 'norman', home: 'norfolk', joust: 3, sword: 3, lead: 3, color: '#c9701a', blurb: '' },
      { id: 'reginald', name: 'Reginald Front-de-Boeuf', side: 'norman', home: 'nottingham', joust: 2, sword: 5, lead: 3, color: '#7a1f5a', blurb: '' },
      { id: 'edmund', name: 'Edmund the Grim', side: 'norman', home: 'sussex', joust: 4, sword: 2, lead: 4, color: '#555555', blurb: '' },
      { id: 'roger', name: 'Roger Falconbridge', side: 'norman', home: 'glamorgan', joust: 3, sword: 3, lead: 4, color: '#c2a000', blurb: '' },
    ],
    // home garrisons at game start: [soldiers, knights, catapults]
    startArmy: { soldier: 12, knight: 3, catapult: 0 },
    aiStartArmy: { soldier: 14, knight: 4, catapult: 1 },
  };
})();
