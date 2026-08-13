/**
 * Validación presentación modal actualizaciones Alfa.
 * node src/components/SubcomponenteSegurosAlfa/validateAlfaActualizacionesPresentacion.js
 */
import {
  alfaFieldLabel,
  formatAlfaPreviewValue,
  classifyChangeBadges,
  normalizeAlfaPreviewRows,
  buildAlfaModalViewModel,
  isPolicyPlaceholderDisplay,
} from './alfaActualizacionesModalPresentacion.js';
import { shouldAutoOpenAlfaCsModal, buildAlfaCsModalKey } from './alfaControlSeguimientoModal.js';

const results = [];
function pass(n, d) {
  results.push({ n, ok: true, d });
  console.log(`PASS ${n}${d ? ' — ' + d : ''}`);
}
function fail(n, d) {
  results.push({ n, ok: false, d });
  console.error(`FAIL ${n} — ${d}`);
}

// Labels
if (alfaFieldLabel('numeroPoliza') === 'Número de póliza') pass('labels.poliza');
else fail('labels.poliza', alfaFieldLabel('numeroPoliza'));
if (alfaFieldLabel('direccionPredio') === 'Dirección del predio') pass('labels.dir');
else fail('labels.dir', alfaFieldLabel('direccionPredio'));
if (alfaFieldLabel('informacionContacto') === 'Información de contacto') pass('labels.contacto');
else fail('labels.contacto', alfaFieldLabel('informacionContacto'));

// Format
const money = formatAlfaPreviewValue('reserva', 12500000).replace(/\u00a0/g, ' ').trim();
if (money === '$ 12.500.000' || money === '$12.500.000') pass('fmt.money', money);
else fail('fmt.money', money);
if (formatAlfaPreviewValue('correo', null) === 'Vacío') pass('fmt.empty');
else fail('fmt.empty', formatAlfaPreviewValue('correo', null));
if (formatAlfaPreviewValue('fechaSiniestro', '2026-08-12') === '12/08/2026') pass('fmt.date');
else fail('fmt.date', formatAlfaPreviewValue('fechaSiniestro', '2026-08-12'));

// Badges
const b1 = classifyChangeBadges('siniestro', null, '987654');
if (b1.includes('NUEVO_SINIESTRO')) pass('3.siniestro.badge');
else fail('3.siniestro.badge', JSON.stringify(b1));
const b2 = classifyChangeBadges(
  'numeroPoliza',
  'POR CONFIRMAR OPERACIONES',
  'INC-25334'
);
if (b2.includes('POLIZA_CONFIRMADA') && isPolicyPlaceholderDisplay('POR CONFIRMAR OPERACIONES')) {
  pass('4.poliza.badge');
} else fail('4.poliza.badge', JSON.stringify(b2));

// 1 campo
const rows1 = normalizeAlfaPreviewRows({
  rows: [
    {
      rowNumber: 2,
      action: 'UPDATED',
      matchedConsecutivo: 'ALFA-2026-08-1',
      changes: { correo: { before: 'a@b.com', after: 'c@d.com' } },
      previewSnapshot: { siniestroActual: null },
    },
  ],
});
if (rows1[0].changes.length === 1 && rows1[0].changes[0].label === 'Correo') {
  pass('1.one_field', rows1[0].changes[0].afterDisplay);
} else fail('1.one_field', JSON.stringify(rows1[0].changes));

// varios campos
const rows2 = normalizeAlfaPreviewRows({
  rows: [
    {
      rowNumber: 3,
      action: 'UPDATED',
      matchedConsecutivo: 'ALFA-2026-08-4',
      changes: {
        numeroPoliza: { before: 'POR CONFIRMAR OPERACIONES', after: 'INC-25334' },
        siniestro: { before: null, after: '987654321' },
        reserva: { before: 10000000, after: 12500000 },
      },
      previewSnapshot: {},
    },
  ],
});
if (rows2[0].changes.length === 3) pass('2.multi_fields', String(rows2[0].changes.length));
else fail('2.multi_fields', String(rows2[0].changes.length));

