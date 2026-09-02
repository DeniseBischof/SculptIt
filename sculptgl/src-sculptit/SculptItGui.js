import { mat4 } from 'gl-matrix';
import Enums from 'misc/Enums';
import Utils from 'misc/Utils';
import Gizmo from 'editing/Gizmo';
import Export from 'files/Export';
import { saveAs } from 'file-saver';
import Shapes from './Shapes';
import Merge from './Merge';
import Presets from './Presets';
import Autosave from './Autosave';

// SculptItGui ersetzt die yagui-basierte Gui-Klasse von SculptGL komplett.
// Schnittstelle zum Core (siehe docs/ui-plan.md):
//   - Scene.start() ruft initGui()
//   - SculptGL leitet DOM-Events über callFunc('onKeyDown', e) etc. weiter
//   - Picking ruft updateMeshInfo()
// Alles andere hier sind eigene Aktionen, die vorhandene Core-Methoden aufrufen.

var svg = function (paths) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
};

var ICONS = {
  kugel: svg('<circle cx="12" cy="12" r="8"/>'),
  wuerfel: svg('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>'),
  zylinder: svg('<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12M19 6v12"/><path d="M5 18a7 3 0 0 0 14 0"/>'),
  bewegen: svg('<path d="M12 2v20M2 12h20"/><path d="M12 2l-2.5 3M12 2l2.5 3M12 22l-2.5-3M12 22l2.5-3M2 12l3-2.5M2 12l3 2.5M22 12l-3-2.5M22 12l-3 2.5"/>'),
  drehen: svg('<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M18.5 2.5v4.5H14"/>'),
  groesse: svg('<rect x="4" y="12" width="8" height="8" rx="1.5"/><path d="M13 11L21 3M21 3h-5.5M21 3v5.5"/>'),
  kopieren: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 15V6a2 2 0 0 1 2-2h9"/>'),
  loeschen: svg('<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/>'),
  aufbauen: svg('<path d="M3 18h4c0-4 3-7 5-7s5 3 5 7h4"/><path d="M12 8V3M12 3l-2 2.2M12 3l2 2.2"/>'),
  druecken: svg('<path d="M3 12h4c0 4 3 7 5 7s5-3 5-7h4"/><path d="M12 2v6M12 8l-2-2.2M12 8l2-2.2"/>'),
  ziehen: svg('<path d="M3 19h5c1-6 4-8 8-8"/><path d="M16 5l4 4-4 4M20 9h-6"/>'),
  glaetten: svg('<path d="M3 14c3 0 3-4 6-4s3 4 6 4 3-4 6-4"/><path d="M3 19h18"/>'),
  falte: svg('<path d="M4 6l8 12L20 6"/>'),
  undo: svg('<path d="M8 5L3 10l5 5"/><path d="M3 10h11a6 6 0 0 1 6 6v3"/>'),
  redo: svg('<path d="M16 5l5 5-5 5"/><path d="M21 10H10a6 6 0 0 0-6 6v3"/>'),
  export: svg('<path d="M12 15V3M12 3L8 7M12 3l4 4"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>'),
  verbinden: svg('<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>'),
  mensch: svg('<circle cx="12" cy="5.5" r="2.8"/><path d="M12 8.5v7M12 15.5l-3.5 5M12 15.5l3.5 5M7 11h10"/>'),
  hund: svg('<circle cx="12" cy="11.5" r="6.5"/><path d="M6.9 6.3C4.2 7.1 3.5 11 5.5 13.6M17.1 6.3c2.7 .8 3.4 4.7 1.4 7.3"/><ellipse cx="12" cy="14" rx="2.7" ry="1.9"/><circle cx="12" cy="13.2" r="0.55" fill="currentColor"/>'),
  katze: svg('<circle cx="12" cy="13" r="6.5"/><path d="M7 9l-1-5 4 2.5M17 9l1-5-4 2.5"/>'),
  kreatur: svg('<circle cx="12" cy="13" r="6.5"/><path d="M8 7L5 3M16 7l3-4M9 3.5L8 7M15 3.5L16 7"/><circle cx="10" cy="12" r="0.5" fill="currentColor"/><circle cx="14" cy="12" r="0.5" fill="currentColor"/>'),
  oeffnen: svg('<path d="M3 8V6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2"/><path d="M3 8h18l-2 11H5L3 8z"/>'),
  auto: svg('<path d="M3 16v-2.5L5 9h9l4 4.5h3V16"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6M3 16h2M21 16h-2"/>'),
  kopf: svg('<circle cx="12" cy="9" r="5.5"/><path d="M7 21c0-3 2-4.5 5-4.5s5 1.5 5 4.5"/>'),
  roboter: svg('<rect x="6" y="8" width="12" height="10" rx="2"/><circle cx="10" cy="13" r="1" fill="currentColor"/><circle cx="14" cy="13" r="1" fill="currentColor"/><path d="M12 8V4M9.5 4h5"/>'),
  zeigen: svg('<rect x="7" y="9" width="10" height="7" rx="2"/><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/>'),
  heim: svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
  weiter: svg('<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5V8.5z" fill="currentColor"/>')
};

