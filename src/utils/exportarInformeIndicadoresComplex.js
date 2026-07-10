/**
 * Exporta el informe de indicadores COMPLEX a Excel profesional (ExcelJS + gráficas PNG).
 */

import ExcelJS from 'exceljs';
import { construirInformeIndicadoresComplex } from './construirInformeIndicadoresComplex.js';
import { generarGraficasInformePng } from './exportarInformeIndicadoresCharts.js';

const FENIX = 'FFC8102E';
const BLANCO = 'FFFFFFFF';
const GRIS_CLARO = 'FFF3F4F6';
const GRIS_BORDE = 'FFD1D5DB';
const TEXTO = 'FF1E1E1E';
const VERDE = 'FF16A34A';

function nombreArchivoInforme() {
  const ahora = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `Informe_Indicadores_COMPLEX_${ahora.getFullYear()}${p(ahora.getMonth() + 1)}${p(ahora.getDate())}_${p(ahora.getHours())}${p(ahora.getMinutes())}.xlsx`;
}

function estiloHeader(cell) {
  cell.font = { bold: true, color: { argb: BLANCO }, name: 'Calibri', size: 11 };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FENIX } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: GRIS_BORDE } },
    left: { style: 'thin', color: { argb: GRIS_BORDE } },
    bottom: { style: 'thin', color: { argb: GRIS_BORDE } },
    right: { style: 'thin', color: { argb: GRIS_BORDE } },
  };
}

function estiloCelda(cell, { bold = false, fill = null, align = 'left' } = {}) {
  cell.font = { bold, color: { argb: TEXTO }, name: 'Calibri', size: 11 };
  cell.alignment = { vertical: 'middle', horizontal: align, wrapText: true };
  if (fill) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  }
  cell.border = {
    top: { style: 'thin', color: { argb: GRIS_BORDE } },
    left: { style: 'thin', color: { argb: GRIS_BORDE } },
    bottom: { style: 'thin', color: { argb: GRIS_BORDE } },
    right: { style: 'thin', color: { argb: GRIS_BORDE } },
  };
}

function ajustarAnchos(sheet, min = 12, max = 42) {
  sheet.columns.forEach((col) => {
    let largo = min;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const v = cell.value == null ? '' : String(cell.value);
      largo = Math.min(max, Math.max(largo, v.length + 2));
    });
    col.width = largo;
  });
}

function escribirTabla(sheet, filas, { freeze = true, autoFilter = true, filaInicio = 1 } = {}) {
  if (!filas?.length) {
    sheet.getCell(filaInicio, 1).value = 'Sin datos';
    estiloCelda(sheet.getCell(filaInicio, 1));
    return filaInicio;
  }

  const headers = Object.keys(filas[0]);
  headers.forEach((h, i) => {
    const cell = sheet.getCell(filaInicio, i + 1);
    cell.value = h;
    estiloHeader(cell);
  });
  sheet.getRow(filaInicio).height = 22;

  filas.forEach((fila, idx) => {
    const rowNum = filaInicio + 1 + idx;
    const esTotal =
      String(fila.Estado || fila.Categoría || fila.Sección || '')
        .toUpperCase()
        .includes('TOTAL') || fila.esTotal;
    headers.forEach((h, i) => {
      const cell = sheet.getCell(rowNum, i + 1);
      const valor = fila[h];
      cell.value = typeof valor === 'number' ? valor : valor ?? '';
      estiloCelda(cell, {
        bold: esTotal,
        fill: esTotal ? GRIS_CLARO : null,
        align: typeof valor === 'number' ? 'right' : 'left',
      });
    });
  });

  const ultimaFila = filaInicio + filas.length;
  const ultimaCol = headers.length;

  if (freeze) {
    sheet.views = [{ state: 'frozen', ySplit: filaInicio }];
  }
  if (autoFilter && filas.length > 0) {
    sheet.autoFilter = {
      from: { row: filaInicio, column: 1 },
      to: { row: ultimaFila, column: ultimaCol },
    };
  }

  ajustarAnchos(sheet);
  return ultimaFila;
}

