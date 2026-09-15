import ExcelJS from 'exceljs';
import { etiquetaTipoPolizaBbvaCat, formatDate } from './bbvaCatHelpers.js';
import { construirResumenReunionBbvaCat } from './dashboardBbvaCatListadoStats.js';

const COLOR_BBVA = '004481';
const COLOR_BBVA_SOFT = 'E8F1F8';
const COLOR_HEADER_TXT = 'FFFFFF';
const COLOR_GRID = 'D0D7DE';

/** Misma fila que el Excel del reporte listado BBVA CAT. */
export function buildExportRowListadoBbvaCat(caso = {}) {
  return {
    Consecutivo: caso.consecutivo ?? '',
    ZC: caso.zc ?? '',
    STRO: caso.siniestro ?? '',
    'TIPO IDENTIFICACIÓN': caso.tipoIdentificacion ?? '',
    IDENTIFICACIÓN: caso.identificacion ?? '',
    PÓLIZA: caso.numeroPoliza ?? '',
    'TIPO PÓLIZA': etiquetaTipoPolizaBbvaCat(caso),
    CAUSA: caso.causa ?? '',
    ASEGURADO: caso.asegurado ?? '',
    INTERMEDIARIO: caso.intermediario ?? '',
    'CORREO INTERMEDIARIO': caso.correoIntermediario ?? '',
    'TELEFONO INTERMEDIARIO': caso.telefonoIntermediario ?? '',
    'TELEFONO ASEGURADO': caso.telefonoAsegurado ?? '',
    'CORREO ASEGURADO': caso.correoAsegurado ?? '',
    CIUDAD: caso.ciudad ?? '',
    ESTADO: caso.estado ?? '',
    RESERVA_BBVA: caso.reserva ?? '',
    'VALOR ESTIMADO ASEGURADORA': caso.valorEstimadoAseguradora ?? '',
    'VALOR ASEGURADO INMUEBLE': caso.valorAseguradoInmueble ?? '',
    'VALOR RECLAMADO BBVA': caso.valorReclamado ?? '',
    'VALOR ASEGURADO CONTENIDOS': caso.valorAseguradoContenidos ?? '',
    'VALOR RESERVA PREVENTIVA PROMEDIO': caso.valorReservaPreventivaPromedio ?? '',
    'VALOR COMERCIAL INMUEBLE': caso.valorComercialInmueble ?? '',
    'RESERVA AJUSTADOR': caso.valorLiquidado ?? '',
    'VALOR A LIQUIDAR': caso.valorALiquidar ?? '',
    'OBSERVACIÓN RESERVA': caso.observacionReserva ?? '',
    MODALIDAD: caso.modalidadAtencion ?? '',
    'AJUSTADOR LIDER': caso.ajustadorLider ?? '',
    AJUSTADOR: caso.ajustador ?? '',
    'FECHA ASIGNACIÓN': formatDate(caso.fechaAsignacion),
    'FECHA VISITA': formatDate(caso.fechaVisita),
    'FECHA CASO NUEVO': formatDate(caso.fechaCasoNuevo),
    'FECHA COORDINANDO INSPECCIÓN': formatDate(caso.fechaCoordinandoInspeccion),
    'FECHA ANÁLISIS': formatDate(caso.fechaAnalisisCaso),
    'FECHA SOLICITUD DOCUMENTO': formatDate(caso.fechaSolicitudDocumento),
    'FECHA RECEPCIÓN DOCUMENTO': formatDate(caso.fechaRecepcionDocumento),
    'FECHA OBJECIÓN': formatDate(caso.fechaObjecion),
    'FECHA OBJETADO': formatDate(caso.fechaObjetado),
    'FECHA AUTORIZACIÓN ANALISTA': formatDate(caso.fechaAutorizacionAnalista),
    'FECHA CASO AJUSTADO': formatDate(caso.fechaCasoAjustado),
    'FECHA CASO PARA PAGO': formatDate(caso.fechaCasoParaPago),
    'FECHA CASO PAGADO': formatDate(caso.fechaCasoPagado),
    'FECHA DESISTIMIENTO': formatDate(caso.fechaDesistimiento),
    'DÍAS EN ESTADO': caso.diasEnEstado ?? '',
    'ÚLTIMA GESTIÓN': formatDate(caso.ultimaGestion),
    'DOCUMENTO FALTANTE': caso.documentoFaltante ?? '',
    OBSERVACIONES: caso.observaciones ?? '',
    'Fecha creación': formatDate(caso.createdAt),
  };
}

