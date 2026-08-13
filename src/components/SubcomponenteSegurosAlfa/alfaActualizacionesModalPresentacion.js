/**
 * Presentación del modal de actualizaciones Alfa (solo UI).
 */

import { formatCurrency, formatDate } from './segurosAlfaHelpers.js';

export const ALFA_FIELD_LABELS = Object.freeze({
  siniestro: 'Número de siniestro',
  numeroPoliza: 'Número de póliza',
  identificacion: 'Identificación',
  asegurado: 'Asegurado',
  tomador: 'Tomador',
  ajustador: 'Ajustador',
  correo: 'Correo',
  informacionContacto: 'Información de contacto',
  numeroCredito: 'Número de crédito',
  direccionPredio: 'Dirección del predio',
  ciudad: 'Ciudad',
  departamento: 'Departamento',
  canalRadicacion: 'Canal de radicación',
  cobertura: 'Cobertura',
  estadoPagoPrimas: 'Estado pago de primas',
  fechaSiniestro: 'Fecha del siniestro',
  fechaInicioPoliza: 'Fecha inicio póliza',
  fechaFinPoliza: 'Fecha fin póliza',
  fechaLlamada: 'Fecha de llamada',
  observacionLlamada: 'Observación de llamada',
  fechaInspeccion: 'Fecha de inspección',
  fechaUltimoDocumento: 'Fecha último documento',
  fechaLiquidado: 'Fecha liquidado',
  fechaAceptacionLiquidacion: 'Fecha aceptación liquidación',
  fechaEnvioAseguradora: 'Fecha envío a aseguradora',
  valorAseguradoInmueble: 'Valor asegurado inmueble',
  valorAseguradoContenidos: 'Valor asegurado contenidos',
  valorReservaPreventivaPromedio: 'Valor reserva preventiva',
  valorComercialInmueble: 'Valor comercial inmueble',
  reserva: 'Valor de reserva',
  valorReclamado: 'Valor reclamado',
  valorLiquidado: 'Valor liquidado',
});

const MONEY_FIELDS = new Set([
  'valorAseguradoInmueble',
  'valorAseguradoContenidos',
  'valorReservaPreventivaPromedio',
  'valorComercialInmueble',
  'reserva',
  'valorReclamado',
  'valorLiquidado',
]);

const DATE_FIELDS = new Set([
  'fechaSiniestro',
  'fechaInicioPoliza',
  'fechaFinPoliza',
  'fechaLlamada',
  'fechaInspeccion',
  'fechaUltimoDocumento',
  'fechaLiquidado',
  'fechaAceptacionLiquidacion',
  'fechaEnvioAseguradora',
]);

export function alfaFieldLabel(field) {
  return ALFA_FIELD_LABELS[field] || field;
}

export function isEmptyAlfaDisplayValue(value) {
  return value === null || value === undefined || value === '';
}

export function isPolicyPlaceholderDisplay(value) {
  if (isEmptyAlfaDisplayValue(value)) return false;
  const t = String(value)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/\s+/g, '');
  return t.includes('PORCONFIRMAR') || t === 'PORCONFIRMAROPERACIONES';
}

export function formatAlfaPreviewValue(field, value) {
  if (isEmptyAlfaDisplayValue(value)) return 'Vacío';
  if (MONEY_FIELDS.has(field) || (typeof value === 'number' && /valor|reserva|reclamado|liquidado|comercial/i.test(field))) {
    const n = Number(value);
    if (!Number.isNaN(n)) return formatCurrency(n);
  }
  if (DATE_FIELDS.has(field) || /fecha/i.test(field)) {
    const d = formatDate(value);
    if (d) return d;
  }
  return String(value);
}

export function formatAlfaDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

export function rejectedReasonLabel(row = {}) {
  const code = row.errorCode || '';
  const map = {
    MISSING_IDENTIFICACION: 'Falta la identificación del asegurado.',
    INSUFFICIENT_CREATE_DATA: 'Datos insuficientes para crear un caso de forma segura.',
    AMBIGUOUS_MATCH: 'Coincidencias múltiples; no se puede asociar de forma segura.',
    MISSING_MATCH: 'No se encontró el caso a actualizar.',
    ROW_EXECUTE_ERROR: 'Error al procesar la fila.',
  };
  const friendly = map[code] || row.message || 'Registro no procesable.';
  return { code, message: friendly };
}

export function classifyChangeBadges(field, before, after) {
  const badges = [];
  if (field === 'siniestro' && isEmptyAlfaDisplayValue(before) && !isEmptyAlfaDisplayValue(after)) {
    badges.push('NUEVO_SINIESTRO');
  }
  if (
    field === 'numeroPoliza' &&
    isPolicyPlaceholderDisplay(before) &&
    !isPolicyPlaceholderDisplay(after) &&
    !isEmptyAlfaDisplayValue(after)
  ) {
    badges.push('POLIZA_CONFIRMADA');
  }
  return badges;
}

