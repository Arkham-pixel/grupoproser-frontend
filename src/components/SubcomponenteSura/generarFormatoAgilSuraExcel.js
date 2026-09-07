import { saveAs } from 'file-saver';
import { getUploadsUrlCandidates } from '../../config/apiConfig.js';
import { lineasPieMapaInforme } from '../../utils/mapaInformeAtribucion.js';
import { urlDescargaArchivoSura } from '../../services/segurosSuraService.js';
import { candidatosUrlArchivo } from '../../services/storageSignedUrl.js';
import { descripcionFotoNsr } from './syncFotosNsrAlInformeSura.js';
import { generarWorkbookLiquidadorSuraNsr, pintarResumenIndemnizacionSura } from './generarLiquidadorSuraExcel.js';
import {
  CAMPOS_INFORME_AGIL,
  defaultFotosAgilSura,
  defaultInformeAgilSura,
  defaultSalvamentoSura,
  enriquecerFotosConDescripcion,
  fotosNsrDesdeLiquidador,
  fusionarFotosArchiveroEnGaleria,
  valorCeldaInformeAgil,
} from './informeAgilSuraHelpers.js';
import { calcularLiquidacionSura, defaultInformeUnicoSura, mapCasoSuraALiquidador, presupuestoNsrTieneDatosSura } from './liquidadorSuraHelpers.js';
import { OCULTAR_EVALUACION_Y_DICTAMEN_NSR10 } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';

const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF0033A0' },
};
const HEADER_FONT = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
const LABEL_FONT = { name: 'Calibri', size: 10, bold: true };
const VALUE_FONT = { name: 'Calibri', size: 10 };
const THIN = { style: 'thin', color: { argb: 'FFB0B0B0' } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const ALINEACION_TEXTO = {
  vertical: 'middle',
  horizontal: 'center',
  wrapText: true,
};

function detectarExtensionImagen(buffer) {
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50) return 'png';
  if (u8.length > 3 && u8[0] === 0xff && u8[1] === 0xd8) return 'jpeg';
  return null;
}

async function fetchImageBuffer(url) {
  if (!url) return null;
  try {
    if (String(url).startsWith('blob:')) return await bufferDesdeBlobUrl(url);
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
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
    canvas.getContext('2d').drawImage(img, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return null;
    const buffer = await blob.arrayBuffer();
    return { buffer, extension: 'jpeg' };
  } catch {
    return null;
  }
}

async function resolverBufferFoto(item = {}, archivosCaso = []) {
  if (item.file && typeof item.file.arrayBuffer === 'function') {
    try {
      const buffer = await item.file.arrayBuffer();
      return { buffer, extension: 'jpeg' };
    } catch {
      /* continue */
    }
  }
  if (item.fotoPreview && String(item.fotoPreview).startsWith('blob:')) {
    const fromBlob = await bufferDesdeBlobUrl(item.fotoPreview);
    if (fromBlob) return fromBlob;
  }
  if (item.preview && String(item.preview).startsWith('blob:')) {
    const fromBlob = await bufferDesdeBlobUrl(item.preview);
    if (fromBlob) return fromBlob;
  }
  if (item.preview && String(item.preview).startsWith('data:')) {
    const fromData = bufferDesdeDataUrl(item.preview);
    if (fromData) return fromData;
  }

  let ruta = item.fotoRuta || item.ruta || '';
  if (!ruta && (item._id || item.archivoId)) {
    const arch = (archivosCaso || []).find(
      (a) => String(a._id) === String(item._id || item.archivoId)
    );
    if (arch?.ruta) ruta = arch.ruta;
  }
  if (!ruta) return null;
  const urls = await candidatosUrlArchivo(
    ruta,
    urlDescargaArchivoSura(ruta),
    ...(getUploadsUrlCandidates(ruta) || [])
  );
  for (const url of urls) {
    const img = await fetchImageBuffer(url);
    if (img) return img;
  }
  return null;
}

function estiloEncabezado(cell) {
  cell.fill = HEADER_FILL;
  cell.font = HEADER_FONT;
  cell.alignment = { ...ALINEACION_TEXTO };
}

function pxAnchoCol(width) {
  return Math.max(10, Number(width) || 10) * 7.5 + 5;
}

function pxAltoFila(height) {
  return Math.max(20, ((Number(height) || 15) * 96) / 72);
}

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
      return await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () =>
          resolve({ width: el.naturalWidth || el.width, height: el.naturalHeight || el.height });
        el.onerror = reject;
        el.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return { width: 4, height: 3 };
  }
}

