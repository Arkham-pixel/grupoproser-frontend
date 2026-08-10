import { ReporteService } from './reporteService.js';
import { REPORTE_INTERACTIVO_JS } from './reporteInteractivoScript.js';

/**
 * Descarga un archivo .html autónomo e interactivo (no PDF).
 * Abrir en Chrome/Edge: arrastre tablas con el mouse.
 */
export async function descargarReporteInteractivoHtml(
  datosMatriz,
  nombreArchivo = 'reporte_matriz_riesgos',
  tipoReporte = 'inicial'
) {
  let html = await ReporteService.generarReporteHTML(datosMatriz, tipoReporte, {
    embeberAssets: true,
    modoExportacion: true,
    modoInteractivo: true,
  });

  const banner = `
    <div class="reporte-banner-interactivo no-print">
      <div>
        <strong>ARNALD Data Flow</strong> · Informe general con gráficas
        <span style="opacity:0.85;margin-left:8px">Arrastre las tablas anchas con el mouse ↔</span>
      </div>
    </div>`;

  const script = `<script>${REPORTE_INTERACTIVO_JS}</script>`;

  html = html.replace('</body>', `${script}</body>`);
  html = html.replace(/<body([^>]*)>/, `<body$1>${banner}`);

  const fecha = new Date().toISOString().split('T')[0];
  const nombreCompleto = `${nombreArchivo}_interactivo_${fecha}.html`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreCompleto;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    success: true,
    nombreArchivo: nombreCompleto,
    mensaje: `Descargado ${nombreCompleto}. Ábralo en el navegador (no en lector PDF).`,
  };
}
