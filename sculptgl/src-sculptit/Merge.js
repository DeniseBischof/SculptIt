import Remesh from 'editing/Remesh';
import Mesh from 'mesh/Mesh';
import MeshStatic from 'mesh/meshStatic/MeshStatic';

// "Verbinden & Sculpten": alle Formen der Szene per Voxel-Remesh zu einem
// sculptbaren Mesh verschmelzen. Das ist der vorhandene Multi-Mesh-Flow aus
// GuiTopology.remesh(), nur ohne manuelle (Strg+Klick-)Auswahl: wir nehmen
// immer ALLE Meshes - einfacher und touch-tauglich.
var Merge = {};

// Feste, kindgerechte Werte statt Slider. Zielgeräte sind iPads ab 2024
// (M-Klasse) - die verkraften deutlich mehr als die konservativen Defaults.
Merge.RESOLUTION = 120;

// Starter-Modelle beim Laden: fein, damit Gesichts-Details überleben
Merge.STARTER_RESOLUTION = 200;

// Dynamic-Topology-Meshes können nicht direkt in den Remesher
// (gleiche Logik wie GuiTopology.convertToStaticMesh)
var toStatic = function (mesh) {
  if (!mesh.isDynamic)
    return mesh;

  var newMesh = new MeshStatic(mesh.getGL());
  newMesh.setID(mesh.getID());
  newMesh.setTransformData(mesh.getTransformData());
  newMesh.setVertices(mesh.getVertices().subarray(0, mesh.getNbVertices() * 3));
  newMesh.setColors(mesh.getColors().subarray(0, mesh.getNbVertices() * 3));
  newMesh.setMaterials(mesh.getMaterials().subarray(0, mesh.getNbVertices() * 3));
  newMesh.setFaces(mesh.getFaces().subarray(0, mesh.getNbFaces() * 4));

  Mesh.OPTIMIZE = false;
  newMesh.init();
  Mesh.OPTIMIZE = true;

  newMesh.setRenderData(mesh.getRenderData());
  newMesh.initRender();
  return newMesh;
};

// Voxel-Remesh über alle Meshes der Szene - auch mit nur EINEM Mesh sinnvoll:
// verschmilzt überlappende Teil-Shells (Flecken-Artefakte), schließt Löcher
// und ersetzt ungleichmäßige Import-Topologie durch gleichmäßige Knet-Quads
// (zackige Sculpt-Striche auf generierten Modellen).
// Blockiert den Hauptthread für ~1-2s - der Aufrufer zeigt vorher das
// Lade-Overlay und ruft uns per setTimeout auf.
Merge.remeshAll = function (main, resolution) {
  var meshes = main.getMeshes();
  if (meshes.length === 0)
    return null;

  var old = meshes.slice();
  var statics = old.map(toStatic);

  var keepRes = Remesh.RESOLUTION;
  Remesh.RESOLUTION = resolution || Merge.RESOLUTION;
  // manifold=true: MarchingCubes + tangentiales Smoothing (glatteres Ergebnis)
  var newMesh = Remesh.remesh(statics, statics[0], true);
  Remesh.RESOLUTION = keepRes;

  meshes.length = 0;
  main.getStateManager().pushStateAddRemove(newMesh, old);
  meshes.push(newMesh);
  main.setMesh(newMesh);
  return newMesh;
};

Merge.mergeAll = function (main) {
  var meshes = main.getMeshes();
  if (meshes.length === 0)
    return null;
  if (meshes.length === 1)
    return meshes[0]; // nichts zu verschmelzen
  return Merge.remeshAll(main, Merge.RESOLUTION);
};

export default Merge;
