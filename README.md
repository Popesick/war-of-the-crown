# War of the Crown

Ein mittelalterliches Strategie-Spiel um die englische Krone, inspiriert vom Amiga-Klassiker aus dem Jahr 1986. Reiner HTML/JS-Klon ohne Build-Schritt. Keine Originalcodes oder -grafiken, nur Spielmechanik, eigene Namen, Texte und Grafik.

## Starten

`index.html` direkt im Browser öffnen (funktioniert auch über `file://`) oder per `python3 -m http.server`.

## Spielprinzip

- 9 Lords, 4 spielbare Sachsen, 16 Gebiete (7 neutral zu Beginn). Ziel: alle Gebiete besitzen. Verloren, sobald keine Burg mehr übrig ist.
- Pro Monat eine Aktion: Turnier, Eroberung, Raubzug, Heer aufstellen (kostenlos, keine Aktion), Karte, Warten.
- Einheiten: Soldat 12, Ritter 40, Katapult 70, Burg 160 Gold.
- Schlachten mit drei Haltungen, Belagerung mit Katapulten, Lanzenstechen mit Einsatz, Schwertkampf beim Raubzug, Zufallsereignisse (Robin Hood, Burgfräulein).

## Architektur

```
js/core    Engine (Szenen-Stack, Canvas 640x400), UI (DOM-Overlays), Einstellungen, Audio, Sprache, Assets, i18n, Mods
js/data    ruleset.js (alle Zahlen/Karten/Lords), texts.js (en/de)
js/game    state (Daten), map (prozedurale Karte), combat, ai, flow (Spielablauf)
js/gfx     draw.js (prozedurale Platzhaltergrafik)
js/scenes  title, mapscene, joust, duel, siege, battle, story
js/mods    extended.js (Einhängepunkt für die Extended-Variante)
```

Szenen sind Promises: `const r = await Engine.run(new Scene(opts))`, Ende mit `scene.done(result)`.

## Audio und Sprachausgabe

Einstellungen (Zahnrad oben rechts, im Titel und im Pausenmenü): Master, Musik, Effekte, Sprache, je an/aus + Lautstärke, Sprechtempo, Stimme. Gespeichert in `localStorage` (`wotc.settings.v1`).

- Musik/Effekte: Dateien in `WOTC.audio.manifest` eintragen (`assets/audio/music/*.mp3`, `assets/audio/sfx/*.mp3`). Ohne Datei spielen synthetische Platzhalter-Effekte.
- Sprache: jeder Dialog ruft `WOTC.voice.speak(text, {id})`. Liegt `assets/audio/voice/<lang>/<id>.mp3` vor, wird es abgespielt, sonst nutzt der Browser `speechSynthesis`.
- Neue Musik-Stichworte, die schon ausgelöst werden: `title`, `map`, `battle`, `siege`, `joust`.

## Grafiken

`assets/img/<key>.png` (640x400) überschreibt automatisch den prozeduralen Hintergrund. Schlüssel und Prompts: `docs/image-prompts.md`.

## Erweiterungen (Extended)

`WOTC.mods.register({ id, ruleset(rs), texts:{en,de}, init(W) })`. Ereignisse über `WOTC.events`:
`game:new, turn:start, turn:end, orders:menu, battle:before, battle:after, joust:before, joust:after, conquest, raid:after, tournament:after`.
Zusätzliche Befehle: im `orders:menu`-Ereignis `data.options.push({id,label})` und Handler in `WOTC.flow.customOrders[id] = async (state) => used`.
Neue Karte: anderes `map.outline`/`territories` im Ruleset. Siehe `js/mods/extended.js`.

## Analyse des Originals

`analysis/` enthält die ADF-Werkzeuge. Aus dem Hunk-Executable wurden nur Regeln und Spielablauf abgeleitet. Siehe `docs/analysis.md`.

## Grafiken (Stand)
Fertig in `assets/img/`: alle Hintergründe (640x400), Lord-Porträts (`portrait_<lord>`), Turnierreiter von vorn (`rider_front_<lord>`), Soldaten und Ritter zu Fuß (`soldier_`/`knightfoot_<lord>`, 6 Frames), Schwertkämpfer (`fencer_<lord>`, 6 Frames), eigenes Pferd in Ich-Perspektive (`pov_<lord>`, 3 Frames, nur sächsische Lords), Kartentexturen `map_sea`/`map_land` (400x400).
Fehlt eine Datei, greift die prozedurale Zeichnung. Sprites entstehen aus ChatGPT-Sheets auf Magenta-Hintergrund mit roter Stoffmarkierung; `python3 tools/build_sprites.py <sheet-ordner> [art]` schneidet, key-t und färbt je Lord um (siehe `docs/image-prompts.md`).
