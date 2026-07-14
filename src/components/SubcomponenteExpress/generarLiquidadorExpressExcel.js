import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  DOCUMENTOS_SOPORTE,
  parsearNumero,
  pctDocumentosMarcados,
  totalesItemsAnalisis,
} from './liquidadorExpressHelpers.js';

const PLANTILLA_URL = '/templates/Liquidador_plantilla.xlsx';

const FILA_INI_CONCEPTOS = 14;
const FILA_FIN_CONCEPTOS = 25;
const FILA_INI_DOCS = 38;
const FILA_INI_ANALISIS = 57;
const MAX_ITEMS_ANALISIS = 3;

function setCell(sheet, ref, value) {
  const cell = sheet.getCell(ref);
  cell.value = value === undefined || value === null || value === '' ? null : value;
  return cell;
}

function setDateCell(sheet, ref, isoDate) {
  if (!isoDate) {
    setCell(sheet, ref, null);
    return;
  }
  const d = new Date(`${String(isoDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    setCell(sheet, ref, String(isoDate));
    return;
  }
  const cell = sheet.getCell(ref);
  cell.value = d;
  if (!cell.numFmt || cell.numFmt === 'General') {
    cell.numFmt = 'd" de "mmmm" de "yyyy';
  }
}

function textoDeducible(liquidador, totales) {
  const texto = liquidador.encabezado?.deducibleTexto?.trim();
  if (texto) return texto;
  return `${totales.porcentaje}% del Valor de la Pérdida Mínimo ${totales.cantidadSMMLV} SMMLV`;
}

/** Nombre del usuario logueado en la plataforma (para ELABORADO POR). */
function nombreUsuarioPlataforma() {
  if (typeof localStorage === 'undefined') return '';
  return (
    localStorage.getItem('nombre') ||
    localStorage.getItem('login') ||
    ''
  ).trim();
}

function marcarSi(valor) {
  return valor === 'SI' ? 1 : 0;
}

function marcarNo(valor) {
  return valor === 'SI' ? 0 : 1;
}

/** Rellena FORMATO_LIQUIDACION preservando estilos/fórmulas/logos de la plantilla. */
function rellenarLiquidacion(sheet, liquidador, totales) {
  const enc = liquidador.encabezado || {};
  const ded = liquidador.deducible || {};

  setCell(sheet, 'B4', enc.reclamo || null);
  setCell(sheet, 'B5', enc.zc || null);
  setCell(sheet, 'B6', enc.asegurado || null);
  setCell(sheet, 'B7', enc.nit || null);
  setCell(sheet, 'B8', enc.poliza || null);
  setDateCell(sheet, 'B9', enc.fechaSiniestro);
  setCell(sheet, 'B10', enc.cobertura || null);
  setCell(sheet, 'B11', textoDeducible(liquidador, totales));

  for (let row = FILA_INI_CONCEPTOS; row <= FILA_FIN_CONCEPTOS; row += 1) {
    setCell(sheet, `A${row}`, null);
    setCell(sheet, `B${row}`, null);
    setCell(sheet, `H${row}`, null);
  }

  const conceptos = liquidador.conceptos || [];
  conceptos.slice(0, FILA_FIN_CONCEPTOS - FILA_INI_CONCEPTOS + 1).forEach((item, idx) => {
    const row = FILA_INI_CONCEPTOS + idx;
    setCell(sheet, `A${row}`, item.concepto || null);
    setCell(sheet, `B${row}`, item.detalle || item.concepto || null);
    const monto = parsearNumero(item.valor);
    setCell(sheet, `H${row}`, monto || null);
  });

  // Entradas de deducible (las fórmulas de totales se mantienen)
  setCell(sheet, 'C27', (totales.porcentaje || 0) / 100);
  setCell(sheet, 'F27', totales.cantidadSMMLV ?? ded.cantidadSMMLV ?? 4);
  setCell(sheet, 'G27', totales.deducibleSMMLV || null);

  // Fórmulas de totales con resultado precargado (Excel recalcula al abrir/editar)
  sheet.getCell('H26').value = { formula: 'SUM(H14:H25)', result: totales.totalPerdida };
  sheet.getCell('D27').value = {
    formula: 'H26*C27',
    result: totales.deduciblePorcentaje,
  };
  sheet.getCell('H27').value = {
    formula: 'MAX(D27,G27)',
    result: totales.deducibleAplicado,
  };
  sheet.getCell('H28').value = {
    formula: 'H26-H27',
    result: totales.totalIndemnizar,
  };

  setCell(sheet, 'D30', 'COP');

  // ELABORADO POR: usuario logueado en Arnald / la plataforma
  setCell(sheet, 'B37', nombreUsuarioPlataforma() || null);
}

/** Rellena FORMATO-CHECK-LIST. */
function rellenarChecklist(sheet, liquidador, totales) {
  const enc = liquidador.encabezado || {};
  const chk = liquidador.checklist || {};
  const pct = pctDocumentosMarcados(chk.documentos);
  const items = chk.itemsAnalisis || [];
  const { totalReclamado, totalAjustado } = totalesItemsAnalisis(items);

  setDateCell(sheet, 'D9', chk.fecha || new Date().toISOString().slice(0, 10));
  setCell(sheet, 'D10', enc.zc || null);
  setCell(sheet, 'D11', enc.reclamo || null);
  setCell(sheet, 'D12', chk.tipoProducto || 'TRDM');
  setCell(sheet, 'D13', enc.poliza || null);
  setCell(sheet, 'D14', enc.asegurado || null);
  setDateCell(sheet, 'D15', chk.vigenciaDesde);
  setDateCell(sheet, 'F15', chk.vigenciaHasta);
  setDateCell(sheet, 'D16', enc.fechaSiniestro);
  setCell(sheet, 'D17', chk.riesgoAsegurado || enc.asegurado || null);
  setCell(sheet, 'D18', chk.coberturaAfectada || enc.cobertura || null);
  setCell(sheet, 'D19', chk.garantias || 'No Aplica');
  setCell(sheet, 'D20', chk.exclusiones || 'No Aplica');
  setCell(sheet, 'D21', chk.objecion || 'No Aplica');
  setCell(sheet, 'D22', chk.tipoPerdida || 'Parcial');
  setCell(sheet, 'D23', chk.aplicaDemerito || 'No Aplica');
  setCell(sheet, 'D24', chk.limiteAsegurado || null);

  setCell(sheet, 'E25', totales.totalPerdida || null);
  setCell(sheet, 'E26', totales.deducibleAplicado || null);
  setCell(sheet, 'E27', totales.totalIndemnizar || null);

  setCell(sheet, 'D28', chk.salvamento || 'No Aplica');
  setCell(sheet, 'E28', chk.salvamentoDetalle || null);
  setCell(sheet, 'D29', chk.recobro || 'No Aplica');
  setCell(sheet, 'D30', chk.indicadoresFraude || 'No Aplica');

  // Descripción del evento (celda fusionada C33)
  setCell(sheet, 'C33', chk.descripcionEvento || null);
  setCell(sheet, 'C34', chk.ajustador ? `Ajustador - ${chk.ajustador}` : null);

  DOCUMENTOS_SOPORTE.forEach((_, idx) => {
    const row = FILA_INI_DOCS + idx;
    const aplica = Boolean(chk.documentos?.[idx]);
    setCell(sheet, `E${row}`, aplica ? 'Aplica' : null);
    setCell(sheet, `F${row}`, aplica ? 1 : 0);
  });

  const rowPct = FILA_INI_DOCS + DOCUMENTOS_SOPORTE.length + 1; // 46
  setCell(sheet, 'E46', pct / 100);
  const e46 = sheet.getCell('E46');
  e46.numFmt = '0%';
  setCell(sheet, 'E48', chk.reclamoFormalizado || 'No');
  setDateCell(sheet, 'E49', chk.fechaFormalizacion);

  for (let i = 0; i < MAX_ITEMS_ANALISIS; i += 1) {
    const row = FILA_INI_ANALISIS + i;
    const item = items[i];
    setCell(sheet, `B${row}`, item ? i + 1 : null);
    setCell(sheet, `C${row}`, item?.descripcion || null);
    setCell(sheet, `D${row}`, item ? parsearNumero(item.reclamado) || null : null);
    setCell(sheet, `E${row}`, item ? parsearNumero(item.ajustado) || null : null);
    setCell(sheet, `F${row}`, item?.observacion || null);
  }

  setCell(sheet, 'D60', totalReclamado || null);
  setCell(sheet, 'E60', totalAjustado || null);
  setCell(sheet, 'B64', chk.comentariosAdicionales || 'Para este caso no aplica');
  setCell(sheet, 'C70', chk.ajustador ? `Ajustador - ${chk.ajustador}` : null);
}

/** Rellena SALVAMENTO. */
function rellenarSalvamento(sheet, liquidador) {
  const enc = liquidador.encabezado || {};
  const sal = liquidador.salvamento || {};

  setCell(sheet, 'H6', enc.poliza || null);
  setCell(sheet, 'H8', enc.reclamo || null);
  setCell(sheet, 'H10', sal.subTarea || 'SALVAMENTO');
  setCell(sheet, 'H12', enc.asegurado || null);

  setCell(sheet, 'J17', sal.descripcion || null);
  setCell(sheet, 'J19', sal.cantidad || null);
  setCell(sheet, 'J22', sal.marca || 'N/D');
  setCell(sheet, 'J24', sal.serial || 'N/D');
  setCell(sheet, 'J26', sal.especificacionDano || null);
  setCell(sheet, 'J29', sal.ubicacion || null);
  setCell(sheet, 'J32', sal.contactoEntrega || null);

  // SI/NO (celdas vinculadas a checkboxes en el original)
  setCell(sheet, 'L35', marcarSi(sal.nacionalizado));
  setCell(sheet, 'P35', marcarNo(sal.nacionalizado));

  setCell(sheet, 'L38', marcarSi(sal.generaCustodia));
  setCell(sheet, 'P38', marcarNo(sal.generaCustodia));
  setCell(sheet, 'T38', parsearNumero(sal.valorCustodia) || null);

  setCell(sheet, 'L41', marcarSi(sal.registroFotografico));
  setCell(sheet, 'P41', marcarNo(sal.registroFotografico));

  setCell(sheet, 'L44', marcarSi(sal.indemnizado));
  setCell(sheet, 'P44', marcarNo(sal.indemnizado));
  setCell(sheet, 'T44', parsearNumero(sal.valorIndemnizado) || null);

  setCell(sheet, 'L46', marcarSi(sal.ofertaNonCash));
  setCell(sheet, 'P46', marcarNo(sal.ofertaNonCash));
  setCell(sheet, 'T46', parsearNumero(sal.valorNonCash) || null);

  setCell(sheet, 'J48', sal.comentarios || null);
}

async function cargarPlantillaWorkbook() {
  const response = await fetch(PLANTILLA_URL);
  if (!response.ok) {
    throw new Error(
      `No se pudo cargar la plantilla Liquidador (${response.status}). Verifique public/templates/Liquidador_plantilla.xlsx`
    );
  }
  const buffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

/**
 * Genera el Excel a partir de la plantilla idéntica a Liquidador.xlsm (sin macros).
 */
export async function generarLiquidadorExpressExcelBlob(liquidador, totales) {
  const workbook = await cargarPlantillaWorkbook();

  const hojaLiq =
    workbook.getWorksheet('FORMATO_LIQUIDACION') || workbook.worksheets[0];
  const hojaChk =
    workbook.getWorksheet('FORMATO-CHECK-LIST') || workbook.worksheets[1];
  const hojaSal = workbook.getWorksheet('SALVAMENTO') || workbook.worksheets[2];

  if (hojaLiq) rellenarLiquidacion(hojaLiq, liquidador, totales);
  if (hojaChk) rellenarChecklist(hojaChk, liquidador, totales);
  if (hojaSal) rellenarSalvamento(hojaSal, liquidador);

  workbook.creator = 'Arnald DataFlow';
  workbook.modified = new Date();

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const reclamo = String(liquidador?.encabezado?.reclamo || 'liquidador').replace(
    /[^a-zA-Z0-9_-]/g,
    '_'
  );
  return {
    blob,
    nombre: `Liquidador_Express_${reclamo}.xlsx`,
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

export async function descargarLiquidadorExpressExcel(liquidador, totales) {
  const { blob, nombre } = await generarLiquidadorExpressExcelBlob(liquidador, totales);
  saveAs(blob, nombre);
}
