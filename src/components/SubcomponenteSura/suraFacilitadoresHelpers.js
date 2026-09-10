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

export function erroresFilaPortal(fila = {}) {
  const errores = [];
  if (digitsReclamacion(fila.reclamacion).length !== 13) errores.push('reclamación 13 dígitos');
  const visita = normalizarSinoNa(fila.visitaRealizada, { permitirNA: false });
  const informe = normalizarSinoNa(fila.informeEnviado, { permitirNA: false });
  const docs = normalizarSinoNa(fila.documentacionCompleta, { permitirNA: false });
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

/** Visita en Excel: texto SI / NO (sin N/A ni íconos). */
function pintarMarcaVisita(cell, valor) {
  const v = normalizarSinoNa(valor, { permitirNA: false });
  cell.value = v || '';
  const fill =
    v === 'SI' ? fillSolid('FFECFDF5') : v === 'NO' ? fillSolid('FFFEF2F2') : fillSolid('FFFFFFFF');
  const fontColor = v === 'SI' ? 'FF047857' : v === 'NO' ? 'FFB91C1C' : 'FF111827';
  estiloCeldaBase(cell, { bold: Boolean(v), center: true, fill, fontColor });
}

function pintarDatoSino(cell, valor) {
  const v = normalizarSinoNa(valor, { permitirNA: false });
  cell.value = v || '';
  const fill =
    v === 'SI' ? fillSolid('FFECFDF5') : v === 'NO' ? fillSolid('FFFEF2F2') : fillSolid('FFFFFFFF');
  const fontColor = v === 'SI' ? 'FF047857' : v === 'NO' ? 'FFB91C1C' : 'FF111827';
  estiloCeldaBase(cell, { bold: Boolean(v), center: true, fill, fontColor });
}

function fechaPresentable(valor) {
  const iso = fechaParaInput(valor);
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function labelCriterio(valor) {
  const v = normalizarCriterioFacilitador(valor);
  if (v === 'Critico') return 'Crítico';
  if (v === 'Medio') return 'Medio';
  if (v === 'Bajo') return 'Bajo';
  return '';
}

/**
 * Excel alineado a la plataforma (una sola hoja, sin duplicar filas).
 * Visita / Informe / Docs / Cerrado en texto SI o NO.
 */
export async function descargarPlantillaFacilitadores(filas = []) {
  const lista = deduplicarFilasFacilitadores(filas);
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
      String(f.ultimoComentario || '').trim(),
      '',
      fechaPresentable(f.fechaInforme),
      '',
      fechaPresentable(f.fechaDocumentacionCompleta),
      '',
      fechaPresentable(f.fechaCierre),
      normalizarEstadoFacilitador(f.estadoSiniestro) || '',
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
        pintarDatoSino(cell, f.casoCerrado);
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
    visitaRealizada: normalizarSinoNa(fila.visitaRealizada, { permitirNA: false }),
    informeEnviado: normalizarSinoNa(fila.informeEnviado, { permitirNA: false }),
    documentacionCompleta: normalizarSinoNa(fila.documentacionCompleta, { permitirNA: false }),
    casoCerrado: normalizarSinoNa(fila.casoCerrado, { permitirNA: false }) || 'NO',
    criterioDetalle: normalizarCriterioFacilitador(fila.criterioDetalle),
    estadoSiniestro: normalizarEstadoFacilitador(fila.estadoSiniestro),
  };
}

/** Una entrada por reclamación (dígitos), conserva la más reciente. */
export function deduplicarFilasFacilitadores(filas = []) {
  const porRec = new Map();
  for (const f of Array.isArray(filas) ? filas : []) {
    const rec = digitsReclamacion(f?.reclamacion);
    if (rec.length < 10) continue;
    const prev = porRec.get(rec);
    if (!prev) {
      porRec.set(rec, f);
      continue;
    }
    const tPrev = new Date(prev.updatedAt || prev.createdAt || 0).getTime();
    const tNext = new Date(f.updatedAt || f.createdAt || 0).getTime();
    if (tNext >= tPrev) porRec.set(rec, f);
  }
  return [...porRec.values()].sort((a, b) =>
    digitsReclamacion(a.reclamacion).localeCompare(digitsReclamacion(b.reclamacion))
  );
}

export { fechaParaInput, crearFechaLocal };
