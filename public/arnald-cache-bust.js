/**
 * Si el build del servidor cambió, borra SW + Cache Storage y recarga.
 * Safari/Mac no vacían la PWA solos; version.json no se precachea.
 */
(function () {
  var BUILD_KEY = 'arnald_build_id';
  var PURGE_KEY = 'arnald_purging_build';

  function buildGuardado() {
    try {
      return localStorage.getItem(BUILD_KEY);
    } catch (e) {
      return null;
    }
  }

  function guardarBuild(build) {
    try {
      localStorage.setItem(BUILD_KEY, build);
    } catch (e) {
      /* private mode */
    }
  }

  function limpiarYRecargar() {
    var done = function () {
      window.location.reload();
    };
    var tasks = [];
    if (navigator.serviceWorker) {
      tasks.push(
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (reg) {
            return reg.unregister();
          }));
        })
      );
    }
    if (window.caches) {
      tasks.push(
        caches.keys().then(function (keys) {
          return Promise.all(keys.map(function (k) {
            return caches.delete(k);
          }));
        })
      );
    }
    Promise.all(tasks).then(done).catch(done);
  }

  function chequearBuild() {
    if (sessionStorage.getItem(PURGE_KEY) === '1') {
      sessionStorage.removeItem(PURGE_KEY);
      return;
    }
    fetch('/version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (v) {
        var build = v && v.build ? String(v.build) : '';
        if (!build) return;
        var prev = buildGuardado();
        if (!prev) {
          guardarBuild(build);
          return;
        }
        if (prev === build) return;
        sessionStorage.setItem(PURGE_KEY, '1');
        guardarBuild(build);
        limpiarYRecargar();
      })
      .catch(function () {});
  }

  chequearBuild();
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') chequearBuild();
  });
  window.addEventListener('pageshow', function (ev) {
    if (ev.persisted) chequearBuild();
  });
})();
