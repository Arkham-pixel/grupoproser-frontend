import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  DOCUMENTOS_SOPORTE,
  documentoChecklistFinalizado,
  nombreAjustadorParaDocumento,
  nombreUsuarioPlataforma,
  normalizarEstadoDocumento,
  parsearNumero,
  pctDocumentosMarcados,
  totalesItemsAnalisis,
} from './liquidadorExpressHelpers.js';
import zurichLogoUrl from '../../assets/zurich-logo.png';

const PLANTILLA_URL = '/templates/Liquidador_plantilla.xlsx';
/** Ancho del logo Zurich en px (96dpi); alto se calcula por proporción natural. */
const LOGO_ANCHO_PX = 140;

const FILA_INI_CONCEPTOS = 14;
const FILA_FIN_CONCEPTOS = 25;
const FILA_INI_DOCS = 38;
const FILA_INI_ANALISIS = 57;
const MAX_ITEMS_ANALISIS = 3;

/** Evita que el logo Zurich se deforme: ancla oneCell con proporción natural del PNG. */
async function corregirLogoZurichLiquidacion(workbook, sheet) {
  if (!sheet) return;
  try {
    sheet._media = [];
    const response = await fetch(zurichLogoUrl);
    if (!response.ok) return;
    const buffer = await response.arrayBuffer();
    const u8 = new Uint8Array(buffer);
    let ratio = 671 / 417;
    if (u8.length >= 24 && u8[0] === 0x89 && u8[1] === 0x50) {
      const w = (u8[16] << 24) | (u8[17] << 16) | (u8[18] << 8) | u8[19];
      const h = (u8[20] << 24) | (u8[21] << 16) | (u8[22] << 8) | u8[23];
      if (w > 0 && h > 0) ratio = w / h;
    }
    const width = LOGO_ANCHO_PX;
    const height = Math.round(width / ratio);
    const imageId = workbook.addImage({ buffer, extension: 'png' });
    sheet.addImage(imageId, {
      tl: { col: 6.2, row: 0.2 },
      ext: { width, height },
      editAs: 'oneCell',
    });
  } catch (err) {
    console.warn('[Liquidador Excel] No se pudo corregir logo Zurich:', err);
  }
}

/** Cada hoja del liquidador debe imprimirse / exportarse en una sola página. */
function configurarImpresionUnaPagina(sheet, printArea, { orientation } = {}) {
  if (!sheet) return;

  sheet.rowBreaks = [];

  const prev = sheet.pageSetup || {};
  sheet.pageSetup = {
    ...prev,
    paperSize: prev.paperSize ?? 9,
    orientation: orientation || prev.orientation || 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    showGridLines: prev.showGridLines ?? false,
    horizontalCentered: prev.horizontalCentered ?? true,
  };
  delete sheet.pageSetup.scale;

  if (printArea) {
    sheet.pageSetup.printArea = printArea;
  }
}

const AREAS_IMPRESION = {
  FORMATO_LIQUIDACION: 'A1:I37',
  'FORMATO-CHECK-LIST': 'A1:F70',
  SALVAMENTO: 'A1:T48',
};

function aplicarImpresionUnaPagina(workbook) {
  workbook.worksheets.forEach((sheet) => {
    const area = AREAS_IMPRESION[sheet.name];
    const orientation =
      sheet.name === 'FORMATO_LIQUIDACION' ? 'landscape' : undefined;
    configurarImpresionUnaPagina(sheet, area, { orientation });
  });
}

function setCell(sheet, ref, value) {
  const cell = sheet.getCell(ref);
  cell.value = value === undefined || value === null || value === '' ? null : value;
  return cell;
}