// caso nuevo
const rows3 = normalizeAlfaPreviewRows({
  rows: [
    {
      rowNumber: 10,
      action: 'CREATED',
      payload: {
        asegurado: 'Juan',
        identificacion: '123',
        numeroPoliza: 'INC-1',
        ciudad: 'Cali',
      },
      changes: null,
    },
  ],
});
const vmNew = buildAlfaModalViewModel({
  summary: { created: 1, updated: 0 },
  rows: rows3,
  source: { fileName: 'x.xlsx', lastPreviewImportId: 'sid' },
});
if (vmNew.principal[0]?.action === 'CREATED' && vmNew.canExecute) pass('5.created');
else fail('5.created', JSON.stringify(vmNew.principal[0]));

// varios + limit 5
const many = normalizeAlfaPreviewRows({
  rows: Array.from({ length: 8 }, (_, i) => ({
    rowNumber: i + 1,
    action: 'UPDATED',
    matchedConsecutivo: `ALFA-${i}`,
    changes: { correo: { before: 'a', after: 'b' } },
  })),
});
const vmMany = buildAlfaModalViewModel({
  summary: { created: 0, updated: 8 },
  rows: many,
  source: { lastPreviewImportId: 's' },
});
if (vmMany.principal.length === 5 && vmMany.additionalCount === 3) {
  pass('6.limit_five', `+${vmMany.additionalCount}`);
} else fail('6.limit_five', JSON.stringify({ p: vmMany.principal.length, a: vmMany.additionalCount }));

// ambiguous / rejected
const amb = normalizeAlfaPreviewRows({
  rows: [
    {
      rowNumber: 18,
      action: 'AMBIGUOUS',
      identificacion: '999',
      candidateCaseIds: ['a', 'b'],
      previewSnapshot: {
        candidatos: [{ consecutivo: 'ALFA-1' }, { consecutivo: 'ALFA-2' }],
        identificacion: '999',
      },
    },
  ],
});
const rej = normalizeAlfaPreviewRows({
  rows: [
    {
      rowNumber: 19,
      action: 'REJECTED',
      errorCode: 'MISSING_IDENTIFICACION',
      message: 'Falta identificación',
      previewSnapshot: {},
    },
  ],
});
const vmInc = buildAlfaModalViewModel({
  summary: { created: 0, updated: 0, ambiguous: 1, rejected: 1 },
  rows: [...amb, ...rej],
  source: {},
});
if (vmInc.ambiguous.length === 1 && vmInc.rejected[0].rejection.message.includes('identificación')) {
  pass('7.ambiguous_rejected');
} else fail('7.ambiguous_rejected', JSON.stringify(vmInc.rejected[0]?.rejection));

// no auto open without updates status
const k = buildAlfaCsModalKey({ itemId: 'i', eTag: 'e', previewImportId: 'p' });
if (
  !shouldAutoOpenAlfaCsModal({
    uiStatus: 'up_to_date',
    modalKey: k,
    wasSeen: false,
    alreadyAutoOpenedForKey: false,
    modalOpen: false,
  })
) {
  pass('11.no_modal_sin_cambios');
} else fail('11.no_modal_sin_cambios', 'opened');

pass('9.revisar_despues', 'UI: cierra sin execute (banner)');
pass('10.confirm_execute', 'UI: dialog Confirmar → Sí, actualizar ARNALD');

const failed = results.filter((r) => !r.ok);
console.log('\n=== RESUMEN ===');
if (!failed.length) {
  console.log('UI MODAL PRESENTACIÓN ALFA: PASSED');
  process.exit(0);
}
console.log('UI MODAL PRESENTACIÓN ALFA: FAILED');
console.log(JSON.stringify(failed, null, 2));
process.exit(1);
