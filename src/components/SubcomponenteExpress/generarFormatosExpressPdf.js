import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import {
  DOCUMENTOS_SOPORTE,
  etiquetaEstadoDocumento,
  formatearMonto,
  nombreAjustadorParaDocumento,
  NOTAS_SALVAMENTO,
  parsearNumero,
  pctDocumentosMarcados,
  totalesItemsAnalisis,
} from './liquidadorExpressHelpers.js';
import { loadZurichLogo } from './liquidadorExpressWordShared.js';
import zurichBannerUrl from '../../assets/zurich-banner-excel.png';

const AZUL_ZURICH = [0, 32, 96];
const AZUL_BORDE = [0, 112, 192];
const CELESTE_DOL = [0, 176, 240];
const GRIS_LABEL = [245, 245, 245];
const VERDE_TOTAL = [220, 252, 231];
/** Espacio reservado abajo para que el pie Zurich no tape filas de tablas. */
const MARGEN_INFERIOR_PIE = 24;

function nombreArchivoSeguro(valor) {
  return String(valor || 'documento')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
}

function moneda(valor) {
  return `$ ${formatearMonto(parsearNumero(valor))}`;
}

function fechaCorta(iso) {
  if (!iso) return '—';
  const raw = String(iso).slice(0, 10);
  const d = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('es-CO');
}

function textoOGuion(valor) {
  const t = String(valor ?? '').trim();
  return t || '—';
}

function marcarSiNo(valor) {
  return valor === 'SI' ? 'SI' : 'NO';
}

function arrayBufferToDataUrl(buffer, mime = 'image/png') {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

let bannerDataUrlCache = null;

async function loadZurichBannerDataUrl() {
  if (bannerDataUrlCache) return bannerDataUrlCache;
  try {
    const response = await fetch(zurichBannerUrl);
    const buffer = await response.arrayBuffer();
    bannerDataUrlCache = arrayBufferToDataUrl(buffer);
    return bannerDataUrlCache;
  } catch (err) {
    console.warn('[Express PDF] No se pudo cargar banner Zurich:', err);
    return null;
  }
}

async function loadZurichLogoDataUrl() {
  try {
    const buffer = await loadZurichLogo();
    return arrayBufferToDataUrl(buffer);
  } catch (err) {
    console.warn('[Express PDF] No se pudo cargar logo Zurich:', err);
    return null;
  }
}

function dibujarPieZurich(doc) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...AZUL_BORDE);
    doc.setLineWidth(0.35);
    doc.line(12, pageHeight - 16, pageWidth - 12, pageHeight - 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(40, 94, 160);
    doc.text('Zurich Colombia Seguros S.A.   |   NIT 860.002.534-0', pageWidth / 2, pageHeight - 11.5, {
      align: 'center',
    });
    doc.text('Calle 116 # 7-15 Of. 1201  |  T. +57 1 5188482 / 3190730', pageWidth / 2, pageHeight - 8, {
      align: 'center',
    });
    doc.text('Bogotá, Colombia', pageWidth / 2, pageHeight - 4.5, { align: 'center' });
    doc.setTextColor(0);
  }
}

/** Si el bloque manual quedaría sobre el pie, pasa a la siguiente página. */
function asegurarEspacioAntesDePie(doc, yActual, altoNecesario = 10) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const limite = pageHeight - MARGEN_INFERIOR_PIE;
  if (yActual + altoNecesario <= limite) return yActual;
  doc.addPage();
  return 16;
}

async function dibujarEncabezadoZurich(doc, { titulo, subtitulo }) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margen = 12;
  const [logoUrl, bannerUrl] = await Promise.all([
    loadZurichLogoDataUrl(),
    loadZurichBannerDataUrl(),
  ]);

  if (bannerUrl) {
    try {
      doc.addImage(bannerUrl, 'PNG', margen, 8, 52, 14);
    } catch {
      /* ignore */
    }
  }
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'PNG', pageWidth - margen - 38, 6, 36, 22);
    } catch {
      /* ignore */
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...AZUL_ZURICH);
  doc.text(titulo, pageWidth / 2, 36, { align: 'center' });
  if (subtitulo) {
    doc.setFontSize(10);
    doc.text(subtitulo, pageWidth / 2, 42, { align: 'center' });
  }
  doc.setTextColor(0);
  return 48;
}

function estilosTablaInfo() {
  return {
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 1.5,
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 52, fillColor: GRIS_LABEL },
      1: { cellWidth: 'auto' },
    },
  };
}