/** Centra la foto en la celda sin estirarla (object-fit: contain). */
function layoutImagenEnCelda({ cellW, cellH, imgW, imgH, colIdx, rowIdx0 }) {
  const pad = 12;
  const maxW = Math.max(24, cellW - pad * 2);
  const maxH = Math.max(24, cellH - pad * 2);
  const natW = Math.max(1, imgW || maxW);
  const natH = Math.max(1, imgH || maxH);
  const scale = Math.min(maxW / natW, maxH / natH);
  const drawW = Math.max(24, Math.round(natW * scale));
  const drawH = Math.max(24, Math.round(natH * scale));
  return {
    tl: {
      col: colIdx + (cellW - drawW) / 2 / cellW,
      row: rowIdx0 + (cellH - drawH) / 2 / cellH,
    },
    ext: { width: drawW, height: drawH },
    editAs: 'oneCell',
  };
}

function colDesdeOffsetPx(sheet, colInicio1, offsetPx) {
  let rest = Math.max(0, Number(offsetPx) || 0);
  let c = colInicio1;
  for (let i = 0; i < 8; i += 1) {
    const w = pxAnchoCol(sheet.getColumn(c).width);
    if (rest <= w) return c - 1 + (w ? rest / w : 0);
    rest -= w;
    c += 1;
  }
  return c - 1;
}

function pintarRangoBordes(sheet, row, fromCol, toCol) {
  for (let c = fromCol; c <= toCol; c += 1) {
    const cell = sheet.getCell(row, c);
    cell.border = BORDER;
    cell.alignment = { ...ALINEACION_TEXTO };
  }
}

function pintarFilaLabelValor(sheet, row, num, label, valor) {
  sheet.getCell(row, 1).value = num;
  sheet.getCell(row, 1).font = LABEL_FONT;
  sheet.getCell(row, 2).value = label;
  sheet.getCell(row, 2).font = LABEL_FONT;
  sheet.getCell(row, 3).value = valor == null || valor === '' ? null : valor;
  sheet.getCell(row, 3).font = VALUE_FONT;
  pintarRangoBordes(sheet, row, 1, 3);
}

/** Alto de fila según el texto, para que Excel no recorte lo escrito. */
function estimarAltoFila(texto, anchoCol = 78, { min = 22, max = 360 } = {}) {
  const s = String(texto ?? '');
  if (!s.trim()) return min;
  const porLinea = Math.max(12, Number(anchoCol) || 78);
  const lineas = s.split(/\r?\n/).reduce((n, linea) => {
    const len = Array.from(linea).length || 1;
    return n + Math.max(1, Math.ceil(len / porLinea));
  }, 0);
  return Math.min(max, Math.max(min, 10 + lineas * 16));
}

function bufferDesdeDataUrl(dataUrl) {
  try {
    const raw = String(dataUrl || '');
    const idx = raw.indexOf('base64,');
    if (idx < 0) return null;
    const binary = Uint8Array.from(atob(raw.slice(idx + 7)), (c) => c.charCodeAt(0));
    const extension = detectarExtensionImagen(binary) || 'png';
    return { buffer: binary.buffer, extension };
  } catch {
    return null;
  }
}

function textoCoordenadasInforme(informe = {}, caso = {}) {
  const directo = String(informe.coordenadasRiesgo || '').trim();
  if (directo) return directo;
  const lat = caso?.ubicacionPredio?.lat;
  const lng = caso?.ubicacionPredio?.lng;
  if (lat != null && lng != null && lat !== '' && lng !== '') return `${lat}, ${lng}`;
  return '';
}

async function resolverBufferMapaInforme(informe = {}) {
  const im = informe?.imagenMapa;
  if (typeof im === 'string' && im.startsWith('data:')) return bufferDesdeDataUrl(im);
  if (typeof im === 'string' && (im.startsWith('blob:') || /^https?:/i.test(im))) {
    return fetchImageBuffer(im);
  }
  if (im && typeof im === 'object') {
    if (typeof im.preview === 'string' && im.preview.startsWith('data:')) {
      return bufferDesdeDataUrl(im.preview);
    }
    if (typeof im.preview === 'string' && (im.preview.startsWith('blob:') || /^https?:/i.test(im.preview))) {
      return fetchImageBuffer(im.preview);
    }
    const ruta = im.ruta || im.fotoRuta || '';
    if (ruta) {
      const urls = await candidatosUrlArchivo(
        ruta,
        urlDescargaArchivoSura(ruta),
        ...(getUploadsUrlCandidates(ruta) || [])
      );
      for (const url of urls) {
        const img = await fetchImageBuffer(url);
        if (img) return img;
      }
    }
  }
  return null;
}

