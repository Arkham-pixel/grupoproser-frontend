import * as XLSX from 'xlsx';
import { construirInformeIndicadoresComplex } from './construirInformeIndicadoresComplex.js';

function nombreArchivoInforme() {
  const ahora = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `Informe_Indicadores_COMPLEX_${ahora.getFullYear()}${p(ahora.getMonth() + 1)}${p(ahora.getDate())}_${p(ahora.getHours())}${p(ahora.getMinutes())}.xlsx`;
}

export function exportarInformeIndicadoresExcel(datosInforme) {
  const {
    portada,
    historicoResumen,
    historicoPorResponsable,
    protocoloResumen,
    protocoloPorAjustador,
    meta,
  } = datosInforme;

  if (!meta?.totalCasosHistorico && !meta?.totalCasosProtocolo) {
    throw new Error('No hay casos en los periodos seleccionados para generar el informe.');
  }

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(portada), 'Portada');
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(historicoResumen),
    'Histórico resumen'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      historicoPorResponsable.length ? historicoPorResponsable : [{ Mensaje: 'Sin datos en el periodo' }]
    ),
    'Histórico por ajustador'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(protocoloResumen),
    'Protocolo resumen'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      protocoloPorAjustador.length ? protocoloPorAjustador : [{ Mensaje: 'Sin datos en el periodo' }]
    ),
    'Protocolo por ajustador'
  );

  XLSX.writeFile(workbook, nombreArchivoInforme());
}

export { construirInformeIndicadoresComplex };
