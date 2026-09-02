import Remesh from 'editing/Remesh';
import SurfaceNets from 'editing/SurfaceNets';
import Mesh from 'mesh/Mesh';
import MeshStatic from 'mesh/meshStatic/MeshStatic';
import Smooth from 'editing/tools/Smooth';

// "Verbinden & Sculpten": alle Formen der Szene per Voxel-Remesh zu einem
// sculptbaren Mesh verschmelzen. Das ist der vorhandene Multi-Mesh-Flow aus
// GuiTopology.remesh(), nur ohne manuelle (Strg+Klick-)Auswahl: wir nehmen
// immer ALLE Meshes - einfacher und touch-tauglich.
var Merge = {};

// Feste, kindgerechte Werte statt Slider. Zielgeräte sind iPads ab 2024
// (M-Klasse) - die verkraften deutlich mehr als die konservativen Defaults.
Merge.RESOLUTION = 150;

// Starter-Modelle beim Laden: fein, damit Gesichts-Details überleben
Merge.STARTER_RESOLUTION = 230;

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
// tangentialer Glättungs-Pass über das ganze Mesh (wie Remesh.js intern) -
// bei hoher Voxel-Auflösung reicht der eine eingebaute Pass nicht, es bleiben
// Marching-Cubes-Terrassen als Streifen-Bänder auf großen Flächen sichtbar
var smoothPass = function (mesh) {
  var nbVertices = mesh.getNbVertices();
  var indices = new Uint32Array(nbVertices);
  for (var i = 0; i < nbVertices; ++i) indices[i] = i;
  var smo = new Smooth();
  smo.setToolMesh(mesh);
  smo.smoothTangent(indices, 1.0);
  mesh.updateGeometry();
  mesh.updateGeometryBuffers();
};

// surfaceNets=true nutzt SurfaceNets statt MarchingCubes: SculptGLs Standard-
// Remesher, erzeugt auf großen Flächen KEINE Terrassen-Streifen (das MC-
// Stufenmuster blieb selbst nach extra Glättung als Schattenbänder sichtbar)
Merge.remeshAll = function (main, resolution, surfaceNets) {
  var meshes = main.getMeshes();
  if (meshes.length === 0)
    return null;

  var old = meshes.slice();
  var statics = old.map(toStatic);

  var keepRes = Remesh.RESOLUTION;
  Remesh.RESOLUTION = resolution || Merge.RESOLUTION;
  var newMesh = Remesh.remesh(statics, statics[0], !surfaceNets);
  Remesh.RESOLUTION = keepRes;

  smoothPass(newMesh);

  meshes.length = 0;
  main.getStateManager().pushStateAddRemove(newMesh, old);
  meshes.push(newMesh);
  main.setMesh(newMesh);
  return newMesh;
};

// "Ausstechen": das aktive Mesh wird als Negativform von allen anderen
// abgezogen (CSG-Differenz). Nutzt die von Remesh.js re-exportierten
// Bausteine: beide Gruppen werden ins SELBE Voxelgrid gerechnet, dann
// d = max(dRest, -dAusstecher) - Standard-SDF-Subtraktion.
// Achtung: Utils.getMemory liefert einen GETEILTEN Buffer, deshalb muss
// das erste Distanzfeld kopiert werden, bevor das zweite entsteht.
var subtractRemesh = function (keepMeshes, cutMeshes, baseMesh) {
  var all = keepMeshes.concat(cutMeshes);
  var box = Remesh._prepareMeshes(all); // schließt Löcher, backt Transforms ein, mutiert das Array
  var keepPrepared = all.slice(0, keepMeshes.length);
  var cutPrepared = all.slice(keepMeshes.length);
  var i = 0;

  var voxels = Remesh._createVoxelData(box);
  for (i = 0; i < keepPrepared.length; ++i)
    Remesh._voxelize(keepPrepared[i], voxels);
  Remesh._floodFill(voxels);
  var dKeep = new Float32Array(voxels.distanceField);
  var cKeep = new Float32Array(voxels.colorField);
  var mKeep = new Float32Array(voxels.materialField);

  var voxelsCut = Remesh._createVoxelData(box);
  for (i = 0; i < cutPrepared.length; ++i)
    Remesh._voxelize(cutPrepared[i], voxelsCut);
  Remesh._floodFill(voxelsCut);

  var df = voxelsCut.distanceField;
  for (i = 0; i < df.length; ++i)
    df[i] = Math.max(dKeep[i], -df[i]);
  voxelsCut.colorField.set(cKeep);
  voxelsCut.materialField.set(mKeep);

  SurfaceNets.BLOCK = false;
  var res = SurfaceNets.computeSurface(voxelsCut);
  var nmesh = Remesh._createMesh(baseMesh, res.faces, res.vertices, res.colors, res.materials);
  Remesh._alignMeshBound(nmesh, box);
  return nmesh;
};

Merge.subtract = function (main, resolution) {
  var meshes = main.getMeshes();
  var cutter = main.getMesh();
  if (!cutter || meshes.length < 2)
    return null;

  var old = meshes.slice();
  var keep = [];
  for (var i = 0; i < old.length; ++i) {
    if (old[i] !== cutter)
      keep.push(toStatic(old[i]));
  }

  var keepRes = Remesh.RESOLUTION;
  Remesh.RESOLUTION = resolution || Merge.RESOLUTION;
  var newMesh = subtractRemesh(keep, [toStatic(cutter)], keep[0]);
  Remesh.RESOLUTION = keepRes;

  // 2x: die max()-Naht der CSG-Differenz ist nicht glatt, an der
  // Schnittkante bleiben sonst Zacken
  smoothPass(newMesh);
  smoothPass(newMesh);

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
  // auch bei EINEM Mesh remeshen: so kann man aufgelegte Details eines
  // Starters (Brauen, Augen) bewusst mit der Oberfläche verschmelzen
  return Merge.remeshAll(main, Merge.RESOLUTION, true);
};

export default Merge;