/**
 * PDF del check-list Express (layout alineado al Excel FORMATO-CHECK-LIST + branding Zurich).
 * @returns {Promise<{ blob: Blob, nombre: string, mime: string }>}
 */
export async function generarChecklistExpressPdfBlob(liquidador = {}, totales = {}) {
  const enc = liquidador.encabezado || {};
  const chk = liquidador.checklist || {};
  const items = Array.isArray(chk.itemsAnalisis) ? chk.itemsAnalisis : [];
  const { totalReclamado, totalAjustado } = totalesItemsAnalisis(items);
  const pct = pctDocumentosMarcados(chk.documentos);
  const nombreAjustador = nombreAjustadorParaDocumento(chk.ajustador) || '—';
  const reclamo = enc.reclamo || enc.zc || 'sin-reclamo';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margen = 12;
  let y = await dibujarEncabezadoZurich(doc, {
    titulo: 'FORMATO ÚNICO ATENCIÓN DE RECLAMOS EXPRESS',
    subtitulo: 'PROPERTY',
  });

  const vigencia =
    chk.vigenciaDesde || chk.vigenciaHasta
      ? `${fechaCorta(chk.vigenciaDesde)} al ${fechaCorta(chk.vigenciaHasta)}`
      : '—';
  const salvamentoTxt =
    chk.salvamento === 'Aplica' && chk.salvamentoDetalle
      ? `${chk.salvamento} | ${chk.salvamentoDetalle}`
      : textoOGuion(chk.salvamento);

  const filasInfo = [
    ['Fecha', fechaCorta(chk.fecha || new Date().toISOString().slice(0, 10))],
    ['ZC', textoOGuion(enc.zc)],
    ['STRO', textoOGuion(enc.reclamo)],
    ['Tipo de producto', textoOGuion(chk.tipoProducto)],
    ['Número de póliza', textoOGuion(enc.poliza)],
    ['Asegurado', textoOGuion(enc.asegurado)],
    ['Vigencia de la póliza', vigencia],
    ['D.O.L', fechaCorta(enc.fechaSiniestro)],
    ['Riesgo asegurado', textoOGuion(chk.riesgoAsegurado || enc.asegurado)],
    ['Cobertura afectada', textoOGuion(chk.coberturaAfectada || enc.cobertura)],
    ['Garantías', textoOGuion(chk.garantias || 'No Aplica')],
    ['Exclusiones', textoOGuion(chk.exclusiones || 'No Aplica')],
    ['Objeción', textoOGuion(chk.objecion || 'No Aplica')],
    ['Tipo de pérdida', textoOGuion(chk.tipoPerdida || 'Parcial')],
    ['Aplica demérito', textoOGuion(chk.aplicaDemerito || 'No Aplica')],
    ['Límite o valor asegurado', textoOGuion(chk.limiteAsegurado)],
    ['Pérdida ajustada', moneda(totales.totalPerdida)],
    ['Deducible', moneda(totales.deducibleAplicado)],
    ['Valor a indemnizar', moneda(totales.totalIndemnizar)],
    ['Salvamento', salvamentoTxt],
    ['Recobro', textoOGuion(chk.recobro || 'No Aplica')],
    ['Indicadores de fraude', textoOGuion(chk.indicadoresFraude || 'No Aplica')],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margen, right: margen, bottom: MARGEN_INFERIOR_PIE, top: 12 },
    body: filasInfo,
    ...estilosTablaInfo(),
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const label = String(filasInfo[data.row.index]?.[0] || '');
      if (label === 'D.O.L' && data.column.index === 1) {
        data.cell.styles.fillColor = CELESTE_DOL;
        data.cell.styles.fontStyle = 'bold';
      }
      if (
        (label === 'Pérdida ajustada' ||
          label === 'Deducible' ||
          label === 'Valor a indemnizar') &&
        data.column.index === 1
      ) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = (doc.lastAutoTable?.finalY || y) + 4;

  // Caja descripción del evento (como Excel)
  const desc = textoOGuion(chk.descripcionEvento);
  const descLines = doc.splitTextToSize(desc, 182);
  const descH = Math.max(12, descLines.length * 3.5 + 4);
  y = asegurarEspacioAntesDePie(doc, y, 6 + descH + 8);
  doc.setFillColor(...AZUL_ZURICH);
  doc.rect(margen, y, 186, 6, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Breve descripción del evento:', margen + 2, y + 4);
  doc.setTextColor(0);
  y += 6;
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.rect(margen, y, 186, descH);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(descLines, margen + 2, y + 4);
  y += descH + 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Ajustador - ${nombreAjustador}`, margen, y);

  autoTable(doc, {
    startY: y + 4,
    margin: { left: margen, right: margen, bottom: MARGEN_INFERIOR_PIE, top: 12 },
    head: [[{ content: 'DOCUMENTOS DE SOPORTE', colSpan: 3, styles: { halign: 'center' } }]],
    body: [
      [
        { content: 'N°', styles: { fontStyle: 'bold', fillColor: GRIS_LABEL, halign: 'center' } },
        { content: 'Documento de soporte', styles: { fontStyle: 'bold', fillColor: GRIS_LABEL } },
        { content: 'Estado', styles: { fontStyle: 'bold', fillColor: GRIS_LABEL, halign: 'center' } },
      ],
      ...DOCUMENTOS_SOPORTE.map((texto, idx) => [
        String(idx + 1),
        texto,
        etiquetaEstadoDocumento(chk.documentos?.[idx]) || '—',
      ]),
      [
        {
          content: 'Porcentaje de tareas finalizadas',
          colSpan: 2,
          styles: { fontStyle: 'bold', fillColor: GRIS_LABEL },
        },
        { content: `${pct}%`, styles: { fontStyle: 'bold', halign: 'center' } },
      ],
      [
        { content: '¿Reclamo formalizado?', styles: { fontStyle: 'bold', fillColor: GRIS_LABEL } },
        textoOGuion(chk.reclamoFormalizado || 'No'),
        fechaCorta(chk.fechaFormalizacion),
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: AZUL_ZURICH,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.3,
      valign: 'middle',
      lineColor: AZUL_BORDE,
      lineWidth: 0.25,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 28, halign: 'center' },
    },
  });

  autoTable(doc, {
    startY: (doc.lastAutoTable?.finalY || y) + 5,
    margin: { left: margen, right: margen, bottom: MARGEN_INFERIOR_PIE, top: 12 },
    head: [[{ content: 'ANÁLISIS DE LA PÉRDIDA', colSpan: 5, styles: { halign: 'center' } }]],
    body: [
      [
        { content: 'ITEM', styles: { fontStyle: 'bold', fillColor: GRIS_LABEL, halign: 'center' } },
        { content: 'DESCRIPCIÓN', styles: { fontStyle: 'bold', fillColor: GRIS_LABEL } },
        { content: 'V/R TOTAL (RECLAMADO)', styles: { fontStyle: 'bold', fillColor: GRIS_LABEL, halign: 'center' } },
        { content: 'V/R TOTAL (AJUSTADO)', styles: { fontStyle: 'bold', fillColor: GRIS_LABEL, halign: 'center' } },
        { content: 'OBSERVACIÓN', styles: { fontStyle: 'bold', fillColor: GRIS_LABEL } },
      ],
      ...(items.length > 0
        ? items.map((item, idx) => [
            String(idx + 1),
            item.descripcion || '—',
            moneda(item.reclamado),
            moneda(item.ajustado),
            item.observacion || '',
          ])
        : [['—', 'Sin ítems de análisis', '—', '—', '']]),
      [
        { content: 'TOTALES', colSpan: 2, styles: { fontStyle: 'bold', fillColor: VERDE_TOTAL } },
        { content: moneda(totalReclamado), styles: { fontStyle: 'bold', fillColor: VERDE_TOTAL, halign: 'right' } },
        { content: moneda(totalAjustado), styles: { fontStyle: 'bold', fillColor: VERDE_TOTAL, halign: 'right' } },
        { content: '', styles: { fillColor: VERDE_TOTAL } },
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: AZUL_ZURICH,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.3,
      valign: 'middle',
      lineColor: AZUL_BORDE,
      lineWidth: 0.25,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 36 },
    },
  });

  y = (doc.lastAutoTable?.finalY || y) + 5;
  const com = textoOGuion(chk.comentariosAdicionales || 'Para este caso no aplica');
  const comLines = doc.splitTextToSize(com, 182);
  const comH = Math.max(10, comLines.length * 3.5 + 4);
  y = asegurarEspacioAntesDePie(doc, y, 6 + comH + 8);
  doc.setFillColor(...AZUL_ZURICH);
  doc.rect(margen, y, 186, 6, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('COMENTARIOS ADICIONALES', margen + 2, y + 4);
  doc.setTextColor(0);
  y += 6;
  doc.setDrawColor(0);
  doc.rect(margen, y, 186, comH);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(comLines, margen + 2, y + 4);
  y += comH + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Ajustador - ${nombreAjustador}`, margen, y);

  dibujarPieZurich(doc);

  const blob = doc.output('blob');
  return {
    blob,
    nombre: `Checklist_Express_PDF_${nombreArchivoSeguro(reclamo)}.pdf`,
    mime: 'application/pdf',
  };
}

