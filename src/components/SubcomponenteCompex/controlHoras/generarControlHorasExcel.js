import ExcelJS from 'exceljs';
import Logo from '../../../img/Logo.png';
import {
  buildCabeceraControlHoras,
  calcularTotalesControlHoras,
  formatearFechaDisplay,
} from './controlHorasUtils';

const FUENTE = 'Arial';
const COLOR_PROSER = 'FFDC2626';

const bordeFino = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
};

const estiloTitulo = {
  font: { name: FUENTE, size: 11, bold: true, color: { argb: 'FF000000' } },
  alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
};

const estiloLabel = {
  font: { name: FUENTE, size: 9, bold: true, color: { argb: 'FF000000' } },
  alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
  border: bordeFino,
};

const estiloValor = {
  font: { name: FUENTE, size: 9, color: { argb: 'FF000000' } },
  alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
  border: bordeFino,
};

const estiloValorFirma = {
  ...estiloValor,
  font: { name: FUENTE, size: 9, bold: true, color: { argb: COLOR_PROSER } },
};

const estiloHeaderTabla = {
  font: { name: FUENTE, size: 8, bold: true, color: { argb: 'FF000000' } },
  alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
  border: bordeFino,
};

const estiloCeldaTabla = {
  font: { name: FUENTE, size: 9, color: { argb: 'FF000000' } },
  alignment: { vertical: 'top', horizontal: 'left', wrapText: true },
  border: bordeFino,
};

const estiloCeldaNumero = {
  ...estiloCeldaTabla,
  alignment: { vertical: 'middle', horizontal: 'right' },
  numFmt: '#,##0.00',
};

const estiloTotalFila = {
  font: { name: FUENTE, size: 9, bold: true, color: { argb: 'FF000000' } },
  alignment: { vertical: 'middle', horizontal: 'right' },
  border: bordeFino,
  numFmt: '#,##0.00',
};

const estiloResumenLabel = {
  font: { name: FUENTE, size: 9, bold: true, color: { argb: 'FF000000' } },
  alignment: { vertical: 'middle', horizontal: 'left' },
};

const estiloResumenMoneda = {
  font: { name: FUENTE, size: 9, color: { argb: 'FF000000' } },
  alignment: { vertical: 'middle', horizontal: 'right' },
  numFmt: '"$"#,##0',
};

const estiloTotalFinal = {
  font: { name: FUENTE, size: 9, bold: true, color: { argb: 'FF000000' } },
  alignment: { vertical: 'middle', horizontal: 'right' },
  numFmt: '"$"#,##0',
  border: {
    bottom: { style: 'double', color: { argb: 'FF000000' } },
  },
};

async function insertarLogoProser(workbook, sheet) {
  try {
    const response = await fetch(Logo);
    if (!response.ok) return;
    const buffer = await response.arrayBuffer();
    const imageId = workbook.addImage({ buffer, extension: 'png' });
    sheet.addImage(imageId, {
      tl: { col: 0.08, row: 0.05 },
      ext: { width: 168, height: 62 },
    });
  } catch (error) {
    console.warn('[ControlHoras Excel] No se pudo cargar el logo:', error);
  }
}

/** Ancho de columna en Excel (~1 unidad ≈ ancho del carácter en Calibri 11). */
const anchoColumna = (texto, min = 10, max = 55) => {
  const len = String(texto ?? '').length;
  return Math.min(max, Math.max(min, Math.ceil(len * 1.15)));
};

function aplicarParMeta(sheet, rowIndex, [label1, valor1, label2, valor2], esFilaFirma = false) {
  const row = sheet.getRow(rowIndex);
  const pares = [
    [1, label1, true],
    [2, valor1, false],
    [5, label2, true],
    [6, valor2, false],
  ];

  pares.forEach(([col, texto, esLabel]) => {
    const cell = row.getCell(col);
    cell.value = texto ?? '';
    if (esLabel) {
      cell.style = estiloLabel;
    } else if (esFilaFirma && col === 2) {
      cell.style = estiloValorFirma;
    } else {
      cell.style = estiloValor;
    }
  });

  sheet.mergeCells(rowIndex, 2, rowIndex, 4);
  sheet.mergeCells(rowIndex, 6, rowIndex, 9);

  const maxLen = Math.max(
    ...[label1, valor1, label2, valor2].map((t) => String(t ?? '').length)
  );
  row.height = maxLen > 40 ? 36 : maxLen > 28 ? 28 : 22;
}

