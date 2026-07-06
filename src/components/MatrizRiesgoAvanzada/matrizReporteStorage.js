export const MATRIZ_REPORTE_STORAGE_KEY = 'matrizReportePreview';

export function guardarDatosReporteMatriz({ datosMatriz, tipoReporte = 'inicial', matrizId = null }) {
  sessionStorage.setItem(
    MATRIZ_REPORTE_STORAGE_KEY,
    JSON.stringify({
      datosMatriz,
      tipoReporte,
      matrizId,
      guardadoEn: Date.now(),
    })
  );
}

export function leerDatosReporteMatriz() {
  const raw = sessionStorage.getItem(MATRIZ_REPORTE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function urlReporteMatriz({ imprimir = false } = {}) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  const path = `${base}matriz-riesgo-reporte`;
  return imprimir ? `${path}?imprimir=1` : path;
}