// Bauen-Modus: ein Gizmo-Modus pro Button - Kinder wollen zuerst schieben,
// Drehen und Größe gibt es als eigene Knöpfe (Gizmo-Bitmasken)
var GIZMO_MODES = {
  bewegen: Gizmo.TRANS_XYZ | Gizmo.PLANE_XYZ,
  drehen: Gizmo.ROT_XYZ | Gizmo.ROT_W,
  groesse: Gizmo.SCALE_XYZW
};

// Sonderbehandlung pro Starter:
// - size: Größenfaktor (Modelle mit großer Spannweite macht die Normierung
//   sonst zu klein, weil die Bounding-Box aufgebläht ist)
// - remesh false: dünne Flügelmembranen überleben das Voxel-Remesh nicht
//   (Flood-Fill leckt durch die Löcher) - dann nur Subdivision
var STARTER_CONFIG = {
  drache: { size: 1.45, remesh: false },
  // die Büste ist unten offen - das Remesh franst die offene Halskante aus;
  // das Modell ist ohnehin das sauberste (verschweißt, einteilig)
  kopf: { remesh: false }
};

var SCULPT_TOOLS = [
  { id: 'aufbauen', label: 'Aufbauen', tool: Enums.Tools.BRUSH, negative: false },
  { id: 'druecken', label: 'Eindrücken', tool: Enums.Tools.BRUSH, negative: true },
  { id: 'ziehen', label: 'Ziehen', tool: Enums.Tools.DRAG },
  { id: 'glaetten', label: 'Glätten', tool: Enums.Tools.SMOOTH },
  { id: 'falte', label: 'Falte', tool: Enums.Tools.CREASE }
];

var el = function (tag, cls, html) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

class SculptItGui {

  constructor(main) {
    this._main = main;
    this._mode = 'kneten'; // 'bauen' | 'kneten'
    this._root = null;
    this._infoLabel = null;
    this._sizeSlider = null;
    this._strengthSlider = null;
    this._symBtn = null;
    this._exportMenu = null;
    this._toolButtons = {};
    this._modeButtons = {};
  }

  ////////////////
  // CORE-SCHNITTSTELLE (von Scene/SculptGL aufgerufen)
  ////////////////

  initGui() {
    this._root = el('div', 'sit-root');
    this._buildTopbar();
    this._buildToolbar();
    this._buildBottombar();
    this._buildLoading();
    this._buildConfirm();
    this._buildStart();
    document.body.appendChild(this._root);

    window.addEventListener('resize', this._main.onCanvasResize.bind(this._main), false);

    this.setMode('kneten');

    Autosave.start(this._main);
    this._refreshResumeCard();
  }

  // zeigt den Startbildschirm wieder an (Home-Button)
  showStart() {
    this._refreshResumeCard();
    this._start.classList.remove('hidden');
  }

