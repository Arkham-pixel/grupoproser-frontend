import { guardarDatosReporteMatriz, urlReporteMatriz } from '../components/MatrizRiesgoAvanzada/matrizReporteStorage.js';

function abrirVentanaReporte(imprimir = false) {
  const url = urlReporteMatriz({ imprimir });
  const ventana = window.open(url, '_blank', 'width=1440,height=900,scrollbars=yes,resizable=yes');
  if (!ventana) {
    throw new Error('No se pudo abrir la ventana. Permita ventanas emergentes.');
  }
  return ventana;
}

/** Abre el reporte y muestra el diálogo para guardar PDF (tablas anchas: mejor en pantalla). */
export async function exportarReportePdfDesdeHtml(
  datosMatriz,
  _nombreArchivo = 'reporte_matriz_riesgos',
  tipoReporte = 'inicial'
) {
  try {
    guardarDatosReporteMatriz({ datosMatriz, tipoReporte });
    abrirVentanaReporte(true);
    return {
      success: true,
      metodo: 'print',
      mensaje:
        'Reporte abierto. Para tablas anchas use arrastre en pantalla; el PDF puede recortar columnas.',
    };
  } catch (error) {
    console.error('Error al abrir reporte para PDF:', error);
    return { success: false, error: error.message };
  }
}

export async function abrirReporteParaImprimirPdf(datosMatriz, tipoReporte = 'inicial') {
  guardarDatosReporteMatriz({ datosMatriz, tipoReporte });
  abrirVentanaReporte(true);
  return { success: true };
}

export function abrirReporteMatrizVista(datosMatriz, tipoReporte = 'inicial') {
  guardarDatosReporteMatriz({ datosMatriz, tipoReporte });
  abrirVentanaReporte(false);
}