/** Ajusta anchos mínimos por columna según el contenido generado. */
function ajustarAnchosColumnas(sheet, filasTabla, meta) {
  const anchos = [12, 36, 32, 20, 14, 14, 14, 14, 12];

  meta.forEach(([l1, v1, l2, v2]) => {
    anchos[0] = Math.max(anchos[0], anchoColumna(l1, 22, 32));
    anchos[1] = Math.max(anchos[1], anchoColumna(v1, 18, 40));
    anchos[4] = Math.max(anchos[4], anchoColumna(l2, 22, 32));
    anchos[5] = Math.max(anchos[5], anchoColumna(v2, 18, 40));
  });

  const headersTabla = [
    'FECHA',
    'DESCRIPCIÓN ACTIVIDAD',
    'FUNCIONARIO',
    'CARGO / PROFESIÓN',
    'HORAS DESPLAZAMIENTO - VIAJE (HH:MM)',
    'HORAS DE CAMPO - INSPECCIÓN (HH:MM)',
    'HORAS OFICINA (HH:MM)',
    'HORAS SECRETARIA (HH:MM)',
    'HORAS TOTAL',
  ];
  headersTabla.forEach((h, i) => {
    anchos[i] = Math.max(anchos[i], anchoColumna(h, 12, 28));
  });

  filasTabla.forEach((fila) => {
    anchos[0] = Math.max(anchos[0], anchoColumna(formatearFechaDisplay(fila.fecha), 11, 14));
    anchos[1] = Math.max(anchos[1], anchoColumna(fila.descripcion, 28, 55));
    anchos[2] = Math.max(anchos[2], anchoColumna(fila.nombre_funcionario, 26, 42));
    anchos[3] = Math.max(anchos[3], anchoColumna(fila.cargo, 16, 28));
  });

  anchos.forEach((w, i) => {
    const col = sheet.getColumn(i + 1);
    col.width = w;
  });
}

