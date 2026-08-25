import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { inferirTipoLiquidadorBbvaCat, TIPO_LIQUIDADOR_LEASING } from './deduciblesBbvaCat.js';
import {
  PLANTILLA_LIQUIDADOR_BBVA_URL,
  calcularFilaDetalleBbvaCat,
  calcularTotalesFormatoExcelBbvaCat,
  esValorGlobal,
} from './formatoLiquidacionBbvaCat.js';
import { parsearNumero } from './liquidadorBbvaCatHelpers.js';

const ITEM_FIRST = 15;
const ITEM_LAST = 24;

async function cargarPlantillaBbva() {
  const response = await fetch(PLANTILLA_LIQUIDADOR_BBVA_URL);
  if (!response.ok) {
    throw new Error(
      `No se pudo cargar Liquidador_BBVA_CAT.xlsx (${response.status}).`
    );
  }
  const buffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

function txt(v) {
  const s = String(v ?? '').trim();
  if (!s || s === 'null' || s === 'undefined') return '';
  return s;
}

function fechaCelda(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0);
    return Number.isNaN(d.getTime()) ? raw : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : d;
}

function setVal(sheet, row, col, value) {
  if (value === undefined) return;
  const cell = sheet.getCell(row, col);
  cell.value = value === '' ? null : value;
  try {
    if (cell.formula) cell.formula = undefined;
  } catch {
    /* ok */
  }
}

function rellenarHoja(sheet, liquidador, totales) {
  const enc = liquidador?.encabezado || {};
  const excel = totales?.formatoExcel || calcularTotalesFormatoExcelBbvaCat(liquidador);
  const ctx = excel.ctx || {};
  const tipos = excel.tiposDeducible || {};
  const ded = excel.deducibleFormato || {};
  const detalle = (excel.detalle || []).map((it) => calcularFilaDetalleBbvaCat(it, ctx));

  setVal(sheet, 4, 6, txt(enc.poliza) || null);
  setVal(sheet, 5, 6, fechaCelda(enc.vigenciaDesde || ctx.vigenciaDesde));
  setVal(sheet, 6, 6, fechaCelda(enc.vigenciaHasta || ctx.vigenciaHasta));
  setVal(sheet, 7, 6, fechaCelda(enc.fechaSiniestro || ctx.fechaSiniestro));
  setVal(sheet, 8, 6, ctx.anio || null);
  setVal(sheet, 9, 6, ctx.diasTranscurridos === '' ? null : ctx.diasTranscurridos);

  setVal(sheet, 5, 7, txt(enc.siniestro) || null);
  setVal(sheet, 5, 11, txt(enc.asegurado) || txt(enc.tomador) || null);
  setVal(sheet, 7, 7, txt(enc.ramoAfectado || enc.cobertura || 'TERREMOTO') || null);
  setVal(sheet, 9, 7, txt(enc.evento || enc.causa) || null);

  setVal(sheet, 7, 12, parsearNumero(ded.smmlv) || 3);
  setVal(sheet, 7, 13, Number(ded.porcentaje) || 0.02);
  setVal(sheet, 7, 14, parsearNumero(ded.dolares) || 0);
  setVal(sheet, 7, 15, parsearNumero(ded.pesos) || 0);

  setVal(sheet, 8, 12, tipos.montoSmmlv || 0);
  setVal(sheet, 8, 13, tipos.montoPct || 0);
  setVal(sheet, 8, 14, tipos.montoUsd || 0);
  setVal(sheet, 8, 15, tipos.montoPesos || 0);

  const trm = parsearNumero(enc.trm);
  setVal(sheet, 9, 13, trm || null);
  setVal(sheet, 11, 6, excel.valorGlobal || null);

  for (let i = 0; i <= ITEM_LAST - ITEM_FIRST; i += 1) {
    const row = ITEM_FIRST + i;
    const it = detalle[i];
    setVal(sheet, row, 4, i + 1);
    if (!it || (!txt(it.descripcion) && !parsearNumero(it.valorAsegurable))) {
      setVal(sheet, row, 5, null);
      setVal(sheet, row, 6, null);
      setVal(sheet, row, 7, null);
      setVal(sheet, row, 8, null);
      setVal(sheet, row, 9, null);
      setVal(sheet, row, 10, null);
      setVal(sheet, row, 11, null);
      setVal(sheet, row, 12, null);
      setVal(sheet, row, 13, null);
      setVal(sheet, row, 14, null);
      setVal(sheet, row, 15, null);
      continue;
    }
    setVal(sheet, row, 5, txt(it.descripcion));
    setVal(
      sheet,
      row,
      6,
      esValorGlobal(it.valorAsegurado) ? 'Valor Global' : parsearNumero(it.valorAsegurado) || 'Valor Global'
    );
    setVal(sheet, row, 7, parsearNumero(it.indiceVariable) || 0);
    setVal(
      sheet,
      row,
      8,
      esValorGlobal(it.valorAseguradoFecha) ? 'Valor Global' : parsearNumero(it.valorAseguradoFecha) || null
    );
    setVal(sheet, row, 9, parsearNumero(it.valorAsegurable) || null);
    setVal(sheet, row, 10, it.pctResponsabilidad ?? 1);
    setVal(sheet, row, 11, parsearNumero(it.valorPerdida) || parsearNumero(it.valorAsegurable) || null);
    setVal(sheet, row, 12, parsearNumero(it.demerito) || 0);
    setVal(sheet, row, 13, parsearNumero(it.valorReal) || null);
    setVal(sheet, row, 14, parsearNumero(it.perdidaBase) || null);
    setVal(sheet, row, 15, parsearNumero(it.perdidaIndemnizable) || null);
  }

  if (detalle.length > ITEM_LAST - ITEM_FIRST + 1) {
    const extra = detalle.slice(ITEM_LAST - ITEM_FIRST + 1);
    const last = ITEM_LAST;
    const sum = extra.reduce((a, it) => a + (parsearNumero(it.perdidaIndemnizable) || 0), 0);
    const prev = parsearNumero(sheet.getCell(last, 15).value);
    const prevDesc = txt(sheet.getCell(last, 5).value);
    setVal(
      sheet,
      last,
      5,
      prevDesc ? `${prevDesc} (+ ${extra.length} ítems)` : `Ítems adicionales (${extra.length})`
    );
    setVal(sheet, last, 15, prev + sum);
  }

  setVal(sheet, 25, 15, excel.subTotal || 0);
  setVal(sheet, 26, 15, excel.deducibleAplicable || 0);
  setVal(sheet, 27, 15, excel.valorAIndemnizar || 0);

  const liquidado =
    txt(liquidador.liquidadoPor) || txt(enc.ajustador) || null;
  setVal(sheet, 26, 4, liquidado ? `Liquidado por: ${liquidado}` : 'Liquidado por:');
  setVal(sheet, 27, 4, liquidado);
  setVal(
    sheet,
    28,
    4,
    txt(liquidador.areaLiquidador) || 'Indemnizaciones Seguros Generales'
  );

  const obs = txt(liquidador.observacionesFiniquito);
  if (obs) setVal(sheet, 39, 4, `OBSERVACIONES: ${obs}`);
}

