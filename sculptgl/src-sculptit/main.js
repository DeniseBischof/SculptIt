import 'misc/Polyfill';
import SculptGL from 'SculptGL';
import SculptItGui from './SculptItGui';
import Shapes from './Shapes';
import Presets from './Presets';
import Autosave from './Autosave';
import Merge from './Merge';

// Standard-Look: Pearl-Matcap (grau) statt des "fleischigen" SculptGL-Defaults
var DEFAULT_MATCAP = Shapes.DEFAULT_MATCAP;

// SculptIt: gleiche Sculpting-Engine, eigene GUI-Schicht.
// Der Scene-Konstruktor erzeugt die yagui-basierte Gui; wir tauschen sie vor
// start() gegen SculptItGui aus, yagui wird also nie initialisiert.
class SculptItApp extends SculptGL {

  constructor() {
    super();
    this._gui = new SculptItGui(this);
    // Importe (Starter + eigene Modelle) auf Standardgröße normalisieren -
    // sonst ist ein geladenes Modell winzig gegenüber den Grundformen
    // (SculptGL-Default scalecenter=false; Scene.loadScene wertet das Flag aus)
    this._autoMatrix = true;
  }

  // jede neue Form (Grundformen, Duplikate, Start-Kugel) bekommt den Standard-Look;
  // das Verbinden-Mesh erbt ihn über die RenderData des ersten Quell-Meshes
  addNewMesh(mesh) {
    mesh.setMatcap(DEFAULT_MATCAP);
    return super.addNewMesh(mesh);
  }

  // Importe laufen an addNewMesh vorbei
  loadScene(fileData, fileType) {
    var newMeshes = super.loadScene(fileData, fileType);
    if (newMeshes) {
      for (var i = 0; i < newMeshes.length; ++i)
        newMeshes[i].setMatcap(DEFAULT_MATCAP);
    }
    return newMeshes;
  }
}

window.SculptIt = SculptItApp;

// Debug-Zugriff für Konsole/Tests (Instanz selbst liegt auf window.sculptit)
window.sculptitDev = { Shapes: Shapes, Presets: Presets, Autosave: Autosave, Merge: Merge };