function rellenarInformeAgil(sheet, informe) {
  sheet.name = 'InformeAgil';
  sheet.getColumn(1).width = 6;
  sheet.getColumn(2).width = 42;
  sheet.getColumn(3).width = 78;
  sheet.mergeCells(1, 1, 1, 3);
  estiloEncabezado(sheet.getCell(1, 1));
  sheet.getCell(1, 1).value = 'INFORME AGIL';
  sheet.getRow(1).height = 26;
  sheet.mergeCells(2, 2, 2, 3);
  estiloEncabezado(sheet.getCell(2, 1));
  estiloEncabezado(sheet.getCell(2, 2));
  sheet.getCell(2, 2).value = 'DATOS BÁSICOS DE LA PÓLIZA Y DEL EVENTO';
  sheet.getRow(2).height = 22;
  CAMPOS_INFORME_AGIL.forEach((campo) => {
    const valor = valorCeldaInformeAgil(campo, informe);
    pintarFilaLabelValor(sheet, campo.row, campo.row - 2, campo.label, valor);
    const min = campo.tipo === 'textarea' || campo.key === 'solicitudDocumentos' ? 40 : 24;
    sheet.getRow(campo.row).height = estimarAltoFila(valor, 72, { min, max: 320 });
  });
}

function leyendaFotoExcel(item = {}, indice = 1, mapaDesc = null) {
  const id = item?._id || item?.archivoId;
  const ruta = item?.ruta || item?.fotoRuta || '';
  const desdeGaleria =
    (id && mapaDesc?.byId?.get(String(id))) ||
    (ruta && mapaDesc?.byRuta?.get(String(ruta))) ||
    '';
  const desc = String(
    desdeGaleria ||
      item.descripcion ||
      item.leyenda ||
      item.caption ||
      item.comentario ||
      ''
  ).trim();
  if (desc) return desc;
  if (item.origen === 'liquidador-nsr10' || item.codigo || item.elemento) {
    const nsr = descripcionFotoNsr(item);
    if (nsr && nsr !== 'Foto evaluación NSR-10') return nsr;
  }
  const nombre = String(item.nombreOriginal || item.nombre || '').trim();
  return nombre || `Foto ${indice}`;
}

function mapaDescripcionesFotosExcel(fotos = []) {
  const byId = new Map();
  const byRuta = new Map();
  for (const f of Array.isArray(fotos) ? fotos : []) {
    const desc = String(f?.descripcion || '').trim();
    if (!desc) continue;
    if (f?._id) byId.set(String(f._id), desc);
    if (f?.archivoId) byId.set(String(f.archivoId), desc);
    if (f?.ruta) byRuta.set(String(f.ruta), desc);
    if (f?.fotoRuta) byRuta.set(String(f.fotoRuta), desc);
  }
  return { byId, byRuta };
}

function listaFotosParaExcel(fotosAgil, liquidador, caso) {
  const propias = Array.isArray(fotosAgil)
    ? fotosAgil.filter((f) => f?.ruta || f?.fotoRuta || f?.preview || f?.fotoPreview || f?._id || f?.file)
    : [];
  const lista = propias.length ? propias : fotosNsrDesdeLiquidador(liquidador);
  const mezcladas = enriquecerFotosConDescripcion(
    fusionarFotosArchiveroEnGaleria(lista, caso?.archivos),
    caso
  );
  // Preferir rutas persistidas para que Excel no se quede en previews rotos
  return [...mezcladas].sort((a, b) => {
    const score = (f) => ((f?.ruta || f?.fotoRuta) ? 2 : f?._id ? 1 : 0);
    return score(b) - score(a);
  });
}