/**
 * Excel liquidador BBVA CAT = plantilla oficial deudores / leasing.
 */
export async function generarLiquidadorBbvaCatExcelBlob(liquidador, totales) {
  const workbook = await cargarPlantillaBbva();
  const tipo = inferirTipoLiquidadorBbvaCat({
    tipoLiquidador: liquidador?.tipoLiquidador,
    encabezado: liquidador?.encabezado,
  });
  const nombreHoja =
    tipo === TIPO_LIQUIDADOR_LEASING ? 'Liquidador leasing' : 'Liquidador Deudores';
  const hoja = workbook.getWorksheet(nombreHoja);
  if (!hoja) {
    throw new Error(`La plantilla no tiene la hoja «${nombreHoja}».`);
  }
  rellenarHoja(hoja, liquidador || {}, totales || {});
  workbook.worksheets.forEach((ws) => {
    if (ws.name !== nombreHoja) ws.state = 'hidden';
  });

  const enc = liquidador?.encabezado || {};
  const buffer = await workbook.xlsx.writeBuffer();
  const safe = String(enc.siniestro || enc.consecutivo || enc.poliza || 'BBVA')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 40);
  const etiqueta = tipo === TIPO_LIQUIDADOR_LEASING ? 'Leasing' : 'Deudores';
  return {
    blob: new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename: `Liquidador_BBVA_CAT_${etiqueta}_${safe}.xlsx`,
  };
}

export async function descargarLiquidadorBbvaCatExcel(liquidador, totales) {
  const { blob, filename } = await generarLiquidadorBbvaCatExcelBlob(liquidador, totales);
  saveAs(blob, filename);
}
