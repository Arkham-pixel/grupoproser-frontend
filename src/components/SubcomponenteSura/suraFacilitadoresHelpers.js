import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { crearFechaLocal } from '../../utils/fechaUtils.js';
import { fechaParaInput } from './segurosSuraHelpers.js';

export const PROVEEDOR_FACILITADORES_SURA = 'PROSER AJUSTES S.A.S';

export const COLUMNAS_EXPORT_FACILITADORES = [
  'RECLAMACION',
  'PROVEEDOR_ASSIGNADO_A_SERVICIO',
  'INFORMACIÓN',
  'FECHA_ASIGNACION',
  'FECHA_PRIMER_CONTACTO',
  'VISITA_REALIZADA',
  'FECHA_VISITA',
  'CRITERIO_DETALLE',
  'ULTIMO_COMENTARIO',
  'INFORME_ENVIADO',
  'FECHA_INFORME',
  'DOCUMENTACION_COMPLETA',
  'FECHA_DOCUMENTACION_COMPLETA',
  'CASO_CERRADO',
  'FECHA_CIERRE',
  'ESTADO_SINIESTRO',
];

export const CRITERIOS_FACILITADOR = [
  { value: 'Critico', label: 'Crítico' },
  { value: 'Medio', label: 'Medio' },
  { value: 'Bajo', label: 'Bajo' },
];

export const ESTADOS_FACILITADOR = [
  'Abierto',
  'Tramitado',
  'Anulado',
  'Desistido',
  'Objetado',
];

export function digitsReclamacion(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

function clave(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase();
}

export function normalizarSinoNa(valor, { permitirNA = true } = {}) {
  const k = clave(valor);
  if (!k) return '';
  if (k === 'SI' || k === 'S' || k === 'YES' || k === 'TRUE' || k === '1') return 'SI';
  if (k === 'NO' || k === 'N' || k === 'FALSE' || k === '0') return 'NO';
  if (permitirNA && (k === 'N/A' || k === 'NA' || k === 'N A')) return 'N/A';
  return '';
}

export function normalizarCriterioFacilitador(valor) {
  const k = clave(valor);
  if (k.startsWith('CRIT')) return 'Critico';
  if (k.startsWith('MED')) return 'Medio';
  if (k.startsWith('BAJ')) return 'Bajo';
  return '';
}

export function normalizarEstadoFacilitador(valor) {
  const k = clave(valor);
  if (k.startsWith('ABIER')) return 'Abierto';
  if (k.startsWith('TRAM')) return 'Tramitado';
  if (k.startsWith('ANUL')) return 'Anulado';
  if (k.startsWith('DESIST')) return 'Desistido';
  if (k.startsWith('OBJET')) return 'Objetado';
  return '';
}

export function filaPlantillaDesdeExcel(raw = {}) {
  return {
    reclamacion: digitsReclamacion(raw.RECLAMACION ?? raw.reclamacion),
    proveedor: String(raw.PROVEEDOR_ASSIGNADO_A_SERVICIO ?? '').trim() || PROVEEDOR_FACILITADORES_SURA,
    informacion: String(raw['INFORMACIÓN'] ?? raw.INFORMACION ?? '').trim() || '0',
    fechaAsignacion: raw.FECHA_ASIGNACION ?? '',
    fechaPrimerContacto: raw.FECHA_PRIMER_CONTACTO ?? '',
    visitaRealizada: normalizarSinoNa(raw.VISITA_REALIZADA ?? raw.visitaRealizada),
    fechaVisita: raw.FECHA_VISITA ?? '',
    criterioDetalle: normalizarCriterioFacilitador(raw.CRITERIO_DETALLE ?? raw.criterioDetalle),
    ultimoComentario: raw.ULTIMO_COMENTARIO ?? '',
    informeEnviado: normalizarSinoNa(raw.INFORME_ENVIADO ?? raw.informeEnviado),
    fechaInforme: raw.FECHA_INFORME ?? '',
    documentacionCompleta: normalizarSinoNa(
      raw.DOCUMENTACION_COMPLETA ?? raw.documentacionCompleta
    ),
    fechaDocumentacionCompleta: raw.FECHA_DOCUMENTACION_COMPLETA ?? '',
    casoCerrado: normalizarSinoNa(raw.CASO_CERRADO ?? raw.casoCerrado, { permitirNA: false }),
    fechaCierre: raw.FECHA_CIERRE ?? '',
    estadoSiniestro: normalizarEstadoFacilitador(raw.ESTADO_SINIESTRO ?? raw.estadoSiniestro),
  };
}

export function parsearPlantillaFacilitadores(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el Excel.'));
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: 'array', cellDates: true, raw: false });
        const hoja = wb.Sheets.BD || wb.Sheets[wb.SheetNames[0]];
        if (!hoja) {
          reject(new Error('El archivo no tiene hojas.'));
          return;
        }
        const rows = XLSX.utils.sheet_to_json(hoja, { defval: '', raw: false });
        resolve(rows.map(filaPlantillaDesdeExcel).filter((r) => digitsReclamacion(r.reclamacion).length >= 10));
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

