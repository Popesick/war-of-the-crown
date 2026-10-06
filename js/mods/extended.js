/*
 * "Extended" edition placeholder. Register a mod to change rules/data/texts/scenes without touching
 * the classic code. Example (disabled by default):
 *
 * WOTC.mods.register({
 *   id: 'extended',
 *   ruleset(rs) { rs.units.archer = { cost: 20, power: 1.5 }; rs.start.gold = 100; },
 *   texts: { en: { 'unit.archer': 'Archers' }, de: { 'unit.archer': 'Bogenschützen' } },
 *   init(W) { W.events.on('orders:menu', (d) => { d.options.push({ id: 'diplomacy', label: 'Diplomacy' }); }); }
 * });
 */
