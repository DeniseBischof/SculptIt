import { mat4 } from 'gl-matrix';
import Utils from 'misc/Utils';
import Shapes from './Shapes';

// Fallback-Startermodelle aus Grundformen - benutzt, wenn zu einem Starter
// noch keine OBJ-Datei in app/resources/starters/ liegt (siehe SculptItGui.
// loadStarter). Jedes Teil bleibt vor "Verbinden & Sculpten" einzeln editierbar.
//
// Einheiten: t wird mit Utils.SCALE (100) multipliziert. WICHTIG für s:
// die normalisierte Kugel hat Halbmesser ~24.2 (nicht 50!), der Zylinder
// ~[20.4, 40.8, 20.4], der Würfel ~28.9 - normalizeSize normiert die
// Bounding-SPHERE auf Radius 50, nicht die Achsen-Ausdehnung.
// Die Teile müssen sich deutlich überlappen, damit das Voxel-Remeshing
// sie zu einem Stück verbindet.

var PRESETS = {

  // Blickrichtung +X (Profil zur Startkamera)
  hund: [
    { shape: 'kugel', t: [0, 0, 0], s: [2.4, 1.4, 1.4] },                 // Körper
    { shape: 'kugel', t: [0.52, 0.30, 0], s: [1.05, 1.0, 0.95] },         // Kopf
    { shape: 'kugel', t: [0.76, 0.20, 0], s: [0.6, 0.45, 0.5] },          // Schnauze
    { shape: 'kugel', t: [0.46, 0.52, 0.13], s: [0.28, 0.5, 0.14] },      // Ohr links
    { shape: 'kugel', t: [0.46, 0.52, -0.13], s: [0.28, 0.5, 0.14] },     // Ohr rechts
    { shape: 'zylinder', t: [0.35, -0.42, 0.20], s: [0.3, 0.55, 0.3] },   // Bein vorne links
    { shape: 'zylinder', t: [0.35, -0.42, -0.20], s: [0.3, 0.55, 0.3] },  // Bein vorne rechts
    { shape: 'zylinder', t: [-0.35, -0.42, 0.20], s: [0.3, 0.55, 0.3] },  // Bein hinten links
    { shape: 'zylinder', t: [-0.35, -0.42, -0.20], s: [0.3, 0.55, 0.3] }, // Bein hinten rechts
    { shape: 'zylinder', t: [-0.62, 0.16, 0], s: [0.15, 0.5, 0.15], rz: 50 } // Schwanz
  ],

  // wie der Hund, aber schlanker, spitze Ohren, längerer Schwanz
  katze: [
    { shape: 'kugel', t: [0, 0, 0], s: [2.0, 1.2, 1.1] },                 // Körper
    { shape: 'kugel', t: [0.44, 0.28, 0], s: [0.9, 0.9, 0.85] },          // Kopf
    { shape: 'kugel', t: [0.63, 0.18, 0], s: [0.42, 0.3, 0.38] },         // Schnauze
    { shape: 'kugel', t: [0.38, 0.5, 0.11], s: [0.2, 0.42, 0.1] },        // Ohr links
    { shape: 'kugel', t: [0.38, 0.5, -0.11], s: [0.2, 0.42, 0.1] },       // Ohr rechts
    { shape: 'zylinder', t: [0.28, -0.38, 0.15], s: [0.24, 0.5, 0.24] },  // Beine
    { shape: 'zylinder', t: [0.28, -0.38, -0.15], s: [0.24, 0.5, 0.24] },
    { shape: 'zylinder', t: [-0.28, -0.38, 0.15], s: [0.24, 0.5, 0.24] },
    { shape: 'zylinder', t: [-0.28, -0.38, -0.15], s: [0.24, 0.5, 0.24] },
    { shape: 'zylinder', t: [-0.5, 0.22, 0], s: [0.12, 0.6, 0.12], rz: 55 } // Schwanz
  ],

  // aufrecht, frontal zur Startkamera
  mensch: [
    { shape: 'kugel', t: [0, 0.72, 0], s: [0.75, 0.8, 0.75] },            // Kopf
    { shape: 'kugel', t: [0, 0.28, 0], s: [1.1, 1.3, 0.7] },              // Torso
    { shape: 'kugel', t: [0, -0.12, 0], s: [0.95, 0.7, 0.65] },           // Becken
    { shape: 'zylinder', t: [0.28, 0.16, 0], s: [0.2, 0.55, 0.2], rz: -18 },  // Arm links
    { shape: 'zylinder', t: [-0.28, 0.16, 0], s: [0.2, 0.55, 0.2], rz: 18 },  // Arm rechts
    { shape: 'zylinder', t: [0.12, -0.52, 0], s: [0.26, 0.6, 0.26] },     // Bein links
    { shape: 'zylinder', t: [-0.12, -0.52, 0], s: [0.26, 0.6, 0.26] }     // Bein rechts
  ],

  // grober Vierbeiner mit Flügeln, Hörnern und Schwanzspitze
  drache: [
    { shape: 'kugel', t: [0, 0, 0], s: [2.6, 1.15, 1.0] },                // Körper
    { shape: 'kugel', t: [0.58, 0.38, 0], s: [0.95, 0.85, 0.8] },         // Kopf
    { shape: 'kugel', t: [0.85, 0.3, 0], s: [0.6, 0.35, 0.45] },          // Schnauze
    { shape: 'zylinder', t: [0.5, 0.62, 0.09], s: [0.09, 0.28, 0.09], rz: -25 },  // Horn
    { shape: 'zylinder', t: [0.5, 0.62, -0.09], s: [0.09, 0.28, 0.09], rz: -25 }, // Horn
    { shape: 'kugel', t: [-0.05, 0.42, 0.4], s: [1.3, 0.12, 0.9], rx: -35 },  // Flügel links
    { shape: 'kugel', t: [-0.05, 0.42, -0.4], s: [1.3, 0.12, 0.9], rx: 35 },  // Flügel rechts
    { shape: 'zylinder', t: [0.35, -0.42, 0.2], s: [0.3, 0.5, 0.3] },     // Beine
    { shape: 'zylinder', t: [0.35, -0.42, -0.2], s: [0.3, 0.5, 0.3] },
    { shape: 'zylinder', t: [-0.35, -0.42, 0.2], s: [0.3, 0.5, 0.3] },
    { shape: 'zylinder', t: [-0.35, -0.42, -0.2], s: [0.3, 0.5, 0.3] },
    { shape: 'zylinder', t: [-0.72, 0.1, 0], s: [0.16, 0.6, 0.16], rz: 60 },  // Schwanz
    { shape: 'kugel', t: [-1.0, 0.35, 0], s: [0.4, 0.28, 0.22], rz: 40 }  // Schwanzspitze
  ]
};

