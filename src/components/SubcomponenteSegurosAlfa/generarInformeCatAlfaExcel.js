import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getUploadsUrlCandidates } from '../../config/apiConfig.js';
import { urlDescargaArchivoAlfa } from '../../services/segurosAlfaService.js';
import {
  calcularLiquidacionAlfa,
  defaultInformeUnicoAlfa,
  mapCasoAlfaALiquidador,
  parsearNumero,
  SMMLV_POR_ANIO,
  resolverMontoIndemnizarAlfa,
  sumarOtrosAmparosAlfa,
  textoResumenOtrosAmparosAlfa,
} from './liquidadorAlfaHelpers.js';
import { fotosInformeDesdeCaso } from '../fotosInformeUnicoHelpers.js';

const PLANTILLA_URL = `${import.meta.env.BASE_URL || '/'}templates/Informe_CAT_Seguros_Alfa.xlsx`;
const LOGO_ALFA_URL = `${import.meta.env.BASE_URL || '/'}templates/logo-seguros-alfa.png`;
/** Anchos iguales C–F en ANÁLISIS GENERAL (plantilla trae C≈99). */
const COL_ANEXOS_W = 28;
/** Aprox. px por unidad de ancho de columna Excel (Calibri). */
const PX_POR_COL_W = 7;

/** Filas de ítems en hoja LIQUIDADOR (plantilla: 16–24 = 9 slots). Se insertan filas si hay más. */
const ITEM_FIRST_ROW = 16;
const ITEM_LAST_ROW = 24;

export const INDICADORES_FRAUDE_ALFA = [
  {
    key: 'docAlteradaOcurrencia',
    label: 'Documentación alterada o sospechosa sobre la ocurrencia',
    defaultNivel: 'BAJO',
    defaultValor: 'X',
  },
  {
    key: 'exageracionMontos',
    label: 'Exageración del 20% de los montos reclamados',
    defaultNivel: 'BAJO',
    defaultValor: 'X',
  },
  {
    key: 'siniestroFinInicioPoliza',
    label:
      'Siniestro ocurre 30 días antes del fin de la póliza o posterior al inicio',
    defaultNivel: 'BAJO',
    defaultValor: 'X',
  },
  {
    key: 'faltaMantenimiento',
    label:
      'Los daños se presumen por falta de mantenimiento, vicio previo que no tiene relación con los hechos',
    defaultNivel: 'BAJO',
    defaultValor: 'X',
  },
  {
    key: 'destruccionAntesReporte',
    label:
      'Existió destrucción de los bienes reclamados antes del reporte del siniestro',
    defaultNivel: 'BAJO',
    defaultValor: 'N/A',
  },
  {
    key: 'docAlteradaCosto',
    label:
      'Se evidencia documentación alterada o sospechosa del costo de los bienes a reclamar',
    defaultNivel: 'BAJO',
    defaultValor: 'X',
  },
  {
    key: 'hurtoBienesInusuales',
    label:
      'Si es hurto, los bienes sustraídos son de gran tamaño o inusuales para un robo',
    defaultNivel: 'BAJO',
    defaultValor: 'N/A',
  },
  {
    key: 'rcInteresResponsabilidad',
    label:
      'Si es RC el asegurado tiene un interés particular en aceptar su responsabilidad',
    defaultNivel: 'BAJO',
    defaultValor: 'N/A',
  },
  {
    key: 'intuyeFraude',
    label: 'Usted intuye o evidencia indicadores de fraude en este siniestro',
    defaultNivel: 'BAJO',
    defaultValor: 'NO',
  },
];

export function defaultAnalisisGeneralAlfa(caso = {}, informe = {}) {
  const guardado =
    informe?.analisisGeneral && typeof informe.analisisGeneral === 'object'
      ? informe.analisisGeneral
      : {};
  const ubicacion =
    [caso.direccionPredio, caso.ciudad, caso.departamento].filter(Boolean).join(', ') ||
    informe.direccionRiesgo ||
    '';
  const indicadores = {};
  INDICADORES_FRAUDE_ALFA.forEach((ind) => {
    const prev = guardado.indicadoresFraude?.[ind.key];
    indicadores[ind.key] = {
      nivel: prev?.nivel || ind.defaultNivel,
      valor: prev?.valor != null ? prev.valor : ind.defaultValor,
    };
  });
  return {
    ubicacionEvento: guardado.ubicacionEvento || ubicacion,
    coaseguro: guardado.coaseguro || 'N/A',
    descripcionEvento:
      guardado.descripcionEvento ||
      informe.infoEvento ||
      informe.descripcionDanios ||
      '',
    causaEvento: guardado.causaEvento || caso.cobertura || '',
    fechaAsignacion: guardado.fechaAsignacion || fechaInputSafe(caso.fechaAsignacion || caso.fechaInspeccion),
    fechaUltimoDocumento:
      guardado.fechaUltimoDocumento || fechaInputSafe(caso.fechaUltimoDocumento),
    aplicacionExclusiones: guardado.aplicacionExclusiones || 'No aplica',
    cumplimientoGarantias: guardado.cumplimientoGarantias || 'Cumple',
    salvamento: guardado.salvamento || 'No aplica',
    indicadoresFraude: indicadores,
    posibilidadRecobro: guardado.posibilidadRecobro || 'No aplica',
    observaciones:
      guardado.observaciones ||
      [informe.conclusiones, informe.recomendacion].filter(Boolean).join('\n\n') ||
      '',
  };
}

function fechaInputSafe(value) {
  if (!value) return '';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '';
  }
}

function txt(v) {
  if (v == null) return '';
  return String(v).trim();
}

const MESES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Pie de aceptación + autorización bancaria (fila D36 del LIQUIDADOR). */
function textoAceptacionBancariaAlfa(datos = {}, opts = {}) {
  const ciudad = txt(datos.ciudadFirma) || txt(opts.ciudad) || '________________________';
  const fecha =
    opts.fecha instanceof Date && !Number.isNaN(opts.fecha.getTime())
      ? opts.fecha
      : fechaCelda(opts.fecha) || new Date();
  const dia = String(fecha.getDate());
  const mes = MESES_ES[fecha.getMonth()] || '____________________';
  const anio = String(fecha.getFullYear());
  const tipo = String(datos.tipoCuenta || '').toUpperCase();
  const marcaAhorros = tipo.includes('AHORRO') ? 'X' : '  ';
  const marcaCorriente = tipo.includes('CORRIENTE') ? 'X' : '  ';
  const cuenta = txt(datos.numeroCuenta) || '________________________';
  const banco = txt(datos.banco) || '__________________';
  const sucursal = txt(datos.sucursal) || '________________________';

  return (
    `En aceptación de lo anterior, firmamos el presente documento en la ciudad de ${ciudad}, ` +
    `a los ${dia} días del mes de ${mes} de ${anio}. ` +
    `Por último autorizamos para que se sirvan consignar o efectuar transferencia a nuestra cuenta de ` +
    `AHORROS( ${marcaAhorros} ) CORRIENTE ( ${marcaCorriente} ) ` +
    `No.${cuenta} del Banco ${banco} Sucursal ${sucursal}`
  );
}

function setVal(sheet, row, col, value) {
  if (value === undefined) return;
  sheet.getCell(row, col).value = value === '' ? null : value;
}

/** Quita merges que intersecten el rango (ExcelJS). */
function unmergeRangoSeguro(sheet, r1, c1, r2, c2) {
  try {
    sheet.unMergeCells(r1, c1, r2, c2);
  } catch {
    /* ok */
  }
  // Por si quedó un merge de una sola fila
  for (let r = r1; r <= r2; r += 1) {
    try {
      sheet.unMergeCells(r, c1, r, c2);
    } catch {
      /* ok */
    }
  }
}

/**
 * Pie del liquidador: un solo texto en D…O (sin repetición por columna).
 * La plantilla usa merges D:O; al insertar filas se rompen y Excel muestra el valor en cada celda.
 */
