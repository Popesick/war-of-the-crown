/* Bootstrap */
(function () {
  const W = window.WOTC;
  W.Engine.start();
  W.assets.preload(['bg_title', 'bg_map', 'bg_joust', 'bg_siege', 'bg_battle', 'bg_duel', 'bg_castle_hall', 'bg_end_win', 'bg_end_lose', 'bg_love', 'bg_tournament']);
  W.flow.boot().catch((e) => console.error('boot failed', e));
  window.addEventListener('error', (e) => console.error('window error', e.message));
})();