async function rellenarFotos(workbook, sheet, fotos = [], archivosCaso = []) {
  sheet.name = 'FOTOS';
  sheet.getColumn(1).width = 40;
  sheet.getColumn(2).width = 40;
  estiloEncabezado(sheet.getCell(1, 1));
  sheet.mergeCells(1, 1, 1, 2);
  sheet.getCell(1, 1).value = 'FOTOS';
  sheet.getRow(1).height = 26;
  if (!fotos.length) {
    sheet.getCell(3, 1).value = 'No hay fotos cargadas en la sección Fotos.';
    sheet.getCell(3, 1).alignment = { ...ALINEACION_TEXTO };
    return;
  }
  const mapaDesc = mapaDescripcionesFotosExcel(fotos);
  const buffers = await Promise.all(
    fotos.map((item) => resolverBufferFoto(item, archivosCaso))
  );
  const cellW = pxAnchoCol(40);
  let row = 3;
  for (let i = 0; i < fotos.length; i += 2) {
    const par = [fotos[i], fotos[i + 1]].filter(Boolean);
    const filaFoto = row;
    const filaLeyenda = row + 1;
    sheet.getRow(filaFoto).height = 190;
    sheet.getRow(filaLeyenda).height = 36;
    sheet.getRow(row + 2).height = 8;
    const cellH = pxAltoFila(190);
    for (let c = 0; c < par.length; c += 1) {
      const item = par[c];
      const nro = i + c + 1;
      const fotoCell = sheet.getCell(filaFoto, c + 1);
      fotoCell.border = BORDER;
      fotoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      fotoCell.alignment = { vertical: 'middle', horizontal: 'center' };
      const cap = sheet.getCell(filaLeyenda, c + 1);
      cap.value = `${nro}. ${leyendaFotoExcel(item, nro, mapaDesc)}`;
      cap.font = { name: 'Calibri', size: 10, bold: true };
      cap.alignment = { ...ALINEACION_TEXTO };
      cap.border = BORDER;
      cap.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      const img = buffers[i + c];
      if (!img) continue;
      const dims = await dimensionesImagenBuffer(img.buffer, img.extension);
      const imageId = workbook.addImage({
        buffer: img.buffer,
        extension: img.extension,
      });
      sheet.addImage(imageId, layoutImagenEnCelda({
        cellW,
        cellH,
        imgW: dims.width,
        imgH: dims.height,
        colIdx: c,
        rowIdx0: filaFoto - 1,
      }));
    }
    row += 3;
  }
}

function pintarBloqueInformeUnico(sheet, row, label, valor, { mergeHasta = 5, anchoTexto = 90 } = {}) {
  sheet.getCell(row, 1).value = label;
  sheet.getCell(row, 1).font = LABEL_FONT;
  if (mergeHasta > 2) {
    try {
      sheet.mergeCells(row, 2, row, mergeHasta);
    } catch {
      /* ya combinado */
    }
  }
  const valorCell = sheet.getCell(row, 2);
  valorCell.value = valor || '';
  valorCell.font = VALUE_FONT;
  pintarRangoBordes(sheet, row, 1, mergeHasta);
  sheet.getRow(row).height = estimarAltoFila(valor, anchoTexto, { min: 24, max: 380 });
}

function pintarFilaMapaRiesgo(workbook, sheet, fila, mapa) {
  sheet.getCell(fila, 1).value = 'Mapa del riesgo';
  sheet.getCell(fila, 1).font = LABEL_FONT;
  try {
    sheet.mergeCells(fila, 2, fila, 5);
  } catch {
    /* ok */
  }
  pintarRangoBordes(sheet, fila, 1, 5);

  if (!mapa) {
    sheet.getCell(fila, 2).value =
      'Sin captura de mapa. Use «Actualizar captura» en el informe único.';
    sheet.getCell(fila, 2).font = VALUE_FONT;
    sheet.getRow(fila).height = 40;
    return;
  }

  const imageId = workbook.addImage({
    buffer: mapa.buffer,
    extension: mapa.extension,
  });
  const altoPts = 152;
  sheet.getRow(fila).height = altoPts;
  const cellW =
    pxAnchoCol(sheet.getColumn(2).width) +
    pxAnchoCol(sheet.getColumn(3).width) +
    pxAnchoCol(sheet.getColumn(4).width) +
    pxAnchoCol(sheet.getColumn(5).width);
  const cellH = (altoPts * 96) / 72;
  const pad = 10;
  const maxW = Math.max(80, cellW - pad * 2);
  const maxH = Math.max(60, cellH - pad * 2);
  const aspect = 16 / 9;
  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  const x0 = pad + (maxW - w) / 2;
  const y0 = pad + (maxH - h) / 2;
  sheet.addImage(imageId, {
    tl: { col: colDesdeOffsetPx(sheet, 2, x0), row: fila - 1 + y0 / cellH },
    br: { col: colDesdeOffsetPx(sheet, 2, x0 + w), row: fila - 1 + (y0 + h) / cellH },
    editAs: 'twoCell',
  });
}

