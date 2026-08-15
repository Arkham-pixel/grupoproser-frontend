import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getUploadsUrlCandidates } from '../../config/apiConfig.js';
import { urlDescargaArchivoSura } from '../../services/segurosSuraService.js';
import {
  fusionarPortadaConFormData,
  normalizarItemsRespuesta,
} from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import { prefillNsrDesdeCasoSura } from './liquidadorSuraHelpers.js';
import { descripcionFotoNsr } from './syncFotosNsrAlInformeSura.js';

const PLANTILLA_URL = `${import.meta.env.BASE_URL || '/'}templates/Plantilla_Evaluacion_Sismica_NSR10.xlsx`;
const BASE_PUBLIC = import.meta.env.BASE_URL || '/';

/** Filas de ítems del checklist en la hoja Evaluación (plantilla). */
const EVAL_FIRST_ROW = 8;
const EVAL_LAST_ROW = 26;

/** Columna I = Foto / Ref. (1-based). */
const COL_FOTO = 9;

/** Filas de presupuesto editables (plantilla: H4:H38 → Subtotal en H40). */
const PRES_FIRST_ROW = 4;
const PRES_LAST_ROW = 38;

/** Celda de foto más alta/ancha para que la miniatura se vea bien. */
const FOTO_COL_WIDTH = 34;
const FOTO_ROW_HEIGHT = 120;
/** Margen interno respecto al borde de la celda (0–0.5). */
const FOTO_MARGEN = 0.06;

/** Ancho de columna Excel (caracteres) → px aproximados. */
function colWidthToPx(width) {
  const w = Number(width) || 10;
  return Math.max(40, Math.floor(w * 7.5 + 5));
}

/** Alto de fila Excel (puntos) → px. */
function rowHeightToPx(height) {
  const h = Number(height) || 15;
  return Math.max(20, Math.floor((h * 96) / 72));
}

/** Dimensiones naturales de una imagen desde ArrayBuffer. */
async function dimensionesImagenBuffer(buffer, extension) {
  try {
    const mime = extension === 'png' ? 'image/png' : 'image/jpeg';
    const blob = new Blob([buffer], { type: mime });
    if (typeof createImageBitmap === 'function') {
      const bmp = await createImageBitmap(blob);
      const dims = { width: bmp.width, height: bmp.height };
      bmp.close?.();
      return dims;
    }
    const url = URL.createObjectURL(blob);
    try {
      const dims = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () =>
          resolve({ width: el.naturalWidth || el.width, height: el.naturalHeight || el.height });
        el.onerror = reject;
        el.src = url;
      });
      return dims;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return { width: 800, height: 600 };
  }
}

/**
 * Escala tipo object-fit: contain y centra dentro de la celda (tl + ext en px).
 */
function layoutFotoEnCelda({ cellW, cellH, imgW, imgH, colIdx, rowIdx0 }) {
  const padX = cellW * FOTO_MARGEN;
  const padY = cellH * FOTO_MARGEN;
  const maxW = Math.max(20, cellW - padX * 2);
  const maxH = Math.max(20, cellH - padY * 2);

  const natW = Math.max(1, imgW || maxW);
  const natH = Math.max(1, imgH || maxH);
  const scale = Math.min(maxW / natW, maxH / natH);
  const drawW = Math.max(16, Math.round(natW * scale));
  const drawH = Math.max(16, Math.round(natH * scale));

  const offsetX = (cellW - drawW) / 2;
  const offsetY = (cellH - drawH) / 2;

  return {
    tl: {
      col: colIdx + offsetX / cellW,
      row: rowIdx0 + offsetY / cellH,
    },
    ext: { width: drawW, height: drawH },
  };
}

