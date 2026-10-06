# Bild-Prompts (ChatGPT, Format 16:10, 640x400)

Stil für alle: "hand-painted medieval illuminated manuscript meets 16-bit pixel art, warm palette, no text, no letters".

| Key | Prompt |
|---|---|
| bg_title | Wide landscape at sunset, a stone castle on a cliff with red banners, a lone knight on horseback in front, empty sky area at the top for a logo |
| bg_map | Parchment texture with worn edges, faint compass rose in a corner, empty center |
| bg_joust | Tournament field seen from the knight's view, tilt barrier fence, colorful crowd stands in the distance, green grass |
| bg_siege | Medieval siege scene, grassy field on the left, tall stone castle with a red-roofed tower on the right, blue sky |
| bg_battle | Open green battlefield with rolling hills and a cloudy sky, empty in the middle |
| bg_duel | Dim castle hall interior with wooden walls and torches, stone floor, empty center |
| bg_castle_hall | Warm castle great hall with banners, a long table, candlelight, empty center |
| bg_story | Old parchment with ornate border, empty center |
| bg_love | Castle balcony at dusk, soft pink light, roses |
| bg_tournament | Medieval tournament grounds, pavilions with pennants, banners, daytime |
| bg_end_win | Knight crowned king in a throne room, golden light |
| bg_end_lose | Ruined castle at dusk, broken banner, dark clouds |

## Sprite-Sheets (tools/build_sprites.py)
Alle auf reinem Magenta (#FF00FF), Stoff in reinem Rot (wird je Lord umgefärbt), Seitenansicht nach rechts, gleiche Größe/Grundlinie pro Zelle.

| Sheet | Raster | Inhalt |
|---|---|---|
| sheet_portraits | 3x3 | 9 Lords, Reihenfolge wie im Ruleset (kein Keying) |
| sheet_rider_side | 2x2 | Reiter Seitenansicht |
| sheet_rider_front | 2x2 | Gegner von vorn: Ruhe, Galopp 1/2, Sturz |
| sheet_soldier | 4x3 | Fußsoldat Lauf x4, Ritter Lauf x4, Angriff x2 + x2 |
| sheet_fencer | 3x2 | Wache, Ausholen, Stoß, Parade, Treffer, besiegt |
| sheet_pov | 3x1 | Pferdekopf von hinten, 3 Galoppphasen |
| map_sea / map_land | 1:1 | Texturen für die Karte |
| sheet_siege | 3x2 | Katapult gespannt/schwingend/entspannt, Stein, Staubwolke, Trümmerhaufen |
