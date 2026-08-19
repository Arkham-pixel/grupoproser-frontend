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
} from './liquidadorAlfaHelpers.js';

const PLANTILLA_URL = `${import.meta.env.BASE_URL || '/'}templates/Informe_CAT_Seguros_Alfa.xlsx`;

/** Filas de ítems en hoja LIQUIDADOR (plantilla: 1–7 numerados + 2 libres). */
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

function fechaCelda(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(12, 0, 0, 0);
  return d;
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

  // Detalle ítems
  // La plantilla calcula O = N * J y J = H/I. Si I (valor asegurable) va vacío → #¡VALOR!.
  // En plataforma no se pide asegurable/% CIA por ítem → asumir 100% responsabilidad.
  const detalle = itemsDetalleDesdeLiquidador(liquidador, totales);
  let sumaIndemnizable = 0;

  for (let i = 0; i <= ITEM_LAST_ROW - ITEM_FIRST_ROW; i += 1) {
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

  if (detalle.length > ITEM_LAST_ROW - ITEM_FIRST_ROW + 1) {
    const rest = detalle.slice(ITEM_LAST_ROW - ITEM_FIRST_ROW + 1);
    const sum = rest.reduce((a, it) => a + (parsearNumero(it.valorPerdida) || 0), 0);
    const last = ITEM_LAST_ROW;
    const prevDesc = txt(sheet.getCell(last, 5).value);
    setVal(
      sheet,
      last,
      5,
      prevDesc ? `${prevDesc} (+ ${rest.length} ítems)` : `Ítems adicionales (${rest.length})`
    );
    const prevK = parsearNumero(sheet.getCell(last, 11).value);
    const nuevo = prevK + sum;
    setVal(sheet, last, 11, nuevo);
    setVal(sheet, last, 13, nuevo);
    setVal(sheet, last, 14, nuevo);
    setVal(sheet, last, 15, nuevo);
    sumaIndemnizable += sum;
  }

  // Totales en valores (evita #¡VALOR! si faltan inputs de fórmulas)
  const limite = va || 0;
  const subTotal =
    limite > 0 && limite < sumaIndemnizable ? limite : sumaIndemnizable;
  const deducibleFinal =
    dedPesos ||
    parsearNumero(totales?.deducibleAplicado) ||
    0;
  const aIndemnizar = Math.max(0, subTotal - deducibleFinal);
  setVal(sheet, 25, 15, subTotal || null);
  setVal(sheet, 26, 15, deducibleFinal || 0);
  setVal(sheet, 27, 15, aIndemnizar || 0);

  // Liquidado por
  setVal(
    sheet,
    26,
    7,
    txt(informe?.actaAjustadorNombre || informe?.ajustadorNombre || enc.ajustador || caso.ajustador) ||
      null
  );

  const obs =
    txt(liquidador?.observaciones) ||
    txt(informe?.analisisGeneral?.observaciones) ||
    txt(informe?.conclusiones) ||
    '';
  setVal(sheet, 30, 4, obs ? `OBSERVACIÓN:\n${obs}` : 'OBSERVACIÓN:');

  // Pie: aceptación + datos bancarios (D36) y firma (D38)
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
  setVal(sheet, 36, 4, textoBanco);
  const celdaBanco = sheet.getCell(36, 4);
  celdaBanco.alignment = {
    ...(celdaBanco.alignment || {}),
    wrapText: true,
    vertical: 'top',
    horizontal: 'left',
  };
  sheet.getRow(36).height = Math.max(sheet.getRow(36).height || 0, 72);

  const acepta = String(liquidador?.aceptacionIndemnizacion || '').toUpperCase();
  const marcaAcepto = acepta === 'ACEPTO' ? 'X' : ' ';
  const marcaNoAcepto = acepta === 'NO_ACEPTO' || acepta === 'NO ACEPTO' ? 'X' : ' ';
  setVal(
    sheet,
    34,
    4,
    `                    ACEPTO INDEMNIZACIÓN  ( ${marcaAcepto} )          NO ACEPTO INDEMNIZACIÓN  ( ${marcaNoAcepto} )`
  );

  const firmaNombre =
    txt(liquidador?.nombreFirmante) ||
    tomadorCelda ||
    txt(enc.asegurado) ||
    txt(caso.asegurado) ||
    txt(caso.tomador) ||
    '';
  setVal(
    sheet,
    38,
    4,
    firmaNombre
      ? `FIRMA ${firmaNombre}`
      : 'FIRMA ______________________________________________'
  );
  sheet.getRow(38).height = Math.max(sheet.getRow(38).height || 0, 90);

  const firmaImg = dataUrlABuffer(liquidador?.firmaCliente);
  if (firmaImg?.buffer && workbook) {
    try {
      const imageId = workbook.addImage({
        buffer: aUint8(firmaImg.buffer),
        extension: firmaImg.extension || 'png',
      });
      sheet.addImage(imageId, {
        tl: { col: 3.2, row: 37.15 },
        ext: { width: 280, height: 70 },
        editAs: 'oneCell',
      });
    } catch {
      /* ok */
    }
  }
}

function rellenarAnalisisGeneral(sheet, analisis) {
  setVal(sheet, 9, 3, txt(analisis.ubicacionEvento) || null);
  setVal(sheet, 10, 3, txt(analisis.coaseguro) || null);

  const descripcion = txt(analisis.descripcionEvento);
  setVal(sheet, 11, 3, descripcion || null);
  const celdaDesc = sheet.getCell(11, 3);
  celdaDesc.alignment = {
    wrapText: true,
    vertical: 'top',
    horizontal: 'left',
  };
  const lineasDesc = Math.max(
    5,
    Math.ceil((descripcion || '').length / 55),
    String(descripcion || '').split(/\n/).length + 2
  );
  sheet.getRow(11).height = Math.min(280, Math.max(80, lineasDesc * 15));
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
  if (obs) {
    const celdaObs = sheet.getCell(29, 3);
    celdaObs.alignment = {
      wrapText: true,
      vertical: 'top',
    };
    sheet.getRow(29).height = Math.min(120, Math.max(30, Math.ceil(obs.length / 70) * 14));
  }

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
  });

  // Un solo valor por fila (C:F) — evita que se vea repetido en 4 columnas
  [9, 10, 11, 12, 13, 14, 15, 16, 17, 28, 29, 30].forEach((row) => {
    remergeValorAnalisis(sheet, row);
  });
}