/** Quita el marco negro grueso del check-list (borde izquierdo col A / derecho col G). */
function quitarMarcoNegroChecklist(sheet) {
  if (!sheet) return;
  const maxRow = Math.max(sheet.rowCount || 70, 70);

  const sinLado = (border, lado) => {
    if (!border) return border;
    const next = { ...border };
    delete next[lado];
    return Object.keys(next).length ? next : undefined;
  };

  for (let r = 1; r <= maxRow; r += 1) {
    const leftCell = sheet.getCell(r, 1); // columna A
    if (leftCell.border?.left) {
      leftCell.border = sinLado(leftCell.border, 'left');
    }
    const rightCell = sheet.getCell(r, 7); // columna G
    const rightStyle = rightCell.border?.right?.style;
    if (rightStyle === 'medium' || rightStyle === 'thick' || rightStyle === 'mediumDashed') {
      rightCell.border = sinLado(rightCell.border, 'right');
    }
  }

  for (let c = 1; c <= 7; c += 1) {
    const cell = sheet.getCell(2, c); // fila 2
    const topStyle = cell.border?.top?.style;
    if (topStyle === 'medium' || topStyle === 'thick') {
      cell.border = sinLado(cell.border, 'top');
    }
  }
}

function setMoneyCell(sheet, ref, value) {
  const num = parsearNumero(value);
  if (!num && value !== 0 && value !== '0') {
    setCell(sheet, ref, value || null);
    return;
  }
  const cell = setCell(sheet, ref, num);
  if (!cell.numFmt || cell.numFmt === 'General') {
    cell.numFmt = '#,##0.00';
  }
}

function fechaSoloDia(valor) {
  if (!valor) return null;
  const str = String(valor).trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function setDateCell(sheet, ref, isoDate, locale = 'es') {
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
    cell.numFmt = String(locale).toLowerCase().startsWith('en')
      ? '[$-en-US]mmmm d, yyyy'
      : 'd" de "mmmm" de "yyyy';
  }
}

function textoDeducible(liquidador, totales) {
  const texto = liquidador.encabezado?.deducibleTexto?.trim();
  if (texto) return texto;
  return `${totales.porcentaje}% del Valor de la Pérdida Mínimo ${
    totales.tipoMinimo === 'SMDLV'
      ? `${totales.cantidadSMDLV} SMDLV`
      : `${totales.cantidadSMMLV} SMMLV`
  }`;
}

function marcarSi(valor) {
  return valor === 'SI' ? 'X' : '';
}

function marcarNo(valor) {
  return valor === 'SI' ? '' : 'X';
}

