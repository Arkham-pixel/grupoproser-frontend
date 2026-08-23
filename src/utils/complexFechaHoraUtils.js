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
  'fchaReconsideracion',
  'fchaEnvioFiniquito',
]);

export function esCampoFechaHoraProtocolo(campo) {
  return CAMPOS_FECHA_HORA_PROTOCOLO.has(campo);
}

/** Hora por defecto al migrar registros que solo tenían día (mediodía local). */
export const HORA_DEFECTO_FECHA_SOLO_DIA = 12;

/** Hora actual del dispositivo en formato HH:mm (24h). */
export function horaActualHHMM(fecha = new Date()) {
  const d = fecha instanceof Date ? fecha : new Date();
  if (Number.isNaN(d.getTime())) return '12:00';
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

/**
 * Parsea fecha/hora conservando minutos. Si solo viene el día (yyyy-MM-dd), usa mediodía local.
 *
 * Importante: strings ISO con Z u offset (los que vienen de Mongo) se interpretan con
 * `new Date(str)` para respetar la zona. Strings sin zona (`YYYY-MM-DDTHH:mm` del form)
 * se tratan como hora local de Colombia / del navegador.
 */
export function parsearFechaHoraComplex(valor) {
  if (!valor) return null;

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return new Date(valor.getTime());
  }

  const str = String(valor).trim();
  if (!str) return null;

  // ISO con zona (Z o ±HH:mm) → Date nativo (UTC correcto → getHours locales)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str) && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(str)) {
    const fecha = new Date(str);
    if (!Number.isNaN(fecha.getTime())) return fecha;
  }

  // Sin zona: hora local tal cual la escribió el usuario en el formulario
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

/** Descompone HH:mm (24h) a partes 12h para UI amigable. */
export function partirHora12Desde24(hora24) {
  const m = String(hora24 || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return { hora12: '', minuto: '', ampm: 'am' };
  let h = Number(m[1]);
  const minuto = String(Math.min(59, Math.max(0, Number(m[2]) || 0))).padStart(2, '0');
  if (!Number.isFinite(h) || h < 0 || h > 23) return { hora12: '', minuto: '', ampm: 'am' };
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return { hora12: String(h), minuto, ampm };
}

/** Arma HH:mm 24h desde partes 12h. */
export function combinarHora12A24(hora12, minuto, ampm) {
  let h = Number(String(hora12 || '').trim());
  let min = Number(String(minuto || '0').trim());
  if (!Number.isFinite(h) || h < 1 || h > 12) return '';
  if (!Number.isFinite(min) || min < 0 || min > 59) min = 0;
  const esPm = String(ampm || 'am').toLowerCase().startsWith('p');
  if (h === 12) h = esPm ? 12 : 0;
  else if (esPm) h += 12;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Acepta escritura libre: 11, 11:00, 1100, 11am, 11:30 p.m., 23:15 → HH:mm 24h.
 */
export function normalizarHoraEscrita(texto) {
  const raw = String(texto || '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ');
  if (!raw) return '';

  let ampm = null;
  if (/\b(a\s*m|am)\b/.test(raw) || raw.endsWith('a')) ampm = 'am';
  if (/\b(p\s*m|pm)\b/.test(raw) || raw.endsWith('p')) ampm = 'pm';

  const limpio = raw
    .replace(/\b(a\s*m|am|p\s*m|pm)\b/g, '')
    .replace(/[ap]$/i, '')
    .replace(/[^\d:]/g, '')
    .trim();

  let h;
  let m = 0;
  if (/^\d{1,2}:\d{1,2}$/.test(limpio)) {
    const [hs, ms] = limpio.split(':');
    h = Number(hs);
    m = Number(ms);
  } else if (/^\d{3,4}$/.test(limpio)) {
    const padded = limpio.padStart(4, '0');
    h = Number(padded.slice(0, 2));
    m = Number(padded.slice(2));
  } else if (/^\d{1,2}$/.test(limpio)) {
    h = Number(limpio);
    m = 0;
  } else {
    return '';
  }

  if (!Number.isFinite(h) || !Number.isFinite(m) || m < 0 || m > 59) return '';

  if (ampm) {
    if (h < 1 || h > 12) return '';
    return combinarHora12A24(h, m, ampm);
  }
  if (h < 0 || h > 23) return '';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
