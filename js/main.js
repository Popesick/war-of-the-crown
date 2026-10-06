/* Bootstrap */
(function () {
  const W = window.WOTC;
  W.Engine.start();
  W.assets.preload(['bg_title', 'bg_map', 'bg_joust', 'bg_siege', 'bg_battle', 'bg_duel', 'bg_castle_hall', 'bg_end_win', 'bg_end_lose', 'bg_love', 'bg_tournament']);
  ['wilfred', 'geoffrey', 'cedric', 'wolfric', 'brian', 'philip', 'reginald', 'edmund', 'roger'].forEach((l) => W.assets.preload(['portrait_', 'soldier_', 'knightfoot_', 'fencer_', 'rider_front_'].map((k) => k + l)));
  ['wilfred', 'geoffrey', 'cedric', 'wolfric'].forEach((l) => W.assets.preload(['pov_' + l]));
  W.assets.preload(['siege_catapult', 'siege_stone', 'siege_dust', 'siege_rubble']);
  W.flow.boot().catch((e) => console.error('boot failed', e));
  window.addEventListener('error', (e) => console.error('window error', e.message));
})();