/** Rellena FORMATO_LIQUIDACION preservando estilos/fórmulas/logos de la plantilla. */
function rellenarLiquidacion(sheet, liquidador, totales, opciones = {}) {
  const enc = liquidador.encabezado || {};
  const ded = liquidador.deducible || {};

  // Datos del encabezado en columna C (la B queda libre / más limpia)
  setCell(sheet, 'B4', null);
  setCell(sheet, 'B5', null);
  setCell(sheet, 'B6', null);
  setCell(sheet, 'B7', null);
  setCell(sheet, 'B8', null);
  setCell(sheet, 'B9', null);
  setCell(sheet, 'B10', null);
  setCell(sheet, 'B11', null);

  setCell(sheet, 'C4', enc.reclamo || null);
  setCell(sheet, 'C5', enc.zc || null);
  setCell(sheet, 'C6', enc.asegurado || null);
  setCell(sheet, 'C7', enc.nit || null);
  setCell(sheet, 'C8', enc.poliza || null);
  setDateCell(sheet, 'C9', enc.fechaSiniestro, opciones.locale);
  setCell(sheet, 'C10', enc.cobertura || null);
  setCell(sheet, 'C11', textoDeducible(liquidador, totales));

  // B27 =B11: limpiar resultado cacheado de la plantilla para que no muestre texto viejo
  const b27 = sheet.getCell('B27');
  if (b27.value && typeof b27.value === 'object' && (b27.value.formula || b27.value.sharedFormula)) {
    b27.value = { formula: 'B11', result: null };
  } else {
    setCell(sheet, 'B27', null);
  }

  // No forzar anchos de E–G: altera la proporción del logo Zurich de la plantilla.

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
  const usaSmdlv = totales.tipoMinimo === 'SMDLV';
  setCell(
    sheet,
    'F27',
    usaSmdlv
      ? totales.cantidadSMDLV ?? ded.cantidadSMDLV ?? 10
      : totales.cantidadSMMLV ?? ded.cantidadSMMLV ?? 4
  );
  setCell(
    sheet,
    'G27',
    usaSmdlv ? totales.deducibleSMDLV || null : totales.deducibleSMMLV || null
  );

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
function rellenarChecklist(sheet, liquidador, totales, opciones = {}) {
  const enc = liquidador.encabezado || {};
  const chk = liquidador.checklist || {};
  const pct = pctDocumentosMarcados(chk.documentos);
  const items = chk.itemsAnalisis || [];
  const { totalReclamado, totalAjustado } = totalesItemsAnalisis(items);
  const fechaFormalizacion =
    fechaSoloDia(opciones.fechaUltimoDocumento) ||
    fechaSoloDia(chk.fechaFormalizacion);

  setDateCell(sheet, 'D9', chk.fecha || new Date().toISOString().slice(0, 10), opciones.locale);
  setCell(sheet, 'D10', enc.zc || null);
  setCell(sheet, 'D11', enc.reclamo || null);
  setCell(sheet, 'D12', chk.tipoProducto || null);
  setCell(sheet, 'D13', enc.poliza || null);
  setCell(sheet, 'D14', enc.asegurado || null);
  setDateCell(sheet, 'D15', chk.vigenciaDesde, opciones.locale);
  setDateCell(sheet, 'F15', chk.vigenciaHasta, opciones.locale);
  setDateCell(sheet, 'D16', enc.fechaSiniestro, opciones.locale);
  setCell(sheet, 'D17', chk.riesgoAsegurado || enc.asegurado || null);
  setCell(sheet, 'D18', chk.coberturaAfectada || enc.cobertura || null);
  setCell(sheet, 'D19', chk.garantias || 'No Aplica');
  setCell(sheet, 'D20', chk.exclusiones || 'No Aplica');
  setCell(sheet, 'D21', chk.objecion || 'No Aplica');
  setCell(sheet, 'D22', chk.tipoPerdida || 'Parcial');
  setCell(sheet, 'D23', chk.aplicaDemerito || 'No Aplica');
  // Límite/valor asegurado va en columna E (con los demás montos), no en D
  setCell(sheet, 'D24', null);
  setMoneyCell(sheet, 'E24', chk.limiteAsegurado);

  setCell(sheet, 'E25', totales.totalPerdida || null);
  setCell(sheet, 'E26', totales.deducibleAplicado || null);
  setCell(sheet, 'E27', totales.totalIndemnizar || null);

  setCell(sheet, 'D28', chk.salvamento || 'No Aplica');
  setCell(sheet, 'E28', chk.salvamentoDetalle || null);
  setCell(sheet, 'D29', chk.recobro || 'No Aplica');
  setCell(sheet, 'D30', chk.indicadoresFraude || 'No Aplica');

  // Descripción del evento (celda fusionada C33)
  setCell(sheet, 'C33', chk.descripcionEvento || null);
  const nombreAjustador = nombreAjustadorParaDocumento(chk.ajustador);
  setCell(sheet, 'C34', nombreAjustador ? `Ajustador - ${nombreAjustador}` : null);

  DOCUMENTOS_SOPORTE.forEach((_, idx) => {
    const row = FILA_INI_DOCS + idx;
    const estado = normalizarEstadoDocumento(chk.documentos?.[idx]);
    setCell(sheet, `E${row}`, estado || null);
    setCell(sheet, `F${row}`, documentoChecklistFinalizado(estado) ? 1 : 0);
  });

  setCell(sheet, 'E46', pct / 100);
  const e46 = sheet.getCell('E46');
  e46.numFmt = '0%';
  setCell(sheet, 'E48', chk.reclamoFormalizado || (fechaFormalizacion ? 'Sí' : 'No'));
  // Fecha formalización = fecha de último documento del caso Express
  setDateCell(sheet, 'E49', fechaFormalizacion, opciones.locale);

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
  setCell(sheet, 'C70', nombreAjustador ? `Ajustador - ${nombreAjustador}` : null);
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

function aplicarEncabezadosLocalizados(workbook, locale = 'es') {
  const esIngles = String(locale).toLowerCase().startsWith('en');
  const titulos = esIngles
    ? {
        FORMATO_LIQUIDACION: 'EXPRESS LIQUIDATION FORM',
        'FORMATO-CHECK-LIST': 'EXPRESS CLAIM CHECKLIST',
        SALVAMENTO: 'SALVAGE FORM',
      }
    : {
        FORMATO_LIQUIDACION: 'FORMATO DE LIQUIDACIÓN EXPRESS',
        'FORMATO-CHECK-LIST': 'CHECK-LIST DE RECLAMO EXPRESS',
        SALVAMENTO: 'FORMATO DE SALVAMENTO',
      };

  workbook.worksheets.forEach((sheet) => {
    const titulo = titulos[sheet.name];
    if (!titulo) return;
    sheet.headerFooter = {
      ...(sheet.headerFooter || {}),
      oddHeader: `&C&\"Arial,Bold\"${titulo}`,
    };
  });
}

/**
 * Crea el workbook Excel relleno (misma plantilla que la descarga .xlsx).
 * @param {{ incluirSalvamento?: boolean, soloLiquidacion?: boolean, locale?: string, fechaUltimoDocumento?: string }} opciones
 */
export async function crearWorkbookLiquidadorExpress(liquidador, totales, opciones = {}) {
  const workbook = await cargarPlantillaWorkbook();
  const incluirSalvamento = opciones.incluirSalvamento !== false;
  const soloLiquidacion = opciones.soloLiquidacion === true;

  const hojaLiq =
    workbook.getWorksheet('FORMATO_LIQUIDACION') || workbook.worksheets[0];
  const hojaChk =
    workbook.getWorksheet('FORMATO-CHECK-LIST') || workbook.worksheets[1];
  const hojaSal = workbook.getWorksheet('SALVAMENTO') || workbook.worksheets[2];

  if (hojaLiq) {
    rellenarLiquidacion(hojaLiq, liquidador, totales, opciones);
    await corregirLogoZurichLiquidacion(workbook, hojaLiq);
  }

  if (!soloLiquidacion) {
    if (hojaChk) {
      quitarMarcoNegroChecklist(hojaChk);
      rellenarChecklist(hojaChk, liquidador, totales, {
        fechaUltimoDocumento: opciones.fechaUltimoDocumento,
      });
    }

    if (incluirSalvamento && hojaSal) {
      rellenarSalvamento(hojaSal, liquidador);
    } else if (hojaSal) {
      workbook.removeWorksheet(hojaSal.id);
    }
  } else {
    // PDF liquidador: solo la hoja de liquidación
    if (hojaChk) workbook.removeWorksheet(hojaChk.id);
    if (hojaSal) workbook.removeWorksheet(hojaSal.id);
  }

  aplicarEncabezadosLocalizados(workbook, opciones.locale);
  aplicarImpresionUnaPagina(workbook);

  workbook.creator = 'Arnald DataFlow';
  workbook.modified = new Date();
  return workbook;
}

/**
 * Genera el Excel a partir de la plantilla idéntica a Liquidador.xlsm (sin macros).
 * Si salvamento no aplica, se omite la hoja SALVAMENTO; el resto se llena normal.
 */
export async function generarLiquidadorExpressExcelBlob(liquidador, totales, opciones = {}) {
  const workbook = await crearWorkbookLiquidadorExpress(liquidador, totales, opciones);

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

export async function descargarLiquidadorExpressExcel(liquidador, totales, opciones = {}) {
  const { blob, nombre } = await generarLiquidadorExpressExcelBlob(liquidador, totales, opciones);
  saveAs(blob, nombre);
}
