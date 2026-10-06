# Analyse der Amiga-Disketten

- Disk 1: OFS-Dateisystem (Rootblock 880), Hunk-Executable `Defender`. Texte, Menüs und Regeln stammen aus den enthaltenen Strings.
- Disk 2: eigenes Trackloader-Format (keine Dateien), Grafik- und Musikdaten. Nicht übernommen.
- Abgeleitete Regeln: 1 Aktion pro Monat, Einnahmen pro Gebiet, Einheitenkosten, Turnier mit Einsatz (Ruhm, Gold, Land), Raubzug mit Schwertkampf, Belagerung mit Katapulten, Ereignisse (Robin Hood, Burgfräulein), Sieg bei allen Gebieten.
- Keine Original-Assets, kein Code wurde übernommen. Die Spielzahlen sind nachempfunden und in `js/data/ruleset.js` leicht anpassbar.