  // "Weitermachen"-Karte einblenden/aktualisieren, wenn ein Spielstand existiert
  _refreshResumeCard() {
    var self = this;
    Autosave.probe(function (date) {
      if (!date) return;
      var when = new Date(date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      if (self._resumeCard) {
        self._resumeCard.querySelector('.sit-card-sub').textContent = 'Stand ' + when + ' Uhr';
        return;
      }
      var c = document.createElement('button');
      c.className = 'sit-card sit-card-resume';
      c.innerHTML = '<span class="sit-card-icon">' + ICONS.weiter + '</span><span class="sit-card-label">Weitermachen</span>' +
        '<span class="sit-card-sub">Stand ' + when + ' Uhr</span>';
      c.addEventListener('click', function () {
        self._start.classList.add('hidden');
        Autosave.restore(self._main, function (ok) {
          if (!ok) return;
          self.setMode('kneten');
          self._fitCamera();
          self.updateMeshInfo();
        });
      });
      self._resumeCard = c;
      self._startGrid.insertBefore(c, self._startGrid.firstChild);
    });
  }

  callFunc(func, event) {
    if (typeof this[func] === 'function')
      this[func](event);
  }

  // Scene.setMesh ruft das nach jedem Auswahlwechsel
  updateMesh() {
    this.updateMeshInfo();
    this._syncSliders();
  }

  // Scene.loadAlphaImage registriert damit Alpha-Brushes - brauchen wir nicht
  addAlphaOptions() {}

  updateMeshInfo() {
    if (!this._infoLabel) return;
    var main = this._main;
    var meshes = main.getMeshes();
    var nbFaces = 0;
    for (var i = 0; i < meshes.length; ++i)
      nbFaces += meshes[i].getNbFaces();
    var kf = (nbFaces / 1000).toFixed(nbFaces < 10000 ? 1 : 0);
    this._infoLabel.textContent = meshes.length > 1
      ? meshes.length + ' Formen · ' + kf + 'k Flächen'
      : (meshes.length === 1 ? kf + 'k Flächen' : '');
  }

  onKeyDown(event) {
    if (event.handled === true) return;
    var key = event.which || event.keyCode;
    if (event.ctrlKey && key === 90) { // ctrl+z
      this.undo();
      event.handled = true;
      event.preventDefault();
    } else if (event.ctrlKey && key === 89) { // ctrl+y
      this.redo();
      event.handled = true;
      event.preventDefault();
    }
  }

  onMouseUp() {
    this.updateMeshInfo();
  }

  ////////////////
  // AKTIONEN
  ////////////////

  undo() {
    var main = this._main;
    main._action = Enums.Action.NOTHING;
    main.getSculptManager().end(); // laufenden Strich abbrechen (wie GuiStates)
    main.getStateManager().undo();
    main.render();
    this.updateMeshInfo();
  }

  redo() {
    this._main.getStateManager().redo();
    this._main.render();
    this.updateMeshInfo();
  }

  setMode(mode) {
    this._mode = mode;
    this._root.dataset.mode = mode;
    this._modeButtons.bauen.classList.toggle('active', mode === 'bauen');
    this._modeButtons.kneten.classList.toggle('active', mode === 'kneten');
    if (mode === 'bauen')
      this._selectBuildTool('bewegen');
    else
      this.setSculptTool(SCULPT_TOOLS[0]);
    this.updateMeshInfo();
  }

  setSculptTool(cfg) {
    var sm = this._main.getSculptManager();
    sm.setToolIndex(cfg.tool);
    if (cfg.tool === Enums.Tools.BRUSH)
      sm.getTool(Enums.Tools.BRUSH)._negative = !!cfg.negative;
    this._setActiveButton(cfg.id);
    this._syncSliders();
    this._main.render();
  }

  _selectBuildTool(id) {
    var sm = this._main.getSculptManager();
    if (GIZMO_MODES[id]) {
      sm.setToolIndex(Enums.Tools.TRANSFORM);
      sm.getTool(Enums.Tools.TRANSFORM)._gizmo.setActivatedType(GIZMO_MODES[id]);
    }
    this._setActiveButton(id);
    this._main.render();
  }

  _setActiveButton(id) {
    var btns = this._toolButtons;
    for (var k in btns) btns[k].classList.toggle('active', k === id);
  }

  addShape(type) {
    Shapes.addShape(this._main, type);
    this._selectBuildTool('bewegen'); // neue Formen wollen zuerst geschoben werden
    this._fitCamera(); // sicherstellen, dass die neue Form im Bild ist
    this.updateMeshInfo();
  }

  showAll() {
    this._fitCamera();
  }

  // Kamera sofort (ohne Animation) auf alle Meshes fitten. Bewusst nicht
  // resetCameraMeshes: das animiert über moveToDelay, und nach clearScene
  // kann Camera._near/._proj auf NaN stehen (optimizeNearFar mit leerer
  // Bounding-Box) - deshalb erst near/far mit der echten Box reparieren.
  _fitCamera() {
    var main = this._main;
    var meshes = main.getMeshes();
    if (!meshes.length) return;
    var cam = main.getCamera();

    // Lädt die Seite in einem verdeckten Tab/Pane, ist viewport.clientWidth 0:
    // die Kamera hat dann nie eine Projektion bekommen (proj[0] = NaN) und
    // jede Fit-Rechnung vergiftet trans/offset/view dauerhaft mit NaN.
    if (!cam._width || !cam._height || !isFinite(cam.computeFrustumFit()))
      main.onCanvasResize();

    // laufende Kamera-Animationen abbrechen: ein Delay-Timer, der mit
    // NaN-Delta gestartet wurde (z.B. Core-resetCameraMeshes bei kaputter
    // Projektion), schreibt sonst nach der Heilung weiter NaN zurück
    if (cam._timers) {
      for (var t in cam._timers) {
        if (cam._timers[t]) cam.clearTimerN(t);
      }
    }

    // vergiftete Werte VOLLSTÄNDIG heilen (trans, offset, center, near/far)
    // und danach view+proj neu aufbauen - sonst rechnet computePosition/
    // optimizeNearFar mit der alten NaN-Matrix weiter
    for (var i = 0; i < 3; ++i) {
      if (!isFinite(cam._trans[i])) cam._trans[i] = i === 2 ? 100.0 : 0.0;
      if (!isFinite(cam._offset[i])) cam._offset[i] = 0.0;
      if (!isFinite(cam._center[i])) cam._center[i] = 0.0;
    }
    if (cam._trans[2] === 0.0) cam._trans[2] = 1.0;
    if (!isFinite(cam._near)) cam._near = 0.05;
    if (!isFinite(cam._far)) cam._far = 5000.0;
    cam.updateView();
    cam.updateProjection();

    var fit = cam.computeFrustumFit();
    if (!isFinite(fit)) return; // Projektion kaputt - nichts tun

    var box = main.computeBoundingBoxMeshes(meshes);
    cam.optimizeNearFar(box);

    // wie Core-resetCameraMeshes, aber Faktor 1.05 statt 0.8 - der Core-Wert
    // beschneidet hohe Modelle (Mensch: Kopf und Füße abgeschnitten)
    var zoom = 1.05 * main.computeRadiusFromBoundingBox(box) * fit;
    cam.setAndFocusOnPivot([(box[0] + box[3]) * 0.5, (box[1] + box[4]) * 0.5, (box[2] + box[5]) * 0.5], zoom);
    main.render();
  }

  // skaliert Meshes so, dass die GRÖSSTE Achse Utils.SCALE*factor misst, und
  // zentriert sie - anders als Scene.normalizeAndCenterMeshes (Diagonale),
  // die breite Modelle relativ zu den Grundformen zu klein macht
  _normalizeSize(meshes, factor) {
    var main = this._main;
    var box = main.computeBoundingBoxMeshes(meshes);
    var max = Math.max(box[3] - box[0], box[4] - box[1], box[5] - box[2]);
    if (!max) return;
    var scale = Utils.SCALE * (factor || 1.0) / max;
    var mCen = mat4.create();
    mat4.scale(mCen, mCen, [scale, scale, scale]);
    mat4.translate(mCen, mCen, [-(box[0] + box[3]) * 0.5, -(box[1] + box[4]) * 0.5, -(box[2] + box[5]) * 0.5]);
    for (var i = 0; i < meshes.length; ++i)
      mat4.mul(meshes[i].getMatrix(), mCen, meshes[i].getMatrix());
  }

  // Starter: fertiges OBJ aus resources/starters/<name>.obj laden;
  // fehlt die Datei (noch), fällt es auf das Grundformen-Preset zurück
  loadStarter(name) {
    var main = this._main;
    var self = this;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'resources/starters/' + name + '.obj', true);
    xhr.responseType = 'text';
    xhr.onload = function () {
      if (xhr.status === 200 && xhr.response && xhr.response.length > 10) {
        main.clearScene();
        var newMeshes = main.loadScene(xhr.response, 'obj');
        if (!newMeshes) {
          self.loadPreset(name);
          return;
        }
        // Generierte OBJs haben überlappende Teil-Shells (Glanz-Flecken) und
        // ungleichmäßige Topologie (zackige Sculpt-Striche). Ein Voxel-Remesh
        // beim Laden heilt beides und liefert gleichmäßige Knet-Quads.
        // Ausnahme remesh:false (siehe STARTER_CONFIG): nur Subdivision.
        // Beides läuft im setTimeout: blockiert den Hauptthread ~1-2s, und
        // der Kamera-Fit funktioniert nur nach abgeschlossenem Load-Task
        // zuverlässig.
        var cfg = STARTER_CONFIG[name] || {};
        self._loadingText.textContent = 'Wird vorbereitet …';
        self._loading.classList.add('visible');
        window.setTimeout(function () {
          try {
            if (cfg.remesh === false) {
              for (var i = 0; i < newMeshes.length; ++i) {
                while (newMeshes[i].getNbFaces() < 25000 && newMeshes[i].addLevel)
                  newMeshes[i].addLevel();
              }
              self._normalizeSize(newMeshes, cfg.size);
              main.setMesh(newMeshes[newMeshes.length - 1]);
            } else {
              var mesh = Merge.remeshAll(main, Merge.STARTER_RESOLUTION);
              if (mesh) self._normalizeSize([mesh], cfg.size);
            }
          } finally {
            self._loading.classList.remove('visible');
          }
          self.setMode('kneten');
          self._fitCamera();
          self.updateMeshInfo();
        }, 60);
      } else {
        self.loadPreset(name);
      }
    };
    xhr.onerror = function () { self.loadPreset(name); };
    xhr.send();
  }

