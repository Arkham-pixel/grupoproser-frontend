import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { formatearMonto, parsearNumero } from './liquidadorExpressHelpers.js';

function nombreArchivoSeguro(valor) {
  return String(valor || 'liquidador')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
}

function moneda(valor) {
  return `$ ${formatearMonto(parsearNumero(valor))}`;
}

/**
 * Genera PDF del liquidador Express (cuadro de conceptos + resumen).
 * @returns {{ blob: Blob, nombre: string, mime: string }}
 */
export function generarLiquidadorExpressPdfBlob(liquidador = {}, totales = {}) {
  const enc = liquidador.encabezado || {};
  const conceptos = Array.isArray(liquidador.conceptos) ? liquidador.conceptos : [];
  const reclamo = enc.reclamo || 'sin-reclamo';

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margen = 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('LIQUIDADOR EXPRESS', margen, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(
    [
      `Reclamo: ${enc.reclamo || '—'}`,
      `Asegurado: ${enc.asegurado || '—'}`,
      `Póliza: ${enc.poliza || '—'}`,
      `Amparo: ${enc.amparo || '—'}`,
    ].join('   |   '),
    margen,
    22,
    { maxWidth: 270 }
  );
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 28,
    margin: { left: margen, right: margen },
    head: [['CONCEPTO', 'DETALLE', 'VALOR']],
    body:
      conceptos.length > 0
        ? conceptos.map((item) => [
            item.concepto || '—',
            item.detalle || '—',
            moneda(item.valor),
          ])
        : [['—', 'Sin conceptos registrados', '—']],
    foot: [
      [
        { content: 'TOTAL PÉRDIDA', colSpan: 2, styles: { fontStyle: 'bold' } },
        moneda(totales.totalPerdida ?? 0),
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [254, 226, 226], textColor: [127, 29, 29], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2.2, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 45, halign: 'right' },
    },
  });

  const etiquetaMinimo =
    totales.tipoMinimo === 'SMDLV'
      ? `${totales.cantidadSMDLV ?? 0} SMDLV`
      : `${totales.cantidadSMMLV ?? 0} SMMLV`;

  const resumenY = (doc.lastAutoTable?.finalY || 28) + 8;
  autoTable(doc, {
    startY: resumenY,
    margin: { left: margen },
    tableWidth: 130,
    body: [
      ['Total pérdida', moneda(totales.totalPerdida ?? 0)],
      [
        `Deducible % (${totales.porcentaje ?? 0}%)`,
        moneda(totales.deduciblePorcentaje ?? 0),
      ],
      [`Deducible mínimo (${etiquetaMinimo})`, moneda(
        totales.tipoMinimo === 'SMDLV'
          ? totales.deducibleSMDLV ?? 0
          : totales.deducibleSMMLV ?? 0
      )],
      ['Deducible aplicado', moneda(totales.deducibleAplicado ?? 0)],
      ['Total a indemnizar', moneda(totales.totalIndemnizar ?? 0)],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 85 },
      1: { halign: 'right', cellWidth: 45 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 4) {
        data.cell.styles.fillColor = [254, 226, 226];
        data.cell.styles.textColor = [127, 29, 29];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  const blob = doc.output('blob');
  return {
    blob,
    nombre: `Liquidador_Express_PDF_${nombreArchivoSeguro(reclamo)}.pdf`,
    mime: 'application/pdf',
  };
}

export function descargarLiquidadorExpressPdf(liquidador, totales) {
  const { blob, nombre } = generarLiquidadorExpressPdfBlob(liquidador, totales);
  saveAs(blob, nombre);
}
