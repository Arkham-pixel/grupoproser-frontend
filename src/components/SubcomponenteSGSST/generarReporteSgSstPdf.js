import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import siluetaPath from '../../assets/sg-sst/silueta-path.json';
import {
  CRITERIOS_EVALUACION,
  ESTADOS_ITEM,
  PERFIL_META,
  calificacionDeItem,
  calcularPuntaje,
  calcularResumenPorGrupo,
  formatearValorPct,
  itemsPorPerfil,
} from '../../config/sgSst0312.js';

const ROJO = [185, 28, 28];
const GRIS = [55, 65, 81];
const GRIS_CLARO = [243, 244, 246];
const GRIS_BORDE = [229, 231, 235];

const ZONAS_CORPORALES = [
  { etiqueta: 'Cabeza', capitulo: 'Recursos y liderazgo', grupoId: 'recursos' },
  { etiqueta: 'Cuello', capitulo: 'Gestión integral / política', grupoId: 'gestion_integral' },
  { etiqueta: 'Pecho', capitulo: 'Medicina preventiva / salud', grupoId: 'gestion_salud' },
  { etiqueta: 'Brazos', capitulo: 'Capacitación', grupoId: 'capacitacion' },
  { etiqueta: 'Manos', capitulo: 'Verificación / procedimientos', grupoId: 'verificar' },
  { etiqueta: 'Piernas', capitulo: 'Gestión de peligros', grupoId: 'peligros' },
  { etiqueta: 'Pies', capitulo: 'Plan de emergencias', grupoId: 'amenazas' },
];

function nivelColor(nivel) {
  if (nivel === 'ACEPTABLE') return [5, 150, 105];
  if (nivel === 'MODERADO') return [217, 119, 6];
  return [220, 38, 38];
}

function nivelColorHex(nivel) {
  if (nivel === 'ACEPTABLE') return '#059669';
  if (nivel === 'MODERADO') return '#d97706';
  return '#dc2626';
}

function nivelLiquidHex(nivel) {
  if (nivel === 'ACEPTABLE') return '#10b981';
  if (nivel === 'MODERADO') return '#f59e0b';
  return '#ef4444';
}

function nivelSoftHex(nivel) {
  if (nivel === 'ACEPTABLE') return '#86efac';
  if (nivel === 'MODERADO') return '#fde68a';
  return '#fecaca';
}

function nivelLabel(nivel) {
  if (nivel === 'ACEPTABLE') return 'ACEPTABLE';
  if (nivel === 'MODERADO') return 'MODERADAMENTE ACEPTABLE';
  return 'CRÍTICO';
}

function colorPct(pct) {
  if (pct > 85) return [5, 150, 105];
  if (pct >= 60) return [217, 119, 6];
  return [220, 38, 38];
}

function estadoTexto(est) {
  if (est === ESTADOS_ITEM.CUMPLE) return 'Cumple';
  if (est === ESTADOS_ITEM.NO_CUMPLE) return 'No cumple';
  if (est === ESTADOS_ITEM.NO_APLICA) return 'No aplica';
  return 'Pendiente';
}

function labelCiclo(ciclo) {
  // Orden largo→corto: si se quita "I. " primero, "II. HACER" → "IHACER".
  return String(ciclo || '')
    .replace(/^IV\.\s*/i, '')
    .replace(/^III\.\s*/i, '')
    .replace(/^II\.\s*/i, '')
    .replace(/^I\.\s*/i, '');
}

/** Helvetica de jsPDF no soporta ≤/tildes; normaliza para el PDF. */
function textoPdf(s) {
  return String(s ?? '')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function ensureSpace(doc, y, needed, margin = 14) {
  const pageH = doc.internal.pageSize.getHeight();
  // Reserva espacio para nota al pie sobre No aplica + número de página
  if (y + needed > pageH - 28) {
    doc.addPage();
    return margin;
  }
  return y;
}

function tituloSeccion(doc, text, margin, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...GRIS);
  doc.text(textoPdf(text), margin, y);
  return y + 6;
}

