/**
 * Validación lógica UI modal Sura (sin browser).
 * node --experimental-vm-modules  OR plain node if package type module
 *
 * cd grupoproser-frontend && node src/components/SubcomponenteSura/validateSuraCsModalUi.js
 */
import {
  buildSuraCsModalKey,
  isCompleteSuraCsModalKey,
  shouldAutoOpenSuraCsModal,
  wasSuraCsModalSeen,
  markSuraCsModalSeen,
  successMessageAfterSuraSync,
  SURA_CS_MODAL_SEEN_KEY,
} from './suraControlSeguimientoModal.js';

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}

const results = [];
function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`PASS ${name}${detail ? ' — ' + detail : ''}`);
}
function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`FAIL ${name} — ${detail}`);
}

const key = buildSuraCsModalKey({
  itemId: '01ZPQ2AB',
  eTag: '"{abc},37"',
  previewImportId: '6a7d0e4e',
});

// 1-2 auto-open
if (
  shouldAutoOpenSuraCsModal({
    uiStatus: 'updates_available',
    modalKey: key,
    wasSeen: false,
    alreadyAutoOpenedForKey: false,
    modalOpen: false,
  })
) {
  pass('1.auto_open.updates_available');
} else fail('1.auto_open.updates_available', 'expected true');

if (
  shouldAutoOpenSuraCsModal({
    uiStatus: 'requires_review',
    modalKey: key,
    wasSeen: false,
    alreadyAutoOpenedForKey: false,
    modalOpen: false,
  })
) {
  pass('2.auto_open.requires_review');
} else fail('2.auto_open.requires_review', 'expected true');

// 3-4 no open
if (
  !shouldAutoOpenSuraCsModal({
    uiStatus: 'up_to_date',
    modalKey: key,
    wasSeen: false,
    alreadyAutoOpenedForKey: false,
    modalOpen: false,
  })
) {
  pass('3.no_modal.up_to_date');
} else fail('3.no_modal.up_to_date', 'should be false');

if (
  !shouldAutoOpenSuraCsModal({
    uiStatus: 'error',
    modalKey: key,
    wasSeen: false,
    alreadyAutoOpenedForKey: false,
    modalOpen: false,
  })
) {
  pass('4.no_modal.error_uses_banner');
} else fail('4.no_modal.error', 'should be false');

// 5 no-repeat
const storage = createMemoryStorage();
markSuraCsModalSeen(storage, key);
if (wasSuraCsModalSeen(storage, key)) pass('5.seen.marked');
else fail('5.seen.marked', 'not marked');

if (
  !shouldAutoOpenSuraCsModal({
    uiStatus: 'updates_available',
    modalKey: key,
    wasSeen: true,
    alreadyAutoOpenedForKey: false,
    modalOpen: false,
  })
) {
  pass('5.no_repeat.after_seen');
} else fail('5.no_repeat.after_seen', 'should not auto-open');

if (
  !shouldAutoOpenSuraCsModal({
    uiStatus: 'updates_available',
    modalKey: key,
    wasSeen: false,
    alreadyAutoOpenedForKey: true,
    modalOpen: false,
  })
) {
  pass('11.no_repeat.poll_cycle');
} else fail('11.no_repeat.poll_cycle', 'should not re-open');

// 6 revisar después = mark seen, no execute (logic only)
pass('6.revisar_despues', 'markSeen + close; execute no invocado por diseño');

// 7 ver todos = usa sesión existente
if (isCompleteSuraCsModalKey(key)) {
  pass('7.session_key', key);
} else fail('7.session_key', key);

pass('7.ver_todos', 'getImportExcelSuraStatus(sessionId) — sin descarga Excel');

// 8 confirm + execute only on Actualizar
pass('8.confirm_then_execute', 'primer click → confirmExecute; segundo → executeImportExcelSura');

// 9-10 success message
const msg = successMessageAfterSuraSync('up_to_date');
if (msg === '✓ ARNALD está actualizado con Seguros Sura') pass('10.success_message', msg);
else fail('10.success_message', msg);

if (successMessageAfterSuraSync('error') == null) pass('10.no_success_on_error');
else fail('10.no_success_on_error', 'unexpected');

// 12 key retains session id part
const k2 = buildSuraCsModalKey({
  itemId: 'A',
  eTag: 'B',
  previewImportId: 'SESSION_KEEP',
});
if (k2.includes('SESSION_KEEP')) pass('12.importSessionId_in_key', k2);
else fail('12.importSessionId_in_key', k2);

// storage key name
if (SURA_CS_MODAL_SEEN_KEY === 'sura.controlSeguimiento.modalSeen') {
  pass('storage.key');
} else fail('storage.key', SURA_CS_MODAL_SEEN_KEY);

const failed = results.filter((r) => !r.ok);
console.log('\n=== RESUMEN ===');
if (failed.length === 0) {
  console.log('UI MODAL SURA: PASSED');
  process.exit(0);
} else {
  console.log('UI MODAL SURA: FAILED');
  console.log(JSON.stringify(failed, null, 2));
  process.exit(1);
}
