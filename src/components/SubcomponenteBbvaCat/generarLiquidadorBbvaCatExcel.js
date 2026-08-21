import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  fusionarPortadaConFormData,
  normalizarItemsRespuesta,
  OCULTAR_EVALUACION_Y_DICTAMEN_NSR10,
  ocultarHojasEvaluacionYDictamenExcel,
  parseMontoNsr10,
} from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import { prefillNsrDesdecasoBbvaCat } from './liquidadorBbvaCatHelpers.js';

const PLANTILLA_URL = `${import.meta.env.BASE_URL || '/'}templates/Plantilla_Evaluacion_Sismica_NSR10.xlsx`;

/** Filas de ítems del checklist en la hoja Evaluación (plantilla). */
const EVAL_FIRST_ROW = 8;
const EVAL_LAST_ROW = 26;

/** Filas de presupuesto editables (plantilla: H4:H38 → Subtotal en H40). */
const PRES_FIRST_ROW = 4;
const PRES_LAST_ROW = 38;

async function cargarPlantillaNsr10() {
  const response = await fetch(PLANTILLA_URL);
  if (!response.ok) {
    throw new Error(
      `No se pudo cargar Plantilla_Evaluacion_Sismica_NSR10.xlsx (${response.status}).`
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

function numeroONull(v) {
  return parseMontoNsr10(v);
}

function setVal(sheet, row, col, value) {
  if (value === undefined) return;
  sheet.getCell(row, col).value = value === '' ? null : value;
}

/**
 * Rellena la plantilla oficial NSR-10 (Listas | Portada | Evaluación | Dictamen | Presupuesto)
 * con los datos del liquidador BbvaCat.
 */
function rellenarPlantillaNsr10(workbook, liquidador) {
  const evalData = liquidador?.evaluacionSismicaNSR10 || {};
  const enc = liquidador?.encabezado || {};
  const portada = fusionarPortadaConFormData(evalData.portada || {}, {
    ...prefillNsrDesdecasoBbvaCat({}, enc),
    ...enc,
    asegurado: enc.asegurado,
    poliza: enc.poliza,
    municipio: enc.ciudad,
    ciudad: enc.ciudad,
    direccion: enc.direccion,
    direccionRiesgo: enc.direccion,
    inspector: enc.ajustador,
    fechaInspeccion: enc.fechaInspeccion,
    fechaSismo: enc.fechaSiniestro,
    fechaSiniestro: enc.fechaSiniestro,
  });
  const items = normalizarItemsRespuesta(evalData.items);
  const presupuesto = evalData.presupuesto || {};
  const filasPres = Array.isArray(presupuesto.items) ? presupuesto.items : [];

  const hojaEval = workbook.getWorksheet('Evaluación');
  const hojaPortada = workbook.getWorksheet('Portada');
  const hojaPres = workbook.getWorksheet('Presupuesto');
  if (!hojaEval || !hojaPres) {
    throw new Error('La plantilla NSR-10 no tiene las hojas Evaluación / Presupuesto.');
  }

  // —— Evaluación · fila 4 (cabecera del inmueble; Portada toma fórmulas de aquí) ——
  setVal(hojaEval, 4, 1, txt(portada.asegurado) || null);
  setVal(hojaEval, 4, 2, txt(portada.municipio) || null);
  setVal(hojaEval, 4, 3, txt(portada.direccion) || null);
  setVal(hojaEval, 4, 4, fechaCelda(portada.fechaInspeccion));
  setVal(hojaEval, 4, 5, txt(portada.inspector) || null);
  setVal(hojaEval, 4, 6, txt(portada.tipologiaPrincipal) || null);
  setVal(hojaEval, 4, 7, txt(portada.entorno) || null);
  setVal(hojaEval, 4, 8, txt(portada.numeroPisos) || null);
  setVal(hojaEval, 4, 9, txt(portada.uso) || null);
  setVal(hojaEval, 4, 10, fechaCelda(portada.fechaSismo));

  // —— Evaluación · checklist filas 8–26 ——
  // E=estado, H=observación, I=foto, J=acción (F/G son fórmulas de la plantilla)
  const porCodigo = new Map(items.map((it) => [String(it.codigo || '').trim(), it]));
  if (!OCULTAR_EVALUACION_Y_DICTAMEN_NSR10) {
  for (let row = EVAL_FIRST_ROW; row <= EVAL_LAST_ROW; row += 1) {
    const codigo = txt(hojaEval.getCell(row, 2).value);
    const it = porCodigo.get(codigo);
    if (!it) {
      setVal(hojaEval, row, 5, null);
      setVal(hojaEval, row, 8, null);
      setVal(hojaEval, row, 9, null);
      setVal(hojaEval, row, 10, null);
      continue;
    }
    setVal(hojaEval, row, 5, txt(it.estado) || null);
    setVal(hojaEval, row, 8, txt(it.observacion) || null);
    setVal(hojaEval, row, 9, txt(it.fotoRef) || null);
    setVal(hojaEval, row, 10, txt(it.accionSugerida) || null);
  }
  }

  // —— Portada · versión (el resto viene por fórmula desde Evaluación) ——
  if (hojaPortada) {
    const version = txt(portada.versionInforme) || 'EVALUACIÓN PRELIMINAR';
    setVal(hojaPortada, 2, 1, `VERSIÓN DEL INFORME: ${version}`);
  }

  // —— Presupuesto · ítems 4–38 + % AIU / imprevistos / impuestos ——
  const filasConDatos = filasPres.filter(
    (it) =>
      txt(it.actividad) ||
      txt(it.componente) ||
      txt(it.capitulo) ||
      numeroONull(it.cantidad) != null ||
      numeroONull(it.valorUnitario) != null
  );

  for (let i = 0; i <= PRES_LAST_ROW - PRES_FIRST_ROW; i += 1) {
    const row = PRES_FIRST_ROW + i;
    const it = filasConDatos[i];
    if (!it) {
      setVal(hojaPres, row, 1, null);
      setVal(hojaPres, row, 2, null);
      setVal(hojaPres, row, 3, null);
      setVal(hojaPres, row, 4, null);
      setVal(hojaPres, row, 5, null);
      setVal(hojaPres, row, 6, null);
      setVal(hojaPres, row, 7, null);
      // H = fórmula de la plantilla (no tocar)
      setVal(hojaPres, row, 9, null);
      setVal(hojaPres, row, 10, null);
      setVal(hojaPres, row, 11, null);
      setVal(hojaPres, row, 12, null);
      continue;
    }
    setVal(hojaPres, row, 1, txt(it.capitulo) || null);
    setVal(hojaPres, row, 2, null); // Código eval. ya no se usa
    setVal(hojaPres, row, 3, txt(it.componente) || null);
    setVal(hojaPres, row, 4, txt(it.actividad) || null);
    setVal(hojaPres, row, 5, txt(it.unidad) || null);
    setVal(hojaPres, row, 6, numeroONull(it.cantidad));
    setVal(hojaPres, row, 7, numeroONull(it.valorUnitario));
    setVal(hojaPres, row, 9, txt(it.prioridad) || null);
    setVal(hojaPres, row, 10, txt(it.cubierto) || null);
    setVal(hojaPres, row, 11, txt(it.observacion) || null);
    setVal(hojaPres, row, 12, txt(it.fuente) || null);
  }

  // Porcentajes editables (plantilla: G41 AIU, G42 imprevistos, G43 impuestos)
  const aiu = Number(presupuesto.aiuPorcentaje ?? 0.05);
  const impr = Number(presupuesto.imprevistosPorcentaje ?? 0.1);
  const imp = Number(presupuesto.impuestosPorcentaje ?? 0);
  setVal(hojaPres, 41, 6, 'AIU');
  setVal(hojaPres, 41, 7, Number.isFinite(aiu) ? aiu : 0.05);
  setVal(hojaPres, 42, 6, 'Imprevistos');
  setVal(hojaPres, 42, 7, Number.isFinite(impr) ? impr : 0.1);
  setVal(hojaPres, 43, 6, 'Impuestos');
  setVal(hojaPres, 43, 7, Number.isFinite(imp) ? imp : 0);
}

/**
 * Excel liquidador BbvaCat = plantilla oficial Evaluación Sísmica NSR-10 rellenada.
 */
export async function generarLiquidadorBbvaCatExcelBlob(liquidador) {
  const workbook = await cargarPlantillaNsr10();
  rellenarPlantillaNsr10(workbook, liquidador || {});
  ocultarHojasEvaluacionYDictamenExcel(workbook);

  const enc = liquidador?.encabezado || {};
  const buffer = await workbook.xlsx.writeBuffer();
  const safe = String(enc.siniestro || enc.consecutivo || enc.poliza || 'NSR10')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 40);
  return {
    blob: new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename: `Evaluacion_Sismica_NSR10_BbvaCat_${safe}.xlsx`,
  };
}

export async function descargarLiquidadorBbvaCatExcel(liquidador, totales) {
  const { blob, filename } = await generarLiquidadorBbvaCatExcelBlob(liquidador, totales);
  saveAs(blob, filename);
}