  loadPreset(name) {
    var main = this._main;
    main.clearScene();
    Presets.load(main, name);
    this._fitCamera();
    this.setMode('bauen');
  }

  duplicate() {
    if (!this._main.getMesh()) return;
    this._main.duplicateSelection();
    this._selectBuildTool('bewegen');
    this._main.render();
    this.updateMeshInfo();
  }

  remove() {
    this._main.deleteCurrentSelection();
    this._main.render();
    this.updateMeshInfo();
  }

  mergeAndSculpt() {
    var main = this._main;
    if (main.getMeshes().length <= 1) {
      this.setMode('kneten');
      return;
    }

    // beim allerersten Mal warnen: Verbinden ist (bis auf Undo) endgültig
    var warned = false;
    try {
      warned = window.localStorage.getItem('sculptit-merge-warned') === '1';
    } catch (e) {}
    if (!warned) {
      this._confirm.classList.add('visible');
      return;
    }
    this._doMerge();
  }

  _confirmMerge(ok) {
    this._confirm.classList.remove('visible');
    if (!ok) return;
    try {
      window.localStorage.setItem('sculptit-merge-warned', '1');
    } catch (e) {}
    this._doMerge();
  }

  _doMerge() {
    var main = this._main;
    var loading = this._loading;
    this._loadingText.textContent = 'Formen werden verbunden …';
    loading.classList.add('visible');
    var self = this;
    // Remesh blockiert den Hauptthread - erst Overlay rendern lassen
    window.setTimeout(function () {
      try {
        Merge.mergeAll(main);
      } finally {
        loading.classList.remove('visible');
      }
      main.render();
      self.setMode('kneten');
    }, 60);
  }