export async function descargarChecklistExpressPdf(liquidador, totales) {
  const { blob, nombre } = await generarChecklistExpressPdfBlob(liquidador, totales);
  saveAs(blob, nombre);
}

/**
 * PDF del formato de salvamento Express (branding Zurich).
 * @returns {Promise<{ blob: Blob, nombre: string, mime: string }>}
 */
export async function generarSalvamentoExpressPdfBlob(liquidador = {}) {
  const enc = liquidador.encabezado || {};
  const sal = liquidador.salvamento || {};
  const reclamo = enc.reclamo || 'sin-reclamo';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margen = 12;
  let y = await dibujarEncabezadoZurich(doc, {
    titulo: 'FORMATO SALVAMENTOS',
    subtitulo: 'PROPERTY — EXPRESS',
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margen, right: margen, bottom: MARGEN_INFERIOR_PIE, top: 12 },
    body: [
      ['Póliza', textoOGuion(enc.poliza)],
      ['Reclamo', textoOGuion(enc.reclamo)],
      ['Sub-tarea', textoOGuion(sal.subTarea || 'SALVAMENTO')],
      ['Asegurado', textoOGuion(enc.asegurado)],
    ],
    ...estilosTablaInfo(),
  });

  autoTable(doc, {
    startY: (doc.lastAutoTable?.finalY || y) + 5,
    margin: { left: margen, right: margen, bottom: MARGEN_INFERIOR_PIE, top: 12 },
    head: [[{ content: 'INFORMACIÓN DE SALVAMENTO', colSpan: 2, styles: { halign: 'center' } }]],
    body: [
      ['COMENTARIOS / Descripción', textoOGuion(sal.descripcion)],
      ['Cantidad (unidades)', textoOGuion(sal.cantidad)],
      ['Marca', textoOGuion(sal.marca || 'N/D')],
      ['Serial', textoOGuion(sal.serial || 'N/D')],
      ['Especificación del daño', textoOGuion(sal.especificacionDano)],
      ['Ubicación', textoOGuion(sal.ubicacion)],
      ['Contacto quien entrega', textoOGuion(sal.contactoEntrega)],
      ['Salvamento nacionalizado', marcarSiNo(sal.nacionalizado)],
      [
        'Genera costos por custodia',
        `${marcarSiNo(sal.generaCustodia)}${
          sal.valorCustodia ? `   Valor: ${moneda(sal.valorCustodia)}` : ''
        }`,
      ],
      ['Registro fotográfico', marcarSiNo(sal.registroFotografico)],
      [
        'Indemnizado',
        `${marcarSiNo(sal.indemnizado)}${
          sal.valorIndemnizado ? `   Valor: ${moneda(sal.valorIndemnizado)}` : ''
        }`,
      ],
      [
        'Oferta Non Cash',
        `${marcarSiNo(sal.ofertaNonCash)}${
          sal.valorNonCash ? `   Valor: ${moneda(sal.valorNonCash)}` : ''
        }`,
      ],
      ['Comentarios salvamento', textoOGuion(sal.comentarios)],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: AZUL_ZURICH,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    styles: {
      fontSize: 8,
      cellPadding: 1.8,
      valign: 'top',
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, fillColor: GRIS_LABEL },
      1: { cellWidth: 'auto' },
    },
  });

  y = (doc.lastAutoTable?.finalY || y) + 6;
  y = asegurarEspacioAntesDePie(doc, y, 20);
  doc.setFillColor(...AZUL_ZURICH);
  doc.rect(margen, y, 186, 6, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('NOTAS', margen + 2, y + 4);
  doc.setTextColor(0);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  NOTAS_SALVAMENTO.forEach((nota, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${nota}`, 186);
    y = asegurarEspacioAntesDePie(doc, y, lines.length * 3.5 + 2);
    doc.text(lines, margen, y);
    y += lines.length * 3.5 + 2;
  });

  dibujarPieZurich(doc);

  const blob = doc.output('blob');
  return {
    blob,
    nombre: `Salvamento_Express_PDF_${nombreArchivoSeguro(reclamo)}.pdf`,
    mime: 'application/pdf',
  };
}

export async function descargarSalvamentoExpressPdf(liquidador) {
  const { blob, nombre } = await generarSalvamentoExpressPdfBlob(liquidador);
  saveAs(blob, nombre);
}