var DEG = Math.PI / 180;

// multipliziert Translate/Rotate/Scale AUF die bestehende Matrix
// (die trägt bereits die normalizeSize-Skalierung der Grundform!)
var applyPartMatrix = function (matrix, part) {
  var u = Utils.SCALE;
  var trs = mat4.create();
  mat4.translate(trs, trs, [part.t[0] * u, part.t[1] * u, part.t[2] * u]);
  if (part.rz) mat4.rotateZ(trs, trs, part.rz * DEG);
  if (part.rx) mat4.rotateX(trs, trs, part.rx * DEG);
  mat4.scale(trs, trs, part.s);
  mat4.mul(matrix, trs, matrix);
};

var Presets = {};

// roh exportiert, damit man die Zahlen im Browser live tunen kann
// (window.sculptitDev.Presets.defs.hund = [...] + loadPreset('hund'))
Presets.defs = PRESETS;

Presets.names = function () {
  return Object.keys(PRESETS);
};

// Lädt ein Preset in die (idealerweise leere) Szene: alle Teile als einzelne
// Objekte, EIN gemeinsamer Undo-Schritt (wie Scene.loadScene).
Presets.load = function (main, name) {
  var def = PRESETS[name];
  if (!def) return null;

  var meshes = main.getMeshes();
  var newMeshes = [];
  for (var i = 0; i < def.length; ++i) {
    var mesh = Shapes.createShape(main, def[i].shape);
    applyPartMatrix(mesh.getMatrix(), def[i]);
    mesh.setMatcap(Shapes.DEFAULT_MATCAP);
    newMeshes.push(mesh);
    meshes.push(mesh);
  }

  main.getStateManager().pushStateAdd(newMeshes.slice());
  main.setMesh(meshes[meshes.length - 1]);
  return newMeshes; // Kamera-Fit macht der Aufrufer (SculptItGui._fitCamera)
};

export default Presets;
