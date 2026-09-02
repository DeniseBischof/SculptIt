import { mat4 } from 'gl-matrix';
import Multimesh from 'mesh/multiresolution/Multimesh';
import Primitives from 'drawables/Primitives';
import Subdivision from 'editing/Subdivision';
import Utils from 'misc/Utils';

// Builder-Grundformen: wie Scene.addSphere/addCube/addCylinder, aber deutlich
// weniger subdividiert. Die Formen existieren nur bis "Verbinden & Sculpten"
// sie remeshed - 50k Faces pro Form (Scene.subdivideClamp) wären auf alten
// Geräten bei 5-8 Formen zu viel.
var MAX_FACES = 12000;

var subdivideClamp = function (mesh, linear) {
  Subdivision.LINEAR = !!linear;
  while (mesh.getNbFaces() < MAX_FACES)
    mesh.addLevel();
  mesh._meshes.splice(0, Math.min(mesh._meshes.length - 4, 4));
  mesh._sel = mesh._meshes.length - 1;
  Subdivision.LINEAR = false;
};

// Spawn-Versatz, damit neue Formen nicht exakt übereinander liegen
// (Einheit: Utils.SCALE ~ Durchmesser einer normalisierten Form)
var OFFSETS = [
  [0.0, 0.0, 0.0],
  [0.65, 0.35, 0.0],
  [-0.65, 0.35, 0.0],
  [0.0, -0.7, 0.0],
  [0.65, -0.4, 0.0],
  [-0.65, -0.4, 0.0],
  [0.0, 0.75, 0.0]
];

var Shapes = {};
Shapes._count = 0;

// Standard-Look: Pearl-Matcap (resources/matcaps/pearl.jpg) - neutrales Grau.
// SculptGL-Default 3 war "fleischig", clay (5) zu braun. Genutzt von main.js
// und Presets.js.
Shapes.DEFAULT_MATCAP = 4;

// Erzeugt eine normalisierte Grundform (Durchmesser ~ Utils.SCALE),
// OHNE sie in die Szene einzufügen - Basis für addShape und Presets.
// type: 'kugel' | 'wuerfel' | 'zylinder'
Shapes.createShape = function (main, type) {
  var mesh;
  var linear = false;
  if (type === 'zylinder') {
    mesh = new Multimesh(Primitives.createCylinder(main._gl));
  } else {
    mesh = new Multimesh(Primitives.createCube(main._gl));
    linear = type === 'wuerfel';
  }
  mesh.normalizeSize();
  subdivideClamp(mesh, linear);
  return mesh;
};

// Interaktiv über die "+"-Buttons: Form mit Spawn-Versatz einfügen (undo-fähig)
Shapes.addShape = function (main, type) {
  var mesh = Shapes.createShape(main, type);
  var m = mesh.getMatrix();
  if (type !== 'kugel')
    mat4.scale(m, m, [0.7, 0.7, 0.7]);

  var off = OFFSETS[Shapes._count++ % OFFSETS.length];
  var t = mat4.create();
  mat4.translate(t, t, [off[0] * Utils.SCALE, off[1] * Utils.SCALE, off[2] * Utils.SCALE]);
  mat4.mul(m, t, m);

  return main.addNewMesh(mesh);
};

export default Shapes;
