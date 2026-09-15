import { ESTADOS_CIERRE_ALLIANZ, ESTADO_ALLIANZ_PAGO } from './allianzHelpers.js';

const INK = '#1E1E1E';
const INK_DARK = '#C4C4C4';
const NAVY = '#1B3A5F';
const NAVY_DARK = '#8BB0D9';
const MUTED = '#9CA3AF';
const MUTED_DARK = '#6B7280';
const PAGO = '#1D4ED8';
const PAGO_DARK = '#93C5FD';

const TINTA_POLIZA = {
  HOGAR: '#0F2744',
  'HOGAR DEUDOR': '#1B3A5F',
  PYME: '#274C7A',
  'MULTIRRIESGOS HOGAR': '#3A6EA5',
  'MULTIRRIESGOS EMPRESARIAL': '#5B8FC4',
  'NEGOCIO EMPRESARIAL': '#8BB0D9',
};

const TINTA_POLIZA_DARK = {
  HOGAR: '#9EC0E6',
  'HOGAR DEUDOR': '#8BB0D9',
  PYME: '#7AA3CF',
  'MULTIRRIESGOS HOGAR': '#6B96C4',
  'MULTIRRIESGOS EMPRESARIAL': '#5B8FC4',
  'NEGOCIO EMPRESARIAL': '#93C5FD',
};

export function truncarAllianz(valor, max = 28) {
  const texto = String(valor ?? '').trim();
  if (!texto) return '—';
  return texto.length > max ? `${texto.slice(0, max - 3)}…` : texto;
}

export function alternarFiltroAllianz(actual, siguiente) {
  return actual === siguiente ? '' : siguiente;
}

export function colorEjeAllianz(isDark) {
  return isDark ? '#B0B0B0' : '#6B6B6B';
}

export function colorGrillaAllianz(isDark) {
  return isDark ? '#2D2D2D' : '#E5E7EB';
}

export function tooltipAllianzStyle(isDark) {
  return {
    backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF',
    border: `1px solid ${isDark ? '#2D2D2D' : '#E6E6E6'}`,
    color: isDark ? '#F5F5F5' : '#1E1E1E',
    borderRadius: '8px',
  };
}

export function colorBarraEstadoAllianz(estado, isDark) {
  if (ESTADOS_CIERRE_ALLIANZ.has(estado)) return isDark ? MUTED_DARK : MUTED;
  if (estado === ESTADO_ALLIANZ_PAGO) return isDark ? PAGO_DARK : PAGO;
  return isDark ? INK_DARK : INK;
}

export function colorBarraPolizaAllianz(nombre, isDark) {
  const mapa = isDark ? TINTA_POLIZA_DARK : TINTA_POLIZA;
  return mapa[nombre] || (isDark ? NAVY_DARK : NAVY);
}

export function colorBarraPersonaAllianz(_nombre, isDark) {
  return isDark ? NAVY_DARK : NAVY;
}

const TINTA_DIAS = {
  '0-7': '#8BB0D9',
  '8-15': '#5B8FC4',
  '16-30': '#3A6EA5',
  '31-45': '#1B3A5F',
  '46+': '#0F2744',
  'sin-fecha': '#9CA3AF',
};

const TINTA_DIAS_DARK = {
  '0-7': '#9EC0E6',
  '8-15': '#7AA3CF',
  '16-30': '#5B8FC4',
  '31-45': '#8BB0D9',
  '46+': '#93C5FD',
  'sin-fecha': '#6B7280',
};

export function colorBarraDiasAllianz(clave, isDark) {
  const mapa = isDark ? TINTA_DIAS_DARK : TINTA_DIAS;
  return mapa[clave] || (isDark ? NAVY_DARK : NAVY);
}
