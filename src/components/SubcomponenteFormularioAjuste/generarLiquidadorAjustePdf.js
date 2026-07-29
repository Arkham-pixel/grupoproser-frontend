import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function parsearNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return 0;
  if (typeof valor === 'number') return valor;

  let numero = String(valor).replace(/[^\d.,-]/g, '');
  if (numero.includes(',') && numero.includes('.')) {
    numero = numero.replace(/\./g, '').replace(',', '.');
  } else if (numero.includes('.') && !numero.includes(',')) {
    numero = numero.replace(/\./g, '');
  } else if (numero.includes(',')) {
    numero = numero.replace(',', '.');
  }

  const resultado = Number(numero);
  return Number.isFinite(resultado) ? resultado : 0;
}

function formatearMoneda(valor) {
  return `$ ${new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor)}`;
}

function nombreArchivoSeguro(valor) {
  return String(valor || 'sin-numero')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-');
}

/**
 * Genera un PDF independiente con el cuadro del liquidador.
 * No captura el DOM: reproduce los datos para evitar controles editables en el archivo.
 */
export function descargarLiquidadorAjustePdf(formData = {}) {
  const liquidador = formData.liquidador || {};
  const items = Array.isArray(liquidador.items) ? liquidador.items : [];
  const deduciblePorcentaje = Number(liquidador.deduciblePorcentaje ?? 15);
  const cantidadSMMLV = Number(liquidador.cantidadSMMLV ?? 4);
  const totalReclamado = items.reduce(
    (total, item) => total + parsearNumero(item.valorReclamado),
    0,
  );
  const totalAjustado = items.reduce(
    (total, item) => total + parsearNumero(item.valorAjustado),
    0,
  );
  const deduciblePorcentajeValor = totalAjustado * (deduciblePorcentaje / 100);
  const deducibleSMMLV = parsearNumero(liquidador.valorSMMLV) * cantidadSMMLV;
  const deducibleAplicable = Math.max(deduciblePorcentajeValor, deducibleSMMLV);
  const lucro = parsearNumero(liquidador.lucro);
  const gastos = parsearNumero(liquidador.gastos);
  const totalIndemnizar = totalAjustado - deducibleAplicable + gastos;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margen = 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('LIQUIDADOR', margen, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(
    `Siniestro: ${formData.numeroSiniestro || 'No registrado'}   |   Póliza: ${formData.numeroPoliza || 'No registrada'}`,
    margen,
    22,
  );
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 28,
    margin: { left: margen, right: margen },
    head: [[
      'BIEN AFECTADO',
      'LÍMITE ASEGURADO',
      'VALOR RECLAMADO',
      'VALOR AJUSTADO',
      'OBSERVACIÓN',
    ]],
    body: items.map((item) => [
      item.bienAfectado || '-',
      item.limiteAsegurado || '-',
      formatearMoneda(parsearNumero(item.valorReclamado)),
      formatearMoneda(parsearNumero(item.valorAjustado)),
      item.observacion || '-',
    ]),
    foot: [[
      { content: 'TOTAL', colSpan: 2 },
      formatearMoneda(totalReclamado),
      formatearMoneda(totalAjustado),
      '',
    ]],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [209, 250, 229], textColor: [6, 95, 70], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 45 },
      2: { cellWidth: 42 },
      3: { cellWidth: 42 },
      4: { cellWidth: 'auto' },
    },
  });

  const resumenY = (doc.lastAutoTable?.finalY || 28) + 10;
  autoTable(doc, {
    startY: resumenY,
    margin: { left: margen },
    tableWidth: 115,
    body: [
      ['Lucro', formatearMoneda(lucro)],
      ['Total del valor ajustado', formatearMoneda(totalAjustado)],
      [
        `Deducible aplicable (${deducibleSMMLV > deduciblePorcentajeValor ? `${cantidadSMMLV} SMMLV` : `${deduciblePorcentaje}%`})`,
        formatearMoneda(deducibleAplicable),
      ],
      ['Gastos', formatearMoneda(gastos)],
      ['Total a indemnizar', formatearMoneda(totalIndemnizar)],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 78 }, 1: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.row.index === 3) {
        data.cell.styles.fillColor = [209, 250, 229];
        data.cell.styles.textColor = [6, 95, 70];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  doc.save(`liquidador-${nombreArchivoSeguro(formData.numeroSiniestro || formData.numeroCaso)}.pdf`);
}
