import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import {
  OCULTAR_EVALUACION_Y_DICTAMEN_NSR10,
  calcularCriterioFinal,
  calcularTotalesPresupuesto,
  fusionarPortadaConFormData,
  normalizarItemsRespuesta,
  parseMontoNsr10,
  totalFilaPresupuesto,
} from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import {
  formatearMonto,
  formatDateLarga,
  prefillNsrDesdeCasoSura,
} from './liquidadorSuraHelpers.js';

/** Landscape A4 — compacto, alineado a plantilla Excel / UI NSR-10. */
const PAGE_W = 297;
const PAGE_H = 210;
const M = 6;
const BOTTOM = PAGE_H - M - 3;

const INK = [30, 30, 30];
const GRID = [140, 140, 140];
const HEADER = [31, 78, 121];
const BEIGE = [220, 220, 210];
const PEACH = [255, 228, 196];
const GREEN_ROW = [217, 234, 211];
const WHITE = [255, 255, 255];
const SOFT = [245, 247, 250];

function money(valor) {
  if (valor == null || valor === '') return '—';
  const n = parseMontoNsr10(valor);
  if (n == null) return '—';
  return `$ ${formatearMonto(n)}`;
}

function txt(v, fallback = '—') {
  const s = String(v ?? '').trim();
  if (!s || s === 'null' || s === 'undefined') return fallback;
  return s;
}

function fmtFecha(value) {
  if (value == null || value === '') return '—';
  try {
    const raw = String(value).trim();
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return formatDateLarga(value);
  } catch {
    return String(value);
  }
}

function pctLabel(frac) {
  const n = Number(frac);
  if (!Number.isFinite(n)) return '0%';
  return `${Math.round(n * 100)}%`;
}

function strokeRect(doc, x, y, w, h, width = 0.15) {
  doc.setDrawColor(...GRID);
  doc.setLineWidth(width);
  doc.rect(x, y, w, h);
}

function fillRect(doc, x, y, w, h, rgb) {
  doc.setFillColor(...rgb);
  doc.rect(x, y, w, h, 'F');
}

function framePage(doc) {
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.4);
  doc.rect(M, M, PAGE_W - M * 2, PAGE_H - M * 2);
}

function newPage(doc) {
  doc.addPage();
  framePage(doc);
  return M + 3;
}

function ensureSpace(doc, y, need) {
  if (y + need <= BOTTOM) return y;
  return newPage(doc);
}

function band(doc, x, y, w, h, title) {
  fillRect(doc, x, y, w, h, HEADER);
  strokeRect(doc, x, y, w, h, 0.25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text(title, x + 2.5, y + h * 0.7);
  doc.setTextColor(...INK);
}

function cellText(doc, text, x, y, maxW, { align = 'left', bold = false, size = 5.5 } = {}) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...INK);
  const lines = doc.splitTextToSize(String(text ?? ''), Math.max(maxW, 2));
  doc.text(lines[0] || '', x, y, { align });
}