  toggleSymmetry() {
    var sm = this._main.getSculptManager();
    sm._symmetry = !sm._symmetry;
    this._symBtn.classList.toggle('active', sm._symmetry);
    this._main.render();
  }

  _sitTools() {
    var sm = this._main.getSculptManager();
    return [
      sm.getTool(Enums.Tools.BRUSH),
      sm.getTool(Enums.Tools.DRAG),
      sm.getTool(Enums.Tools.SMOOTH),
      sm.getTool(Enums.Tools.CREASE)
    ];
  }

  setRadius(val) {
    // global auf alle SculptIt-Tools, damit der Wert beim Werkzeugwechsel bleibt
    var tools = this._sitTools();
    for (var i = 0; i < tools.length; ++i)
      tools[i]._radius = val;
    this._main.renderSelectOverRtt();
  }

  setStrength(val) {
    var tools = this._sitTools();
    for (var i = 0; i < tools.length; ++i) {
      if (tools[i]._intensity !== undefined)
        tools[i]._intensity = val / 100;
    }
  }

  _syncSliders() {
    var tool = this._main.getSculptManager().getCurrentTool();
    if (!tool) return;
    if (tool._radius !== undefined)
      this._sizeSlider.value = tool._radius;
    if (tool._intensity !== undefined)
      this._strengthSlider.value = Math.round(tool._intensity * 100);
  }