async function rellenarDocumentos(workbook, sheet, informe, caso, { nombreHoja = 'DOCUMENTOS' } = {}) {
  sheet.name = nombreHoja;
  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 36;
  sheet.getColumn(3).width = 24;
  sheet.getColumn(4).width = 24;
  sheet.getColumn(5).width = 24;
  estiloEncabezado(sheet.getCell(1, 1));
  sheet.mergeCells(1, 1, 1, 5);
  sheet.getCell(1, 1).value = 'INFORME ÚNICO';
  sheet.getRow(1).height = 28;

  const coords = textoCoordenadasInforme(informe, caso);
  const bloquesAntes = [
    ['Ajustador', informe.ajustadorNombre || caso?.ajustador || ''],
    ['Fecha informe', informe.fechaInforme || ''],
  ];
  bloquesAntes.forEach(([label, valor], idx) => {
    pintarBloqueInformeUnico(sheet, idx + 3, label, valor, { anchoTexto: 96 });
  });

  const mapa = await resolverBufferMapaInforme(informe);
  pintarFilaMapaRiesgo(workbook, sheet, 5, mapa);

  const pieMapa = lineasPieMapaInforme({
    direccion: informe.direccionRiesgo || caso?.direccionPredio || '',
    coordenadas: coords,
  });
  pieMapa.forEach((linea, idx) => {
    const esFuente = /Fuente del mapa|© Google/i.test(linea);
    pintarBloqueInformeUnico(
      sheet,
      6 + idx,
      esFuente ? 'Fuente del mapa' : linea.includes('Dirección') ? 'Dirección geográfica' : 'Ubicación',
      linea.replace(/^[^:]+:\s*/, ''),
      { anchoTexto: 96 }
    );
  });

  const filaBase = 6 + pieMapa.length;
  const bloquesDespues = [
    ['Información del evento', informe.infoEvento || ''],
    ['Descripción de daños', informe.descripcionDanios || ''],
    ['Análisis de cobertura', informe.analisisCobertura || ''],
    ['Conclusiones', informe.conclusiones || ''],
    ['Recomendación', informe.recomendacion || ''],
  ];
  bloquesDespues.forEach(([label, valor], idx) => {
    pintarBloqueInformeUnico(sheet, filaBase + idx, label, valor, { anchoTexto: 96 });
  });
}

function rellenarSalvamento(sheet, salvamento) {
  sheet.name = 'SALVAMENTO';
  sheet.getColumn(1).width = 5;
  sheet.getColumn(2).width = 42;
  sheet.getColumn(3).width = 60;
  estiloEncabezado(sheet.getCell(1, 1));
  sheet.mergeCells(1, 1, 1, 3);
  sheet.getCell(1, 1).value = 'SALVAMENTO';
  const aplica = salvamento?.aplica === 'aplica';
  const filas = [
    [1, 'Descripción', aplica ? salvamento.descripcion : 'No aplica'],
    [2, 'Cantidad', aplica ? salvamento.cantidad : ''],
    [3, 'Peso aproximado', aplica ? salvamento.pesoAproximado : ''],
    [4, 'Fotos', aplica ? String((salvamento.fotos || []).length || 0) : ''],
    [5, 'Ubicación física', aplica ? salvamento.ubicacionFisica : ''],
    [6, 'Contacto para la recolección', aplica ? salvamento.contactoRecoleccion : ''],
    [7, 'Asegurado oferta por el salvamento?', aplica ? salvamento.aseguradoOferta : ''],
    [8, 'El salvamento requiere nacionalización?', aplica ? salvamento.requiereNacionalizacion : ''],
    [9, 'Condiciones especiales', aplica ? salvamento.condicionesEspeciales : ''],
  ];
  filas.forEach(([num, label, valor], idx) => {
    pintarFilaLabelValor(sheet, idx + 3, num, label, valor);
    sheet.getRow(idx + 3).height = estimarAltoFila(valor, 58, { min: 24, max: 160 });
  });
}

function anexarResumenIndemnizacion(hojaPres, totales) {
  pintarResumenIndemnizacionSura(hojaPres, totales);
}

