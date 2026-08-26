import ExcelJS from 'exceljs';
import {
  AIU_PORCENTAJE_DEFAULT_ALFA,
  DEFAULT_LIQUIDADOR_ALFA,
  SMMLV_POR_ANIO,
  defaultOtrosAmparosAlfa,
  mapCasoAlfaALiquidador,
  nuevoItemDetalleLiquidacionCat,
  nuevoOtroAmparoAlfa,
  parsearNumero,
  sincronizarDetalleCatConPresupuestoNsr,
} from './liquidadorAlfaHelpers.js';
import { patchDeducibleDesdeTomadorAlfa } from './tomadoresAlfaCatalogo.js';

const ITEM_FIRST_ROW = 16;
/** Mismo orden que INDICADORES_FRAUDE_ALFA (filas 19–27 de ANALISIS GENERAL). */
const INDICADORES_FRAUDE_KEYS = [
  { key: 'docAlteradaOcurrencia', defaultNivel: 'BAJO', defaultValor: 'X' },
  { key: 'exageracionMontos', defaultNivel: 'BAJO', defaultValor: 'X' },
  { key: 'siniestroFinInicioPoliza', defaultNivel: 'BAJO', defaultValor: 'X' },
  { key: 'faltaMantenimiento', defaultNivel: 'BAJO', defaultValor: 'X' },
  { key: 'destruccionAntesReporte', defaultNivel: 'BAJO', defaultValor: 'N/A' },
  { key: 'docAlteradaCosto', defaultNivel: 'BAJO', defaultValor: 'X' },
  { key: 'hurtoBienesInusuales', defaultNivel: 'BAJO', defaultValor: 'N/A' },
  { key: 'rcInteresResponsabilidad', defaultNivel: 'BAJO', defaultValor: 'N/A' },
  { key: 'intuyeFraude', defaultNivel: 'BAJO', defaultValor: 'NO' },
];
const LABEL_FIN_ITEMS =
  /sub\s*total|aiu\s*\(|deducible|valor a indemnizar|liquidado por|observaci[oó]n|acepto indemnizaci[oó]n|otros amparos/i;

function unwrap(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'object') {
    if (Object.prototype.hasOwnProperty.call(v, 'result')) return unwrap(v.result);
    if (Array.isArray(v.richText)) {
      return unwrap(v.richText.map((p) => p?.text || '').join(''));
    }
    if (typeof v.text === 'string') return unwrap(v.text);
    if (v.error) return null;
  }
  return null;
}

function cell(sheet, row, col) {
  if (!sheet) return null;
  return unwrap(sheet.getCell(row, col).value);
}

function cellTxt(sheet, row, col) {
  const v = cell(sheet, row, col);
  if (v == null) return '';
  if (v instanceof Date) return fechaInput(v);
  return String(v).trim();
}

function cellNum(sheet, row, col) {
  const v = cell(sheet, row, col);
  if (v == null || v === '') return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return parsearNumero(v);
}

function fechaInput(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number' && Number.isFinite(value) && value > 20000 && value < 80000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.round(value));
    return fechaInput(epoch);
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value.trim())) {
    return value.trim().slice(0, 10);
  }
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return fechaInput(d);
  return '';
}

function esFilaFinItems(sheet, row) {
  const d = cellTxt(sheet, row, 4);
  const e = cellTxt(sheet, row, 5);
  const l = cellTxt(sheet, row, 12);
  const blob = `${d} ${e} ${l}`;
  return LABEL_FIN_ITEMS.test(blob);
}