function fechaExcel(valor) {
  const iso = fechaParaInput(valor);
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function erroresFilaPortal(fila = {}) {
  const errores = [];
  if (digitsReclamacion(fila.reclamacion).length !== 13) errores.push('reclamación 13 dígitos');
  const visita = normalizarSinoNa(fila.visitaRealizada);
  const informe = normalizarSinoNa(fila.informeEnviado);
  const docs = normalizarSinoNa(fila.documentacionCompleta);
  const cerrado = normalizarSinoNa(fila.casoCerrado, { permitirNA: false });
  if (!visita) errores.push('visita');
  if (visita === 'SI' && !fechaParaInput(fila.fechaVisita)) errores.push('fecha visita');
  if (!informe) errores.push('informe');
  if (informe === 'SI' && !fechaParaInput(fila.fechaInforme)) errores.push('fecha informe');
  if (!docs) errores.push('documentación');
  if (docs === 'SI' && !fechaParaInput(fila.fechaDocumentacionCompleta)) errores.push('fecha docs');
  if (!cerrado) errores.push('cerrado');
  if (cerrado === 'SI' && !fechaParaInput(fila.fechaCierre)) errores.push('fecha cierre');
  if (!normalizarCriterioFacilitador(fila.criterioDetalle)) errores.push('criterio');
  if (!normalizarEstadoFacilitador(fila.estadoSiniestro)) errores.push('estado');
  return errores;
}

const BORDER_THIN = {
  top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
};

const FILL_HEADER = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A5F' },
};