function escribirBloquePieCombinado(sheet, rowStart, rowEnd, value, opts = {}) {
  const c1 = opts.colStart || 4; // D
  const c2 = opts.colEnd || 15; // O
  const r1 = rowStart;
  const r2 = Math.max(rowStart, rowEnd);

  unmergeRangoSeguro(sheet, r1, c1, r2, c2);

  for (let r = r1; r <= r2; r += 1) {
    for (let c = c1; c <= c2; c += 1) {
      const cell = sheet.getCell(r, c);
      cell.value = null;
      try {
        if (cell.formula) cell.formula = undefined;
      } catch {
        /* ok */
      }
    }
  }

  const master = sheet.getCell(r1, c1);
  master.value = value == null || value === '' ? null : value;
  master.alignment = {
    wrapText: true,
    vertical: opts.vertical || 'top',
    horizontal: opts.horizontal || 'left',
    ...(opts.alignment || {}),
  };
  if (opts.font) {
    master.font = { ...(master.font || {}), ...opts.font };
  }

  try {
    sheet.mergeCells(r1, c1, r2, c2);
  } catch {
    try {
      unmergeRangoSeguro(sheet, r1, c1, r2, c2);
      sheet.mergeCells(r1, c1, r2, c2);
    } catch {
      /* si no se puede combinar, al menos queda solo en D */
    }
  }

  if (opts.height != null) {
    const rows = r2 - r1 + 1;
    const per = Math.max(18, Number(opts.height) / rows);
    for (let r = r1; r <= r2; r += 1) {
      sheet.getRow(r).height = Math.max(sheet.getRow(r).height || 0, per);
    }
  }
}

/** Reaplica merges del pie según plantilla (filas 30–38) + desplazamiento por ítems extra. */
function repararPieLiquidadorMerges(sheet, rowShift, textos = {}) {
  const s = Number(rowShift) || 0;
  // Observación: plantilla D30:O31
  escribirBloquePieCombinado(sheet, 30 + s, 31 + s, textos.observacion ?? 'OBSERVACIÓN:', {
    height: 48,
    vertical: 'top',
  });
  // Declaración paz y salvo: plantilla D33:O33 (conservar texto plantilla si no viene override)
  if (textos.declaracion != null) {
    escribirBloquePieCombinado(sheet, 33 + s, 33 + s, textos.declaracion, {
      height: 52,
      vertical: 'middle',
    });
  } else {
    const raw = sheet.getCell(33 + s, 4).value;
    const txtDecl =
      typeof raw === 'object' && raw
        ? raw.text ||
          (Array.isArray(raw.richText) ? raw.richText.map((p) => p.text || '').join('') : '') ||
          String(raw.result || '')
        : String(raw || '');
    escribirBloquePieCombinado(
      sheet,
      33 + s,
      33 + s,
      txtDecl ||
        'Una vez realizado el pago anteriormente solicitado declaramos a COMPAÑÍA., a paz y salvo por cualquier concepto relacionado con la reclamación del presente siniestro.',
      { height: 52, vertical: 'middle' }
    );
  }
  escribirBloquePieCombinado(sheet, 34 + s, 34 + s, textos.aceptacion ?? '', {
    height: 26,
    vertical: 'middle',
    horizontal: 'center',
  });
  escribirBloquePieCombinado(sheet, 36 + s, 36 + s, textos.banco ?? '', {
    height: 72,
    vertical: 'top',
  });
  // D37:O37 suele ser separador / espacio firma
  escribirBloquePieCombinado(sheet, 37 + s, 37 + s, null, { height: 15 });
  escribirBloquePieCombinado(sheet, 38 + s, 38 + s, textos.firma ?? '', {
    height: 90,
    vertical: 'bottom',
  });
}

/** Copia formato de una fila de ítem (para filas insertadas). */
function copyItemRowFormat(sheet, fromRow, toRow) {
  const src = sheet.getRow(fromRow);
  const dst = sheet.getRow(toRow);
  dst.height = Math.max(Number(src.height) || 0, 22);
  for (let c = 4; c <= 15; c += 1) {
    const sc = src.getCell(c);
    const dc = dst.getCell(c);
    try {
      if (sc.style) dc.style = structuredClone(sc.style);
    } catch {
      if (sc.font) dc.font = { ...sc.font };
      if (sc.alignment) dc.alignment = { ...sc.alignment };
      if (sc.border) dc.border = sc.border;
      if (sc.fill) dc.fill = sc.fill;
      if (sc.numFmt) dc.numFmt = sc.numFmt;
    }
    dc.alignment = {
      ...(dc.alignment || {}),
      wrapText: true,
      vertical: 'middle',
    };
  }
}

/**
 * Si hay más ítems que slots de plantilla (16–24), duplica filas (con alto/estilo)
 * y desplaza el bloque inferior. Devuelve última fila de ítems y el shift.
 */
function ensureItemRowsCapacity(sheet, needed) {
  const capacity = ITEM_LAST_ROW - ITEM_FIRST_ROW + 1;
  const forceItemHeights = (from, to) => {
    for (let r = from; r <= to; r += 1) {
      const row = sheet.getRow(r);
      row.height = Math.max(Number(row.height) || 0, 22);
    }
  };

  if (needed <= capacity) {
    forceItemHeights(ITEM_FIRST_ROW, ITEM_LAST_ROW);
    return { lastItemRow: ITEM_LAST_ROW, rowShift: 0 };
  }

  const extra = needed - capacity;
  // duplicateRow conserva alto/estilo mejor que spliceRows([]) vacío
  if (typeof sheet.duplicateRow === 'function') {
    sheet.duplicateRow(ITEM_LAST_ROW, extra, true);
  } else {
    sheet.spliceRows(
      ITEM_LAST_ROW + 1,
      0,
      ...Array.from({ length: extra }, () => [])
    );
    for (let i = 1; i <= extra; i += 1) {
      copyItemRowFormat(sheet, ITEM_LAST_ROW, ITEM_LAST_ROW + i);
    }
  }

  const lastItemRow = ITEM_LAST_ROW + extra;
  // Limpiar valores clonados; se rellenan después
  for (let r = ITEM_LAST_ROW + 1; r <= lastItemRow; r += 1) {
    copyItemRowFormat(sheet, ITEM_LAST_ROW, r);
    for (let c = 4; c <= 15; c += 1) {
      sheet.getCell(r, c).value = null;
    }
  }
  forceItemHeights(ITEM_FIRST_ROW, lastItemRow);
  return { lastItemRow, rowShift: extra };
}

function fechaCelda(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
    }
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

function anioDeFecha(value) {
  const d = fechaCelda(value);
  return d ? d.getFullYear() : null;
}

function detectarExtensionImagen(buffer) {
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (u8.length > 8 && u8[0] === 0x89 && u8[1] === 0x50) return 'png';
  if (u8.length > 3 && u8[0] === 0xff && u8[1] === 0xd8) return 'jpeg';
  return null;
}

function aUint8(buffer) {
  if (!buffer) return null;
  if (buffer instanceof Uint8Array) return buffer;
  if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);
  if (ArrayBuffer.isView(buffer)) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  return null;
}

function dataUrlABuffer(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  try {
    const idx = dataUrl.indexOf('base64,');
    const raw = idx !== -1 ? dataUrl.slice(idx + 7) : '';
    if (!raw) return null;
    const binary = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    return {
      buffer: binary,
      extension: detectarExtensionImagen(binary) || (dataUrl.includes('image/png') ? 'png' : 'jpeg'),
    };
  } catch {
    return null;
  }
}

function extraerLatLng(texto) {
  const parts = String(texto || '')
    .split(',')
    .map((c) => parseFloat(String(c).trim()));
  if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return { lat: parts[0], lng: parts[1] };
  }
  return null;
}