function leerItems(sheet) {
  const filas = [];
  const last = Math.max(sheet.rowCount || 0, ITEM_FIRST_ROW + 80);
  for (let row = ITEM_FIRST_ROW; row <= last; row += 1) {
    if (esFilaFinItems(sheet, row)) break;
    const descripcion = cellTxt(sheet, row, 5);
    const valorPerdida = cellNum(sheet, row, 11);
    const n = cell(sheet, row, 4);
    const nOk = typeof n === 'number' ? n > 0 : /^\d+$/.test(String(n || '').trim());
    if (!descripcion && !valorPerdida && !nOk) {
      if (filas.length) break;
      continue;
    }
    if (!descripcion && !valorPerdida) continue;
    const fila = nuevoItemDetalleLiquidacionCat();
    fila.id = `det-xlsx-${row}`;
    fila.descripcion = descripcion || `Ítem ${filas.length + 1}`;
    fila.valorAsegurado = cellNum(sheet, row, 6) || '';
    fila.indiceVariable = cellNum(sheet, row, 7) || 0;
    fila.valorAseguradoFecha = cellNum(sheet, row, 8) || fila.valorAsegurado;
    fila.valorAsegurable = cellNum(sheet, row, 9) || fila.valorAseguradoFecha;
    fila.valorPerdida = valorPerdida || '';
    fila.demerito = cellNum(sheet, row, 12) || 0;
    fila.valorReal = cellNum(sheet, row, 13) || valorPerdida || '';
    fila.cantidad = 1;
    fila.valorUnitario = valorPerdida || '';
    filas.push(fila);
  }
  return filas;
}

function buscarFilaPorEtiqueta(sheet, regex, col = 12, fromRow = 20) {
  const last = Math.max(sheet.rowCount || 0, fromRow + 40);
  for (let row = fromRow; row <= last; row += 1) {
    const txt = `${cellTxt(sheet, row, col)} ${cellTxt(sheet, row, 4)} ${cellTxt(sheet, row, 5)}`;
    if (regex.test(txt)) return row;
  }
  return null;
}

function parsearAiuPct(label, fallback = AIU_PORCENTAJE_DEFAULT_ALFA) {
  const m = String(label || '').match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!m) return fallback;
  const n = parsearNumero(m[1]);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n > 1 ? n / 100 : n;
}

function parsearTomadorAsegurado(raw) {
  const t = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!t) return { tomador: '', asegurado: '' };
  const parts = t.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { tomador: parts[0], asegurado: parts.slice(1).join(' / ') };
  }
  return { tomador: t, asegurado: '' };
}

function parsearAceptacion(sheet) {
  const last = Math.max(sheet.rowCount || 0, 34);
  for (let row = 30; row <= last; row += 1) {
    const txt = cellTxt(sheet, row, 4);
    if (!/acepto indemnizaci/i.test(txt)) continue;
    const no = /\(\s*x\s*\).*no acepto|no acepto indemnizaci[oó]n\s*\(\s*x\s*\)/i.test(txt);
    const si = /acepto indemnizaci[oó]n\s*\(\s*x\s*\)/i.test(txt);
    if (no && !si) return 'NO_ACEPTO';
    if (si) return 'ACEPTO';
    return '';
  }
  return '';
}

function parsearBanco(sheet) {
  const last = Math.max(sheet.rowCount || 0, 36);
  let blob = '';
  for (let row = 34; row <= last; row += 1) {
    blob += ` ${cellTxt(sheet, row, 4)}`;
  }
  const ahorros = /ahorros\s*\(\s*x\s*\)/i.test(blob);
  const corriente = /corriente\s*\(\s*x\s*\)/i.test(blob);
  const cuenta = blob.match(/no\.?\s*([0-9][0-9.\-\s]{4,})/i);
  const banco = blob.match(/banco\s+([^]+?)\s+sucursal/i);
  const sucursal = blob.match(/sucursal\s+([^]+?)$/i);
  const ciudad = blob.match(/ciudad de\s+([^,]+)/i);
  return {
    tipoCuenta: ahorros ? 'AHORROS' : corriente ? 'CORRIENTE' : '',
    numeroCuenta: cuenta ? cuenta[1].replace(/\s+/g, '').replace(/\.$/, '') : '',
    banco: banco ? banco[1].replace(/_+/g, '').trim() : '',
    sucursal: sucursal ? sucursal[1].replace(/_+/g, '').trim() : '',
    ciudadFirma: ciudad ? ciudad[1].replace(/_+/g, '').trim() : '',
  };
}

function parsearObservaciones(sheet) {
  const row = buscarFilaPorEtiqueta(sheet, /observaci[oó]n/i, 4, 28);
  if (!row) return '';
  let txt = cellTxt(sheet, row, 4);
  txt = txt.replace(/^observaci[oó]n:\s*/i, '').trim();
  txt = txt.replace(/\n?OTROS AMPAROS \(sin deducible\):[\s\S]*$/i, '').trim();
  return txt;
}

