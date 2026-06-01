/** Alturas y límites para gráficos del dashboard Complex */

export const CHART_HEIGHT_STANDARD = 320;
export const CHART_HEIGHT_TALL = 360;
export const CHART_HEIGHT_BAR_MAX = 440;
/** Tablas largas de cumplimiento (muchos responsables en la misma lista que la tabla) */
export const CHART_HEIGHT_BAR_LIST_MAX = 560;
export const CHART_ROW_PX = 28;

export const CHART_TOP_ASEGURADORAS = 12;
export const CHART_TOP_RESPONSABLES = 10;
export const CHART_TOP_ESTADOS = 12;
export const CHART_TOP_CUMPLIMIENTO = 10;
export const METRIC_TOP_ESTADOS = 8;

/** Altura acotada para barras horizontales según cantidad de filas */
export function alturaGraficoBarrasVerticales(itemCount, maxHeight = CHART_HEIGHT_BAR_MAX) {
  if (!itemCount) return CHART_HEIGHT_STANDARD;
  return Math.min(
    maxHeight,
    Math.max(CHART_HEIGHT_STANDARD, itemCount * CHART_ROW_PX + 56)
  );
}