export async function generarControlHorasExcel({ formData, controlHoras, nombreAseguradora }) {
  const cabecera = buildCabeceraControlHoras(formData, nombreAseguradora);
  const totales = calcularTotalesControlHoras(controlHoras);
  const filas = controlHoras?.filas || [];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PROSER AJUSTES';
  const sheet = workbook.addWorksheet('Control de Horas', {
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: false,
    },
  });

  await insertarLogoProser(workbook, sheet);

  sheet.mergeCells('A1:B4');
  sheet.mergeCells('C1:I4');
  const tituloCell = sheet.getCell('C1');
  tituloCell.value = 'RELACIÓN DEL TIEMPO EMPLEADO EN EL AJUSTE';
  tituloCell.style = estiloTitulo;
  sheet.getRow(1).height = 18;
  sheet.getRow(2).height = 18;
  sheet.getRow(3).height = 18;
  sheet.getRow(4).height = 18;

  const meta = [
    ['FIRMA AJUSTADORA', cabecera.firma, 'COMPAÑÍA', cabecera.compania],
    ['RAMO/PÓLIZA', cabecera.ramoPoliza, 'ASEGURADO O TERCERO', cabecera.asegurado],
    ['IDENTIFICACIÓN', cabecera.documento, 'No. SINIESTRO', cabecera.siniestro],
    ['LUGAR DE ACCIDENTE', cabecera.lugar, 'RIESGO AFECTADO', cabecera.riesgo],
    ['ANALISTA ASEGURADORA', cabecera.analista, 'CORREO ELECTRÓNICO', cabecera.emailAnalista || ''],
    [
      'FECHA DE SINIESTRO',
      formatearFechaDisplay(cabecera.fechaSiniestro),
      'FECHA ASIGNACIÓN',
      formatearFechaDisplay(cabecera.fechaAsignacion),
    ],
    [
      'FECHA DE INSPECCIÓN',
      formatearFechaDisplay(cabecera.fechaInspeccion),
      'NUESTRA REFERENCIA',
      cabecera.referencia,
    ],
  ];

  let rowIdx = 6;
  meta.forEach((fila, index) => {
    aplicarParMeta(sheet, rowIdx, fila, index === 0);
    rowIdx += 1;
  });

  rowIdx += 1;

  const headers = [
    'FECHA',
    'DESCRIPCIÓN ACTIVIDAD',
    'FUNCIONARIO',
    'CARGO / PROFESIÓN',
    'HORAS DESPLAZAMIENTO - VIAJE (HH:MM)',
    'HORAS DE CAMPO - INSPECCIÓN (HH:MM)',
    'HORAS OFICINA (HH:MM)',
    'HORAS SECRETARIA (HH:MM)',
    'HORAS TOTAL',
  ];

  const headerRow = sheet.getRow(rowIdx);
  headerRow.height = 32;
  headers.forEach((texto, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = texto;
    cell.style = estiloHeaderTabla;
  });
  rowIdx += 1;

  filas.forEach((fila) => {
    const totalFila =
      Number(fila.horas_viaje || 0) +
      Number(fila.horas_campo || 0) +
      Number(fila.horas_oficina || 0) +
      Number(fila.horas_secretaria || 0);
    const row = sheet.getRow(rowIdx);
    const largoDesc = String(fila.descripcion || '').length;
    const largoNombre = String(fila.nombre_funcionario || '').length;
    const maxLen = Math.max(largoDesc, largoNombre);
    row.height = maxLen > 80 ? 48 : maxLen > 45 ? 36 : 26;
    const valores = [
      formatearFechaDisplay(fila.fecha),
      fila.descripcion,
      fila.nombre_funcionario,
      fila.cargo,
      Number(fila.horas_viaje || 0),
      Number(fila.horas_campo || 0),
      Number(fila.horas_oficina || 0),
      Number(fila.horas_secretaria || 0),
      totalFila,
    ];
    valores.forEach((val, i) => {
      const cell = row.getCell(i + 1);
      cell.value = val;
      cell.style = i >= 4 ? estiloCeldaNumero : estiloCeldaTabla;
    });
    rowIdx += 1;
  });

  const totalRow = sheet.getRow(rowIdx);
  totalRow.height = 18;
  sheet.mergeCells(rowIdx, 1, rowIdx, 4);
  const totalLabel = totalRow.getCell(1);
  totalLabel.value = 'VALORES TOTALES';
  totalLabel.style = {
    ...estiloHeaderTabla,
    alignment: { vertical: 'middle', horizontal: 'center' },
  };
  totalRow.getCell(5).value = totales.viaje;
  totalRow.getCell(6).value = totales.campo;
  totalRow.getCell(7).value = totales.oficina;
  totalRow.getCell(8).value = totales.secretaria;
  totalRow.getCell(9).value = totales.total_horas;
  [5, 6, 7, 8, 9].forEach((c) => {
    totalRow.getCell(c).style = estiloTotalFila;
  });
  rowIdx += 2;

  const filaHonorarios = sheet.getRow(rowIdx);
  filaHonorarios.getCell(1).value = 'HONORARIOS $';
  filaHonorarios.getCell(1).style = estiloResumenLabel;
  filaHonorarios.getCell(2).value = totales.total_horas;
  filaHonorarios.getCell(2).style = { ...estiloResumenMoneda, numFmt: '#,##0.00' };
  filaHonorarios.getCell(4).value = 'VALOR HORA';
  filaHonorarios.getCell(4).style = estiloResumenLabel;
  filaHonorarios.getCell(5).value = totales.valor_hora;
  filaHonorarios.getCell(5).style = estiloResumenMoneda;
  filaHonorarios.getCell(7).value = totales.subtotal_honorarios;
  filaHonorarios.getCell(7).style = estiloResumenMoneda;
  rowIdx += 1;

  const filaGastos = sheet.getRow(rowIdx);
  filaGastos.getCell(1).value = 'GASTOS';
  filaGastos.getCell(1).style = estiloResumenLabel;
  filaGastos.getCell(7).value = totales.gastos;
  filaGastos.getCell(7).style = estiloResumenMoneda;
  rowIdx += 1;

  const filaTotal = sheet.getRow(rowIdx);
  filaTotal.getCell(1).value = 'TOTAL';
  filaTotal.getCell(1).style = estiloResumenLabel;
  filaTotal.getCell(7).value = totales.total;
  filaTotal.getCell(7).style = estiloTotalFinal;

  ajustarAnchosColumnas(sheet, filas, meta);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const ref = cabecera.referencia || 'caso';
  const nombre = `Control_Horas_${ref}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { blob, nombre };
}

export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