/** Genera captura satélite vía Static Maps (misma lógica que MapaGoogleEarth). */
async function capturarMapaEstaticoBuffer(lat, lng, apiKey) {
  if (!apiKey || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: '18',
    size: '640x480',
    maptype: 'satellite',
    scale: '2',
    markers: `color:red|${lat},${lng}`,
    key: apiKey,
  });
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`
    );
    if (!res.ok) return null;
    const buffer = aUint8(await res.arrayBuffer());
    if (!buffer) return null;
    return {
      buffer,
      extension: detectarExtensionImagen(buffer) || 'png',
    };
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
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (!blob) return null;
    return { buffer: aUint8(await blob.arrayBuffer()), extension: 'jpeg' };
  } catch {
    return null;
  }
}

async function fetchImageBuffer(url) {
  if (!url) return null;
  try {
    if (String(url).startsWith('blob:')) return bufferDesdeBlobUrl(url);
    if (String(url).startsWith('data:')) return dataUrlABuffer(url);
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return null;
    const buffer = aUint8(await res.arrayBuffer());
    if (!buffer) return null;
    const extension = detectarExtensionImagen(buffer);
    if (!extension) return null;
    return { buffer, extension };
  } catch {
    return null;
  }
}

async function resolverBufferFoto(foto) {
  if (!foto) return null;
  if (typeof foto === 'string') {
    if (foto.startsWith('data:')) return dataUrlABuffer(foto);
    if (foto.startsWith('blob:')) return bufferDesdeBlobUrl(foto);
    return fetchImageBuffer(foto);
  }
  if (foto.preview && String(foto.preview).startsWith('blob:')) {
    const fromBlob = await bufferDesdeBlobUrl(foto.preview);
    if (fromBlob) return fromBlob;
  }
  if (foto.preview && String(foto.preview).startsWith('data:')) {
    const fromData = dataUrlABuffer(foto.preview);
    if (fromData) return fromData;
  }
  if (foto.base64) {
    const fromB64 = dataUrlABuffer(
      String(foto.base64).startsWith('data:') ? foto.base64 : `data:image/jpeg;base64,${foto.base64}`
    );
    if (fromB64) return fromB64;
  }
  const ruta = foto.ruta || foto.fotoRuta || '';
  if (ruta) {
    if (String(ruta).startsWith('data:')) return dataUrlABuffer(ruta);
    const primary = urlDescargaArchivoAlfa(ruta);
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
 * Resuelve bytes del mapa de ubicación:
 * 1) imagenMapa guardada  2) Static Maps desde coordenadas  3) null
 */
async function resolverBufferMapaUbicacion(informe = {}) {
  const im = informe.imagenMapa;
  if (im) {
    if (typeof im === 'string') {
      const fromStr = await resolverBufferFoto(im);
      if (fromStr) return fromStr;
    } else if (typeof im === 'object') {
      const fromObj = await resolverBufferFoto(im);
      if (fromObj) return fromObj;
    }
  }
  const coords = extraerLatLng(informe.coordenadasRiesgo);
  if (!coords) return null;
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return capturarMapaEstaticoBuffer(coords.lat, coords.lng, apiKey);
}

async function cargarPlantilla() {
  const response = await fetch(PLANTILLA_URL);
  if (!response.ok) {
    throw new Error(
      `No se pudo cargar Informe_CAT_Seguros_Alfa.xlsx (${response.status}).`
    );
  }
  const buffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

function itemsDetalleDesdeLiquidador(liquidador, totales) {
  // Preferir filas editadas en la UI FORMATO LIQUIDACIÓN
  const guardado = liquidador?.detalleLiquidacionCat;
  if (Array.isArray(guardado)) {
    return guardado
      .filter((it) => String(it?.descripcion || '').trim() || it?.catalogoId)
      .map((it) => ({
        descripcion: txt(it.descripcion),
        valorAsegurado: it.valorAsegurado ?? '',
        indiceVariable: it.indiceVariable ?? 0,
        valorAseguradoFecha: it.valorAseguradoFecha ?? '',
        valorAsegurable: it.valorAsegurable ?? '',
        valorPerdida:
          parsearNumero(it.valorPerdida) ||
          parsearNumero(it.valorUnitario) * parsearNumero(it.cantidad),
        demerito: parsearNumero(it.demerito),
        valorReal:
          parsearNumero(it.valorReal) ||
          parsearNumero(it.valorPerdida) ||
          parsearNumero(it.valorUnitario) * parsearNumero(it.cantidad),
      }));
  }
  const filas = [];
  const items = liquidador?.evaluacionSismicaNSR10?.presupuesto?.items;
  if (Array.isArray(items)) {
    items.forEach((it) => {
      const desc = txt(it.actividad || it.componente);
      if (!desc) return;
      const perdida = parsearNumero(it.total);
      filas.push({
        descripcion: desc,
        valorAsegurado: '',
        indiceVariable: 0,
        valorAseguradoFecha: '',
        valorAsegurable: '',
        valorPerdida: perdida || parsearNumero(it.valorUnitario) * parsearNumero(it.cantidad),
        demerito: 0,
        valorReal: perdida || parsearNumero(it.valorUnitario) * parsearNumero(it.cantidad),
      });
    });
  }
  const hospedaje = parsearNumero(totales?.diagrama?.gastosHospedaje);
  if (hospedaje > 0) {
    filas.push({
      descripcion: 'Gastos de hospedaje / alojamiento temporal',
      valorAsegurado: '',
      indiceVariable: 0,
      valorAseguradoFecha: '',
      valorAsegurable: '',
      valorPerdida: hospedaje,
      demerito: 0,
      valorReal: hospedaje,
    });
  }
  return filas;
}

function rellenarLiquidador(sheet, { caso, liquidador, totales, informe, workbook }) {
  const enc = liquidador?.encabezado || {};
  const liq = liquidador?.liquidacionCatastrofico || {};
  const dedCfg =
    liq.deducibleConfigPresupuesto || liq.deducibleConfig || {};
  const fechaSin = enc.fechaSiniestro || caso.fechaSiniestro;
  const anio = anioDeFecha(fechaSin) || new Date().getFullYear();
  const smmlvAnio = SMMLV_POR_ANIO[anio] || SMMLV_POR_ANIO[2026];
  const tomador =
    txt(enc.tomador) ||
    txt(enc.asegurado) ||
    txt(caso.tomador) ||
    txt(caso.asegurado) ||
    txt(caso.informacionContacto);
  const aseguradoExtra = txt(enc.asegurado) && txt(enc.asegurado) !== tomador ? txt(enc.asegurado) : '';
  const tomadorCelda = [tomador, aseguradoExtra].filter(Boolean).join(' / ');

  setVal(sheet, 4, 8, fechaCelda(informe?.fechaInforme || new Date()));

  // Cabecera (celdas azules de captura)
  setVal(sheet, 5, 6, txt(enc.poliza || caso.numeroPoliza) || null);
  setVal(sheet, 6, 7, txt(enc.siniestro || caso.siniestro) || null); // G6:J6
  setVal(sheet, 6, 11, tomadorCelda || null); // K6:O6
  setVal(sheet, 6, 6, fechaCelda(caso.fechaInicioPoliza));
  setVal(sheet, 7, 6, fechaCelda(caso.fechaFinPoliza));
  setVal(sheet, 7, 7, txt(enc.cobertura || caso.cobertura) || null); // ramo
  setVal(sheet, 8, 6, fechaCelda(fechaSin));
  setVal(sheet, 8, 7, txt(enc.evento || caso.cobertura) || null); // sustracción / tipo
  setVal(sheet, 9, 6, anio);
  setVal(sheet, 9, 7, txt(enc.causa || informe?.analisisGeneral?.causaEvento || caso.cobertura) || null);

  // Deducible
  const cantSmmlv = Number(dedCfg.cantidadSMMLV);
  setVal(sheet, 8, 12, Number.isFinite(cantSmmlv) ? cantSmmlv : 1);
  const pct = Number(dedCfg.porcentaje);
  setVal(sheet, 8, 13, Number.isFinite(pct) ? pct / 100 : 0.1);
  setVal(sheet, 8, 14, 0);
  const dedPesos = parsearNumero(totales?.deducibleAplicado);
  setVal(sheet, 8, 15, dedPesos || 0);

  // L9 = SMMLV * cantidad (para fórmula de deducible aplicable)
  const smmlvCalc = (Number.isFinite(cantSmmlv) ? cantSmmlv : 1) * (Number(dedCfg.valorSMMLV) || smmlvAnio);
  setVal(sheet, 9, 12, smmlvCalc);
  const pctMonto = parsearNumero(totales?.totalDanios) * ((Number.isFinite(pct) ? pct : 10) / 100);
  setVal(sheet, 9, 13, pctMonto || null);

  const va = parsearNumero(enc.valorAseguradoInmueble || liq.valorAsegurado || caso.valorAseguradoInmueble);
  setVal(sheet, 12, 6, va || null);

  // Detalle ítems — una fila por partida (sin compactar/sumar el resto)
  const detalle = itemsDetalleDesdeLiquidador(liquidador, totales);
  const { lastItemRow, rowShift } = ensureItemRowsCapacity(sheet, detalle.length);
  let sumaIndemnizable = 0;
  const slots = lastItemRow - ITEM_FIRST_ROW + 1;

  for (let i = 0; i < slots; i += 1) {
    const row = ITEM_FIRST_ROW + i;
    const it = detalle[i];
    setVal(sheet, row, 4, i + 1);
    if (!it) {
      setVal(sheet, row, 5, null);
      setVal(sheet, row, 6, null);
      setVal(sheet, row, 7, 0);
      setVal(sheet, row, 8, null);
      setVal(sheet, row, 9, null);
      setVal(sheet, row, 10, null);
      setVal(sheet, row, 11, null);
      setVal(sheet, row, 12, 0);
      setVal(sheet, row, 13, null);
      setVal(sheet, row, 14, null);
      setVal(sheet, row, 15, null);
      continue;
    }

    const perdida = parsearNumero(it.valorPerdida) || 0;
    const real = parsearNumero(it.valorReal) || perdida;
    const baseAseg =
      parsearNumero(it.valorAsegurado) ||
      parsearNumero(it.valorAseguradoFecha) ||
      parsearNumero(it.valorAsegurable) ||
      va ||
      Math.max(real, perdida) ||
      0;
    const asegFecha = parsearNumero(it.valorAseguradoFecha) || baseAseg;
    const asegurable = parsearNumero(it.valorAsegurable) || asegFecha || baseAseg;
    const pctCia =
      asegurable > 0 ? Math.min(1, Math.max(0, asegFecha / asegurable)) : 1;
    const perdidaBase = real > 0 && perdida > 0 ? Math.min(real, perdida) : real || perdida;
    const indemnizable = perdidaBase * pctCia;
    sumaIndemnizable += indemnizable;

    setVal(sheet, row, 5, it.descripcion);
    const celdaDesc = sheet.getCell(row, 5);
    celdaDesc.alignment = {
      ...(celdaDesc.alignment || {}),
      wrapText: true,
      vertical: 'middle',
      horizontal: 'left',
    };
    sheet.getRow(row).height = Math.max(sheet.getRow(row).height || 0, 22);
    setVal(sheet, row, 6, baseAseg || null);
    setVal(sheet, row, 7, it.indiceVariable ?? 0);
    setVal(sheet, row, 8, asegFecha || null);
    setVal(sheet, row, 9, asegurable || null);
    setVal(sheet, row, 10, pctCia); // % responsabilidad CIA (1 = 100%)
    setVal(sheet, row, 11, perdida || null);
    setVal(sheet, row, 12, it.demerito ?? 0);
    setVal(sheet, row, 13, real || perdida || null);
    setVal(sheet, row, 14, perdidaBase || null); // Pérdida Base
    setVal(sheet, row, 15, indemnizable || null); // Pérdida Indemnizable
  }

  // Blindaje de layout: ninguna fila de ítem queda aplastada
  for (let r = ITEM_FIRST_ROW; r <= lastItemRow; r += 1) {
    const row = sheet.getRow(r);
    row.height = Math.max(Number(row.height) || 0, 22);
  }

  // Totales alineados a la UI (filas plantilla 25+ desplazadas si se insertaron ítems):
  // Preferir suma de valorPerdida del detalle (igual que Formato liquidación)
  const limite = va || 0;
  const subDesdeDetalle = detalle.reduce(
    (acc, it) => acc + (parsearNumero(it.valorPerdida) || 0),
    0
  );
  const baseSub = subDesdeDetalle > 0 ? subDesdeDetalle : sumaIndemnizable;
  const subTotalItems =
    limite > 0 && limite < baseSub ? limite : baseSub;
  const aiuPctDecimal = Number(totales?.presupuesto?.aiuPct);
  const aiuPctUi = Number.isFinite(aiuPctDecimal)
    ? Math.round(aiuPctDecimal * 10000) / 100
    : 20;
  const aiuValStored = parsearNumero(totales?.aiu);
  const aiuVal =
    aiuValStored > 0
      ? aiuValStored
      : Math.round(subTotalItems * (aiuPctUi / 100) * 100) / 100;

  // Deducible = el mismo de la UI (aplicado), no una fórmula distinta de la plantilla
  const deducibleFinal = Math.max(
    0,
    parsearNumero(totales?.deducibleAplicado) ||
      parsearNumero(dedCfg.pesosOtro) ||
      dedPesos ||
      0
  );

  const totalOtrosAmparos =
    parsearNumero(totales?.totalOtrosAmparos) ||
    sumarOtrosAmparosAlfa(liquidador?.otrosAmparos || []);

  // Blindaje: mismo monto que Finiquito / UI (ignora totales.totalIndemnizar desfasado)
  const { totalIndemnizar: aIndemnizarOficial } = resolverMontoIndemnizarAlfa(
    liquidador,
    totales
  );
  const subtotalEdificio = Math.max(
    0,
    Math.round((subTotalItems + aiuVal - deducibleFinal) * 100) / 100
  );
  const aIndemnizar = aIndemnizarOficial;

  const resumenOtros = textoResumenOtrosAmparosAlfa(
    liquidador?.otrosAmparos || totales?.otrosAmparos || []
  );

  /** Escribe valor numérico y elimina fórmula de plantilla (evita que Excel “deshaga” la resta). */
  const setTotalVal = (row, col, value) => {
    const cell = sheet.getCell(row, col);
    cell.value = value == null || value === '' ? null : value;
    try {
      if (cell.formula) cell.formula = undefined;
    } catch {
      /* ok */
    }
  };

  const rSub = 25 + rowShift;
  const rAiu = 26 + rowShift;
  const rDed = 27 + rowShift;
  const rOtros = 28 + rowShift;
  const rValorBase = 28 + rowShift;
  const rLiqPor = 26 + rowShift;
  const rObs = 30 + rowShift;
  const rAcept = 34 + rowShift;
  const rBanco = 36 + rowShift;
  const rFirma = 38 + rowShift;

  setVal(sheet, rSub, 12, 'Sub Total ítems');
  setTotalVal(rSub, 15, subTotalItems || 0);

  setVal(sheet, rAiu, 12, `AIU (${aiuPctUi}%)`);
  setTotalVal(rAiu, 15, aiuVal || 0);

  setVal(sheet, rDed, 12, 'Deducible Aplicable');
  setTotalVal(rDed, 15, deducibleFinal || 0);

  // Reescribir O8 (Pesos/Otro) con el deducible aplicado real
  setTotalVal(8, 15, deducibleFinal || 0);

  let rowValor = rValorBase;
  if (totalOtrosAmparos > 0) {
    setVal(sheet, rOtros, 12, 'Otros amparos (sin deducible)');
    setTotalVal(rOtros, 15, totalOtrosAmparos);
    rowValor = rOtros + 1;
  }
  setVal(sheet, rowValor, 12, 'Valor a Indemnizar');
  setTotalVal(rowValor, 15, aIndemnizar || 0);
  try {
    sheet.getCell(rowValor, 12).font = {
      ...(sheet.getCell(rDed, 12).font || {}),
      bold: true,
    };
    sheet.getCell(rowValor, 15).font = {
      ...(sheet.getCell(rDed, 15).font || {}),
      bold: true,
    };
  } catch {
    /* ok */
  }

  // Liquidado por
  setVal(
    sheet,
    rLiqPor,
    7,
    txt(informe?.actaAjustadorNombre || informe?.ajustadorNombre || enc.ajustador || caso.ajustador) ||
      null
  );

  const obs =
    txt(liquidador?.observaciones) ||
    txt(informe?.analisisGeneral?.observaciones) ||
    txt(informe?.conclusiones) ||
    '';
  const obsOtros = resumenOtros
    ? `OTROS AMPAROS (sin deducible): ${resumenOtros}`
    : '';
  const obsFinal = [obs, obsOtros].filter(Boolean).join('\n');

  // Pie: aceptación + datos bancarios
  const banco = liquidador?.datosBancarios || liquidador?.finiquitoBancario || {};
  const ciudadCaso =
    txt(caso.ciudad) ||
    txt(caso.municipio) ||
    txt(informe?.analisisGeneral?.ubicacionEvento) ||
    txt(informe?.direccionRiesgo);
  const fechaFirma =
    fechaCelda(informe?.fechaInforme) ||
    fechaCelda(enc.fechaInforme) ||
    new Date();
  const textoBanco = textoAceptacionBancariaAlfa(banco, {
    ciudad: ciudadCaso,
    fecha: fechaFirma,
  });

  const acepta = String(liquidador?.aceptacionIndemnizacion || '').toUpperCase();
  const marcaAcepto = acepta === 'ACEPTO' ? 'X' : ' ';
  const marcaNoAcepto = acepta === 'NO_ACEPTO' || acepta === 'NO ACEPTO' ? 'X' : ' ';
  const textoAceptacion = `ACEPTO INDEMNIZACIÓN  ( ${marcaAcepto} )          NO ACEPTO INDEMNIZACIÓN  ( ${marcaNoAcepto} )`;

  const firmaNombre =
    txt(liquidador?.nombreFirmante) ||
    tomadorCelda ||
    txt(enc.asegurado) ||
    txt(caso.asegurado) ||
    txt(caso.tomador) ||
    '';
  const textoFirma = firmaNombre
    ? `FIRMA ${firmaNombre}`
    : 'FIRMA ______________________________________________';

  // Siempre recombinar D:O del pie (evita texto repetido en cada columna tras insertar ítems)
  if (rowShift > 0) {
    // Merges “fantasma” de la plantilla que no se desplazaron
    for (const base of [30, 31, 33, 34, 36, 37, 38]) {
      unmergeRangoSeguro(sheet, base, 4, base, 15);
    }
    unmergeRangoSeguro(sheet, 30, 4, 31, 15);
  }
  repararPieLiquidadorMerges(sheet, rowShift, {
    observacion: obsFinal ? `OBSERVACIÓN:\n${obsFinal}` : 'OBSERVACIÓN:',
    aceptacion: textoAceptacion,
    banco: textoBanco,
    firma: textoFirma,
  });

  const firmaImg = dataUrlABuffer(liquidador?.firmaCliente);
  if (firmaImg?.buffer && workbook) {
    try {
      const imageId = workbook.addImage({
        buffer: aUint8(firmaImg.buffer),
        extension: firmaImg.extension || 'png',
      });
      sheet.addImage(imageId, {
        tl: { col: 3.2, row: rFirma - 0.85 },
        ext: { width: 280, height: 70 },
        editAs: 'oneCell',
      });
    } catch {
      /* ok */
    }
  }
}

function rellenarAnalisisGeneral(sheet, analisis) {
  // Columnas C–F iguales → fotos 2×2 alineadas (la plantilla trae C≈99 y D–F mínimas)
  for (let col = 3; col <= 6; col += 1) {
    sheet.getColumn(col).width = COL_ANEXOS_W;
  }

  setVal(sheet, 9, 3, txt(analisis.ubicacionEvento) || null);
  setVal(sheet, 10, 3, txt(analisis.coaseguro) || null);

  const descripcion = txt(analisis.descripcionEvento);
  setVal(sheet, 11, 3, descripcion || null);
  const celdaDesc = sheet.getCell(11, 3);
  celdaDesc.alignment = {
    wrapText: true,
    vertical: 'top',
    horizontal: 'justify',
  };
  // C:F ≈ 4×28 → ~90 caracteres útiles por línea
  const charsPorLineaDesc = Math.max(55, Math.floor(COL_ANEXOS_W * 4 * 0.82));
  const lineasDesc = Math.max(
    5,
    String(descripcion || '').split(/\n/).reduce((acc, linea) => {
      const t = String(linea || '').trim();
      if (!t) return acc + 1;
      return acc + Math.max(1, Math.ceil(t.length / charsPorLineaDesc));
    }, 0) + 1
  );
  sheet.getRow(11).height = Math.min(650, Math.max(90, lineasDesc * 15));
  const labelDesc = sheet.getCell(11, 2);
  labelDesc.alignment = {
    ...(labelDesc.alignment || {}),
    vertical: 'top',
    wrapText: true,
  };

  setVal(sheet, 12, 3, txt(analisis.causaEvento) || null);
  setVal(sheet, 13, 3, fechaCelda(analisis.fechaAsignacion) || txt(analisis.fechaAsignacion) || null);
  setVal(
    sheet,
    14,
    3,
    fechaCelda(analisis.fechaUltimoDocumento) || txt(analisis.fechaUltimoDocumento) || null
  );
  setVal(sheet, 15, 3, txt(analisis.aplicacionExclusiones) || null);
  setVal(sheet, 16, 3, txt(analisis.cumplimientoGarantias) || null);
  setVal(sheet, 17, 3, txt(analisis.salvamento) || null);
  setVal(sheet, 28, 3, txt(analisis.posibilidadRecobro) || null);

  const obs = txt(analisis.observaciones);
  setVal(sheet, 29, 3, obs || null);
  const celdaObs = sheet.getCell(29, 3);
  celdaObs.alignment = {
    wrapText: true,
    vertical: 'top',
    horizontal: 'justify',
  };
  // C:F ≈ 4×28 → ~95–100 caracteres útiles por línea (Calibri)
  const charsPorLineaObs = Math.max(55, Math.floor(COL_ANEXOS_W * 4 * 0.82));
  const lineasObs = Math.max(
    3,
    String(obs || '').split(/\n/).reduce((acc, linea) => {
      const t = String(linea || '').trim();
      if (!t) return acc + 1;
      return acc + Math.max(1, Math.ceil(t.length / charsPorLineaObs));
    }, 0) + 1
  );
  // Sin tope bajo: el texto no debe quedar cortado sobre ANEXOS
  sheet.getRow(29).height = Math.min(520, Math.max(56, lineasObs * 15));
  const labelObs = sheet.getCell(29, 2);
  labelObs.alignment = {
    ...(labelObs.alignment || {}),
    vertical: 'top',
    wrapText: true,
  };

  const colNivel = { BAJO: 4, MEDIO: 5, ALTO: 6 };
  INDICADORES_FRAUDE_ALFA.forEach((ind, idx) => {
    const row = 19 + idx;
    setVal(sheet, row, 4, null);
    setVal(sheet, row, 5, null);
    setVal(sheet, row, 6, null);
    const data = analisis.indicadoresFraude?.[ind.key] || {
      nivel: ind.defaultNivel,
      valor: ind.defaultValor,
    };
    const nivel = String(data.nivel || ind.defaultNivel).toUpperCase();
    const col = colNivel[nivel] || 4;
    setVal(sheet, row, col, data.valor != null ? data.valor : ind.defaultValor);

    // Texto completo del indicador (plantilla a veces trae texto truncado)
    const celdaInd = sheet.getCell(row, 3);
    const labelInd = txt(ind.label) || txt(celdaInd.value);
    setVal(sheet, row, 3, labelInd || null);
    celdaInd.alignment = {
      wrapText: true,
      vertical: 'top',
      horizontal: 'left',
    };
    // Columna C = COL_ANEXOS_W (~28) → ~24 caracteres útiles por línea
    const charsPorLineaInd = Math.max(22, Math.floor(COL_ANEXOS_W * 0.85));
    const lineasInd = Math.max(
      1,
      String(labelInd || '')
        .split(/\n/)
        .reduce((acc, linea) => {
          const t = String(linea || '').trim();
          if (!t) return acc + 1;
          return acc + Math.max(1, Math.ceil(t.length / charsPorLineaInd));
        }, 0)
    );
    sheet.getRow(row).height = Math.min(96, Math.max(28, lineasInd * 15 + 4));
    for (const nc of [4, 5, 6]) {
      sheet.getCell(row, nc).alignment = {
        ...(sheet.getCell(row, nc).alignment || {}),
        horizontal: 'center',
        vertical: 'middle',
      };
    }
  });

  // Un solo valor por fila (C:F) — evita que se vea repetido en 4 columnas
  [9, 10, 11, 12, 13, 14, 15, 16, 17, 28, 29].forEach((row) => {
    remergeValorAnalisis(sheet, row);
  });
  // ANEXOS (fila 30): no rellenar texto; las fotos viven ahí
  try {
    sheet.unMergeCells(30, 3, 30, 6);
  } catch {
    /* ok */
  }
  for (let col = 3; col <= 6; col += 1) {
    sheet.getCell(30, col).value = null;
  }
}

/** Deja el texto solo en C y recombina C:F (corrige columnas repetidas). */
function remergeValorAnalisis(sheet, row) {
  const cellC = sheet.getCell(row, 3);
  const valor = cellC.value;
  const alignment = cellC.alignment
    ? { ...cellC.alignment, wrapText: true }
    : { wrapText: true, vertical: 'top', horizontal: 'justify' };
  for (let col = 4; col <= 6; col += 1) {
    sheet.getCell(row, col).value = null;
  }
  try {
    sheet.unMergeCells(`C${row}:F${row}`);
  } catch {
    /* ok */
  }
  try {
    sheet.mergeCells(row, 3, row, 6);
  } catch {
    /* ok */
  }
  sheet.getCell(row, 3).value = valor;
  sheet.getCell(row, 3).alignment = alignment;
}

/**
 * Mapa en UBICACIÓN sin spliceRows (rompía merges y duplicaba el texto).
 */
async function insertarFotoMapaUbicacion(workbook, sheet, informe, mapaBufferIn = null) {
  if (!sheet) return 0;

  const img = mapaBufferIn?.buffer
    ? mapaBufferIn
    : await resolverBufferMapaUbicacion(informe || {});

  const ubicacion = txt(informe?.analisisGeneral?.ubicacionEvento || informe?.direccionRiesgo);
  const coords = txt(informe?.coordenadasRiesgo);
  const textoUb = [ubicacion, coords ? `Coords: ${coords}` : ''].filter(Boolean).join('\n');

  setVal(sheet, 9, 3, textoUb || (!img?.buffer ? '(Sin captura de mapa)' : null));
  remergeValorAnalisis(sheet, 9);
  // Dirección + coords centrados (como plantilla Alfa)
  sheet.getCell(9, 3).alignment = {
    wrapText: true,
    vertical: 'top',
    horizontal: 'center',
  };
  sheet.getCell(9, 2).alignment = {
    ...(sheet.getCell(9, 2).alignment || {}),
    vertical: 'top',
    wrapText: true,
  };

  const lineasUb = Math.max(1, (textoUb || ' ').split(/\n/).length);

  if (!img?.buffer) {
    sheet.getRow(9).height = Math.max(40, 16 * (lineasUb + 1));
    return 0;
  }

  // Dirección arriba + mapa centrado debajo (C:F mergeado; sin spliceRows)
  // Mantener C–F iguales (mismo criterio que anexos 2×2)
  const COL_W = Math.max(28, Number(sheet.getColumn(3).width) || 28);
  const PX_POR_UNIDAD = 7;
  for (let col = 3; col <= 6; col += 1) {
    sheet.getColumn(col).width = COL_W;
  }

  const MAP_W = 420;
  const MAP_H = 210;
  const altoTexto = Math.max(32, lineasUb * 16);
  sheet.getRow(9).height = altoTexto + MAP_H + 18;

  const imageId = workbook.addImage({
    buffer: aUint8(img.buffer),
    extension: img.extension || 'jpeg',
  });

  // Centrar horizontalmente el mapa en el ancho C:F
  const totalPx = COL_W * 4 * PX_POR_UNIDAD;
  const margenPx = Math.max(0, (totalPx - MAP_W) / 2);
  const colOffset = margenPx / (COL_W * PX_POR_UNIDAD); // fracción desde col C (índice 2)
  const offsetTexto = Math.min(0.38, 0.1 + lineasUb * 0.055);

  sheet.addImage(imageId, {
    tl: { col: 2 + colOffset, row: 8 + offsetTexto },
    ext: { width: MAP_W, height: MAP_H },
    editAs: 'oneCell',
  });

  return 0;
}

/**
 * Dimensiones naturales de imagen (para no estirar anexos).
 */
async function dimensionesBufferImagen(buffer, extension) {
  try {
    const u8 = aUint8(buffer);
    if (!u8) return { width: 800, height: 600 };
    const mime = extension === 'png' ? 'image/png' : 'image/jpeg';
    const blob = new Blob([u8], { type: mime });
    if (typeof createImageBitmap === 'function') {
      const bmp = await createImageBitmap(blob);
      const dims = { width: bmp.width || 800, height: bmp.height || 600 };
      bmp.close?.();
      return dims;
    }
    const url = URL.createObjectURL(blob);
    try {
      return await new Promise((resolve) => {
        const el = new Image();
        el.onload = () =>
          resolve({
            width: el.naturalWidth || el.width || 800,
            height: el.naturalHeight || el.height || 600,
          });
        el.onerror = () => resolve({ width: 800, height: 600 });
        el.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return { width: 800, height: 600 };
  }
}

/** object-fit: contain dentro de maxW×maxH (px). */
function containPx(imgW, imgH, maxW, maxH) {
  const w = Math.max(1, Number(imgW) || 1);
  const h = Math.max(1, Number(imgH) || 1);
  const scale = Math.min(maxW / w, maxH / h);
  return {
    width: Math.max(40, Math.round(w * scale)),
    height: Math.max(40, Math.round(h * scale)),
  };
}

/** Quita imágenes ancladas en filas altas (p. ej. logo de cabecera). */
function quitarImagenesHastaFila(sheet, maxNativeRowExclusive) {
  if (!sheet?._media?.length) return;
  sheet._media = sheet._media.filter((m) => {
    const nr = m?.range?.tl?.nativeRow;
    if (nr != null && Number.isFinite(Number(nr))) {
      return Number(nr) >= maxNativeRowExclusive;
    }
    const r = Number(m?.range?.tl?.row);
    return !Number.isFinite(r) || r >= maxNativeRowExclusive;
  });
}

async function resolverLogoAlfaBuffer(workbook) {
  try {
    const res = await fetch(LOGO_ALFA_URL);
    if (res.ok) {
      const buffer = aUint8(await res.arrayBuffer());
      if (buffer?.length) return { buffer, extension: 'png' };
    }
  } catch {
    /* ok */
  }
  const media = workbook?.model?.media?.[0];
  if (media?.buffer) {
    return {
      buffer: aUint8(media.buffer),
      extension: media.extension || 'png',
    };
  }
  return null;
}

/**
 * Al igualar C–F el logo de plantilla (anclado D:F) se estira y se ve pixelado.
 * Se quita y se reinserta como imagen flotante con tamaño fijo (tl+ext).
 */
async function reponerLogoAnalisisGeneral(workbook, sheet) {
  if (!sheet) return;
  quitarImagenesHastaFila(sheet, 6);
  const logo = await resolverLogoAlfaBuffer(workbook);
  if (!logo?.buffer) return;

  const dims = await dimensionesBufferImagen(logo.buffer, logo.extension);
  const sized = containPx(dims.width, dims.height, 260, 82);
  const pxCol = COL_ANEXOS_W * PX_POR_COL_W;
  const totalPx = pxCol * 4; // C–F
  const pad = Math.max(0, (totalPx - sized.width) / 2);
  const id = workbook.addImage({
    buffer: aUint8(logo.buffer),
    extension: logo.extension || 'png',
  });
  sheet.addImage(id, {
    tl: { col: 2 + pad / pxCol, row: 0.18 },
    ext: { width: sized.width, height: sized.height },
    editAs: 'oneCell',
  });
}

/**
 * Anexos: fotos DENTRO del bloque ANEXOS (fila 30+), de a dos, sin título "Anexos fotográficos (N)".
 * Imágenes flotantes (tl+ext / oneCell) centradas en C:D y E:F — movibles en Excel.
 * @returns {number} última fila usada
 */
async function insertarFotosAnexos(workbook, sheet, fotos = [], rowOffset = 0) {
  if (!sheet) return 30 + rowOffset;

  const baseRow = 30 + rowOffset; // primera fila del hueco ANEXOS
  const lista = Array.isArray(fotos) ? fotos.filter(Boolean) : [];

  const safeUnmerge = (r1, c1, r2, c2) => {
    try {
      sheet.unMergeCells(r1, c1, r2, c2);
    } catch {
      try {
        sheet.unMergeCells(r1, c1, r1, c2);
      } catch {
        /* ok */
      }
    }
  };

  // Limpiar celda ANEXOS (sin texto “Anexos fotográficos (7)”)
  safeUnmerge(baseRow, 3, baseRow, 6);
  for (let col = 3; col <= 6; col += 1) {
    sheet.getCell(baseRow, col).value = null;
  }

  if (!lista.length) {
    setVal(sheet, baseRow, 3, 'Sin anexos fotográficos');
    try {
      sheet.mergeCells(baseRow, 3, baseRow, 6);
    } catch {
      /* ok */
    }
    sheet.getCell(baseRow, 3).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    sheet.getRow(baseRow).height = 36;
    return baseRow;
  }

  const resueltas = [];
  for (let i = 0; i < lista.length; i += 1) {
    const foto = lista[i];
    const img = await resolverBufferFoto(foto);
    if (!img?.buffer) continue;
    const dims = await dimensionesBufferImagen(img.buffer, img.extension);
    const desc =
      txt(foto?.descripcion) ||
      txt(foto?.caption) ||
      txt(foto?.leyenda) ||
      txt(foto?.nombreOriginal) ||
      txt(foto?.nombre) ||
      `Foto ${resueltas.length + 1}`;
    resueltas.push({ img, descripcion: desc, dims });
  }

  if (!resueltas.length) {
    setVal(sheet, baseRow, 3, 'No se pudieron embeber las fotos');
    try {
      sheet.mergeCells(baseRow, 3, baseRow, 6);
    } catch {
      /* ok */
    }
    sheet.getRow(baseRow).height = 28;
    return baseRow;
  }

  for (let col = 3; col <= 6; col += 1) {
    sheet.getColumn(col).width = COL_ANEXOS_W;
  }

  const PX_COL = COL_ANEXOS_W * PX_POR_COL_W;
  const SLOT_W = PX_COL * 2 - 16;
  const MAX_FOTO_W = Math.min(250, Math.max(150, SLOT_W));
  const MAX_FOTO_H = 148;
  const ROW_IMG_H = 122;
  const ROW_DESC_H = 32;
  const ROWS_PER_PAIR = 2;
  const borderThin = {
    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
    left: { style: 'thin', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
    right: { style: 'thin', color: { argb: 'FF94A3B8' } },
  };

  const pares = Math.ceil(resueltas.length / 2);
  let lastRow = baseRow;

  for (let p = 0; p < pares; p += 1) {
    const rowImg = baseRow + p * ROWS_PER_PAIR;
    const rowDesc = rowImg + 1;
    lastRow = rowDesc;

    const izq = resueltas[p * 2];
    const der = resueltas[p * 2 + 1];

    sheet.getRow(rowImg).height = ROW_IMG_H;
    sheet.getRow(rowDesc).height = ROW_DESC_H;

    unmergeRangoSeguro(sheet, rowImg, 3, rowDesc, 6);
    for (let col = 3; col <= 6; col += 1) {
      const cImg = sheet.getCell(rowImg, col);
      const cDesc = sheet.getCell(rowDesc, col);
      cImg.value = null;
      cDesc.value = null;
      cImg.border = borderThin;
      cDesc.border = borderThin;
      cImg.alignment = { horizontal: 'center', vertical: 'middle' };
      cDesc.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    }

    if (p === 0) {
      setVal(sheet, rowImg, 2, 'ANEXOS');
      sheet.getCell(rowImg, 2).alignment = {
        ...(sheet.getCell(rowImg, 2).alignment || {}),
        vertical: 'top',
        wrapText: true,
      };
    }

    const pintarDesc = (colStart, colEnd, texto) => {
      try {
        sheet.mergeCells(rowDesc, colStart, rowDesc, colEnd);
      } catch {
        /* ok */
      }
      const cell = sheet.getCell(rowDesc, colStart);
      cell.value = texto;
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF111827' } };
      cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
      cell.border = borderThin;
    };

    // Flotante tl+ext: se puede mover a gusto en Excel; centrada en el slot de 2 columnas
    const colocarFoto = (side, col0) => {
      if (!side) return;
      const sized = containPx(side.dims.width, side.dims.height, MAX_FOTO_W, MAX_FOTO_H);
      const padX = Math.max(4, (PX_COL * 2 - sized.width) / 2);
      const cellHpx = ROW_IMG_H * (96 / 72);
      const padY = Math.max(4, (cellHpx - sized.height) / 2);
      const id = workbook.addImage({
        buffer: aUint8(side.img.buffer),
        extension: side.img.extension || 'jpeg',
      });
      sheet.addImage(id, {
        tl: {
          col: col0 + padX / PX_COL,
          row: rowImg - 1 + padY / cellHpx,
        },
        ext: { width: sized.width, height: sized.height },
        editAs: 'oneCell',
      });
    };

    if (izq) {
      pintarDesc(3, 4, izq.descripcion);
      colocarFoto(izq, 2);
    }
    if (der) {
      pintarDesc(5, 6, der.descripcion);
      colocarFoto(der, 4);
    }
  }

  return lastRow;
}

/** Quita todos los merges que toquen las filas indicadas (más agresivo que unMerge puntual). */
function romperMergesEnFilas(sheet, rowStart, rowEnd) {
  const merges = sheet?._merges || {};
  const keys = Object.keys(merges);
  for (const key of keys) {
    try {
      const m = merges[key];
      const top = Number(m?.top ?? m?.model?.top);
      const bottom = Number(m?.bottom ?? m?.model?.bottom ?? top);
      if (!Number.isFinite(top)) continue;
      if (bottom < rowStart || top > rowEnd) continue;
      sheet.unMergeCells(key);
    } catch {
      /* ok */
    }
  }
  for (let r = rowStart; r <= rowEnd; r += 1) {
    unmergeRangoSeguro(sheet, r, 1, r, 10);
  }
}

/** Ancho de columna Excel → px (fórmula estándar). */
function excelColToPx(width) {
  const w = Number(width) || COL_ANEXOS_W;
  return Math.max(8, Math.floor(((256 * w + Math.floor(128 / 7)) / 256) * 7));
}

/**
 * Recorta márgenes transparentes y centra la tinta en un PNG del ancho del bloque C:F.
 * Así la firma queda visualmente centrada aunque el dataURL original tenga padding raro
 * o ExcelJS desfase el ancla.
 */
async function componerFirmaCentradaEnBloque(firmaBuf, slotW, slotH) {
  if (!firmaBuf?.buffer || typeof document === 'undefined') return null;
  try {
    const blob = new Blob([aUint8(firmaBuf.buffer)], {
      type: firmaBuf.extension === 'jpeg' ? 'image/jpeg' : 'image/png',
    });
    const url = URL.createObjectURL(blob);
    let img;
    try {
      img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }

    const iw = img.naturalWidth || img.width || 1;
    const ih = img.naturalHeight || img.height || 1;

    // Detectar bounding box de píxeles no transparentes (la tinta real)
    const probe = document.createElement('canvas');
    probe.width = iw;
    probe.height = ih;
    const pctx = probe.getContext('2d', { willReadFrequently: true });
    if (!pctx) return null;
    pctx.drawImage(img, 0, 0);
    const { data } = pctx.getImageData(0, 0, iw, ih);
    let minX = iw;
    let minY = ih;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < ih; y += 1) {
      for (let x = 0; x < iw; x += 1) {
        const a = data[(y * iw + x) * 4 + 3];
        if (a > 20) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) {
      minX = 0;
      minY = 0;
      maxX = iw - 1;
      maxY = ih - 1;
    }
    // Margen mínimo alrededor de la tinta
    const pad = 4;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(iw - 1, maxX + pad);
    maxY = Math.min(ih - 1, maxY + pad);
    const cropW = Math.max(1, maxX - minX + 1);
    const cropH = Math.max(1, maxY - minY + 1);

    const outW = Math.max(120, Math.round(slotW));
    const outH = Math.max(40, Math.round(slotH));
    const out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, outW, outH);

    const fitted = containPx(cropW, cropH, outW * 0.72, outH * 0.92);
    const dx = Math.round((outW - fitted.width) / 2);
    const dy = Math.round((outH - fitted.height) / 2);
    ctx.drawImage(
      img,
      minX,
      minY,
      cropW,
      cropH,
      dx,
      dy,
      fitted.width,
      fitted.height
    );

    const pngBlob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'));
    if (!pngBlob) return null;
    return {
      buffer: aUint8(await pngBlob.arrayBuffer()),
      extension: 'png',
      width: outW,
      height: outH,
    };
  } catch {
    return null;
  }
}

/**
 * Firma del ajustador: título → imagen → nombre, centrados como en la captura de referencia.
 * La imagen se compone ya centrada en un PNG ancho C:F y se ancla en columna C (sin offsets raros).
 */
async function insertarFirmaAjustadorAnalisis(workbook, sheet, informe = {}, rowAfterFotos) {
  if (!sheet) return;

  const start = Math.max(Number(rowAfterFotos) || 30, 30) + 2;
  const firmaUrl = informe.firmaAjustador || informe.actaAjustadorFirmaImagen || '';
  const nombre =
    txt(informe.actaAjustadorNombre) ||
    txt(informe.ajustadorNombre) ||
    '________________________';
  const cargo =
    txt(informe.actaAjustadorCargo) || txt(informe.cargoAjustador) || 'Ajustador';
  const email = txt(informe.actaAjustadorEmail);

  const rowTitulo = start;
  const rowImg = start + 1;
  const rowNom = start + 2;
  const rowCargo = start + 3;
  const rowEmail = email ? start + 4 : start + 3;

  for (let col = 3; col <= 6; col += 1) {
    sheet.getColumn(col).width = COL_ANEXOS_W;
  }

  romperMergesEnFilas(sheet, rowTitulo, rowEmail);

  for (let r = rowTitulo; r <= rowEmail; r += 1) {
    for (let c = 3; c <= 6; c += 1) {
      const cell = sheet.getCell(r, c);
      cell.value = null;
      cell.border = {};
    }
  }

  const mergeCF = (r) => {
    try {
      sheet.unMergeCells(r, 3, r, 6);
    } catch {
      /* ok */
    }
    try {
      sheet.mergeCells(r, 3, r, 6);
    } catch {
      /* ok */
    }
  };

  const estiloCentro = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true,
  };

  mergeCF(rowTitulo);
  setVal(sheet, rowTitulo, 3, 'FIRMA DEL AJUSTADOR');
  sheet.getCell(rowTitulo, 3).font = { name: 'Calibri', size: 11, bold: true };
  sheet.getCell(rowTitulo, 3).alignment = estiloCentro;
  sheet.getRow(rowTitulo).height = 22;

  const ROW_IMG_H = 82;
  sheet.getRow(rowImg).height = ROW_IMG_H;
  mergeCF(rowImg);

  const firmaBuf = dataUrlABuffer(firmaUrl);
  if (firmaBuf?.buffer) {
    try {
      const pxCol = excelColToPx(COL_ANEXOS_W);
      const slotW = pxCol * 4; // ancho visual C–F
      const slotH = Math.round(ROW_IMG_H * (96 / 72));
      const compuesta =
        (await componerFirmaCentradaEnBloque(firmaBuf, slotW, slotH)) || {
          buffer: aUint8(firmaBuf.buffer),
          extension: firmaBuf.extension || 'png',
          width: Math.min(220, slotW),
          height: 56,
        };

      const id = workbook.addImage({
        buffer: aUint8(compuesta.buffer),
        extension: compuesta.extension || 'png',
      });
      // Ancla simple en C: la tinta ya va centrada dentro del PNG
      sheet.addImage(id, {
        tl: { col: 2, row: rowImg - 1 },
        ext: {
          width: compuesta.width || slotW,
          height: compuesta.height || slotH,
        },
        editAs: 'oneCell',
      });
    } catch {
      /* ok */
    }
  } else {
    setVal(sheet, rowImg, 3, '(Sin firma — cárguela en Informe único)');
    sheet.getCell(rowImg, 3).font = {
      name: 'Calibri',
      size: 8,
      italic: true,
      color: { argb: 'FFB45309' },
    };
    sheet.getCell(rowImg, 3).alignment = estiloCentro;
  }

  mergeCF(rowNom);
  setVal(sheet, rowNom, 3, nombre);
  sheet.getCell(rowNom, 3).font = { name: 'Calibri', size: 10, bold: true };
  sheet.getCell(rowNom, 3).alignment = estiloCentro;
  sheet.getRow(rowNom).height = 18;

  mergeCF(rowCargo);
  if (email) {
    setVal(sheet, rowCargo, 3, cargo);
    sheet.getCell(rowCargo, 3).font = { name: 'Calibri', size: 9 };
    sheet.getCell(rowCargo, 3).alignment = estiloCentro;
    sheet.getRow(rowCargo).height = 16;

    mergeCF(rowEmail);
    setVal(sheet, rowEmail, 3, email);
    sheet.getCell(rowEmail, 3).font = { name: 'Calibri', size: 9 };
    sheet.getCell(rowEmail, 3).alignment = estiloCentro;
    sheet.getRow(rowEmail).height = 16;
  } else {
    setVal(sheet, rowCargo, 3, cargo);
    sheet.getCell(rowCargo, 3).font = { name: 'Calibri', size: 9 };
    sheet.getCell(rowCargo, 3).alignment = estiloCentro;
    sheet.getRow(rowCargo).height = 18;
  }
}

/**
 * Genera el Excel oficial INFORME CAT Seguros Alfa (LIQUIDADOR + ANALISIS GENERAL + fotos en Anexos).
 */
export async function generarInformeCatAlfaExcelBlob({
  caso = {},
  liquidador: liquidadorIn = null,
  informe: informeIn = null,
  totales: totalesIn = null,
} = {}) {
  const liquidador = liquidadorIn || mapCasoAlfaALiquidador(caso);
  const informeBase = defaultInformeUnicoAlfa(caso);
  const informe = {
    ...informeBase,
    ...(informeIn || {}),
    analisisGeneral: defaultAnalisisGeneralAlfa(caso, {
      ...informeBase,
      ...(informeIn || {}),
    }),
  };
  // Completar coordenadas desde caso si el informe no las trae
  if (!String(informe.coordenadasRiesgo || '').trim()) {
    const lat =
      caso.ubicacionPredio?.lat ?? caso.latitud ?? caso.lat ?? caso.location?.lat;
    const lng =
      caso.ubicacionPredio?.lng ?? caso.longitud ?? caso.lng ?? caso.location?.lng;
    if (lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      informe.coordenadasRiesgo = `${lat}, ${lng}`;
    }
  }
  // Descripciones de fotos: fusionar informe + archivos del caso (no perder texto)
  informe.fotosInspeccion = fotosInformeDesdeCaso(caso, informe);

  const totales = totalesIn || calcularLiquidacionAlfa(liquidador);

  const workbook = await cargarPlantilla();
  const hojaLiq = workbook.getWorksheet('LIQUIDADOR');
  const hojaAg = workbook.getWorksheet('ANALISIS GENERAL');
  if (!hojaLiq || !hojaAg) {
    throw new Error('La plantilla CAT Alfa no tiene las hojas LIQUIDADOR / ANALISIS GENERAL.');
  }

  rellenarLiquidador(hojaLiq, { caso, liquidador, totales, informe, workbook });
  rellenarAnalisisGeneral(hojaAg, informe.analisisGeneral);

  const mapaBuffer = await resolverBufferMapaUbicacion(informe);
  const filasMapa = await insertarFotoMapaUbicacion(workbook, hojaAg, informe, mapaBuffer);
  // Reafirmar anchos C–F tras el mapa (para grilla 2×2 limpia)
  for (let col = 3; col <= 6; col += 1) {
    hojaAg.getColumn(col).width = COL_ANEXOS_W;
  }
  // Logo: al cambiar anchos se estira; reponer flotante con tamaño nítido
  await reponerLogoAnalisisGeneral(workbook, hojaAg);

  const lastFotoRow = await insertarFotosAnexos(
    workbook,
    hojaAg,
    informe.fotosInspeccion || [],
    filasMapa || 0
  );
  await insertarFirmaAjustadorAnalisis(workbook, hojaAg, informe, lastFotoRow);

  const buffer = await workbook.xlsx.writeBuffer();
  const safe = String(caso.siniestro || caso.consecutivo || encSafe(liquidador) || 'caso')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 40);
  return {
    blob: new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename: `Informe_CAT_Seguros_Alfa_${safe}.xlsx`,
  };
}

function encSafe(liquidador) {
  return liquidador?.encabezado?.siniestro || liquidador?.encabezado?.poliza || '';
}

export async function descargarInformeCatAlfaExcel(opts) {
  const { blob, filename } = await generarInformeCatAlfaExcelBlob(opts);
  saveAs(blob, filename);
  return { blob, filename };
}

/** Compat: export desde liquidador (usa informe del caso si existe). */
export async function descargarLiquidadorAlfaExcelCat(liquidador, totales, caso = null) {
  return descargarInformeCatAlfaExcel({
    caso: caso || {},
    liquidador,
    totales,
    informe: caso?.informeUnico || null,
  });
}