function fillSolid(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function estiloCeldaBase(cell, { bold = false, center = false, fill = null, fontColor = 'FF111827' } = {}) {
  cell.font = { name: 'Calibri', size: 10, bold, color: { argb: fontColor } };
  cell.alignment = {
    vertical: 'middle',
    horizontal: center ? 'center' : 'left',
    wrapText: true,
  };
  cell.border = BORDER_THIN;
  if (fill) cell.fill = fill;
}

/** Chulo / X / N/A como en la plataforma (cuadro de color). */
function pintarMarcaVisita(cell, valor) {
  const v = normalizarSinoNa(valor);
  if (v === 'SI') {
    cell.value = '✓';
    estiloCeldaBase(cell, {
      bold: true,
      center: true,
      fill: fillSolid('FF059669'),
      fontColor: 'FFFFFFFF',
    });
    return;
  }
  if (v === 'NO') {
    cell.value = '✗';
    estiloCeldaBase(cell, {
      bold: true,
      center: true,
      fill: fillSolid('FFDC2626'),
      fontColor: 'FFFFFFFF',
    });
    return;
  }
  if (v === 'N/A') {
    cell.value = '—';
    estiloCeldaBase(cell, {
      bold: true,
      center: true,
      fill: fillSolid('FFF59E0B'),
      fontColor: 'FFFFFFFF',
    });
    return;
  }
  cell.value = '';
  estiloCeldaBase(cell, { center: true, fill: fillSolid('FFF3F4F6'), fontColor: 'FF9CA3AF' });
}

function pintarDatoSino(cell, valor, { permitirNA = true } = {}) {
  const v = normalizarSinoNa(valor, { permitirNA });
  cell.value = v || '—';
  const fill =
    v === 'SI'
      ? fillSolid('FFECFDF5')
      : v === 'NO'
        ? fillSolid('FFFEF2F2')
        : v === 'N/A'
          ? fillSolid('FFFFFBEB')
          : fillSolid('FFF9FAFB');
  const fontColor =
    v === 'SI' ? 'FF047857' : v === 'NO' ? 'FFB91C1C' : v === 'N/A' ? 'FFB45309' : 'FF6B7280';
  estiloCeldaBase(cell, { bold: Boolean(v), center: true, fill, fontColor });
}

function fechaPresentable(valor) {
  const iso = fechaParaInput(valor);
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function labelCriterio(valor) {
  const v = normalizarCriterioFacilitador(valor);
  if (v === 'Critico') return 'Crítico';
  if (v === 'Medio') return 'Medio';
  if (v === 'Bajo') return 'Bajo';
  return '—';
}

/**
 * Excel alineado a la plataforma:
 * - Hoja "Seguimiento": Visita con chulo/X/— en cuadro de color (como la UI).
 * - Hoja "BD": columnas exactas del Portal (SI / NO / N/A) para el líder.
 */
export async function descargarPlantillaFacilitadores(filas = []) {
  const lista = Array.isArray(filas) ? filas : [];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Arnald · Grupo Proser';
  workbook.created = new Date();

  const headersUi = [
    'Reclamación',
    'Asignación',
    '1.er contacto',
    'Visita',
    'Fecha visita',
    'Criterio',
    'Último comentario',
    'Informe',
    'Fecha informe',
    'Docs',
    'Fecha docs',
    'Cerrado',
    'Fecha cierre',
    'Estado',
    'Portal',
  ];

  const wsUi = workbook.addWorksheet('Seguimiento', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  wsUi.columns = [
    { width: 16 },
    { width: 12 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 28 },
    { width: 10 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 22 },
  ];

  const headerRow = wsUi.addRow(headersUi);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    estiloCeldaBase(cell, {
      bold: true,
      center: true,
      fill: FILL_HEADER,
      fontColor: 'FFFFFFFF',
    });
  });

  for (const f of lista) {
    const errs = erroresFilaPortal(f);
    const row = wsUi.addRow([
      digitsReclamacion(f.reclamacion),
      fechaPresentable(f.fechaAsignacion),
      fechaPresentable(f.fechaPrimerContacto),
      '', // Visita se pinta aparte
      fechaPresentable(f.fechaVisita),
      labelCriterio(f.criterioDetalle),
      String(f.ultimoComentario || '').trim() || '—',
      '',
      fechaPresentable(f.fechaInforme),
      '',
      fechaPresentable(f.fechaDocumentacionCompleta),
      '',
      fechaPresentable(f.fechaCierre),
      normalizarEstadoFacilitador(f.estadoSiniestro) || '—',
      errs.length ? `Falta: ${errs.slice(0, 3).join(', ')}` : 'OK',
    ]);
    row.height = 20;

    for (let c = 1; c <= headersUi.length; c += 1) {
      const cell = row.getCell(c);
      if (c === 4) {
        pintarMarcaVisita(cell, f.visitaRealizada);
        continue;
      }
      if (c === 8) {
        pintarDatoSino(cell, f.informeEnviado);
        continue;
      }
      if (c === 10) {
        pintarDatoSino(cell, f.documentacionCompleta);
        continue;
      }
      if (c === 12) {
        pintarDatoSino(cell, f.casoCerrado, { permitirNA: false });
        continue;
      }
      const portalOk = c === 15 && !errs.length;
      const portalBad = c === 15 && errs.length;
      estiloCeldaBase(cell, {
        center: ![1, 7, 15].includes(c),
        fill: portalOk
          ? fillSolid('FFECFDF5')
          : portalBad
            ? fillSolid('FFFFF7ED')
            : fillSolid('FFFFFFFF'),
        fontColor: portalOk ? 'FF047857' : portalBad ? 'FFC2410C' : 'FF111827',
        bold: c === 15,
      });
      if (c === 1) {
        cell.numFmt = '@';
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    }
  }

  // Hoja técnica del portal (valores SI/NO/N/A exactos).
  const wsBd = workbook.addWorksheet('BD', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  wsBd.columns = COLUMNAS_EXPORT_FACILITADORES.map((h) => ({
    header: h,
    key: h,
    width: Math.max(18, h.length + 2),
  }));
  const bdHeader = wsBd.getRow(1);
  bdHeader.height = 20;
  bdHeader.eachCell((cell) => {
    estiloCeldaBase(cell, {
      bold: true,
      center: true,
      fill: FILL_HEADER,
      fontColor: 'FFFFFFFF',
    });
  });

  for (const f of lista) {
    const row = wsBd.addRow({
      RECLAMACION: digitsReclamacion(f.reclamacion),
      PROVEEDOR_ASSIGNADO_A_SERVICIO: f.proveedor || PROVEEDOR_FACILITADORES_SURA,
      INFORMACIÓN: String(f.informacion ?? '0'),
      FECHA_ASIGNACION: fechaExcel(f.fechaAsignacion) || null,
      FECHA_PRIMER_CONTACTO: fechaExcel(f.fechaPrimerContacto) || null,
      VISITA_REALIZADA: normalizarSinoNa(f.visitaRealizada),
      FECHA_VISITA: fechaExcel(f.fechaVisita) || null,
      CRITERIO_DETALLE: normalizarCriterioFacilitador(f.criterioDetalle),
      ULTIMO_COMENTARIO: String(f.ultimoComentario || ''),
      INFORME_ENVIADO: normalizarSinoNa(f.informeEnviado),
      FECHA_INFORME: fechaExcel(f.fechaInforme) || null,
      DOCUMENTACION_COMPLETA: normalizarSinoNa(f.documentacionCompleta),
      FECHA_DOCUMENTACION_COMPLETA: fechaExcel(f.fechaDocumentacionCompleta) || null,
      CASO_CERRADO: normalizarSinoNa(f.casoCerrado, { permitirNA: false }),
      FECHA_CIERRE: fechaExcel(f.fechaCierre) || null,
      ESTADO_SINIESTRO: normalizarEstadoFacilitador(f.estadoSiniestro),
    });
    row.height = 18;
    row.eachCell((cell, colNumber) => {
      estiloCeldaBase(cell, { center: colNumber !== 9 });
      if (colNumber === 1) cell.numFmt = '@';
      if ([6, 10, 12, 14].includes(colNumber)) {
        const v = String(cell.value || '');
        if (v === 'SI') {
          cell.fill = fillSolid('FFECFDF5');
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF047857' } };
        } else if (v === 'NO') {
          cell.fill = fillSolid('FFFEF2F2');
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
        } else if (v === 'N/A') {
          cell.fill = fillSolid('FFFFFBEB');
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB45309' } };
        }
      }
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const fecha = new Date().toISOString().slice(0, 10);
  saveAs(blob, `plantilla-facilitadores-sura-${fecha}.xlsx`);
}

export function filaParaInput(fila = {}) {
  return {
    ...fila,
    fechaAsignacion: fechaParaInput(fila.fechaAsignacion),
    fechaPrimerContacto: fechaParaInput(fila.fechaPrimerContacto),
    fechaVisita: fechaParaInput(fila.fechaVisita),
    fechaInforme: fechaParaInput(fila.fechaInforme),
    fechaDocumentacionCompleta: fechaParaInput(fila.fechaDocumentacionCompleta),
    fechaCierre: fechaParaInput(fila.fechaCierre),
    visitaRealizada: normalizarSinoNa(fila.visitaRealizada),
    informeEnviado: normalizarSinoNa(fila.informeEnviado),
    documentacionCompleta: normalizarSinoNa(fila.documentacionCompleta),
    casoCerrado: normalizarSinoNa(fila.casoCerrado, { permitirNA: false }) || 'NO',
    criterioDetalle: normalizarCriterioFacilitador(fila.criterioDetalle),
    estadoSiniestro: normalizarEstadoFacilitador(fila.estadoSiniestro),
  };
}

export { fechaParaInput, crearFechaLocal };