function parsearAnalisisGeneral(sheet) {
  if (!sheet) return null;
  const colNivel = { 4: 'BAJO', 5: 'MEDIO', 6: 'ALTO' };
  const indicadoresFraude = {};
  INDICADORES_FRAUDE_KEYS.forEach((ind, idx) => {
    const row = 19 + idx;
    let nivel = ind.defaultNivel;
    let valor = ind.defaultValor;
    for (const col of [4, 5, 6]) {
      const v = cellTxt(sheet, row, col);
      if (v) {
        nivel = colNivel[col] || nivel;
        valor = v;
        break;
      }
    }
    indicadoresFraude[ind.key] = { nivel, valor };
  });
  return {
    ubicacionEvento: cellTxt(sheet, 9, 3),
    coaseguro: cellTxt(sheet, 10, 3),
    descripcionEvento: cellTxt(sheet, 11, 3),
    causaEvento: cellTxt(sheet, 12, 3),
    fechaAsignacion: fechaInput(cell(sheet, 13, 3)),
    fechaUltimoDocumento: fechaInput(cell(sheet, 14, 3)),
    aplicacionExclusiones: cellTxt(sheet, 15, 3),
    cumplimientoGarantias: cellTxt(sheet, 16, 3),
    salvamento: cellTxt(sheet, 17, 3),
    posibilidadRecobro: cellTxt(sheet, 28, 3),
    observaciones: cellTxt(sheet, 29, 3),
    indicadoresFraude,
  };
}

export function extraerConsecutivoAlfaDeNombre(nombre = '') {
  const m = String(nombre || '').match(/ALFA-\d{4}-\d{2}-\d+/i);
  return m ? m[0].toUpperCase() : '';
}

export function esExcelCatManualAlfa(liquidador = {}) {
  return String(liquidador?.excelCatOrigen || '').toLowerCase() === 'manual';
}

/**
 * Lee un Informe CAT Alfa (.xlsx) y lo convierte al estado del liquidador / informe.
 * No modifica el archivo: el llamador debe archivarlo tal cual.
 */