/**
 * Normaliza filas del preview para el modal.
 */
export function normalizeAlfaPreviewRows(payload) {
  const session = payload?.import || payload;
  const rows = payload?.rows || session?.sampleRows || [];
  return (rows || []).map((r) => {
    const changes = r.changes || {};
    const changeEntries = Object.entries(changes).map(([field, ch]) => ({
      field,
      label: alfaFieldLabel(field),
      before: ch?.before,
      after: ch?.after,
      beforeDisplay: formatAlfaPreviewValue(field, ch?.before),
      afterDisplay: formatAlfaPreviewValue(field, ch?.after),
      badges: classifyChangeBadges(field, ch?.before, ch?.after),
    }));
    const siniestro =
      r.previewSnapshot?.siniestroExcel ||
      r.previewSnapshot?.siniestroActual ||
      r.payload?.siniestro ||
      changes?.siniestro?.after ||
      null;
    return {
      rowNumber: r.rowNumber,
      action: r.action,
      consecutivo: r.matchedConsecutivo || r.previewSnapshot?.consecutivoArnald || null,
      matchedCaseId: r.matchedCaseId ? String(r.matchedCaseId) : null,
      candidateCaseIds: (r.candidateCaseIds || []).map(String),
      candidateConsecutivos: r.previewSnapshot?.candidatos || [],
      matchStrategy: r.matchStrategy,
      identificacion: r.previewSnapshot?.identificacion || r.payload?.identificacion || null,
      asegurado: r.payload?.asegurado || r.previewSnapshot?.asegurado || null,
      numeroPoliza:
        r.previewSnapshot?.numeroPolizaExcel ||
        r.payload?.numeroPoliza ||
        r.previewSnapshot?.numeroPolizaActual ||
        null,
      siniestro,
      numeroCredito: r.previewSnapshot?.numeroCredito || r.payload?.numeroCredito || null,
      ciudad: r.payload?.ciudad || null,
      fechaSiniestro: r.payload?.fechaSiniestro || r.previewSnapshot?.fechaSiniestro || null,
      changes: changeEntries,
      warnings: r.warnings || [],
      message: r.message,
      errorCode: r.errorCode,
      rejection: rejectedReasonLabel(r),
    };
  });
}

export function buildAlfaModalViewModel({ summary = {}, rows = [], source = {}, statusMeta = {} } = {}) {
  const created = rows.filter((r) => r.action === 'CREATED');
  const updated = rows.filter((r) => r.action === 'UPDATED');
  const ambiguous = rows.filter((r) => r.action === 'AMBIGUOUS');
  const rejected = rows.filter((r) => r.action === 'REJECTED');

  const principalSource = [...updated, ...created];
  const PRINCIPAL_LIMIT = 5;
  const principal = principalSource.slice(0, PRINCIPAL_LIMIT);
  const additionalCount = Math.max(0, principalSource.length - PRINCIPAL_LIMIT);

  const claimFromRows = updated.filter((r) =>
    (r.changes || []).some((c) => c.badges?.includes('NUEVO_SINIESTRO'))
  ).length;
  const polizaFromRows = updated.filter((r) =>
    (r.changes || []).some((c) => c.badges?.includes('POLIZA_CONFIRMADA'))
  ).length;
  const conflicts = (summary.ambiguous ?? ambiguous.length) || 0;

  return {
    title: 'Seguros Alfa — Actualizaciones disponibles',
    subtitle: 'Se detectaron cambios en el archivo de Control y Seguimiento.',
    fileName: source.fileName || '—',
    lastModifiedDisplay: formatAlfaDateTime(source.lastModifiedDateTime),
    lastCheckedDisplay: formatAlfaDateTime(
      statusMeta.lastCheckedAt || source.lastSuccessfulCheckAt || source.lastCheckedAt
    ),
    indicators: {
      created: summary.created ?? created.length,
      updated: summary.updated ?? updated.length,
      claimNumberAssignments: summary.claimNumberAssignments ?? claimFromRows,
      policyNumberUpdates: summary.policyNumberUpdates ?? polizaFromRows,
      conflicts,
    },
    principal,
    additionalCount,
    allActionable: principalSource,
    ambiguous,
    rejected,
    canExecute:
      (summary.created ?? created.length) > 0 || (summary.updated ?? updated.length) > 0,
    sessionId: source.lastPreviewImportId || null,
  };
}
