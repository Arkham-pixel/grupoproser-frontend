import { saveAs } from 'file-saver';
import { getUploadsUrlCandidates } from '../../config/apiConfig.js';
import { urlDescargaArchivoSura } from '../../services/segurosSuraService.js';
import { descripcionFotoNsr } from './syncFotosNsrAlInformeSura.js';
import { generarWorkbookLiquidadorSuraNsr } from './generarLiquidadorSuraExcel.js';
import {
  CAMPOS_INFORME_AGIL,
  defaultFotosAgilSura,
  defaultInformeAgilSura,
  defaultSalvamentoSura,
  fotosNsrDesdeLiquidador,
  valorActividadInformeAgil,
} from './informeAgilSuraHelpers.js';
import { calcularLiquidacionSura, defaultInformeUnicoSura, mapCasoSuraALiquidador } from './liquidadorSuraHelpers.js';
import { OCULTAR_EVALUACION_Y_DICTAMEN_NSR10 } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';

const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF333399' },
};
const HEADER_FONT = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
const LABEL_FONT = { name: 'Calibri', size: 10, bold: true };
const VALUE_FONT = { name: 'Calibri', size: 10 };
const THIN = { style: 'thin', color: { argb: 'FFB0B0B0' } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

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
    canvas.getContext('2d').drawImage(img, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return null;
    const buffer = await blob.arrayBuffer();
    return { buffer, extension: 'jpeg' };
  } catch {
    return null;
  }
}

async function resolverBufferFoto(item = {}) {
  if (item.fotoPreview && String(item.fotoPreview).startsWith('blob:')) {
    const fromBlob = await bufferDesdeBlobUrl(item.fotoPreview);
    if (fromBlob) return fromBlob;
  }
  if (item.preview && String(item.preview).startsWith('blob:')) {
    const fromBlob = await bufferDesdeBlobUrl(item.preview);
    if (fromBlob) return fromBlob;
  }
  const ruta = item.fotoRuta || item.ruta || '';
  if (!ruta) return null;
  const primary = urlDescargaArchivoSura(ruta);
  const candidatos = getUploadsUrlCandidates(ruta) || [];
  const urls = [...new Set([primary, ...candidatos].filter(Boolean))];
  for (const url of urls) {
    const img = await fetchImageBuffer(url);
    if (img) return img;
  }
  return null;
}

function estiloEncabezado(cell) {
  cell.fill = HEADER_FILL;
  cell.font = HEADER_FONT;
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
}

function pintarFilaLabelValor(sheet, row, num, label, valor) {
  sheet.getCell(row, 1).value = num;
  sheet.getCell(row, 1).font = LABEL_FONT;
  sheet.getCell(row, 1).border = BORDER;
  sheet.getCell(row, 1).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(row, 2).value = label;
  sheet.getCell(row, 2).font = LABEL_FONT;
  sheet.getCell(row, 2).border = BORDER;
  sheet.getCell(row, 2).alignment = { vertical: 'middle', wrapText: true };
  sheet.getCell(row, 3).value = valor == null || valor === '' ? null : valor;
  sheet.getCell(row, 3).font = VALUE_FONT;
  sheet.getCell(row, 3).border = BORDER;
  sheet.getCell(row, 3).alignment = { vertical: 'middle', wrapText: true };
}

function rellenarInformeAgil(sheet, informe) {
  sheet.name = 'InformeAgil';
  sheet.getColumn(1).width = 5;
  sheet.getColumn(2).width = 42;
  sheet.getColumn(3).width = 78;
  sheet.mergeCells(1, 1, 1, 3);
  estiloEncabezado(sheet.getCell(1, 1));
  sheet.getCell(1, 1).value = 'INFORME AGIL';
  sheet.getRow(1).height = 22;
  sheet.mergeCells(2, 2, 2, 3);
  estiloEncabezado(sheet.getCell(2, 1));
  estiloEncabezado(sheet.getCell(2, 2));
  sheet.getCell(2, 2).value = 'DATOS BÁSICOS DE LA PÓLIZA Y DEL EVENTO';
  sheet.getRow(2).height = 20;
  CAMPOS_INFORME_AGIL.forEach((campo) => {
    const valor =
      campo.key === 'actividad'
        ? valorActividadInformeAgil(informe)
        : informe?.[campo.key] || '';
    pintarFilaLabelValor(
      sheet,
      campo.row,
      campo.row - 2,
      campo.label,
      valor
    );
    sheet.getRow(campo.row).height = campo.tipo === 'textarea' ? 36 : 18;
  });
}

function tituloFotoAgil(item = {}) {
  const leyenda = String(item.descripcion || item.nombre || item.nombreOriginal || '').trim();
  if (leyenda) return leyenda;
  return descripcionFotoNsr(item);
}

function listaFotosParaExcel(fotosAgil, liquidador) {
  const propias = Array.isArray(fotosAgil)
    ? fotosAgil.filter((f) => f?.ruta || f?.fotoRuta || f?.preview || f?.fotoPreview || f?._id)
    : [];
  if (propias.length) return propias;
  return fotosNsrDesdeLiquidador(liquidador);
}