export async function parsearInformeCatAlfaExcel(file, { caso = {}, liquidadorActual = null } = {}) {
  if (!file) throw new Error('Seleccione un archivo Excel CAT Alfa.');
  const name = String(file.name || '').toLowerCase();
  if (!/\.(xlsx|xlsm)$/i.test(name)) {
    throw new Error('Solo se aceptan archivos .xlsx / .xlsm del Informe CAT Alfa.');
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const hojaLiq =
    wb.getWorksheet('LIQUIDADOR') ||
    wb.worksheets.find((ws) => /liquid/i.test(ws.name || '')) ||
    null;
  if (!hojaLiq) {
    throw new Error('El Excel no tiene la hoja LIQUIDADOR.');
  }

  const base = mapCasoAlfaALiquidador({
    ...(caso || {}),
    liquidador: liquidadorActual || caso?.liquidador || null,
  });

  const { tomador, asegurado } = parsearTomadorAsegurado(cellTxt(hojaLiq, 6, 11));
  const poliza = cellTxt(hojaLiq, 5, 6);
  const siniestro = cellTxt(hojaLiq, 6, 7);
  const cobertura = cellTxt(hojaLiq, 7, 7);
  const evento = cellTxt(hojaLiq, 8, 7) || cobertura;
  const causa = cellTxt(hojaLiq, 9, 7) || evento;
  const fechaSiniestro = fechaInput(cell(hojaLiq, 8, 6));
  const anio = cellNum(hojaLiq, 9, 6) || (fechaSiniestro ? Number(fechaSiniestro.slice(0, 4)) : 0);
  const valorAsegurado = cellNum(hojaLiq, 12, 6);
  const cantSmmlv = cellNum(hojaLiq, 8, 12);
  let pctRaw = cellNum(hojaLiq, 8, 13);
  if (pctRaw > 0 && pctRaw <= 1) pctRaw *= 100;

  const encabezado = {
    ...base.encabezado,
    poliza: poliza || base.encabezado.poliza,
    siniestro: siniestro || base.encabezado.siniestro,
    tomador: tomador || base.encabezado.tomador,
    asegurado: asegurado || base.encabezado.asegurado,
    cobertura: cobertura || base.encabezado.cobertura,
    evento: evento || base.encabezado.evento,
    causa: causa || base.encabezado.causa,
    fechaSiniestro: fechaSiniestro || base.encabezado.fechaSiniestro,
    valorAseguradoInmueble: valorAsegurado || base.encabezado.valorAseguradoInmueble,
  };

  const cfgTomador = patchDeducibleDesdeTomadorAlfa(encabezado.tomador, {
    ...(base.liquidacionCatastrofico?.deducibleConfig || {}),
    porcentaje: pctRaw || 2,
    cantidadSMMLV: cantSmmlv || 2,
    anioSMMLV: anio || new Date().getFullYear(),
    valorSMMLV: SMMLV_POR_ANIO[anio] || SMMLV_POR_ANIO[2026],
  }, encabezado.poliza);

  const rowAiu = buscarFilaPorEtiqueta(hojaLiq, /\baiu\b/i, 12, ITEM_FIRST_ROW);
  const aiuPct = parsearAiuPct(rowAiu ? cellTxt(hojaLiq, rowAiu, 12) : '');
  const rowLiqPor = buscarFilaPorEtiqueta(hojaLiq, /liquidado por/i, 4, ITEM_FIRST_ROW);
  const liquidadoPor = rowLiqPor ? cellTxt(hojaLiq, rowLiqPor, 7) : '';
  if (liquidadoPor) encabezado.ajustador = liquidadoPor;

  const detalle = leerItems(hojaLiq);
  if (!detalle.length) {
    throw new Error('El Excel CAT no tiene ítems en la hoja LIQUIDADOR.');
  }

  const rowOtros = buscarFilaPorEtiqueta(hojaLiq, /otros amparos/i, 12, ITEM_FIRST_ROW);
  const totalOtros = rowOtros ? cellNum(hojaLiq, rowOtros, 15) : 0;
  let otrosAmparos = defaultOtrosAmparosAlfa().map((it) => ({ ...it, aplica: false }));
  if (totalOtros > 0) {
    otrosAmparos = [
      ...otrosAmparos,
      nuevoOtroAmparoAlfa({
        tipo: 'otro',
        aplica: true,
        cantidad: 1,
        unidad: 'glb',
        valorUnitario: totalOtros,
        valor: totalOtros,
        observacion: 'Importado del Excel CAT',
      }),
    ];
  }

  const bancoParsed = parsearBanco(hojaLiq);
  const banco = {
    ...DEFAULT_LIQUIDADOR_ALFA.datosBancarios,
    ...(base.datosBancarios || {}),
    ...Object.fromEntries(
      Object.entries(bancoParsed).filter(([, v]) => String(v || '').replace(/_/g, '').trim())
    ),
  };

  let liquidador = {
    ...base,
    modelo: 'nsr10',
    excelCatOrigen: 'manual',
    encabezado,
    detalleLiquidacionCat: detalle,
    observaciones: parsearObservaciones(hojaLiq) || base.observaciones || '',
    aceptacionIndemnizacion: parsearAceptacion(hojaLiq) || base.aceptacionIndemnizacion || '',
    nombreFirmante: asegurado || base.nombreFirmante || '',
    datosBancarios: banco,
    otrosAmparos,
    liquidacionCatastrofico: {
      ...(base.liquidacionCatastrofico || {}),
      valorAsegurado: valorAsegurado || base.liquidacionCatastrofico?.valorAsegurado,
      deducible: cfgTomador.texto,
      deducibleConfig: cfgTomador,
      deducibleConfigPresupuesto: cfgTomador,
    },
    evaluacionSismicaNSR10: {
      ...(base.evaluacionSismicaNSR10 || {}),
      presupuesto: {
        ...(base.evaluacionSismicaNSR10?.presupuesto || {}),
        aiuPorcentaje: aiuPct,
        imprevistosPorcentaje: 0,
        impuestosPorcentaje: 0,
      },
    },
  };

  liquidador = sincronizarDetalleCatConPresupuestoNsr(liquidador, detalle);

  const hojaAg =
    wb.getWorksheet('ANALISIS GENERAL') ||
    wb.worksheets.find((ws) => /analisis/i.test(ws.name || '')) ||
    null;
  const analisis = parsearAnalisisGeneral(hojaAg);

  return {
    liquidador,
    analisisGeneral: analisis,
    nItems: detalle.length,
    consecutivoArchivo: extraerConsecutivoAlfaDeNombre(file.name),
  };
}