function rgbCss(rgb) {
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

/** Gauge semicircular vía canvas (mismo arco 210° → -30° que Recharts). */
function crearGaugeDataUrl({ pct, color, size = 280 }) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2 + 8;
  const outer = size * 0.38;
  const inner = outer * 0.72;
  const start = (210 * Math.PI) / 180;
  const totalSweep = (240 * Math.PI) / 180;
  const fillSweep = totalSweep * Math.min(1, Math.max(0, pct / 100));

  const drawArc = (a0, a1, fill) => {
    ctx.beginPath();
    ctx.arc(cx, cy, outer, a0, a1, true);
    ctx.arc(cx, cy, inner, a1, a0, false);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };

  drawArc(start, start - totalSweep, '#e5e7eb');
  if (fillSweep > 0.001) drawArc(start, start - fillSweep, rgbCss(color));
  return canvas.toDataURL('image/png');
}

function dibujarGauge(doc, { cx, cy, rMm, pct, color, label, sub }) {
  const dataUrl = crearGaugeDataUrl({ pct, color });
  const size = rMm * 2.2;
  doc.addImage(dataUrl, 'PNG', cx - size / 2, cy - size / 2 - 2, size, size);
  doc.setTextColor(...GRIS);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(formatearValorPct(pct), cx, cy - 1, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setTextColor(...color);
  const labelLines = doc.splitTextToSize(label, rMm * 2);
  doc.text(labelLines, cx, cy + 5, { align: 'center' });
  doc.setTextColor(140);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(sub, cx, cy + 5 + labelLines.length * 3.2, { align: 'center' });
}

function dibujarKpis(doc, { x, y, width, items }) {
  const gap = 3;
  const cardW = (width - gap * (items.length - 1)) / items.length;
  const cardH = 22;
  items.forEach((it, i) => {
    const cx = x + i * (cardW + gap);
    doc.setDrawColor(...GRIS_BORDE);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cx, y, cardW, cardH, 1.5, 1.5, 'FD');
    doc.setFontSize(6.5);
    doc.setTextColor(140);
    doc.setFont('helvetica', 'bold');
    doc.text(String(it.label).toUpperCase(), cx + 2.5, y + 5.5);
    doc.setFontSize(12);
    doc.setTextColor(...(it.color || GRIS));
    doc.text(String(it.value), cx + 2.5, y + 13);
    doc.setFontSize(6);
    doc.setTextColor(140);
    doc.setFont('helvetica', 'normal');
    doc.text(String(it.sub || ''), cx + 2.5, y + 18.5);
  });
  return y + cardH;
}

function dibujarPhvaCards(doc, { x, y, width, ciclos, colorNivel }) {
  const gap = 3;
  const cols = 2;
  const cardW = (width - gap) / cols;
  const cardH = 22;
  let maxY = y;
  ciclos.forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = x + col * (cardW + gap);
    const cy = y + row * (cardH + gap);
    doc.setDrawColor(...GRIS_BORDE);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(cx, cy, cardW, cardH, 1.5, 1.5, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'bold');
    doc.text(labelCiclo(c.ciclo).toUpperCase(), cx + 3, cy + 5.5);
    doc.setTextColor(...GRIS);
    doc.text(`${c.pct}%`, cx + cardW - 3, cy + 5.5, { align: 'right' });
    const barX = cx + 3;
    const barY = cy + 9;
    const barW = cardW - 6;
    doc.setFillColor(...GRIS_CLARO);
    doc.roundedRect(barX, barY, barW, 3.5, 1, 1, 'F');
    const fillW = Math.max(0, Math.min(barW, (c.pct / 100) * barW));
    doc.setFillColor(...colorNivel);
    if (fillW > 0) doc.roundedRect(barX, barY, fillW, 3.5, 1, 1, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(140);
    doc.text(`${c.obtenido}/${c.posible} pts · peso ${c.peso}%`, cx + 3, cy + 18);
    maxY = Math.max(maxY, cy + cardH);
  });
  return maxY;
}

