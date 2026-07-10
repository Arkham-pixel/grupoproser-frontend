/**
 * Fecha y hora en hitos de asignación y trazabilidad COMPLEX.
 * Permite medir plazos en horas (12 h, 24 h) con precisión real.
 */

/** Campos de protocolo que guardan fecha + hora del evento. */
export const CAMPOS_FECHA_HORA_PROTOCOLO = new Set([
  'fchaAsgncion',
  'fchaContIni',
  'fchaCoordInspeccion',
  'fchaProgInspeccion',
  'fchaInspccion',
  'fchaSoliDocu',
  'fchaInfoPrelm',
  'fchaRepoActi',
  'fchaInfoFnal',
  'fchaPresentacionCifras',
  'fchaAceptacionCifrasAseguradora',
  'fchaEnvioFiniquito',
]);

export function esCampoFechaHoraProtocolo(campo) {
  return CAMPOS_FECHA_HORA_PROTOCOLO.has(campo);
}

/** Hora por defecto al migrar registros que solo tenían día (mediodía local). */
export const HORA_DEFECTO_FECHA_SOLO_DIA = 12;

/**
 * Parsea fecha/hora conservando minutos. Si solo viene el día (yyyy-MM-dd), usa mediodía local.
 */
export function parsearFechaHoraComplex(valor) {
  if (!valor) return null;

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return new Date(valor.getTime());
  }

  const str = String(valor).trim();
  if (!str) return null;

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
    const [datePart, timePart] = str.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    if (year && month && day) {
      return new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);
    }
  }

  if (str.includes('T')) {
    const fecha = new Date(str);
    if (!Number.isNaN(fecha.getTime())) return fecha;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [year, month, day] = str.split('-').map(Number);
    return new Date(year, month - 1, day, HORA_DEFECTO_FECHA_SOLO_DIA, 0, 0, 0);
  }

  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
    const [day, month, year] = str.split('/').map(Number);
    if (year && month && day) {
      return new Date(year, month - 1, day, HORA_DEFECTO_FECHA_SOLO_DIA, 0, 0, 0);
    }
  }

  const fecha = new Date(str);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** Solo día calendario (filtros, agrupación por mes). */
export function parsearFechaSoloDiaComplex(valor) {
  const fecha = parsearFechaHoraComplex(valor);
  if (!fecha) return null;
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/** Año mínimo aceptable en inputs de hitos (evita 1902/0008 por datos corruptos). */
export const ANIO_MINIMO_FECHA_HORA_INPUT = 2024;

export function esAnioFechaHoraInputValido(fecha) {
  const parsed = fecha instanceof Date ? fecha : parsearFechaHoraComplex(fecha);
  if (!parsed || Number.isNaN(parsed.getTime())) return false;
  const year = parsed.getFullYear();
  return year >= ANIO_MINIMO_FECHA_HORA_INPUT && year <= 2100;
}

/** Formato para inputs fecha+hora: YYYY-MM-DDTHH:mm. Vacío si el año es inválido/corrupto. */
export function formatearFechaHoraParaInput(fecha) {
  if (!fecha) return '';

  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fecha)) {
    const year = Number(fecha.slice(0, 4));
    if (year < ANIO_MINIMO_FECHA_HORA_INPUT || year > 2100) return '';
    return fecha.slice(0, 16);
  }

  const parsed = parsearFechaHoraComplex(fecha);
  if (!parsed || !esAnioFechaHoraInputValido(parsed)) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hour = String(parsed.getHours()).padStart(2, '0');
  const minute = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/** Partes para inputs separados (más fáciles de editar a mano que datetime-local). */
export function partirFechaHoraParaInputs(valor) {
  const normalizado = formatearFechaHoraParaInput(valor);
  if (!normalizado) return { fecha: '', hora: '' };
  const [fecha, hora = ''] = normalizado.split('T');
  return { fecha: fecha || '', hora: (hora || '').slice(0, 5) };
}

export function combinarFechaHoraInputs(fecha, hora) {
  const f = String(fecha || '').trim();
  if (!f || !/^\d{4}-\d{2}-\d{2}$/.test(f)) return '';
  const year = Number(f.slice(0, 4));
  if (year < ANIO_MINIMO_FECHA_HORA_INPUT || year > 2100) return '';
  const h = String(hora || '').trim();
  const horaFinal = /^\d{2}:\d{2}/.test(h) ? h.slice(0, 5) : `${String(HORA_DEFECTO_FECHA_SOLO_DIA).padStart(2, '0')}:00`;
  return `${f}T${horaFinal}`;
}

/** Formato legible en UI: 09/07/2025, 14:30 */
export function formatearFechaHoraLegible(fecha) {
  const parsed = parsearFechaHoraComplex(fecha);
  if (!parsed) return '—';
  return parsed.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