function ordenarHojasFormatoAgil(workbook) {
  const orden = OCULTAR_EVALUACION_Y_DICTAMEN_NSR10
    ? ['InformeAgil', 'Presupuesto', 'FOTOS', 'DOCUMENTOS', 'SALVAMENTO']
    : [
        'InformeAgil',
        'Evaluación',
        'Dictamen',
        'Presupuesto',
        'FOTOS',
        'DOCUMENTOS',
        'SALVAMENTO',
      ];
  orden.forEach((nombre, i) => {
    const ws = workbook.getWorksheet(nombre);
    if (ws) {
      ws.state = 'visible';
      ws.orderNo = i + 1;
    }
  });
  const ocultas = OCULTAR_EVALUACION_Y_DICTAMEN_NSR10
    ? ['Evaluación', 'Dictamen', 'Portada', 'Listas']
    : ['Portada', 'Listas'];
  ocultas.forEach((nombre, i) => {
    const ws = workbook.getWorksheet(nombre);
    if (ws) {
      ws.state = 'hidden';
      ws.orderNo = orden.length + 1 + i;
    }
  });
}

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function generarWorkbookFormatoAgilSura({
  casoSura = {},
  informeAgil = null,
  liquidador = null,
  totales = null,
  informeUnico = null,
  salvamento = null,
  fotosAgil = null,
} = {}) {
  const liq = liquidador || mapCasoSuraALiquidador(casoSura);
  const tot = totales || calcularLiquidacionSura(liq);
  const agil =
    informeAgil ||
    defaultInformeAgilSura({ caso: casoSura, liquidador: liq, totales: tot, salvamento });
  const informe = informeUnico || defaultInformeUnicoSura(casoSura);
  const sal = salvamento || defaultSalvamentoSura(casoSura);
  const fotos = listaFotosParaExcel(
    fotosAgil ?? defaultFotosAgilSura(casoSura, liq),
    liq,
    casoSura
  );

  const workbook = await generarWorkbookLiquidadorSuraNsr(liq);
  workbook.creator = 'Grupo Proser';
  workbook.created = new Date();

  rellenarInformeAgil(workbook.addWorksheet('InformeAgil'), agil);
  const hojaPresupuesto = workbook.getWorksheet('Presupuesto');
  if (presupuestoNsrTieneDatosSura(liq) && hojaPresupuesto) {
    anexarResumenIndemnizacion(hojaPresupuesto, tot);
  }
  await rellenarFotos(
    workbook,
    workbook.addWorksheet('FOTOS'),
    fotos,
    casoSura?.archivos || []
  );
  await rellenarDocumentos(workbook, workbook.addWorksheet('DOCUMENTOS'), informe, casoSura);
  rellenarSalvamento(workbook.addWorksheet('SALVAMENTO'), sal);
  ordenarHojasFormatoAgil(workbook);
  if (!presupuestoNsrTieneDatosSura(liq)) {
    ['Presupuesto', 'Evaluación', 'Dictamen'].forEach((nombre) => {
      const ws = workbook.getWorksheet(nombre);
      if (ws) ws.state = 'hidden';
    });
  }
  return workbook;
}

export async function descargarFormatoAgilSuraExcel({
  casoSura = {},
  informeAgil = null,
  liquidador = null,
  totales = null,
  informeUnico = null,
  salvamento = null,
  fotosAgil = null,
} = {}) {
  const workbook = await generarWorkbookFormatoAgilSura({
    casoSura,
    informeAgil,
    liquidador,
    totales,
    informeUnico,
    salvamento,
    fotosAgil,
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: MIME_XLSX });
  const nro = casoSura.siniestro || casoSura.consecutivo || 'SURA';
  saveAs(blob, `Formato_Agil_SURA_${String(nro).replace(/[^\w.-]+/g, '_')}.xlsx`);
  return { blob };
}

/** Excel del informe único: liquidador, fotos, documentos, ágil y salvamento. */
export async function descargarInformeUnicoSuraExcel({
  caso = {},
  informe = null,
  liquidador = null,
  fotosAgil = null,
  informeAgil = null,
  salvamento = null,
  totales = null,
} = {}) {
  const workbook = await generarWorkbookFormatoAgilSura({
    casoSura: caso,
    informeAgil,
    liquidador,
    totales,
    informeUnico: informe,
    salvamento,
    fotosAgil,
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: MIME_XLSX });
  const nro = caso.siniestro || caso.consecutivo || 'caso';
  const nombre = `Informe_Unico_Sura_${String(nro).replace(/[^\w.-]+/g, '_')}.xlsx`;
  saveAs(blob, nombre);
  return { blob, nombre, filename: nombre };
}