function dibujarBarrasHorizontales(doc, { x, y, width, items, maxLabel = 42 }) {
  let cursorY = y;
  const barH = 5;
  const gap = 8;
  for (const it of items) {
    const label = String(it.label || '').slice(0, maxLabel);
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x, cursorY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${it.pct}%`, x + width, cursorY, { align: 'right' });
    cursorY += 2;
    doc.setFillColor(...GRIS_CLARO);
    doc.roundedRect(x, cursorY, width, barH, 1, 1, 'F');
    const fillW = Math.max(0, Math.min(width, (Number(it.pct) / 100) * width));
    doc.setFillColor(...colorPct(it.pct));
    if (fillW > 0) doc.roundedRect(x, cursorY, fillW, barH, 1, 1, 'F');
    cursorY += gap;
  }
  return cursorY;
}

/** Distribución de estados (dona vía canvas). */
function crearDonaDataUrl(slices, size = 220) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const outer = size * 0.42;
  const inner = outer * 0.55;
  const total = slices.reduce((s, it) => s + it.value, 0) || 1;
  let angle = -Math.PI / 2;
  slices.forEach((sl) => {
    if (!sl.value) return;
    const sweep = (sl.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, outer, angle, angle + sweep, false);
    ctx.arc(cx, cy, inner, angle + sweep, angle, true);
    ctx.closePath();
    ctx.fillStyle = rgbCss(sl.color);
    ctx.fill();
    angle += sweep;
  });
  ctx.fillStyle = '#111827';
  ctx.font = `bold ${Math.round(size * 0.12)}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(total), cx, cy - size * 0.02);
  ctx.fillStyle = '#9ca3af';
  ctx.font = `${Math.round(size * 0.055)}px Helvetica, Arial, sans-serif`;
  ctx.fillText('ítems', cx, cy + size * 0.08);
  return canvas.toDataURL('image/png');
}

function dibujarDonaEstados(doc, { cx, cy, rMm, slices }) {
  const dataUrl = crearDonaDataUrl(slices);
  const size = rMm * 2;
  doc.addImage(dataUrl, 'PNG', cx - size / 2, cy - size / 2, size, size);
}