function estiloHeader(cell, { fill = COLOR_BBVA } = {}) {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${fill}` },
  };
  cell.font = { bold: true, color: { argb: `FF${COLOR_HEADER_TXT}` }, size: 11 };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: `FF${COLOR_GRID}` } },
    left: { style: 'thin', color: { argb: `FF${COLOR_GRID}` } },
    bottom: { style: 'thin', color: { argb: `FF${COLOR_GRID}` } },
    right: { style: 'thin', color: { argb: `FF${COLOR_GRID}` } },
  };
}

function estiloCelda(cell, { bold = false, fill = null, align = 'left' } = {}) {
  cell.font = { bold, size: 10, color: { argb: 'FF1F2937' } };
  cell.alignment = { vertical: 'middle', horizontal: align, wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: `FF${COLOR_GRID}` } },
    left: { style: 'thin', color: { argb: `FF${COLOR_GRID}` } },
    bottom: { style: 'thin', color: { argb: `FF${COLOR_GRID}` } },
    right: { style: 'thin', color: { argb: `FF${COLOR_GRID}` } },
  };
  if (fill) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${fill}` },
    };
  }
}

function autoAncho(ws, min = 10, max = 36) {
  ws.columns.forEach((col) => {
    let largo = min;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const texto = cell.value == null ? '' : String(cell.value);
      largo = Math.min(max, Math.max(largo, texto.length + 2));
    });
    col.width = largo;
  });
}

function escribirHojaCasos(workbook, casos) {
  const ws = workbook.addWorksheet('Casos', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  const filas = casos.map(buildExportRowListadoBbvaCat);
  const headers = filas.length
    ? Object.keys(filas[0])
    : Object.keys(buildExportRowListadoBbvaCat({}));

  ws.addRow(headers);
  const headerRow = ws.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => estiloHeader(cell));

  for (const fila of filas) {
    const row = ws.addRow(headers.map((h) => fila[h]));
    row.eachCell((cell, colNumber) => {
      const key = headers[colNumber - 1];
      const esMonto =
        /RESERVA|VALOR|ESTIMADO|LIQUIDAR|RECLAMADO|COMERCIAL|PREVENTIVA/i.test(key);
      estiloCelda(cell, { align: esMonto ? 'right' : 'left' });
      if (esMonto && typeof cell.value === 'number') {
        cell.numFmt = '"$"#,##0';
      }
    });
  }
  autoAncho(ws, 12, 28);
  return ws;
}

