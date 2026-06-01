/**
 * Paleta de gráficas ARNAL Data Flow (Fénix).
 * Alineada con tailwind.config.js → theme.extend.colors.fenix
 *
 * Regla: el rojo corporativo solo se usa en el índice 0 de series categóricas
 * (tortas/barras). Del índice 1 en adelante: grises + acentos sin repetir rojo.
 * La línea de tendencia usa rojo solo para la serie "Casos".
 */

export const FENIX_PALETTE = {
  primario: '#DC2626',
  secundario: '#EF4444',
  texto: '#1E1E1E',
  textoMedio: '#6B6B6B',
  textoClaro: '#9CA3AF',
  borde: '#E6E6E6',
  fondo: '#F5F5F7',
  info: '#3878D9',
  exito: '#2E8B57',
  editar: '#F59E0B',
  advertencia: '#E6B800',
};

/** Colores 1…N para tortas y barras (sin rojo) — modo claro */
const FENIX_CHART_REST_LIGHT = [
  FENIX_PALETTE.texto,
  FENIX_PALETTE.textoMedio,
  FENIX_PALETTE.textoClaro,
  FENIX_PALETTE.info,
  FENIX_PALETTE.exito,
  FENIX_PALETTE.editar,
  FENIX_PALETTE.advertencia,
  '#64748B',
  '#475569',
  '#0D9488',
  '#7C3AED',
  '#334155',
];

/** Colores 1…N — modo oscuro */
const FENIX_CHART_REST_DARK = [
  '#F3F4F6',
  '#D1D5DB',
  '#9CA3AF',
  '#6B7280',
  '#5B9BD5',
  '#4ADE80',
  '#FBBF24',
  '#E6B800',
  '#94A3B8',
  '#2DD4BF',
  '#A78BFA',
  '#64748B',
];

/** @deprecated Usar getFenixChartColor — secuencia plana solo para compatibilidad */
export const FENIX_CHART_SEQUENCE_LIGHT = [
  FENIX_PALETTE.primario,
  ...FENIX_CHART_REST_LIGHT,
];

export const FENIX_CHART_SEQUENCE_DARK = [
  FENIX_PALETTE.secundario,
  ...FENIX_CHART_REST_DARK,
];

export const FENIX_LINE_CHART_LIGHT = {
  casos: FENIX_PALETTE.primario,
  indemnizacion: FENIX_PALETTE.textoMedio,
  reserva: FENIX_PALETTE.texto,
};

export const FENIX_LINE_CHART_DARK = {
  casos: FENIX_PALETTE.secundario,
  indemnizacion: '#9CA3AF',
  reserva: '#E5E7EB',
};

/**
 * Color para segmento/barra por índice.
 * Índice 0: rojo corporativo (única vez). Resto: escala gris + acentos, sin rojo.
 */
export const getFenixChartColor = (index, isDark = false) => {
  const i = Math.abs(Number(index) || 0);
  if (i === 0) {
    return isDark ? FENIX_PALETTE.secundario : FENIX_PALETTE.primario;
  }
  const rest = isDark ? FENIX_CHART_REST_DARK : FENIX_CHART_REST_LIGHT;
  return rest[(i - 1) % rest.length];
};

export const getFenixLineChartColors = (isDark = false) =>
  isDark ? FENIX_LINE_CHART_DARK : FENIX_LINE_CHART_LIGHT;

/**
 * Barras neutras (sin rojo) para métricas de apoyo.
 * Mantiene coherencia visual con la paleta categórica sin usar el color corporativo.
 */
export const getFenixNeutralBarColor = (index = 0, isDark = false) => {
  const i = Math.abs(Number(index) || 0);
  const rest = isDark ? FENIX_CHART_REST_DARK : FENIX_CHART_REST_LIGHT;
  return rest[i % rest.length];
};

/**
 * Dominio [0, N] para ejes de porcentaje (0..100), con margen y redondeo
 * para que las barras/etiquetas no queden pegadas al borde superior.
 */
export const dominioPorcentajeAcotado = (valores = []) => {
  const numeros = (valores || [])
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n >= 0);

  if (numeros.length === 0) return [0, 100];

  const maximo = Math.max(...numeros);
  const maxConMargen = maximo <= 0 ? 10 : maximo * 1.1;
  const redondeado = Math.ceil(maxConMargen / 5) * 5;
  const limiteSuperior = Math.max(10, Math.min(100, redondeado));

  return [0, limiteSuperior];
};

export const buildPieLegendPayload = (items, labelKey, isDark = false) =>
  (items || []).map((item, index) => ({
    value: item[labelKey] ?? 'Sin nombre',
    type: 'circle',
    color: getFenixChartColor(index, isDark),
    payload: item,
  }));

/** Compatibilidad con imports existentes */
export const FENIX_CHART_COLORS = FENIX_CHART_SEQUENCE_LIGHT;
export const FENIX_LINE_CHART = FENIX_LINE_CHART_LIGHT;