async function renderSiluetaPng(pct, nivel) {
  const vb = String(siluetaPath.viewBox || '0 0 161 385').split(/\s+/).map(Number);
  const [, , vbW = 161, vbH = 385] = vb;
  const fillTop = ((100 - pct) / 100) * vbH;
  const fillHeight = (pct / 100) * vbH;
  const color = nivelColorHex(nivel);
  const liquid = nivelLiquidHex(nivel);
  const soft = nivelSoftHex(nivel);
  const pathD = siluetaPath.d;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${vbW * 2}" height="${vbH * 2}" viewBox="0 0 ${vbW} ${vbH}">
  <defs>
    <clipPath id="body"><path d="${pathD}"/></clipPath>
    <clipPath id="fill"><rect x="-2" y="${fillTop}" width="${vbW + 4}" height="${Math.max(fillHeight, 0)}"/></clipPath>
    <linearGradient id="g" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="62%" stop-color="${liquid}"/>
      <stop offset="100%" stop-color="${soft}"/>
    </linearGradient>
  </defs>
  <path d="${pathD}" fill="#e8eef5"/>
  <path d="${pathD}" fill="none" stroke="#94a3b8" stroke-width="1.2" stroke-linejoin="round" opacity="0.55"/>
  <g clip-path="url(#body)">
    <g clip-path="url(#fill)">
      <rect x="-2" y="0" width="${vbW + 4}" height="${vbH}" fill="url(#g)"/>
      <rect x="-2" y="${fillTop}" width="${vbW + 4}" height="10" fill="#ffffff" opacity="0.28"/>
    </g>
  </g>
</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = vbW * 2;
    canvas.height = vbH * 2;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Genera el informe ejecutivo PDF de la autoevaluación Res. 0312.
 * Incluye las mismas gráficas de la UI: KPIs, gauge, PHVA, estándares, silueta y mapa corporal.
 */
export async function generarReporteSgSstPdf({ caso, respuestasMap }) {
  const perfilId = caso?.perfilId;
  const progreso = calcularPuntaje(perfilId, respuestasMap);
  const resumen = calcularResumenPorGrupo(perfilId, respuestasMap);
  const items = itemsPorPerfil(perfilId);
  const meta = PERFIL_META[perfilId] || {};
  const color = nivelColor(progreso.nivel);
  const label = nivelLabel(progreso.nivel);

  let siluetaDataUrl = null;
  try {
    siluetaDataUrl = await renderSiluetaPng(progreso.pct, progreso.nivel);
  } catch {
    siluetaDataUrl = null;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 16;

  // Encabezado
  doc.setFillColor(...ROJO);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(textoPdf('Informe ejecutivo SG-SST - Resolucion 0312 de 2019'), margin, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(textoPdf(`${caso?.numeroCaso || ''} · Generado ${new Date().toLocaleString('es-CO')}`), margin, 20);

  y = 38;
  y = tituloSeccion(doc, '1. Datos de la empresa (portada)', margin, y);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: ROJO, textColor: 255 },
    head: [['Campo', 'Valor']],
    body: [
      ['Empresa', textoPdf(caso?.empresa?.nombre || '—')],
      ['NIT', textoPdf(caso?.empresa?.nit || '—')],
      ['Trabajadores directos', String(caso?.empresa?.numTrabajadores ?? '—')],
      ['Trabajadores indirectos', String(caso?.empresa?.numTrabajadoresIndirectos ?? '—')],
      ['Clase de riesgo', caso?.empresa?.claseRiesgo || '—'],
      [
        'Ciudad / Depto.',
        textoPdf(`${caso?.empresa?.ciudad || '—'} / ${caso?.empresa?.departamento || '—'}`),
      ],
      ['Sector economico', textoPdf(caso?.empresa?.sectorEconomico || '—')],
      [
        'Realizado por',
        textoPdf(`${caso?.empresa?.realizadoPor || '—'} · ${caso?.empresa?.cargoRealizadoPor || ''}`),
      ],
      ['Perfil evaluacion', textoPdf(`${perfilId || '—'} - ${meta.titulo || ''}`)],
      ['Estado del caso', caso?.estadoCaso || '—'],
      ['Archivos de evidencia', String(caso?.archivos?.length || 0)],
    ],
  });
  y = doc.lastAutoTable.finalY + 10;

  // 2. Resultado global + KPIs
  y = ensureSpace(doc, y, 55, margin);
  y = tituloSeccion(doc, '2. Resultado global y KPIs', margin, y);
  y = dibujarKpis(doc, {
    x: margin,
    y,
    width: contentW,
    items: [
      { label: 'Calificación', value: formatearValorPct(progreso.pct), sub: label, color },
      { label: 'Cumple', value: String(progreso.cumple), sub: 'ítems marcados', color: [5, 150, 105] },
      {
        label: 'No cumple',
        value: String(progreso.noCumple),
        sub: 'requieren plan',
        color: [220, 38, 38],
      },
      {
        label: 'Pendientes',
        value: String(progreso.pendientesAplicables),
        sub: `de ${progreso.totalAplicables} aplicables`,
        color: [100, 116, 139],
      },
    ],
  });
  y += 8;

  // Resumen de estándares (UX; mismos contadores derivados del puntaje oficial)
  const noAplicaPerfil = Math.max(0, progreso.totalItems - progreso.totalAplicables);
  const pctDilig =
    progreso.totalAplicables > 0
      ? Math.round((progreso.respondidosAplicables / progreso.totalAplicables) * 1000) / 10
      : 100;
  y = ensureSpace(doc, y, 42, margin);
  y = tituloSeccion(doc, '2.1 Resumen de estandares y diligenciamiento', margin, y);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [71, 85, 105], textColor: 255 },
    head: [['Concepto', 'Cantidad', 'Nota']],
    body: [
      ['Total de estandares', String(progreso.totalItems), 'Formulario Art. 27'],
      ['Exigibles para esta empresa', String(progreso.totalAplicables), 'Segun tamano y riesgo'],
      ['No aplica (auto)', String(noAplicaPerfil), 'No son incumplimientos'],
      [
        'Respondidos (exigibles)',
        String(progreso.respondidosAplicables),
        'Cumple o No cumple',
      ],
      [
        'Pendientes (exigibles)',
        String(progreso.pendientesAplicables),
        'Sin diligenciar',
      ],
      [
        'Progreso de diligenciamiento',
        `${pctDilig}%`,
        `${progreso.respondidosAplicables} de ${progreso.totalAplicables} (no es % de cumplimiento)`,
      ],
    ],
  });
  y = doc.lastAutoTable.finalY + 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRIS);
  const infoNa = doc.splitTextToSize(
    textoPdf(
      'De acuerdo con la Resolucion 0312 de 2019, el numero de estandares exigibles depende del tamano de la empresa y su nivel de riesgo. Los estandares clasificados como "No aplica" no representan incumplimientos y no afectan la calificacion oficial.'
    ),
    contentW
  );
  doc.text(infoNa, margin, y);
  y += infoNa.length * 3.5 + 4;

  if (progreso.pendientesAplicables > 0) {
    y = ensureSpace(doc, y, 18, margin);
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(251, 191, 36);
    const warnLines = doc.splitTextToSize(
      textoPdf(
        'La evaluacion aun tiene estandares pendientes por diligenciar. El puntaje mostrado corresponde al calculo oficial de la Resolucion 0312 de 2019 para esta empresa, considerando unicamente los estandares que le son exigibles.'
      ),
      contentW - 4
    );
    const warnH = warnLines.length * 3.5 + 6;
    doc.roundedRect(margin, y - 2, contentW, warnH, 1.5, 1.5, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 53, 15);
    doc.text(warnLines, margin + 2, y + 3);
    y += warnH + 4;
  }

  const criterio = CRITERIOS_EVALUACION.find((c) => c.nivel === progreso.nivel);
  if (criterio) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(textoPdf('Accion recomendada (criterios ARL):'), margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(textoPdf(criterio.accion), contentW);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 4;
  }

  // 3. Página de gráficos dashboard
  doc.addPage();
  y = 16;
  y = tituloSeccion(doc, '3. Gráficos — Nivel de cumplimiento y PHVA', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.text('Meta Aceptable: >85%  ·  Moderado: 60–85%  ·  Crítico: <60%', margin, y);
  y += 8;

  // Gauge izquierda
  const gaugeCx = margin + 32;
  const gaugeCy = y + 28;
  dibujarGauge(doc, {
    cx: gaugeCx,
    cy: gaugeCy,
    rMm: 28,
    pct: progreso.pct,
    color,
    label,
    sub: `${progreso.obtenido} / ${progreso.posible}`,
  });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text('Nivel de cumplimiento', margin, y - 1);

  // PHVA derecha
  const phvaX = margin + 68;
  const phvaW = contentW - 68;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Cumplimiento por ciclo PHVA', phvaX, y - 1);
  const phvaBottom = dibujarPhvaCards(doc, {
    x: phvaX,
    y: y + 2,
    width: phvaW,
    ciclos: resumen.porCiclo,
    colorNivel: color,
  });
  y = Math.max(gaugeCy + 38, phvaBottom) + 10;

  // Dona de estados
  y = ensureSpace(doc, y, 55, margin);
  y = tituloSeccion(doc, '4. Gráfico — Distribución por estado de ítems', margin, y);
  const slices = [
    { label: 'Cumple', value: progreso.cumple, color: [5, 150, 105] },
    { label: 'No cumple', value: progreso.noCumple, color: [220, 38, 38] },
    { label: 'No aplica', value: progreso.noAplica, color: [156, 163, 175] },
    { label: 'Pendiente', value: progreso.pendientesAplicables, color: [100, 116, 139] },
  ];
  dibujarDonaEstados(doc, { cx: margin + 28, cy: y + 22, rMm: 20, slices });
  let leyY = y + 6;
  slices.forEach((sl) => {
    doc.setFillColor(...sl.color);
    doc.roundedRect(margin + 58, leyY - 2.5, 4, 4, 0.5, 0.5, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.setFont('helvetica', 'normal');
    doc.text(`${sl.label}: ${sl.value}`, margin + 65, leyY + 0.5);
    leyY += 7;
  });
  y = Math.max(y + 50, leyY + 4);

  // 5. Estándares
  doc.addPage();
  y = 16;
  y = tituloSeccion(doc, '5. Gráfico — Desempeño por estándar', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.text('Barras según % obtenido sobre el peso de cada estándar del formato', margin, y);
  y += 6;
  y = dibujarBarrasHorizontales(doc, {
    x: margin,
    y,
    width: contentW,
    maxLabel: 48,
    items: resumen.porGrupo.map((g) => ({
      label: textoPdf(g.nombreCorto || g.titulo),
      pct: g.pct,
    })),
  });

  // 6. Silueta + mapa corporal
  doc.addPage();
  y = 16;
  y = tituloSeccion(doc, '6. Infografía — Silueta de cumplimiento SG-SST', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.text(
    'Silueta humana vectorial con relleno líquido según el porcentaje global de Estándares Mínimos.',
    margin,
    y
  );
  y += 6;

  const silW = 42;
  const silH = 100;
  if (siluetaDataUrl) {
    doc.addImage(siluetaDataUrl, 'PNG', margin + 8, y, silW, silH);
  } else {
    doc.setDrawColor(...GRIS_BORDE);
    doc.roundedRect(margin + 8, y, silW, silH, 2, 2, 'S');
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text('Silueta no disponible', margin + 8 + silW / 2, y + silH / 2, { align: 'center' });
  }

  // Escala lateral
  [100, 75, 50, 25, 0].forEach((m) => {
    const sy = y + ((100 - m) / 100) * silH;
    doc.setFontSize(6);
    doc.setTextColor(140);
    doc.text(`${m}%`, margin + 4, sy + 1.5, { align: 'right' });
    doc.setDrawColor(200);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin + 6, sy, margin + 8 + silW, sy);
    doc.setLineDashPattern([], 0);
  });

  const infoX = margin + 58;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text('CUMPLIMIENTO GLOBAL', infoX, y + 8);
  doc.setFontSize(28);
  doc.setTextColor(...color);
  doc.text(formatearValorPct(progreso.pct), infoX, y + 22);
  doc.setFillColor(...color);
  doc.roundedRect(infoX, y + 28, 58, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(label, infoX + 29, y + 33.5, { align: 'center' });

  doc.setDrawColor(...GRIS_BORDE);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(infoX, y + 42, 80, 28, 2, 2, 'FD');
  doc.setTextColor(140);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('DISTANCIA AL 100%', infoX + 3, y + 48);
  const restante = Math.round((100 - progreso.pct) * 10) / 10;
  doc.setFontSize(16);
  doc.setTextColor(...GRIS);
  doc.text(formatearValorPct(restante), infoX + 3, y + 58);
  doc.setFillColor(...GRIS_CLARO);
  doc.roundedRect(infoX + 3, y + 62, 74, 3.5, 1, 1, 'F');
  doc.setFillColor(...color);
  const fillRest = Math.min(74, (progreso.pct / 100) * 74);
  if (fillRest > 0) doc.roundedRect(infoX + 3, y + 62, fillRest, 3.5, 1, 1, 'F');

  // Métricas silueta
  const metricas = [
    { label: 'Puntaje obtenido', value: `${progreso.obtenido} / ${progreso.posible}` },
    { label: 'Estándares evaluados', value: String(progreso.totalAplicables) },
    { label: 'Cumplidos', value: String(progreso.cumple) },
    { label: 'Pendientes', value: String(progreso.pendientesAplicables) },
  ];
  const metY = y + silH + 8;
  const metW = (contentW - 9) / 4;
  metricas.forEach((m, i) => {
    const mx = margin + i * (metW + 3);
    doc.setDrawColor(...GRIS_BORDE);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(mx, metY, metW, 16, 1.5, 1.5, 'FD');
    doc.setFontSize(6);
    doc.setTextColor(140);
    doc.setFont('helvetica', 'bold');
    doc.text(m.label.toUpperCase(), mx + 2, metY + 5);
    doc.setFontSize(10);
    doc.setTextColor(...GRIS);
    doc.text(m.value, mx + 2, metY + 12);
  });

  // Mapa corporal
  let mapY = metY + 24;
  mapY = ensureSpace(doc, mapY, 70, margin);
  mapY = tituloSeccion(doc, '7. Mapa corporal por capítulo', margin, mapY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text('Relación orientativa entre zonas del cuerpo y capítulos de la Res. 0312.', margin, mapY);
  mapY += 5;

  const pctPorGrupo = {};
  for (const g of resumen.porGrupo || []) pctPorGrupo[g.id] = g.pct;
  const zonas = ZONAS_CORPORALES.map((z) => ({
    ...z,
    pct: pctPorGrupo[z.grupoId] ?? progreso.pct,
  }));

  const zCols = 4;
  const zGap = 3;
  const zW = (contentW - zGap * (zCols - 1)) / zCols;
  const zH = 20;
  zonas.forEach((z, i) => {
    const col = i % zCols;
    const row = Math.floor(i / zCols);
    const zx = margin + col * (zW + zGap);
    const zy = mapY + row * (zH + zGap);
    const zc = colorPct(z.pct);
    doc.setDrawColor(...GRIS_BORDE);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(zx, zy, zW, zH, 1.5, 1.5, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRIS);
    doc.text(z.etiqueta, zx + 2.5, zy + 5);
    doc.setTextColor(...zc);
    doc.text(formatearValorPct(z.pct), zx + zW - 2.5, zy + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(140);
    doc.text(String(z.capitulo).slice(0, 28), zx + 2.5, zy + 9.5);
    doc.setFillColor(...GRIS_CLARO);
    doc.roundedRect(zx + 2.5, zy + 12.5, zW - 5, 3, 1, 1, 'F');
    const zw = Math.min(zW - 5, (z.pct / 100) * (zW - 5));
    doc.setFillColor(...zc);
    if (zw > 0) doc.roundedRect(zx + 2.5, zy + 12.5, zw, 3, 1, 1, 'F');
  });

  // 8. Tabla de valores
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...GRIS);
  doc.text('8. Tabla de valores y calificación', margin, 16);

  const filas = items.map((it) => {
    const est = respuestasMap[it.id]?.estado || '';
    const pts = calificacionDeItem(it.valor, est);
    return [
      it.codigo,
      textoPdf(it.item),
      formatearValorPct(it.valor),
      estadoTexto(est),
      formatearValorPct(pts),
      it.aplica ? 'Si' : 'N/A auto',
    ];
  });

  autoTable(doc, {
    startY: 20,
    margin: { left: margin, right: margin },
    head: [['Código', 'Ítem', 'Valor', 'Estado', 'Calif.', 'Aplica']],
    body: filas,
    styles: { fontSize: 7, cellPadding: 1.4 },
    headStyles: { fillColor: ROJO, textColor: 255, fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 16 },
      2: { cellWidth: 14 },
      3: { cellWidth: 20 },
      4: { cellWidth: 14 },
      5: { cellWidth: 16 },
    },
  });

  // 9. Plan de mejora
  const noCumplen = items.filter(
    (it) => it.aplica && respuestasMap[it.id]?.estado === ESTADOS_ITEM.NO_CUMPLE
  );
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...GRIS);
  doc.text('9. Plan de acción — ítems que no cumplen', margin, 16);
  if (noCumplen.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('No hay ítems aplicables marcados como No cumple.', margin, 24);
  } else {
    autoTable(doc, {
      startY: 20,
      margin: { left: margin, right: margin },
      head: [['Código', 'Ítem', 'Plan de acción', 'Responsable', 'Plazo']],
      body: noCumplen.map((it) => {
        const r = respuestasMap[it.id] || {};
        return [it.codigo, it.item, r.planAccion || '—', r.responsable || '—', r.fechaPlazo || '—'];
      }),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: ROJO, textColor: 255 },
    });
  }

  // 10. Criterios
  let cy = (doc.lastAutoTable?.finalY || 30) + 12;
  cy = ensureSpace(doc, cy, 50, margin);
  cy = tituloSeccion(doc, '10. Criterios de evaluacion (nivel oficial 0312)', margin, cy);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRIS);
  const introCrit = doc.splitTextToSize(
    textoPdf(
      `Estos umbrales interpretan el cumplimiento oficial (${formatearValorPct(progreso.pct)} - ${label}). El avance de diligenciamiento es independiente: ${progreso.respondidosAplicables} de ${progreso.totalAplicables} estandares exigibles.`
    ),
    contentW
  );
  doc.text(introCrit, margin, cy);
  cy += introCrit.length * 3.5 + 4;
  doc.setFontSize(8);
  for (const c of CRITERIOS_EVALUACION) {
    const activo = c.nivel === progreso.nivel ? ' <- tu nivel oficial' : '';
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRIS);
    doc.text(textoPdf(`${c.titulo} (${c.rango})${activo}`), margin, cy);
    cy += 4;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(textoPdf(c.accion), contentW);
    doc.text(lines, margin, cy);
    cy += lines.length * 3.8 + 4;
    cy = ensureSpace(doc, cy, 20, margin);
  }

  // 11. Evidencias
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...GRIS);
  doc.text('11. Inventario de evidencias adjuntas', margin, 16);
  const archivos = caso?.archivos || [];
  if (!archivos.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Sin archivos adjuntos en este caso.', margin, 24);
  } else {
    autoTable(doc, {
      startY: 20,
      margin: { left: margin, right: margin },
      head: [['Ítem', 'Archivo', 'Tamaño (KB)', 'Fecha']],
      body: archivos.map((a) => [
        a.itemId || '—',
        a.nombreOriginal || a.nombreArchivo || '—',
        a.tamaño ? String(Math.round(a.tamaño / 1024)) : '—',
        a.fechaSubida ? new Date(a.fechaSubida).toLocaleDateString('es-CO') : '—',
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: ROJO, textColor: 255 },
    });
  }

  // Nota legal / pie sobre No aplica (todas las páginas)
  const notaNa = textoPdf(
    'Nota: Los estandares marcados como No aplica fueron determinados automaticamente conforme a la Resolucion 0312 de 2019, teniendo en cuenta el tamano de la empresa y su clasificacion de riesgo. Estos estandares no constituyen incumplimientos y no afectan la calificacion oficial.'
  );
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(6);
    doc.setTextColor(110);
    const notaLines = doc.splitTextToSize(notaNa, contentW);
    const notaY = pageH - 8 - notaLines.length * 2.6;
    doc.text(notaLines, margin, notaY);
    doc.setFontSize(7);
    doc.setTextColor(140);
    doc.text(
      `ARNALD Data Flow · SG-SST 0312 · ${caso?.numeroCaso || ''} · Pagina ${i}/${totalPages}`,
      pageW / 2,
      pageH - 4,
      { align: 'center' }
    );
  }

  const bytes = doc.output('arraybuffer');
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const nombre = `${caso?.numeroCaso || 'SGSST'}_Informe_Ejecutivo_0312.pdf`;
  return { blob, nombre, bytes: new Uint8Array(bytes), progreso, resumen };
}

/** CSV de tabla de valores para el paquete. */
export function generarTablaValoresCsv({ caso, respuestasMap }) {
  const items = itemsPorPerfil(caso?.perfilId);
  const sep = ';';
  const header = [
    'codigo',
    'item',
    'valor',
    'estado',
    'calificacion',
    'aplica',
    'evidencias',
    'planAccion',
    'responsable',
    'fechaPlazo',
    'recursos',
    'fundamentos',
  ].join(sep);
  const rows = items.map((it) => {
    const r = respuestasMap[it.id] || {};
    const est = r.estado || '';
    const pts = calificacionDeItem(it.valor, est);
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return [
      it.codigo,
      esc(it.item),
      it.valor,
      estadoTexto(est),
      pts,
      it.aplica ? 'si' : 'no',
      esc(r.evidencias),
      esc(r.planAccion),
      esc(r.responsable),
      esc(r.fechaPlazo),
      esc(r.recursos),
      esc(r.fundamentos),
    ].join(sep);
  });
  return `\uFEFF${header}\n${rows.join('\n')}`;
}