function crearPortada(workbook, datosInforme) {
  const sheet = workbook.addWorksheet('Portada', {
    properties: { tabColor: { argb: FENIX } },
  });
  const meta = datosInforme.meta || {};
  const cons = datosInforme.consolidadoHistorico || meta.consolidadoHistorico || {};

  sheet.mergeCells('A1:F1');
  const titulo = sheet.getCell('A1');
  titulo.value = 'INFORME DE INDICADORES COMPLEX — ARNALD DATAFLOW';
  titulo.font = { bold: true, size: 16, color: { argb: BLANCO }, name: 'Calibri' };
  titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FENIX } };
  titulo.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 32;

  sheet.mergeCells('A2:F2');
  sheet.getCell('A2').value = 'Grupo Proser · Reporte gerencial de gestión de siniestros';
  sheet.getCell('A2').font = { italic: true, size: 11, color: { argb: 'FF6B7280' }, name: 'Calibri' };

  const filasMeta = [
    ['Fecha de generación', meta.generado || new Date().toLocaleString('es-CO')],
    ['Periodo histórico', meta.periodoHistorico || '—'],
    ['Casos periodo histórico', meta.totalCasosHistorico ?? cons.total ?? 0],
    ['Periodo nuevo protocolo', meta.periodoProtocolo || '—'],
    ['Casos nuevo protocolo', meta.totalCasosProtocolo ?? 0],
    ['Protocolo de referencia', meta.protocolo || '—'],
  ];

  filasMeta.forEach(([k, v], i) => {
    const row = 4 + i;
    sheet.getCell(row, 1).value = k;
    estiloCelda(sheet.getCell(row, 1), { bold: true, fill: GRIS_CLARO });
    sheet.mergeCells(row, 2, row, 4);
    sheet.getCell(row, 2).value = v;
    estiloCelda(sheet.getCell(row, 2));
  });

  const base = 11;
  sheet.getCell(base, 1).value = 'RESUMEN EJECUTIVO (estados reales)';
  estiloHeader(sheet.getCell(base, 1));
  sheet.mergeCells(base, 1, base, 4);

  const kpis = [
    ['Facturado (éxito / pagado)', cons.cierreExitoso ?? 0, VERDE],
    ['% cierre exitoso (facturado / total)', `${cons.porcentajeCierreExitoso ?? 0}%`, VERDE],
    ['Desistido / Anulado (otros cerrados)', cons.otrosCerrados ?? 0, FENIX],
    ['Total casos cerrados', cons.totalCerrados ?? 0, GRIS_CLARO],
    ['% cierre total (cerrados / total)', `${cons.porcentajeCierreTotal ?? 0}%`, GRIS_CLARO],
    ['En gestión', cons.enGestion ?? 0, 'FFDBEAFE'],
    ['% en gestión', `${cons.porcentajeEnGestion ?? 0}%`, 'FFDBEAFE'],
    ['TOTAL GENERAL', cons.total ?? meta.totalCasosHistorico ?? 0, GRIS_CLARO],
  ];

  kpis.forEach(([label, valor, fill], i) => {
    const row = base + 1 + i;
    sheet.getCell(row, 1).value = label;
    estiloCelda(sheet.getCell(row, 1), { bold: true, fill });
    sheet.getCell(row, 2).value = valor;
    estiloCelda(sheet.getCell(row, 2), { bold: true, align: 'right', fill });
  });

  const notaRow = base + kpis.length + 3;
  sheet.mergeCells(notaRow, 1, notaRow + 2, 6);
  sheet.getCell(notaRow, 1).value =
    'Notas: % cierre exitoso = facturado / total. % cierre total = (facturado + desistido + anulado) / total. ' +
    'Facturado = cierre exitoso (pagado). Desistido/Anulado = otros cerrados finalizados. ' +
    'Las graficas son imagenes embebidas en la hoja Graficas.';
  sheet.getCell(notaRow, 1).alignment = { wrapText: true, vertical: 'top' };
  sheet.getCell(notaRow, 1).font = { name: 'Calibri', size: 10, color: { argb: 'FF4B5563' } };

  sheet.getColumn(1).width = 42;
  sheet.getColumn(2).width = 18;
  sheet.getColumn(3).width = 14;
  sheet.getColumn(4).width = 14;
}