  exportFile(format) {
    var main = this._main;
    var meshes = main.getMeshes();
    if (!meshes.length) return;
    if (format === 'obj') saveAs(Export.exportOBJ(meshes), 'sculptit.obj');
    else if (format === 'stl') saveAs(Export.exportBinarySTL(meshes), 'sculptit.stl');
    else if (format === 'ply') saveAs(Export.exportBinaryPLY(meshes), 'sculptit.ply');
    else if (format === 'sgl') saveAs(Export.exportSGL(meshes, main), 'sculptit.sgl');
    this._exportMenu.classList.remove('open');
  }

  ////////////////
  // DOM-AUFBAU
  ////////////////

  _iconBtn(id, label, cls, onclick) {
    var b = el('button', 'sit-btn ' + (cls || ''));
    b.innerHTML = '<span class="sit-icon">' + (ICONS[id] || '') + '</span><span class="sit-label">' + label + '</span>';
    b.addEventListener('click', onclick);
    this._toolButtons[id] = b;
    return b;
  }

  _buildTopbar() {
    var bar = el('div', 'sit-topbar');

    bar.appendChild(el('div', 'sit-brand', 'Sculpt<b>It</b>'));

    var homeBtn = el('button', 'sit-btn sit-btn-flat', '<span class="sit-icon">' + ICONS.heim + '</span><span class="sit-label">Start</span>');
    homeBtn.addEventListener('click', this.showStart.bind(this));
    bar.appendChild(homeBtn);

    var history = el('div', 'sit-history');
    var undoBtn = el('button', 'sit-btn sit-btn-flat', '<span class="sit-icon">' + ICONS.undo + '</span><span class="sit-label">Rückgängig</span>');
    undoBtn.addEventListener('click', this.undo.bind(this));
    var redoBtn = el('button', 'sit-btn sit-btn-flat', '<span class="sit-icon">' + ICONS.redo + '</span><span class="sit-label">Wiederholen</span>');
    redoBtn.addEventListener('click', this.redo.bind(this));
    history.appendChild(undoBtn);
    history.appendChild(redoBtn);
    bar.appendChild(history);

    var right = el('div', 'sit-topbar-right');
    this._infoLabel = el('span', 'sit-info');
    right.appendChild(this._infoLabel);

    var showAllBtn = el('button', 'sit-btn sit-btn-flat', '<span class="sit-icon">' + ICONS.zeigen + '</span><span class="sit-label">Alles zeigen</span>');
    showAllBtn.addEventListener('click', this.showAll.bind(this));
    right.appendChild(showAllBtn);

    var exportWrap = el('div', 'sit-export-wrap');
    var exportBtn = el('button', 'sit-btn sit-btn-primary', '<span class="sit-icon">' + ICONS.export + '</span><span class="sit-label">Exportieren</span>');
    var menu = this._exportMenu = el('div', 'sit-export-menu');
    var self = this;
    [['obj', '3D-Modell (.obj)'], ['stl', 'Für 3D-Druck (.stl)'], ['ply', 'Mit Farben (.ply)'], ['sgl', 'Projekt speichern (.sgl)']].forEach(function (opt) {
      var item = el('button', 'sit-export-item', opt[1]);
      item.addEventListener('click', function () { self.exportFile(opt[0]); });
      menu.appendChild(item);
    });
    exportBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      menu.classList.toggle('open');
    });
    document.addEventListener('click', function () { menu.classList.remove('open'); });
    exportWrap.appendChild(exportBtn);
    exportWrap.appendChild(menu);
    right.appendChild(exportWrap);
    bar.appendChild(right);

    this._root.appendChild(bar);
  }

  _buildToolbar() {
    var bar = el('div', 'sit-toolbar');
    var self = this;

    var modes = el('div', 'sit-modes');
    var bBauen = el('button', 'sit-mode-btn', 'Bauen');
    bBauen.addEventListener('click', function () { self.setMode('bauen'); });
    var bKneten = el('button', 'sit-mode-btn', 'Kneten');
    bKneten.addEventListener('click', function () { self.setMode('kneten'); });
    this._modeButtons = { bauen: bBauen, kneten: bKneten };
    modes.appendChild(bBauen);
    modes.appendChild(bKneten);
    bar.appendChild(modes);

    // Bauen-Werkzeuge
    var build = el('div', 'sit-tools only-bauen');
    build.appendChild(this._iconBtn('kugel', '+ Kugel', 'sit-btn-add', function () { self.addShape('kugel'); }));
    build.appendChild(this._iconBtn('wuerfel', '+ Würfel', 'sit-btn-add', function () { self.addShape('wuerfel'); }));
    build.appendChild(this._iconBtn('zylinder', '+ Zylinder', 'sit-btn-add', function () { self.addShape('zylinder'); }));
    build.appendChild(el('div', 'sit-sep'));
    build.appendChild(this._iconBtn('bewegen', 'Bewegen', '', function () { self._selectBuildTool('bewegen'); }));
    build.appendChild(this._iconBtn('drehen', 'Drehen', '', function () { self._selectBuildTool('drehen'); }));
    build.appendChild(this._iconBtn('groesse', 'Größe', '', function () { self._selectBuildTool('groesse'); }));
    build.appendChild(this._iconBtn('kopieren', 'Kopieren', '', this.duplicate.bind(this)));
    build.appendChild(this._iconBtn('loeschen', 'Löschen', '', this.remove.bind(this)));
    bar.appendChild(build);

    // Kneten-Werkzeuge
    var sculpt = el('div', 'sit-tools only-kneten');
    SCULPT_TOOLS.forEach(function (cfg) {
      sculpt.appendChild(self._iconBtn(cfg.id, cfg.label, '', function () { self.setSculptTool(cfg); }));
    });
    bar.appendChild(sculpt);

    // der wichtigste Button
    var merge = el('button', 'sit-btn sit-btn-merge only-bauen');
    merge.innerHTML = '<span class="sit-icon">' + ICONS.verbinden + '</span><span class="sit-label">Verbinden &amp; Sculpten</span>';
    merge.addEventListener('click', this.mergeAndSculpt.bind(this));
    bar.appendChild(merge);

    this._root.appendChild(bar);
  }

  _buildBottombar() {
    var bar = el('div', 'sit-bottombar');
    var self = this;

    var sculptCtrls = el('div', 'sit-sliders only-kneten');

    var sizeWrap = el('label', 'sit-slider');
    sizeWrap.appendChild(el('span', 'sit-slider-label', 'Größe'));
    var size = this._sizeSlider = el('input');
    size.type = 'range';
    size.min = '5';
    size.max = '150';
    size.value = '50';
    size.addEventListener('input', function () { self.setRadius(parseFloat(size.value)); });
    sizeWrap.appendChild(size);
    sculptCtrls.appendChild(sizeWrap);

    var strWrap = el('label', 'sit-slider');
    strWrap.appendChild(el('span', 'sit-slider-label', 'Stärke'));
    var str = this._strengthSlider = el('input');
    str.type = 'range';
    str.min = '0';
    str.max = '100';
    str.value = '75';
    str.addEventListener('input', function () { self.setStrength(parseFloat(str.value)); });
    strWrap.appendChild(str);
    sculptCtrls.appendChild(strWrap);

    var sym = this._symBtn = el('button', 'sit-btn sit-btn-flat active', '<span class="sit-label">Symmetrie</span>');
    sym.addEventListener('click', this.toggleSymmetry.bind(this));
    sculptCtrls.appendChild(sym);

    bar.appendChild(sculptCtrls);
    bar.appendChild(el('div', 'sit-hint only-bauen', 'Tippe eine Form an und zieh die Pfeile · Drehen und Größe über die Knöpfe links'));

    this._root.appendChild(bar);
  }

  _buildLoading() {
    var overlay = this._loading = el('div', 'sit-loading');
    var box = el('div', 'sit-loading-box');
    box.appendChild(el('div', 'sit-spinner'));
    this._loadingText = el('div', 'sit-loading-text', 'Formen werden verbunden …');
    box.appendChild(this._loadingText);
    overlay.appendChild(box);
    this._root.appendChild(overlay);
  }

  _buildConfirm() {
    var overlay = this._confirm = el('div', 'sit-confirm');
    var box = el('div', 'sit-confirm-box');
    box.appendChild(el('div', 'sit-confirm-icon', ICONS.verbinden));
    box.appendChild(el('h2', 'sit-confirm-title', 'Formen verbinden?'));
    box.appendChild(el('p', 'sit-confirm-text',
      'Deine Formen werden zu einem Stück verschmolzen. ' +
      'Danach kannst du sie nicht mehr einzeln bewegen — ' +
      'nur „Rückgängig" holt die Einzelteile zurück.'));
    var row = el('div', 'sit-confirm-row');
    var cancel = el('button', 'sit-btn sit-btn-ghost', 'Zurück');
    cancel.addEventListener('click', this._confirmMerge.bind(this, false));
    var ok = el('button', 'sit-btn sit-btn-primary', 'Los, verbinden!');
    ok.addEventListener('click', this._confirmMerge.bind(this, true));
    row.appendChild(cancel);
    row.appendChild(ok);
    box.appendChild(row);
    overlay.appendChild(box);
    this._root.appendChild(overlay);
  }

  _buildStart() {
    var overlay = this._start = el('div', 'sit-start');
    var box = el('div', 'sit-start-box');
    box.appendChild(el('h1', 'sit-start-title', 'Was möchtest du machen?'));
    var grid = this._startGrid = el('div', 'sit-start-grid');
    var self = this;
    var main = this._main;

    // Klick auf den Hintergrund schließt (nur wenn schon etwas in der Szene ist)
    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay && main.getMeshes().length)
        overlay.classList.add('hidden');
    });

    var card = function (icon, label, sub, onclick, disabled) {
      var c = el('button', 'sit-card' + (disabled ? ' disabled' : ''));
      c.innerHTML = '<span class="sit-card-icon">' + ICONS[icon] + '</span><span class="sit-card-label">' + label + '</span>' +
        (sub ? '<span class="sit-card-sub">' + sub + '</span>' : '');
      if (!disabled) c.addEventListener('click', function () {
        overlay.classList.add('hidden');
        onclick();
      });
      grid.appendChild(c);
    };

    card('mensch', 'Mensch', 'Zum Loskneten', function () { self.loadStarter('mensch'); });
    card('kopf', 'Kopf', 'Zum Loskneten', function () { self.loadStarter('kopf'); });
    card('hund', 'Hund', 'Zum Loskneten', function () { self.loadStarter('hund'); });
    card('katze', 'Katze', 'Zum Loskneten', function () { self.loadStarter('katze'); });
    card('kreatur', 'Drache', 'Zum Loskneten', function () { self.loadStarter('drache'); });
    // Auto vorerst raus (Hard-Surface knetet sich schlecht) - Datei liegt weiter
    // in resources/starters/auto.obj, Karte bei Bedarf einfach wieder einfügen
    card('roboter', 'Roboter', 'Zum Loskneten', function () { self.loadStarter('roboter'); });
    card('verbinden', 'Frei bauen', 'Formen zusammensetzen', function () {
      main.clearScene();
      Shapes.addShape(main, 'kugel');
      self.setMode('bauen');
    });
    card('kugel', 'Kugel', 'Gleich loskneten', function () {
      self.setMode('kneten');
    });
    card('wuerfel', 'Würfel', 'Gleich loskneten', function () {
      main.clearScene();
      main.addCube();
      self.setMode('kneten');
    });
    card('oeffnen', 'Eigenes Modell', 'OBJ, STL, PLY', function () {
      main.clearScene(); // sonst bleibt die Standard-Kugel neben dem Import stehen
      self.setMode('kneten');
      document.getElementById('fileopen').click();
    });

    box.appendChild(grid);
    overlay.appendChild(box);
    this._root.appendChild(overlay);
  }
}

export default SculptItGui;
