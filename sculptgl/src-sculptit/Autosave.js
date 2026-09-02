import Export from 'files/Export';

// Zwischenspeicherung: die komplette Szene als SGL-Blob in IndexedDB
// (localStorage ist für Mesh-Daten zu klein). Gespeichert wird alle 15s,
// sobald sich der Undo-Stack geändert hat - und immer, wenn der Tab in den
// Hintergrund geht (Tablet: App-Wechsel/Reload!). Beim Start bietet der
// Startbildschirm eine "Weitermachen"-Karte an.

var DB_NAME = 'sculptit';
var STORE = 'autosave';
var KEY = 'scene';
var INTERVAL_MS = 15000;

var openDb = function (cb) {
  try {
    var req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
    req.onsuccess = function () { cb(req.result); };
    req.onerror = function () { cb(null); };
  } catch (e) {
    cb(null);
  }
};

var Autosave = {};

Autosave.save = function (main) {
  var meshes = main.getMeshes();
  if (!meshes.length) return;
  try {
    var blob = Export.exportSGL(meshes, main);
    openDb(function (db) {
      if (!db) return;
      db.transaction(STORE, 'readwrite').objectStore(STORE).put({ blob: blob, date: Date.now() }, KEY);
    });
  } catch (e) {}
};

// cb(timestampMs | null) - gibt es einen Spielstand?
Autosave.probe = function (cb) {
  openDb(function (db) {
    if (!db) return cb(null);
    var req = db.transaction(STORE).objectStore(STORE).get(KEY);
    req.onsuccess = function () { cb(req.result ? req.result.date : null); };
    req.onerror = function () { cb(null); };
  });
};

// cb(erfolgreich) - ersetzt die Szene durch den Spielstand
Autosave.restore = function (main, cb) {
  openDb(function (db) {
    if (!db) return cb(false);
    var req = db.transaction(STORE).objectStore(STORE).get(KEY);
    req.onsuccess = function () {
      if (!req.result || !req.result.blob) return cb(false);
      req.result.blob.arrayBuffer().then(function (buf) {
        try {
          main.clearScene();
          main.loadScene(buf, 'sgl');
          cb(true);
        } catch (e) {
          cb(false);
        }
      }, function () { cb(false); });
    };
    req.onerror = function () { cb(false); };
  });
};

Autosave.start = function (main) {
  var stamp = function () {
    var sm = main.getStateManager();
    return sm._undos.length + ':' + sm._curUndoIndex + ':' + main.getMeshes().length;
  };
  var last = null; // erst ab dem zweiten Tick vergleichen (Startszene nicht sichern)
  window.setInterval(function () {
    var s = stamp();
    if (last === null) { last = s; return; }
    if (s !== last) {
      last = s;
      Autosave.save(main);
    }
  }, INTERVAL_MS);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden')
      Autosave.save(main);
  });
};

export default Autosave;