/** Embebe fotos centradas en Foto / Ref., escaladas para caber en la celda. */
async function insertarFotosEnColumna(workbook, hojaEval, itemsPorFila) {
  if (!hojaEval || !itemsPorFila?.size) return;

  const colFoto = hojaEval.getColumn(COL_FOTO);
  colFoto.width = Math.max(colFoto.width || 0, FOTO_COL_WIDTH);
  const cellW = colWidthToPx(colFoto.width);
  const colIdx = COL_FOTO - 1; // 0-based (columna I)

  for (const [row, item] of itemsPorFila.entries()) {
    if (!(item.fotoRuta || item.fotoPreview || item.fotoArchivoId)) continue;

    const img = await resolverBufferFotoFila(item);
    if (!img) continue;

    const dims = await dimensionesImagenBuffer(img.buffer, img.extension);
    const imageId = workbook.addImage({
      buffer: img.buffer,
      extension: img.extension,
    });

    setVal(hojaEval, row, COL_FOTO, null);

    const excelRow = hojaEval.getRow(row);
    excelRow.height = Math.max(excelRow.height || 0, FOTO_ROW_HEIGHT);
    const cellH = rowHeightToPx(excelRow.height);

    const cell = hojaEval.getCell(row, COL_FOTO);
    cell.alignment = { vertical: 'middle', horizontal: 'center' };

    const pos = layoutFotoEnCelda({
      cellW,
      cellH,
      imgW: dims.width,
      imgH: dims.height,
      colIdx,
      rowIdx0: row - 1,
    });

    hojaEval.addImage(imageId, {
      tl: pos.tl,
      ext: pos.ext,
      editAs: 'oneCell',
    });
  }
}
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

function detectarExtensionImagen(buffer) {
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50) return 'png';
  if (u8.length > 3 && u8[0] === 0xff && u8[1] === 0xd8) return 'jpeg';
  return null;
}

async function cargarLogoBuffer(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const extension = detectarExtensionImagen(buffer);
    if (!extension) return null;
    return { buffer, extension };
  } catch {
    return null;
  }
}

async function fetchImageBuffer(url) {
  if (!url) return null;
  try {
    // blob: no se puede fetch por CSP en algunos entornos → Image + canvas
    if (String(url).startsWith('blob:')) {
      return await bufferDesdeBlobUrl(url);
    }
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const extension = detectarExtensionImagen(buffer);
    if (!extension) return null;
    return { buffer, extension };
  } catch {
    return null;
  }
}

async function bufferDesdeBlobUrl(blobUrl) {
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = blobUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.88)
    );
    if (!blob) return null;
    return { buffer: await blob.arrayBuffer(), extension: 'jpeg' };
  } catch {
    return null;
  }
}

/** Resuelve bytes de foto de una fila NSR (ruta servidor, preview local, etc.). */
async function resolverBufferFotoFila(item) {
  if (!item) return null;

  if (item.fotoPreview && String(item.fotoPreview).startsWith('blob:')) {
    const fromBlob = await bufferDesdeBlobUrl(item.fotoPreview);
    if (fromBlob) return fromBlob;
  }
  if (item.fotoPreview && String(item.fotoPreview).startsWith('data:')) {
    try {
      const idx = item.fotoPreview.indexOf('base64,');
      const raw = idx !== -1 ? item.fotoPreview.slice(idx + 7) : '';
      if (raw) {
        const binary = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
        const extension = detectarExtensionImagen(binary) || 'jpeg';
        return { buffer: binary.buffer, extension };
      }
    } catch {
      /* continue */
    }
  }

  const ruta = item.fotoRuta || '';
  if (ruta) {
    const primary = urlDescargaArchivoSura(ruta);
    const candidatos = getUploadsUrlCandidates(ruta) || [];
    const urls = [...new Set([primary, ...candidatos].filter(Boolean))];
    for (const url of urls) {
      const img = await fetchImageBuffer(url);
      if (img) return img;
    }
  }

  return null;
}

/**
 * Cabecera con logos grandes visibles: Proser izq. | título | Sura der.
 * No desplaza filas de datos (mantiene fórmulas Portada → Evaluación).
 */