async function rellenarFotos(workbook, sheet, fotos = []) {
  sheet.name = 'FOTOS';
  sheet.getColumn(1).width = 48;
  sheet.getColumn(2).width = 48;
  estiloEncabezado(sheet.getCell(1, 1));
  sheet.mergeCells(1, 1, 1, 2);
  sheet.getCell(1, 1).value = 'FOTOS';
  if (!fotos.length) {
    sheet.getCell(3, 1).value = 'No hay fotos cargadas en la sección Fotos.';
    return;
  }
  let row = 3;
  for (let i = 0; i < fotos.length; i += 2) {
    const par = [fotos[i], fotos[i + 1]].filter(Boolean);
    sheet.getRow(row).height = 140;
    for (let c = 0; c < par.length; c++) {
      const item = par[c];
      const img = await resolverBufferFoto(item);
      sheet.getCell(row + 1, c + 1).value = tituloFotoAgil(item);
      sheet.getCell(row + 1, c + 1).font = VALUE_FONT;
      sheet.getCell(row + 1, c + 1).alignment = { wrapText: true };
      if (!img) continue;
      const imageId = workbook.addImage({
        buffer: img.buffer,
        extension: img.extension,
      });
      sheet.addImage(imageId, {
        tl: { col: c, row: row - 1 },
        ext: { width: 320, height: 180 },
        editAs: 'oneCell',
      });
    }
    row += 3;
  }
}

function rellenarDocumentos(sheet, informe, caso) {
  sheet.name = 'DOCUMENTOS';
  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 90;
  estiloEncabezado(sheet.getCell(1, 1));
  sheet.mergeCells(1, 1, 1, 2);
  sheet.getCell(1, 1).value = 'INFORME ÚNICO';
  const bloques = [
    ['Ajustador', informe.ajustadorNombre || caso?.ajustador || ''],
    ['Fecha informe', informe.fechaInforme || ''],
    ['Dirección riesgo', informe.direccionRiesgo || caso?.direccionPredio || ''],
    ['Coordenadas', informe.coordenadasRiesgo || ''],
    ['Información del evento', informe.infoEvento || ''],
    ['Descripción de daños', informe.descripcionDanios || ''],
    ['Análisis de cobertura', informe.analisisCobertura || ''],
    ['Conclusiones', informe.conclusiones || ''],
    ['Recomendación', informe.recomendacion || ''],
  ];
  bloques.forEach(([label, valor], idx) => {
    const r = idx + 3;
    sheet.getCell(r, 1).value = label;
    sheet.getCell(r, 1).font = LABEL_FONT;
    sheet.getCell(r, 1).border = BORDER;
    sheet.getCell(r, 2).value = valor || '';
    sheet.getCell(r, 2).font = VALUE_FONT;
    sheet.getCell(r, 2).border = BORDER;
    sheet.getCell(r, 2).alignment = { wrapText: true, vertical: 'top' };
    sheet.getRow(r).height = String(valor || '').length > 80 ? 60 : 22;
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
  });
}

function anexarResumenIndemnizacion(hojaPres, totales) {
  if (!hojaPres || !totales) return;
  const fila = 45;
  const filas = [
    ['Subtotal daños', totales.subtotal ?? totales.totalDanios ?? 0],
    ['Hospedaje', totales.diagrama?.gastosHospedaje ?? 0],
    ['Total a indemnizar', totales.totalIndemnizar ?? 0],
  ];
  filas.forEach(([label, valor], i) => {
    const r = fila + i;
    hojaPres.getCell(r, 4).value = label;
    hojaPres.getCell(r, 4).font = LABEL_FONT;
    hojaPres.getCell(r, 8).value = Number(valor) || 0;
    hojaPres.getCell(r, 8).font = LABEL_FONT;
    hojaPres.getCell(r, 8).numFmt = '"$" #,##0';
  });
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

export async function descargarFormatoAgilSuraExcel({
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
    liq
  );

  const workbook = await generarWorkbookLiquidadorSuraNsr(liq);
  workbook.creator = 'Grupo Proser';
  workbook.created = new Date();

  rellenarInformeAgil(workbook.addWorksheet('InformeAgil'), agil);
  anexarResumenIndemnizacion(workbook.getWorksheet('Presupuesto'), tot);
  await rellenarFotos(workbook, workbook.addWorksheet('FOTOS'), fotos);
  rellenarDocumentos(workbook.addWorksheet('DOCUMENTOS'), informe, casoSura);
  rellenarSalvamento(workbook.addWorksheet('SALVAMENTO'), sal);
  ordenarHojasFormatoAgil(workbook);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const nro = casoSura.siniestro || casoSura.consecutivo || 'SURA';
  saveAs(blob, `Formato_Agil_SURA_${String(nro).replace(/[^\w.-]+/g, '_')}.xlsx`);
}
