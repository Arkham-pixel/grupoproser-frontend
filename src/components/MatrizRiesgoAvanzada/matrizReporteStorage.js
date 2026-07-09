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

export function urlReporteMatriz({ imprimir = false, seccion = null } = {}) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  const path = `${base}matriz-riesgo-reporte`;
  const params = new URLSearchParams();
  if (imprimir) params.set('imprimir', '1');
  if (seccion) params.set('seccion', seccion);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