async function crearHojaGraficas(workbook, datosInforme) {
  const sheet = workbook.addWorksheet('Gráficas', {
    properties: { tabColor: { argb: 'FF2563EB' } },
  });

  sheet.mergeCells('A1:H1');
  const titulo = sheet.getCell('A1');
  titulo.value = 'GRÁFICAS DEL INFORME';
  titulo.font = { bold: true, size: 14, color: { argb: BLANCO }, name: 'Calibri' };
  titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FENIX } };
  titulo.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells('A2:H2');
  sheet.getCell('A2').value =
    'Imágenes generadas automáticamente a partir de los datos del consolidado y del protocolo.';
  sheet.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };

  let graficas = [];
  try {
    graficas = await generarGraficasInformePng(datosInforme);
  } catch (e) {
    console.warn('[Informe Excel] No se pudieron generar gráficas:', e);
  }

  if (!graficas.length) {
    sheet.getCell('A4').value = 'No hay datos suficientes para generar gráficas en este periodo.';
    return;
  }

  // Colocar gráficas en dos columnas aproximadas (filas Excel)
  let fila = 4;
  for (let i = 0; i < graficas.length; i += 1) {
    const g = graficas[i];
    sheet.getCell(fila, 1).value = g.titulo;
    sheet.getCell(fila, 1).font = { bold: true, size: 12, name: 'Calibri', color: { argb: TEXTO } };
    fila += 1;

    const imageId = workbook.addImage({
      buffer: g.buffer,
      extension: 'png',
    });

    // ExcelJS: tl en coordenadas de celda (0-indexed)
    const rowExcel = fila - 1; // 0-based for addImage tl.row roughly
    sheet.addImage(imageId, {
      tl: { col: 0, row: rowExcel },
      ext: { width: Math.min(g.width, 640), height: Math.min(g.height, 380) },
    });

    // Reservar filas según alto de imagen (~20 px por fila)
    const filasReservadas = Math.ceil(Math.min(g.height, 380) / 18) + 2;
    fila += filasReservadas;
  }

  sheet.getColumn(1).width = 20;
}

/**
 * Genera y descarga el Excel del informe.
 * @param {object} datosInforme resultado de construirInformeIndicadoresComplex
 */
export async function exportarInformeIndicadoresExcel(datosInforme) {
  const {
    historicoResumen,
    consolidadoCategorias,
    consolidadoCasosCerrados,
    consolidadoEnGestion,
    consolidadoPorEstado,
    historicoPorResponsable,
    protocoloResumen,
    protocoloPorAjustador,
    meta,
  } = datosInforme || {};

  if (!meta?.totalCasosHistorico && !meta?.totalCasosProtocolo) {
    throw new Error('No hay casos en los periodos seleccionados para generar el informe.');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Arnald DataFlow — COMPLEX';
  workbook.created = new Date();
  workbook.modified = new Date();

  crearPortada(workbook, datosInforme);

  const hojaCerrados = workbook.addWorksheet('Casos cerrados');
  escribirTabla(
    hojaCerrados,
    consolidadoCasosCerrados?.length
      ? consolidadoCasosCerrados
      : [{ Estado: 'Sin casos cerrados', Casos: 0, Tipo: '—' }]
  );

  const hojaGestion = workbook.addWorksheet('En gestión');
  escribirTabla(
    hojaGestion,
    consolidadoEnGestion?.length
      ? consolidadoEnGestion
      : [{ Estado: 'Sin casos en gestión', Casos: 0, Tipo: '—' }]
  );

  const hojaCompleto = workbook.addWorksheet('Consolidado completo');
  escribirTabla(
    hojaCompleto,
    consolidadoPorEstado?.length
      ? consolidadoPorEstado
      : [{ Estado: 'Sin desglose', Casos: 0, Clasificación: '—' }]
  );

  await crearHojaGraficas(workbook, datosInforme);

  if (consolidadoCategorias?.length) {
    const hojaCat = workbook.addWorksheet('Consolidado categorías');
    escribirTabla(hojaCat, consolidadoCategorias);
  }

  if (historicoResumen?.length) {
    const hojaHist = workbook.addWorksheet('Histórico resumen');
    escribirTabla(hojaHist, historicoResumen, { autoFilter: false });
  }

  const hojaAj = workbook.addWorksheet('Histórico por ajustador');
  escribirTabla(
    hojaAj,
    historicoPorResponsable?.length
      ? historicoPorResponsable
      : [{ Mensaje: 'Sin datos en el periodo' }]
  );

  if (protocoloResumen?.length) {
    const hojaProt = workbook.addWorksheet('Protocolo resumen');
    escribirTabla(hojaProt, protocoloResumen, { autoFilter: false });
  }

  const hojaProtAj = workbook.addWorksheet('Protocolo por ajustador');
  escribirTabla(
    hojaProtAj,
    protocoloPorAjustador?.length
      ? protocoloPorAjustador
      : [{ Mensaje: 'Sin datos en el periodo' }]
  );

  const buffer = await workbook.xlsx.writeBuffer();
  const { saveAs } = await import('file-saver');
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    nombreArchivoInforme()
  );
}

export { construirInformeIndicadoresComplex };