function prepararCabeceraConLogos(sheet, {
  tituloMerge = 'C1:H1',
  unmerge = 'A1:J1',
  colSura = 8.15,
  anchoProser = 220,
  altoProser = 70,
  anchoSura = 200,
  altoSura = 78,
  colTitulo = 3,
  colLogoDer = 9,
} = {}) {
  if (!sheet) return {};

  const cellA1 = sheet.getCell(1, 1);
  const tituloTexto = cellA1.value;
  const fill = cellA1.fill ? { ...cellA1.fill } : undefined;
  const font = cellA1.font ? { ...cellA1.font } : undefined;
  const alignment = cellA1.alignment ? { ...cellA1.alignment } : undefined;

  try {
    sheet.unMergeCells(unmerge);
  } catch {
    /* ya descombinado o rango distinto */
  }

  // Liberar celdas laterales para los logos
  sheet.getCell(1, 1).value = null;
  sheet.getCell(1, 2).value = null;
  if (colLogoDer) {
    sheet.getCell(1, colLogoDer).value = null;
    sheet.getCell(1, colLogoDer + 1).value = null;
  }

  try {
    sheet.mergeCells(tituloMerge);
  } catch {
    /* ok */
  }

  const tituloCell = sheet.getCell(1, colTitulo);
  if (tituloTexto != null && tituloTexto !== '') {
    tituloCell.value = tituloTexto;
  }
  tituloCell.alignment = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true,
    ...(alignment || {}),
  };
  if (font) {
    tituloCell.font = { ...font, bold: true, size: Math.max(font.size || 12, 12) };
  }
  if (fill) {
    tituloCell.fill = fill;
    // Mantener franja de color bajo los logos
    [1, 2, colLogoDer, colLogoDer ? colLogoDer + 1 : null]
      .filter(Boolean)
      .forEach((c) => {
        sheet.getCell(1, c).fill = fill;
      });
  }

  const row1 = sheet.getRow(1);
  row1.height = Math.max(row1.height || 0, 78);

  return { colSura, anchoProser, altoProser, anchoSura, altoSura };
}

function colocarLogosEnHoja(sheet, logoIds, layout) {
  if (!sheet || !logoIds) return;
  const {
    colSura = 8.15,
    anchoProser = 220,
    altoProser = 70,
    anchoSura = 200,
    altoSura = 78,
  } = layout || {};

  const row1 = sheet.getRow(1);
  if (!row1.height || row1.height < 72) row1.height = 78;

  if (logoIds.proserId != null) {
    sheet.addImage(logoIds.proserId, {
      tl: { col: 0.12, row: 0.08 },
      ext: { width: anchoProser, height: altoProser },
      editAs: 'oneCell',
    });
  }

  if (logoIds.suraId != null) {
    sheet.addImage(logoIds.suraId, {
      tl: { col: colSura, row: 0.05 },
      ext: { width: anchoSura, height: altoSura },
      editAs: 'oneCell',
    });
  }
}

