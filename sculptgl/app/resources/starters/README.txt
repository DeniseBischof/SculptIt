Startermodelle für SculptIt
===========================

Lege hier fertige OBJ-Dateien mit genau diesen Namen ab:

  mensch.obj
  kopf.obj
  hund.obj
  katze.obj
  drache.obj
  auto.obj
  roboter.obj

(Quell-ZIPs der aktuellen Modelle: ../../../starters-src/)

Die Startbildschirm-Karten laden dann diese Modelle.
Fehlt eine Datei, baut SculptIt das Tier ersatzweise aus Grundformen zusammen
(Fallback-Presets in src-sculptit/Presets.js).

Hinweise:
- Das Modell wird beim Laden automatisch zentriert und skaliert.
- Wasserdichte, mitteldichte Meshes (~20k-100k Faces) sculpten sich am besten.
- Farben/Texturen aus der OBJ werden ignoriert, es zählt nur die Form.