function escribirHojaResumenEstado(workbook, reunion) {
  const ws = workbook.addWorksheet('Resumen por estado', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  const headers = ['Estado', 'Cuenta de casos', 'Reserva actuarial', 'Reserva ajustador'];
  ws.addRow(headers);
  ws.getRow(1).height = 26;
  ws.getRow(1).eachCell((cell) => estiloHeader(cell));

  for (const fila of reunion.porEstado || []) {
    const row = ws.addRow([
      fila.estado,
      fila.cantidad,
      fila.reservaActuarial || 0,
      fila.reservaAjustador || 0,
    ]);
    row.eachCell((cell, col) => {
      estiloCelda(cell, { align: col === 1 ? 'left' : 'right' });
      if (col >= 3) cell.numFmt = '"$"#,##0';
    });
  }

  const tot = reunion.totales || {};
  const totalRow = ws.addRow([
    'Total general',
    tot.cantidad || 0,
    tot.reservaActuarial || 0,
    tot.reservaAjustador || 0,
  ]);
  totalRow.eachCell((cell, col) => {
    estiloCelda(cell, { bold: true, fill: COLOR_BBVA_SOFT, align: col === 1 ? 'left' : 'right' });
    if (col >= 3) cell.numFmt = '"$"#,##0';
  });

  autoAncho(ws, 14, 32);
  return ws;
}

function escribirHojaOperativo(workbook, reunion) {
  const ws = workbook.addWorksheet('Avance operativo');
  const op = reunion.operativo || {};
  const video = op.videoperitajes || {};
  const presencial = op.presencial || {};
  const cierres = op.cierres || {};

  ws.addRow([
    `Asignados (${Number(op.pctContactados || 0).toLocaleString('es-CO')}% contactados)`,
    op.asignados || 0,
    '%',
  ]);
  ws.getRow(1).height = 26;
  ws.getRow(1).eachCell((cell) => estiloHeader(cell));

  const filas = [
    {
      label: 'Videoperitajes',
      value: video.total || 0,
      pct: video.pctSobreAsignados,
      section: true,
    },
    { label: '  Realizados', value: video.realizados || 0, pct: video.pctRealizados },
    { label: '  Programados', value: video.programados || 0, pct: video.pctProgramados },
    {
      label: 'Visita presencial',
      value: presencial.total || 0,
      pct: presencial.pctSobreAsignados,
      section: true,
    },
    { label: '  Realizados', value: presencial.realizados || 0, pct: null },
    { label: '  Programados', value: presencial.programados || 0, pct: null },
    {
      label: 'Cierres de casos',
      value: cierres.total || 0,
      pct: null,
      section: true,
    },
    { label: '  Documentados en plataforma', value: cierres.documentados || 0, pct: null },
    { label: '  Por documentar', value: cierres.noDocumentados || 0, pct: null },
  ];

  for (const fila of filas) {
    const pctTxt =
      fila.pct != null && Number(fila.pct) > 0
        ? `${Number(fila.pct).toLocaleString('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}%`
        : '';
    const row = ws.addRow([fila.label, fila.value, pctTxt]);
    row.eachCell((cell, col) => {
      estiloCelda(cell, {
        bold: Boolean(fila.section),
        fill: fila.section ? COLOR_BBVA_SOFT : null,
        align: col === 1 ? 'left' : 'right',
      });
    });
  }

  ws.getColumn(1).width = 36;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 12;
  return ws;
}

function dibujarBarChart({
  title,
  labels = [],
  values = [],
  width = 920,
  height = 420,
  valuePrefix = '',
  color = '#004481',
}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 18px Segoe UI, Arial, sans-serif';
  ctx.fillText(title, 24, 32);

  const padL = 72;
  const padR = 24;
  const padT = 56;
  const padB = 110;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const maxVal = Math.max(1, ...values.map((v) => Number(v) || 0));
  const n = Math.max(1, labels.length);
  const gap = 10;
  const barW = Math.max(12, (plotW - gap * (n + 1)) / n);

  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padT + (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(width - padR, y);
    ctx.stroke();
    const tick = Math.round(maxVal * (1 - i / 4));
    ctx.fillStyle = '#6B7280';
    ctx.font = '11px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${valuePrefix}${tick.toLocaleString('es-CO')}`, padL - 8, y + 4);
  }

  labels.forEach((label, i) => {
    const valor = Number(values[i]) || 0;
    const x = padL + gap + i * (barW + gap);
    const h = (valor / maxVal) * plotH;
    const y = padT + plotH - h;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barW, h);

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 10px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    if (h > 16) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(
        `${valuePrefix}${valor.toLocaleString('es-CO')}`,
        x + barW / 2,
        Math.max(y + 14, padT + 12)
      );
    } else {
      ctx.fillStyle = '#111827';
      ctx.fillText(`${valuePrefix}${valor.toLocaleString('es-CO')}`, x + barW / 2, y - 6);
    }

    ctx.save();
    ctx.translate(x + barW / 2, padT + plotH + 10);
    ctx.rotate(-Math.PI / 3.2);
    ctx.fillStyle = '#374151';
    ctx.font = '10px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'right';
    const texto = String(label || '').length > 22 ? `${String(label).slice(0, 20)}…` : String(label || '');
    ctx.fillText(texto, 0, 0);
    ctx.restore();
  });

  return canvas.toDataURL('image/png');
}

