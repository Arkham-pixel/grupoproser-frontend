/** America/Bogota = UTC-5 (sin horario de verano). */
const OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * Convierte valor de <input type="datetime-local"> a ISO UTC
 * interpretando la hora como Colombia (Bogotá), no como zona del navegador.
 */
export function datetimeLocalBogotaToIso(value) {
  const s = String(value || '').trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const utcMs =
    Date.UTC(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6] || 0)
    ) + OFFSET_MS;
  return new Date(utcMs).toISOString();
}

export function formatFechaHoraBogota(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/** Para rellenar <input type="datetime-local"> con hora Colombia. */
export function isoToDatetimeLocalBogota(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}
