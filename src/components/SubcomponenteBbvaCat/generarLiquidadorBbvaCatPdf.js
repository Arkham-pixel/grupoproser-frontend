import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { formatearMonto } from './liquidadorBbvaCatHelpers.js';
import {
  LOGO_BBVA_URL,
  calcularTotalesFormatoExcelBbvaCat,
  esValorGlobal,
  etiquetaAiuBbvaCat,
} from './formatoLiquidacionBbvaCat.js';
import { inferirTipoLiquidadorBbvaCat, textosLetrerosBbvaCat } from './deduciblesBbvaCat.js';

const PAGE_W = 297;
const PAGE_H = 210;
const M = 8;
const NAVY = [0, 68, 129];
const GOLD = [249, 228, 183];
const INK = [30, 30, 30];
const GRID = [160, 160, 160];
const WHITE = [255, 255, 255];

function money(valor) {
  if (valor == null || valor === '') return '—';
  if (esValorGlobal(valor)) return 'Valor Global';
  return `$ ${formatearMonto(Number(valor) || 0)}`;
}

function txt(v, fallback = '—') {
  const s = String(v ?? '').trim();
  if (!s || s === 'null' || s === 'undefined') return fallback;
  return s;
}

async function logoDataUrl() {
  try {
    const res = await fetch(LOGO_BBVA_URL);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const u8 = new Uint8Array(buf);
    let binary = '';
    u8.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return `data:image/png;base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

/**
 * PDF del formato Excel LIQUIDACIÓN DE INDEMNIZACION BBVA.
 */
export async function generarLiquidadorBbvaCatPdfBlob(liquidador, totales) {
  const enc = liquidador?.encabezado || {};
  const excel = totales?.formatoExcel || calcularTotalesFormatoExcelBbvaCat(liquidador);
  const tipos = excel.tiposDeducible || {};
  const tipo = inferirTipoLiquidadorBbvaCat({
    tipoLiquidador: liquidador?.tipoLiquidador,
    encabezado: enc,
  });
  const textos = textosLetrerosBbvaCat(tipo);
  const detalle = (excel.detalle || []).filter((it) => String(it?.descripcion || '').trim());
  const logo = await logoDataUrl();

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setProperties({
    title: `Liquidación BBVA CAT - ${enc.siniestro || enc.asegurado || ''}`,
    creator: 'Arnald DataFlow',
  });

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', M, 6, 32, 12);
    } catch {
      /* ok */
    }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text('LIQUIDACIÓN DE INDEMNIZACION', PAGE_W / 2, 14, { align: 'center' });
  doc.setFontSize(8);
  doc.text(
    tipo === 'leasing' ? 'Liquidador leasing' : 'Liquidador deudores',
    PAGE_W - M,
    14,
    { align: 'right' }
  );
  doc.setTextColor(...INK);

  const meta = [
    ['Póliza', txt(enc.poliza)],
    ['Siniestro', txt(enc.siniestro)],
    ['Asegurado', txt(enc.asegurado)],
    ['Vigencia', `${txt(enc.vigenciaDesde)} – ${txt(enc.vigenciaHasta)}`],
    ['Fecha siniestro', txt(enc.fechaSiniestro)],
    ['Ramo', txt(enc.ramoAfectado || 'TERREMOTO')],
    ['Evento', txt(enc.evento || enc.causa)],
    ['Valor global', money(excel.valorGlobal)],
    ['SMMLV', `${tipos.smmlvQty || 3} × $ ${formatearMonto(tipos.valorSmmlv)}`],
    ['Porcentaje', `${Math.round((tipos.porcentaje || 0) * 10000) / 100} %`],
  ];
  let y = 22;
  const colW = (PAGE_W - M * 2) / 5;
  meta.forEach((pair, i) => {
    const cx = M + (i % 5) * colW;
    if (i % 5 === 0 && i) y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text(pair[0].toUpperCase(), cx, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(doc.splitTextToSize(pair[1], colW - 3)[0] || '', cx, y + 4);
  });
  y += 10;

  doc.setFillColor(...GOLD);
  doc.rect(M, y, PAGE_W - M * 2, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(
    `Deducible aplicable (${tipos.tipoAplicadoLabel || 'MAX'}): $ ${formatearMonto(
      excel.deducibleAplicable
    )}   ·   SMMLV $ ${formatearMonto(tipos.montoSmmlv)}   ·   % $ ${formatearMonto(
      tipos.montoPct
    )}   ·   USD $ ${formatearMonto(tipos.montoUsd)}   ·   Pesos $ ${formatearMonto(
      tipos.montoPesos
    )}`,
    M + 2,
    y + 5.2
  );
  y += 11;

  const headers = [
    '#',
    'Descripción del bien',
    'V. asegurado',
    'Asegurable',
    'Pérdida',
    'Demérito',
    'Pérd. indemnizable',
  ];
  const widths = [10, 90, 35, 35, 35, 22, 42];
  const tableW = widths.reduce((a, b) => a + b, 0);
  doc.setFillColor(...NAVY);
  doc.rect(M, y, tableW, 7, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  let cx = M;
  headers.forEach((h, i) => {
    doc.text(h, cx + 1, y + 4.6);
    cx += widths[i];
  });
  doc.setTextColor(...INK);
  y += 7;

  const rowH = 6;
  detalle.forEach((it, idx) => {
    if (y + rowH > PAGE_H - 40) {
      doc.addPage();
      y = M;
    }
    cx = M;
    const vals = [
      String(idx + 1),
      txt(it.descripcion),
      money(it.valorAsegurado),
      money(it.valorAsegurable),
      money(it.valorPerdida),
      String(it.demerito ?? 0),
      money(it.perdidaIndemnizable),
    ];
    vals.forEach((val, i) => {
      doc.setDrawColor(...GRID);
      doc.rect(cx, y, widths[i], rowH);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      const align = i >= 2 ? 'right' : 'left';
      const tx = align === 'right' ? cx + widths[i] - 1 : cx + 1;
      doc.text(doc.splitTextToSize(val, widths[i] - 2)[0] || '', tx, y + 4, { align });
      cx += widths[i];
    });
    y += rowH;
  });

  if (y + 22 > PAGE_H - 28) {
    doc.addPage();
    y = M;
  }
  const totX = M + tableW - 90;
  const totRows = [
    ['Sub total', money(excel.subTotal)],
    [etiquetaAiuBbvaCat(excel.aiuPct), money(excel.aiu)],
    ['Total', money(excel.totalConAiu)],
    ['Deducible (el mayor)', money(excel.deduciblePoliza ?? excel.deducibleAplicable)],
    ['Valor a indemnizar', money(excel.valorAIndemnizar)],
  ];
  totRows.forEach(([lab, val], i) => {
    const last = i === totRows.length - 1;
    if (last) doc.setFillColor(...NAVY);
    else if (i === 1) doc.setFillColor(...GOLD);
    else doc.setFillColor(...WHITE);
    doc.rect(totX, y, 90, 7, last ? 'F' : 'FD');
    doc.setTextColor(...(last ? WHITE : INK));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(lab, totX + 2, y + 4.8);
    doc.text(val, totX + 88, y + 4.8, { align: 'right' });
    y += 7;
  });
  doc.setTextColor(...INK);
  y += 6;

  if (y + 50 > PAGE_H - M) {
    doc.addPage();
    y = M;
  }

  const datos = liquidador?.datosFiniquito || {};
  const aceptacion = String(liquidador?.aceptacionIndemnizacion || '').toUpperCase();
  const marcaAcepto = aceptacion === 'ACEPTO' ? 'X' : ' ';
  const marcaRechazo = aceptacion === 'RECHAZO' ? 'X' : ' ';
  const meses = [
    '',
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
  const ciudadFirma = String(datos.ciudadFirma || enc.ciudad || '').trim() || '________________';
  const diaFirma = String(datos.diaFirma || '').trim() || '________';
  const mesFirma =
    meses[Number(datos.mesFirma)] || String(datos.mesFirma || '').trim() || '________';
  const anioFirma = String(datos.anioFirma || '').trim() || '________';
  const nombreFirmante =
    String(liquidador?.nombreFirmante || enc.asegurado || '').trim() || '________________';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const bloquesTexto = [textos.avisoDeducible, textos.pazYSalvo].filter(Boolean);
  bloquesTexto.forEach((t) => {
    const lines = doc.splitTextToSize(t, PAGE_W - M * 2);
    if (y + lines.length * 3.2 > PAGE_H - M) {
      doc.addPage();
      y = M;
    }
    doc.text(lines, M, y);
    y += lines.length * 3.2 + 2;
  });

  if (y + 12 > PAGE_H - M) {
    doc.addPage();
    y = M;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(
    `ACEPTO INDEMNIZACIÓN  ( ${marcaAcepto} )          RECHAZO INDEMNIZACIÓN  ( ${marcaRechazo} )`,
    PAGE_W / 2,
    y,
    { align: 'center' }
  );
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const fechaFirma = `En aceptación de lo anterior, firmamos el presente documento en la ciudad de ${ciudadFirma}, a los ${diaFirma} días del mes de ${mesFirma} de ${anioFirma}.`;
  {
    const lines = doc.splitTextToSize(fechaFirma, PAGE_W - M * 2);
    doc.text(lines, M, y);
    y += lines.length * 3.2 + 3;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('FIRMA DEL CLIENTE', M, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${nombreFirmante}`, M, y);
  y += 3;

  const firmaUrl = String(liquidador?.firmaCliente || '').trim();
  if (firmaUrl.startsWith('data:image')) {
    try {
      if (y + 28 > PAGE_H - M) {
        doc.addPage();
        y = M;
      }
      const formato = firmaUrl.includes('image/jpeg') || firmaUrl.includes('image/jpg') ? 'JPEG' : 'PNG';
      doc.addImage(firmaUrl, formato, M, y, 70, 22);
      y += 24;
    } catch {
      y += 2;
    }
  } else {
    doc.text('___________________________', M, y + 8);
    y += 14;
  }

  if (y + 20 > PAGE_H - M) {
    doc.addPage();
    y = M;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  {
    const lines = doc.splitTextToSize(textos.autorizacionPago, PAGE_W - M * 2);
    doc.text(lines, M, y);
    y += lines.length * 3.2 + 3;
  }

  const obs = txt(liquidador?.observacionesFiniquito, '');
  doc.setFont('helvetica', 'normal');
  {
    const t = obs ? `OBSERVACIONES: ${obs}` : 'OBSERVACIONES:';
    const lines = doc.splitTextToSize(t, PAGE_W - M * 2);
    if (y + lines.length * 3.2 > PAGE_H - M) {
      doc.addPage();
      y = M;
    }
    doc.text(lines, M, y);
  }

  return doc.output('blob');
}

export async function descargarLiquidadorBbvaCatPdf(liquidador, totales) {
  const blob = await generarLiquidadorBbvaCatPdfBlob(liquidador, totales);
  const enc = liquidador?.encabezado || {};
  const safe = String(enc.siniestro || enc.consecutivo || 'BBVA')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 40);
  saveAs(blob, `Liquidador_BBVA_CAT_${safe}.pdf`);
}