function resolverPortada(liquidador) {
  const evalData = liquidador?.evaluacionSismicaNSR10 || {};
  const enc = liquidador?.encabezado || {};
  return fusionarPortadaConFormData(evalData.portada || {}, {
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
}

/**
 * PDF NSR-10: Portada + Evaluación + Criterio + Dictamen en pág.1 si caben;
 * Presupuesto (tabla Excel + caja de totales como en la UI) en pág.2.
 */
export async function generarLiquidadorSuraPdfBlob(liquidador) {
  const evalData = liquidador?.evaluacionSismicaNSR10 || {};
  const enc = liquidador?.encabezado || {};
  const portada = resolverPortada(liquidador || {});
  const items = normalizarItemsRespuesta(evalData.items);
  const criterio = calcularCriterioFinal(items);
  const presupuesto = evalData.presupuesto || {};
  const filasPres = (Array.isArray(presupuesto.items) ? presupuesto.items : []).filter(
    (it) =>
      String(it?.actividad || '').trim() ||
      String(it?.componente || '').trim() ||
      String(it?.capitulo || '').trim() ||
      (parseMontoNsr10(it?.cantidad) || 0) > 0 ||
      (parseMontoNsr10(it?.valorUnitario) || 0) > 0
  );
  const totalesPres = calcularTotalesPresupuesto(presupuesto);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setProperties({
    title: `Evaluación Sísmica NSR-10 Sura - ${enc.siniestro || enc.asegurado || ''}`,
    creator: 'Arnald DataFlow',
  });

  const x = M + 2.5;
  const w = PAGE_W - M * 2 - 5;
  framePage(doc);
  let y = M + 3;

  // ── Portada (2 columnas) ──
  band(doc, x, y, w, 5.5, 'EVALUACIÓN SÍSMICA NSR-10 — PORTADA / DATOS DE INSPECCIÓN');
  y += 6.2;

  const gap = 3;
  const colW = (w - gap) / 2;
  const labW = 38;
  const valW = colW - labW;
  const kvH = 4;
  const left = [
    ['Asegurado', txt(portada.asegurado)],
    ['Póliza', txt(portada.poliza)],
    ['Municipio', txt(portada.municipio)],
    ['Dirección', txt(portada.direccion)],
    ['Inspector', txt(portada.inspector)],
    ['Siniestro', txt(enc.siniestro)],
  ];
  const right = [
    ['Fecha inspección', fmtFecha(portada.fechaInspeccion)],
    ['Fecha sismo', fmtFecha(portada.fechaSismo)],
    ['Tipología', txt(portada.tipologiaPrincipal)],
    ['Entorno', txt(portada.entorno)],
    ['Pisos / Uso', `${txt(portada.numeroPisos)} / ${txt(portada.uso)}`],
    ['Versión', txt(portada.versionInforme, 'EVALUACIÓN PRELIMINAR')],
  ];
  const drawKv = (ox, rows) => {
    rows.forEach(([lab, val], i) => {
      const cy = y + i * kvH;
      fillRect(doc, ox, cy, labW, kvH, PEACH);
      strokeRect(doc, ox, cy, labW, kvH);
      strokeRect(doc, ox + labW, cy, valW, kvH);
      cellText(doc, lab, ox + 1.2, cy + kvH * 0.7, labW - 2, { bold: true, size: 6 });
      cellText(doc, val, ox + labW + 1.2, cy + kvH * 0.7, valW - 2.2, { size: 6 });
    });
  };
  drawKv(x, left);
  drawKv(x + colW + gap, right);
  y += Math.max(left.length, right.length) * kvH + 2;

  if (!OCULTAR_EVALUACION_Y_DICTAMEN_NSR10) {
  // ── Evaluación ──
  band(doc, x, y, w, 5, 'EVALUACIÓN — CHECKLIST POST-SISMO');
  y += 5.5;

  const evalW = [22, 12, 36, 24, 10, 18, 40, w - 162];
  const evalL = [
    'COMPONENTE',
    'CÓDIGO',
    'ELEMENTO',
    'ESTADO',
    'PUNT.',
    'INTERV.',
    'OBSERVACIÓN',
    'ACCIÓN',
  ];
  const hHead = 5;
  const hRow = 3.5;

  const drawEvalHead = () => {
    let cx = x;
    fillRect(doc, x, y, w, hHead, HEADER);
    evalL.forEach((lab, i) => {
      strokeRect(doc, cx, y, evalW[i], hHead);
      doc.setTextColor(...WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.text(lab, cx + evalW[i] / 2, y + hHead * 0.68, { align: 'center' });
      doc.setTextColor(...INK);
      cx += evalW[i];
    });
    y += hHead;
  };

  drawEvalHead();
  items.forEach((it, idx) => {
    y = ensureSpace(doc, y, hRow + 0.2);
    if (y <= M + 4) drawEvalHead();
    let cx = x;
    if (idx % 2 === 0) fillRect(doc, x, y, w, hRow, SOFT);
    [
      it.componente || '',
      it.codigo || '',
      it.elemento || '',
      it.estado || '',
      it.puntaje == null ? '' : String(it.puntaje),
      it.requiereIntervencion || '',
      it.observacion || '',
      it.accionSugerida || '',
    ].forEach((val, i) => {
      strokeRect(doc, cx, y, evalW[i], hRow);
      cellText(doc, val, cx + 0.5, y + hRow * 0.72, evalW[i] - 1, { size: 5 });
      cx += evalW[i];
    });
    y += hRow;
  });

  // ── Criterio final (como Excel: Indicador | Resultado) ──
  y += 2;
  y = ensureSpace(doc, y, 28);
  band(doc, x, y, w, 5, 'CRITERIO FINAL AUTOMÁTICO');
  y += 5.5;

  const critLeftW = w * 0.42;
  const critRows = [
    ['Puntaje máximo observado', txt(criterio.puntajeMaximo)],
    ['Categoría asignada', txt(criterio.categoria)],
    ['Habitabilidad', txt(criterio.habitabilidad)],
    ['Urgencia', txt(criterio.urgencia)],
    ['¿Requiere evacuación?', txt(criterio.evacuacion)],
  ];
  const cLab = critLeftW * 0.48;
  const cVal = critLeftW - cLab;
  const cH = 4;
  critRows.forEach(([lab, val], i) => {
    const cy = y + i * cH;
    fillRect(doc, x, cy, cLab, cH, PEACH);
    strokeRect(doc, x, cy, cLab, cH);
    strokeRect(doc, x + cLab, cy, cVal, cH);
    cellText(doc, lab, x + 1.2, cy + cH * 0.7, cLab - 2, { bold: true, size: 5.5 });
    cellText(doc, val, x + cLab + 1.2, cy + cH * 0.7, cVal - 2, { size: 5.5 });
  });

  // Concepto a la derecha del criterio
  const concX = x + critLeftW + 3;
  const concW = w - critLeftW - 3;
  const concH = critRows.length * cH;
  fillRect(doc, concX, y, concW, concH, SOFT);
  strokeRect(doc, concX, y, concW, concH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...HEADER);
  doc.text('CONCEPTO TÉCNICO PRELIMINAR', concX + 2, y + 3.2);
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  const conceptoLines = doc.splitTextToSize(txt(criterio.concepto), concW - 4);
  conceptoLines.slice(0, 5).forEach((ln, i) => {
    doc.text(ln, concX + 2, y + 6.5 + i * 2.8);
  });
  y += concH + 2.5;

  // ── Dictamen: bloque compacto (sin recuadro vacío ni texto pisado) ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const dmgLines = doc.splitTextToSize(txt(criterio.descripcionDanios), w - 6);
  const dictLines = doc.splitTextToSize(txt(criterio.dictamen), w - 6);
  const dmgShow = dmgLines.slice(0, 4);
  const dictShow = dictLines.slice(0, 6);
  const lineH = 3.2;
  const pad = 2.5;
  const titleH = 4;
  const gapTitles = 2;
  const bodyH =
    titleH +
    dmgShow.length * lineH +
    gapTitles +
    titleH +
    dictShow.length * lineH;
  const boxH = pad + bodyH + pad;
  const bandH = 5;
  const needDictamen = bandH + 1.5 + boxH + 2;

  if (y + needDictamen > BOTTOM) {
    y = newPage(doc);
  }

  band(doc, x, y, w, bandH, 'DICTAMEN PRELIMINAR');
  y += bandH + 1.5;

  // Caja ajustada al texto (sin hueco enorme abajo)
  fillRect(doc, x, y, w, boxH, SOFT);
  strokeRect(doc, x, y, w, boxH, 0.25);
  let ty = y + pad + 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...HEADER);
  doc.text('Descripción de los daños', x + 3, ty);
  ty += titleH;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...INK);
  dmgShow.forEach((ln) => {
    doc.text(ln, x + 3, ty);
    ty += lineH;
  });
  ty += gapTitles;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...HEADER);
  doc.text('Dictamen', x + 3, ty);
  ty += titleH;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...INK);
  dictShow.forEach((ln) => {
    doc.text(ln, x + 3, ty);
    ty += lineH;
  });

  y += boxH + 2;
  }

  // ── Presupuesto: nueva página solo si no cabe la tabla ──
  const needPresupuestoMin = 50;
  if (y + needPresupuestoMin > BOTTOM) {
    y = newPage(doc);
  }

  band(doc, x, y, w, 5.5, 'PRESUPUESTO DE INTERVENCIÓN / REPARACIÓN POST-SISMO');
  y += 6.5;
  const presupuestoTableTop = y;

  // Anchos proporcionales a la plantilla Excel
  const rawW = [24, 28, 48, 11, 12, 16, 17, 13, 18, 28, 20];
  const sumRaw = rawW.reduce((a, b) => a + b, 0);
  const tableW = w * 0.72;
  const boxW = w - tableW - 3;
  const boxX = x + tableW + 3;
  const presW = rawW.map((n) => (n / sumRaw) * tableW);
  const presL = [
    'Capítulo',
    'Componente',
    'Actividad / reparación',
    'Unidad',
    'Cantidad',
    'Vlr. unitario',
    'Vlr. total',
    'Prioridad',
    '¿Cubierto?',
    'Observación',
    'Fuente',
  ];
  const pHead = 7;
  const pRow = 4;

  const drawPresHead = () => {
    let cx = x;
    fillRect(doc, x, y, tableW, pHead, HEADER);
    presL.forEach((lab, i) => {
      strokeRect(doc, cx, y, presW[i], pHead);
      doc.setTextColor(...WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4.6);
      const lines = doc.splitTextToSize(lab, presW[i] - 0.8);
      doc.text(lines, cx + presW[i] / 2, y + 2.4, { align: 'center' });
      doc.setTextColor(...INK);
      cx += presW[i];
    });
    y += pHead;
  };

  drawPresHead();
  const lista = filasPres.length ? filasPres : [{ actividad: '—' }];
  const minRows = Math.max(lista.length, 6);
  for (let idx = 0; idx < minRows; idx += 1) {
    y = ensureSpace(doc, y, pRow + 0.2);
    if (y <= M + 4) drawPresHead();
    const it = lista[idx] || {};
    const tot = totalFilaPresupuesto(it);
    const vals = [
      it.capitulo || '',
      it.componente || '',
      it.actividad || '',
      it.unidad || '',
      it.cantidad === '' || it.cantidad == null ? '' : String(it.cantidad),
      it.valorUnitario === '' || it.valorUnitario == null ? '' : money(it.valorUnitario),
      tot == null ? '' : money(tot),
      it.prioridad || '',
      it.cubierto || '',
      it.observacion || '',
      it.fuente || '',
    ];
    let cx = x;
    if (idx % 2 === 0) fillRect(doc, x, y, tableW, pRow, SOFT);
    vals.forEach((val, i) => {
      strokeRect(doc, cx, y, presW[i], pRow);
      const right = i >= 4 && i <= 6;
      cellText(
        doc,
        val,
        right ? cx + presW[i] - 0.5 : cx + 0.4,
        y + pRow * 0.72,
        presW[i] - 0.9,
        { align: right ? 'right' : 'left', size: 5 }
      );
      cx += presW[i];
    });
    y += pRow;
  }

  // Caja de totales a la derecha (como en la UI del liquidador)
  const boxTop = presupuestoTableTop;
  const boxRows = [
    ['Subtotal', money(totalesPres.subtotal), false],
    [`AIU (${pctLabel(totalesPres.aiuPct)})`, money(totalesPres.aiu), false],
    [`Imprevistos (${pctLabel(totalesPres.imprPct)})`, money(totalesPres.imprevistos), false],
    [`Impuestos (${pctLabel(totalesPres.impPct)})`, money(totalesPres.impuestos), false],
    ['Total estimado', money(totalesPres.total), true],
  ];
  const boxRowH = 7;
  const totalesBoxH = 8 + boxRows.length * boxRowH + 4;
  fillRect(doc, boxX, boxTop, boxW, totalesBoxH, WHITE);
  strokeRect(doc, boxX, boxTop, boxW, totalesBoxH, 0.35);
  fillRect(doc, boxX, boxTop, boxW, 7, HEADER);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text('TOTALES', boxX + boxW / 2, boxTop + 4.8, { align: 'center' });
  doc.setTextColor(...INK);

  boxRows.forEach(([lab, val, strong], i) => {
    const cy = boxTop + 9 + i * boxRowH;
    if (strong) fillRect(doc, boxX + 1.5, cy - 1, boxW - 3, boxRowH - 0.5, GREEN_ROW);
    doc.setFont('helvetica', strong ? 'bold' : 'normal');
    doc.setFontSize(7);
    doc.text(lab, boxX + 3, cy + 3.5);
    doc.setFont('helvetica', 'bold');
    doc.text(val, boxX + boxW - 3, cy + 3.5, { align: 'right' });
    if (!strong) {
      doc.setDrawColor(...GRID);
      doc.setLineWidth(0.1);
      doc.line(boxX + 2.5, cy + boxRowH - 1.2, boxX + boxW - 2.5, cy + boxRowH - 1.2);
    }
  });

  return doc.output('blob');
}

export async function descargarLiquidadorSuraPdf(liquidador, totales) {
  const blob = await generarLiquidadorSuraPdfBlob(liquidador, totales);
  const enc = liquidador?.encabezado || {};
  const safe = String(enc.siniestro || enc.consecutivo || 'NSR10')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 40);
  saveAs(blob, `Evaluacion_Sismica_NSR10_Sura_${safe}.pdf`);
}