/** Deja el texto solo en C y recombina C:F (corrige columnas repetidas). */
function remergeValorAnalisis(sheet, row) {
  const cellC = sheet.getCell(row, 3);
  const valor = cellC.value;
  const alignment = cellC.alignment
    ? { ...cellC.alignment }
    : { wrapText: true, vertical: 'top', horizontal: 'left' };
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
  const COL_W = 18; // unidades Excel por columna C–F
  const PX_POR_UNIDAD = 7;
  for (let col = 3; col <= 6; col += 1) {
    sheet.getColumn(col).width = Math.max(sheet.getColumn(col).width || 0, COL_W);
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
 * Anexos: 2 fotos por fila + descripción debajo. Sin mapa duplicado.
 */
async function insertarFotosAnexos(workbook, sheet, fotos = [], rowOffset = 0) {
  if (!sheet) return;

  const filaTitulo = 30 + rowOffset;
  const startRow = filaTitulo + 1;
  const lista = Array.isArray(fotos) ? fotos.filter(Boolean) : [];

  if (!lista.length) {
    setVal(sheet, filaTitulo, 3, 'Sin anexos fotográficos');
    remergeValorAnalisis(sheet, filaTitulo);
    sheet.getRow(filaTitulo).height = 28;
    return;
  }

  const resueltas = [];
  for (let i = 0; i < lista.length; i += 1) {
    const img = await resolverBufferFoto(lista[i]);
    if (!img?.buffer) continue;
    resueltas.push({
      img,
      descripcion: txt(lista[i]?.descripcion) || `Foto ${i + 1}`,
    });
  }

  setVal(
    sheet,
    filaTitulo,
    3,
    resueltas.length
      ? `Anexos fotográficos (${resueltas.length})`
      : `Anexos: ${lista.length} foto(s) no se pudieron embeber`
  );
  remergeValorAnalisis(sheet, filaTitulo);
  sheet.getRow(filaTitulo).height = 24;

  if (!resueltas.length) return;

  for (let col = 3; col <= 6; col += 1) {
    sheet.getColumn(col).width = Math.max(sheet.getColumn(col).width || 0, 22);
  }

  const FOTO_W = 300;
  const FOTO_H = 200;
  const pares = Math.ceil(resueltas.length / 2);

  for (let p = 0; p < pares; p += 1) {
    const rowImg = startRow + p * 2;
    const rowDesc = rowImg + 1;
    sheet.getRow(rowImg).height = 160;
    sheet.getRow(rowDesc).height = 42;

    const izq = resueltas[p * 2];
    const der = resueltas[p * 2 + 1];

    for (let col = 3; col <= 6; col += 1) {
      sheet.getCell(rowImg, col).value = null;
      sheet.getCell(rowDesc, col).value = null;
    }

    if (izq) {
      try {
        sheet.mergeCells(rowDesc, 3, rowDesc, 4);
      } catch {
        /* ok */
      }
      setVal(sheet, rowDesc, 3, izq.descripcion);
      sheet.getCell(rowDesc, 4).value = null;
      sheet.getCell(rowDesc, 3).alignment = {
        wrapText: true,
        vertical: 'top',
        horizontal: 'center',
      };

      const id = workbook.addImage({
        buffer: aUint8(izq.img.buffer),
        extension: izq.img.extension || 'jpeg',
      });
      sheet.addImage(id, {
        tl: { col: 2.15, row: rowImg - 1 + 0.05 },
        ext: { width: FOTO_W, height: FOTO_H },
        editAs: 'oneCell',
      });
    }

    if (der) {
      try {
        sheet.mergeCells(rowDesc, 5, rowDesc, 6);
      } catch {
        /* ok */
      }
      setVal(sheet, rowDesc, 5, der.descripcion);
      sheet.getCell(rowDesc, 6).value = null;
      sheet.getCell(rowDesc, 5).alignment = {
        wrapText: true,
        vertical: 'top',
        horizontal: 'center',
      };

      const id = workbook.addImage({
        buffer: aUint8(der.img.buffer),
        extension: der.img.extension || 'jpeg',
      });
      sheet.addImage(id, {
        tl: { col: 4.15, row: rowImg - 1 + 0.05 },
        ext: { width: FOTO_W, height: FOTO_H },
        editAs: 'oneCell',
      });
    }
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
  await insertarFotosAnexos(workbook, hojaAg, informe.fotosInspeccion || [], filasMapa || 0);

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