function dataUrlToBase64(dataUrl) {
  return String(dataUrl || '').split(',')[1] || '';
}

async function escribirHojaGraficas(workbook, reunion) {
  const ws = workbook.addWorksheet('Gráficas');
  ws.getCell('A1').value = 'Gráficas generadas desde las tablas dinámicas (datos vivos de la base)';
  ws.getCell('A1').font = { bold: true, size: 13, color: { argb: `FF${COLOR_BBVA}` } };
  ws.mergeCells('A1:L1');

  const porEstado = reunion.porEstado || [];
  const labels = porEstado.map((f) => f.estado);
  const cantidades = porEstado.map((f) => f.cantidad || 0);
  const actuarial = porEstado.map((f) => f.reservaActuarial || 0);
  const ajustador = porEstado.map((f) => f.reservaAjustador || 0);

  const op = reunion.operativo || {};
  const video = op.videoperitajes || {};
  const presencial = op.presencial || {};
  const cierres = op.cierres || {};

  const charts = [
    {
      title: 'Casos por estado',
      labels,
      values: cantidades,
      color: '#004481',
      col: 0,
      row: 2,
    },
    {
      title: 'Reserva actuarial por estado',
      labels,
      values: actuarial,
      color: '#0B6E99',
      valuePrefix: '$',
      col: 0,
      row: 24,
    },
    {
      title: 'Reserva ajustador por estado',
      labels,
      values: ajustador,
      color: '#DC2626',
      valuePrefix: '$',
      col: 0,
      row: 46,
    },
    {
      title: 'Avance operativo',
      labels: [
        'Video realizados',
        'Video programados',
        'Presencial realizados',
        'Presencial programados',
        'Cierres documentados',
        'Cierres por documentar',
      ],
      values: [
        video.realizados || 0,
        video.programados || 0,
        presencial.realizados || 0,
        presencial.programados || 0,
        cierres.documentados || 0,
        cierres.noDocumentados || 0,
      ],
      color: '#004481',
      col: 0,
      row: 68,
    },
  ];

  for (const chart of charts) {
    if (!chart.labels.length) continue;
    const dataUrl = dibujarBarChart(chart);
    if (!dataUrl) continue;
    const imageId = workbook.addImage({
      base64: dataUrlToBase64(dataUrl),
      extension: 'png',
    });
    ws.addImage(imageId, {
      tl: { col: chart.col, row: chart.row },
      ext: { width: 720, height: 330 },
    });
  }

  ws.getColumn(1).width = 18;
  return ws;
}

/**
 * Excel del dashboard BBVA CAT:
 * 1) Casos (igual al reporte listado)
 * 2) Resumen por estado (tabla dinámica)
 * 3) Avance operativo (tabla dinámica)
 * 4) Gráficas (imágenes generadas de esas tablas)
 */
export async function exportarDashboardBbvaCatExcel(casos = [], { nombreArchivo } = {}) {
  const lista = Array.isArray(casos) ? casos : [];
  if (!lista.length) {
    throw new Error('NO_DATA');
  }

  const reunion = construirResumenReunionBbvaCat(lista);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Grupo Proser · BBVA CAT';
  workbook.created = new Date();

  escribirHojaCasos(workbook, lista);
  escribirHojaResumenEstado(workbook, reunion);
  escribirHojaOperativo(workbook, reunion);
  await escribirHojaGraficas(workbook, reunion);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fecha = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = nombreArchivo || `bbva-cat-dashboard-${fecha}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { hojas: 4, casos: lista.length };
}