async function registrarLogosSuraProser(workbook) {
  let proser = await cargarLogoBuffer(`${BASE_PUBLIC}templates/logo-grupoproser.png`);
  if (!proser) proser = await cargarLogoBuffer(`${BASE_PUBLIC}templates/logo-grupoproser.jpg`);
  const sura = await cargarLogoBuffer(`${BASE_PUBLIC}templates/logo-sura.png`);

  const logoIds = {};
  if (proser) {
    logoIds.proserId = workbook.addImage({
      buffer: proser.buffer,
      extension: proser.extension,
    });
  }
  if (sura) {
    logoIds.suraId = workbook.addImage({
      buffer: sura.buffer,
      extension: sura.extension,
    });
  }
  return logoIds;
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
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function setVal(sheet, row, col, value) {
  if (value === undefined) return;
  sheet.getCell(row, col).value = value === '' ? null : value;
}

/**
 * Rellena la plantilla oficial NSR-10 (Listas | Portada | Evaluación | Dictamen | Presupuesto)
 * con los datos del liquidador Sura.
 * @returns {{ hojaEval: object, itemsPorFila: Map<number, object> }}
 */
function rellenarPlantillaNsr10(workbook, liquidador) {
  const evalData = liquidador?.evaluacionSismicaNSR10 || {};
  const enc = liquidador?.encabezado || {};
  const portada = fusionarPortadaConFormData(evalData.portada || {}, {
    ...prefillNsrDesdeCasoSura({}, enc),
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
  const itemsPorFila = new Map();

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
    itemsPorFila.set(row, it);
    setVal(hojaEval, row, 5, txt(it.estado) || null);
    setVal(hojaEval, row, 8, txt(it.observacion) || null);
    // Texto temporal; si hay imagen se limpia al embeber
    setVal(
      hojaEval,
      row,
      COL_FOTO,
      txt(it.fotoRef) ||
        (it.fotoRuta || it.fotoArchivoId || it.fotoPreview
          ? descripcionFotoNsr(it)
          : null)
    );
    setVal(hojaEval, row, 10, txt(it.accionSugerida) || null);
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
      txt(it.codigoEvaluacion) ||
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
      setVal(hojaPres, row, 9, null);
      setVal(hojaPres, row, 10, null);
      setVal(hojaPres, row, 11, null);
      setVal(hojaPres, row, 12, null);
      continue;
    }
    setVal(hojaPres, row, 1, txt(it.capitulo) || null);
    setVal(hojaPres, row, 2, txt(it.codigoEvaluacion) || null);
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

  const aiu = Number(presupuesto.aiuPorcentaje ?? 0.05);
  const impr = Number(presupuesto.imprevistosPorcentaje ?? 0.1);
  const imp = Number(presupuesto.impuestosPorcentaje ?? 0);
  setVal(hojaPres, 41, 6, 'AIU');
  setVal(hojaPres, 41, 7, Number.isFinite(aiu) ? aiu : 0.05);
  setVal(hojaPres, 42, 6, 'Imprevistos');
  setVal(hojaPres, 42, 7, Number.isFinite(impr) ? impr : 0.1);
  setVal(hojaPres, 43, 6, 'Impuestos');
  setVal(hojaPres, 43, 7, Number.isFinite(imp) ? imp : 0);

  return { hojaEval, hojaPortada, hojaPres, itemsPorFila };
}

/**
 * Excel liquidador Sura = plantilla oficial Evaluación Sísmica NSR-10 rellenada.
 * Hojas: Listas | Portada | Evaluación | Dictamen | Presupuesto
 */
export async function generarWorkbookLiquidadorSuraNsr(liquidador) {
  const workbook = await cargarPlantillaNsr10();
  const { hojaEval, hojaPortada, hojaPres, itemsPorFila } = rellenarPlantillaNsr10(
    workbook,
    liquidador || {}
  );

  const logoIds = await registrarLogosSuraProser(workbook);

  const layoutEval = prepararCabeceraConLogos(hojaEval, {
    unmerge: 'A1:J1',
    tituloMerge: 'C1:H1',
    colTitulo: 3,
    colLogoDer: 9,
    colSura: 8.1,
    anchoProser: 230,
    altoProser: 72,
    anchoSura: 210,
    altoSura: 82,
  });
  colocarLogosEnHoja(hojaEval, logoIds, layoutEval);

  if (hojaPortada) {
    const row3 = hojaPortada.getRow(3);
    row3.height = Math.max(row3.height || 0, 72);
    if (logoIds.proserId != null) {
      hojaPortada.addImage(logoIds.proserId, {
        tl: { col: 0.1, row: 2.05 },
        ext: { width: 200, height: 64 },
        editAs: 'oneCell',
      });
    }
    if (logoIds.suraId != null) {
      hojaPortada.addImage(logoIds.suraId, {
        tl: { col: 2.4, row: 2.05 },
        ext: { width: 180, height: 70 },
        editAs: 'oneCell',
      });
    }
  }

  if (hojaPres) {
    const layoutPres = prepararCabeceraConLogos(hojaPres, {
      unmerge: 'A1:L1',
      tituloMerge: 'C1:J1',
      colTitulo: 3,
      colLogoDer: 11,
      colSura: 10.1,
      anchoProser: 220,
      altoProser: 70,
      anchoSura: 200,
      altoSura: 78,
    });
    colocarLogosEnHoja(hojaPres, logoIds, layoutPres);
  }

  await insertarFotosEnColumna(workbook, hojaEval, itemsPorFila);
  return workbook;
}

export async function generarLiquidadorSuraExcelBlob(liquidador) {
  const workbook = await generarWorkbookLiquidadorSuraNsr(liquidador);
  const enc = liquidador?.encabezado || {};
  const buffer = await workbook.xlsx.writeBuffer();
  const safe = String(enc.siniestro || enc.consecutivo || enc.poliza || 'NSR10')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 40);
  return {
    blob: new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename: `Evaluacion_Sismica_NSR10_Sura_${safe}.xlsx`,
  };
}

export async function descargarLiquidadorSuraExcel(liquidador, totales) {
  const { blob, filename } = await generarLiquidadorSuraExcelBlob(liquidador, totales);
  saveAs(blob, filename);
}
