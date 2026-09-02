import { rutaNotificacionAReporte } from '../../utils/filtroCasoExclusivo.js';

export const HORA_INICIO_AGENDA = 7;
export const HORA_FIN_AGENDA = 19;
/** Visita sencilla Zurich: 20 min antes + 1 h inspección + 20 min después. */
export const DURACION_SENCILLA_MIN = 100;

export const COLORES_MODULO_AGENDA = {
  zurich: 'bg-rose-600',
  zurichListado: 'bg-rose-500',
  bbvaCat: 'bg-sky-700',
  bbvaCatListado: 'bg-sky-600',
  allianz: 'bg-blue-700',
  allianzListado: 'bg-blue-600',
  previsora: 'bg-teal-700',
  previsoraListado: 'bg-teal-600',
  equidadCat: 'bg-violet-700',
  alfa: 'bg-amber-600',
  sura: 'bg-emerald-700',
};

export function ymdLocal(value = new Date()) {
  if (value == null || value === '') return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value.trim())) {
    return value.trim().slice(0, 10);
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    /* noop */
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseYmd(ymd) {
  const [y, m, d] = String(ymd || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function addDaysYmd(ymd, days) {
  const dt = parseYmd(ymd);
  if (!dt) return ymd;
  dt.setDate(dt.getDate() + days);
  return ymdLocal(dt);
}

/** Lunes de la semana (Colombia). */
export function inicioSemanaYmd(ymd) {
  const dt = parseYmd(ymd) || new Date();
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return ymdLocal(dt);
}

export function diasSemana(ymdLunes) {
  return Array.from({ length: 7 }, (_, i) => addDaysYmd(ymdLunes, i));
}

export const HORA_DIA_COMPLETO_INICIO = '08:00';
export const HORA_DIA_COMPLETO_FIN = '17:00';

export function slotsHoraAgenda() {
  const slots = [];
  const tope = HORA_FIN_AGENDA * 60;
  for (let min = HORA_INICIO_AGENDA * 60; min + DURACION_SENCILLA_MIN <= tope; min += 20) {
    const inicio = minutosAHora(min);
    const fin = minutosAHora(min + DURACION_SENCILLA_MIN);
    slots.push({
      inicio,
      fin,
      minutosInicio: min,
      minutosFin: min + DURACION_SENCILLA_MIN,
    });
  }
  return slots;
}

export function horaAMinutos(hora) {
  const m = String(hora || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function minutosAHora(minutos) {
  const m = Math.max(0, Number(minutos) || 0);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function slotOcupadoPor(minutosInicio, minutosFin, ocupados = []) {
  return ocupados.find(
    (ev) => minutosInicio < (ev.minutosFin ?? horaAMinutos(ev.horaFin)) &&
      (ev.minutosInicio ?? horaAMinutos(ev.horaInicio)) < minutosFin
  );
}

export function tituloEventoAgenda(ev) {
  const caso = ev.siniestro || ev.consecutivo || ev.zc || '';
  const gente = ev.inspector || ev.ajustador || '';
  return [caso, ev.asegurado, gente, ev.direccionPredio].filter(Boolean).join(' — ');
}

export function detalleHoverAgenda(ev, t = (k, opts) => opts?.defaultValue || k) {
  const hora = ev?.todoElDia
    ? t('agendaCatastrofico.allDay', { defaultValue: 'Todo el día' })
    : [ev?.horaInicio, ev?.horaFin].filter(Boolean).join(' – ') || '';
  const inspector = String(ev?.inspector || '').trim();
  const ajustador = String(ev?.ajustador || '').trim();
  const misma =
    inspector &&
    ajustador &&
    inspector.localeCompare(ajustador, 'es', { sensitivity: 'accent' }) === 0;
  const personas = [];
  if (inspector) {
    personas.push({
      rol: t('roles.inspector', { defaultValue: 'Inspector' }),
      nombre: inspector,
    });
  }
  if (ajustador && !misma) {
    personas.push({
      rol: t('roles.ajustador', { defaultValue: 'Ajustador' }),
      nombre: ajustador,
    });
  }
  return {
    hora,
    personas,
    caso: ev?.siniestro || ev?.consecutivo || ev?.zc || '',
    asegurado: ev?.asegurado || '',
    modulo: ev?.etiquetaModulo || '',
    direccion: ev?.direccionPredio || '',
  };
}

export function rutaEventoAgenda(ev) {
  const cruda = String(ev?.ruta || '').trim();
  if (!cruda) return '/agenda-catastrofico';
  return rutaNotificacionAReporte(cruda);
}

export function etiquetaDiaCorto(ymd, locale = 'es') {
  const dt = parseYmd(ymd);
  if (!dt) return ymd;
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric' }).format(dt);
}

export function etiquetaMes(ymd, locale = 'es') {
  const dt = parseYmd(ymd);
  if (!dt) return '';
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(dt);
}
