import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { crearFechaLocal } from '../../utils/fechaUtils.js';
import { fechaParaInput } from './segurosSuraHelpers.js';

export const PROVEEDOR_FACILITADORES_SURA = 'PROSER AJUSTES S.A.S';

export const COLUMNAS_EXPORT_FACILITADORES = [
  'RECLAMACION',
  'PROVEEDOR_ASSIGNADO_A_SERVICIO',
  'FECHA_ASIGNACION',
  'FECHA_PRIMER_CONTACTO',
  'VISITA_REALIZADA',
  'FECHA_VISITA',
  'CRITERIO_DETALLE',
  'ULTIMO_COMENTARIO',
  'INFORME_PRELIMINAR_ENVIADO',
  'FECHA_INFORME_PRELIMINAR',
  'INFORME_FINAL_ENVIADO',
  'FECHA_INFORME_FINAL',
  'DOCUMENTACION_COMPLETA',
  'FECHA_DOCUMENTACION_COMPLETA',
  'CASO_CERRADO',
  'FECHA_CIERRE',
  'ESTADO_SINIESTRO',
  'TIPO_VIVIENDA',
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
  'Cancelado Sura',
];

export const TIPOS_VIVIENDA_FACILITADOR = [
  { value: 'URBANA', label: 'Urbana' },
  { value: 'RURAL', label: 'Rural' },
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

/** SI / NO / N/A; si viene vacío → NO (regla operativa Facilitadores). */
export function sinoConDefault(valor, { permitirNA = true, defecto = 'NO' } = {}) {
  return normalizarSinoNa(valor, { permitirNA }) || defecto;
}

export const TEXTO_FALTA_GESTIONAR = 'Falta por gestionar';

/** Fecha presentable año-mes-día (YYYY-MM-DD); si no hay fecha → «Falta por gestionar». */
export function fechaOFaltaGestionar(valor) {
  const iso = fechaParaInput(valor);
  if (!iso) return TEXTO_FALTA_GESTIONAR;
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return TEXTO_FALTA_GESTIONAR;
  return `${y}-${m}-${d}`;
}

/** Texto libre; si vacío → «Falta por gestionar». */
export function textoOFaltaGestionar(valor) {
  const t = String(valor ?? '').trim();
  return t || TEXTO_FALTA_GESTIONAR;
}

export function normalizarCriterioFacilitador(valor) {
  const k = clave(valor);
  if (k.startsWith('CRIT')) return 'Critico';
  if (k.startsWith('MED')) return 'Medio';
  if (k.startsWith('BAJ')) return 'Bajo';
  return '';
}

/** Criterio vacío → Medio (regla operativa Facilitadores). */
export function criterioConDefault(valor, defecto = 'Medio') {
  return normalizarCriterioFacilitador(valor) || defecto;
}

export function normalizarEstadoFacilitador(valor) {
  const k = clave(valor);
  if (k.startsWith('ABIER')) return 'Abierto';
  if (k.startsWith('TRAM')) return 'Tramitado';
  if (k.startsWith('ANUL')) return 'Anulado';
  if (k.startsWith('DESIST')) return 'Desistido';
  if (k.startsWith('OBJET')) return 'Objetado';
  if (k.includes('CANCELADO')) return 'Cancelado Sura';
  return '';
}

/**
 * Serie para gráfica / franjas: un conteo por estado oficial del portal.
 * Cada fila cuenta en un solo estado; sin estado → Abierto.
 */
export function contarPorEstadoFacilitador(filas = []) {
  const counts = Object.fromEntries(ESTADOS_FACILITADOR.map((e) => [e, 0]));
  let otros = 0;
  for (const f of filas) {
    const e = normalizarEstadoFacilitador(f?.estadoSiniestro) || 'Abierto';
    if (counts[e] != null) counts[e] += 1;
    else otros += 1;
  }
  const serie = ESTADOS_FACILITADOR.map((estado) => ({
    estado,
    nombre: estado,
    cantidad: counts[estado] || 0,
  }));
  if (otros > 0) {
    serie.push({ estado: 'Otros', nombre: 'Otros', cantidad: otros });
  }
  return serie;
}

export function normalizarTipoViviendaFacilitador(valor) {
  const k = clave(valor);
  if (k.startsWith('RUR')) return 'RURAL';
  if (k.startsWith('URB')) return 'URBANA';
  return '';
}

export function tipoViviendaConDefault(valor, defecto = 'URBANA') {
  return normalizarTipoViviendaFacilitador(valor) || defecto;
}

/** Estado en mayúsculas como en la plantilla SURA. */
export function estadoParaPlantillaSura(valor) {
  const n = normalizarEstadoFacilitador(valor) || 'Abierto';
  const mapa = {
    Abierto: 'ABIERTO',
    Tramitado: 'TRAMITADO',
    Anulado: 'ANULADO',
    Desistido: 'DESISTIDO',
    Objetado: 'OBJETADO',
    'Cancelado Sura': 'CANCELADO SURA',
  };
  return mapa[n] || 'ABIERTO';
}

/** Fecha YYYY-MM-DD para plantilla / Excel Facilitadores; vacío si no hay fecha. */
export function fechaParaPlantillaSura(valor) {
  const iso = fechaParaInput(valor);
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${y}-${m}-${d}`;
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
    criterioDetalle: criterioConDefault(raw.CRITERIO_DETALLE ?? raw.criterioDetalle),
    ultimoComentario: raw.ULTIMO_COMENTARIO ?? '',
    informePreliminarEnviado: normalizarSinoNa(
      raw.INFORME_PRELIMINAR_ENVIADO ?? raw.INFORME_PRELIMINAR ?? raw.informePreliminarEnviado
    ),
    fechaInformePreliminar: raw.FECHA_INFORME_PRELIMINAR ?? raw.fechaInformePreliminar ?? '',
    informeEnviado: normalizarSinoNa(
      raw.INFORME_FINAL_ENVIADO ??
        raw.INFORME_ENVIADO ??
        raw.informeEnviado ??
        raw.INFORME_FINAL
    ),
    fechaInforme: raw.FECHA_INFORME_FINAL ?? raw.FECHA_INFORME ?? raw.fechaInforme ?? '',
    documentacionCompleta: normalizarSinoNa(
      raw.DOCUMENTACION_COMPLETA ?? raw.documentacionCompleta
    ),
    fechaDocumentacionCompleta: raw.FECHA_DOCUMENTACION_COMPLETA ?? '',
    casoCerrado: normalizarSinoNa(raw.CASO_CERRADO ?? raw.casoCerrado, { permitirNA: false }),
    fechaCierre: raw.FECHA_CIERRE ?? '',
    estadoSiniestro: normalizarEstadoFacilitador(raw.ESTADO_SINIESTRO ?? raw.estadoSiniestro),
    tipoVivienda: tipoViviendaConDefault(raw.TIPO_VIVIENDA ?? raw.tipoVivienda),
  };
}

export function parsearPlantillaFacilitadores(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el Excel.'));
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: 'array', cellDates: true, raw: false });
        const hoja =
          wb.Sheets.Plantilla ||
          wb.Sheets.BD ||
          wb.Sheets[wb.SheetNames[0]];
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
  const visita = sinoConDefault(fila.visitaRealizada, { permitirNA: false });
  const informePrelim = sinoConDefault(fila.informePreliminarEnviado, { permitirNA: false });
  const informe = sinoConDefault(fila.informeEnviado, { permitirNA: false });
  const docs = sinoConDefault(fila.documentacionCompleta, { permitirNA: false });
  const cerrado = sinoConDefault(fila.casoCerrado, { permitirNA: false });
  if (visita === 'SI' && !fechaParaInput(fila.fechaVisita)) errores.push('fecha visita');
  if (informePrelim === 'SI' && !fechaParaInput(fila.fechaInformePreliminar)) {
    errores.push('fecha informe preliminar');
  }
  if (informe === 'SI' && !fechaParaInput(fila.fechaInforme)) errores.push('fecha informe final');
  if (docs === 'SI' && !fechaParaInput(fila.fechaDocumentacionCompleta)) errores.push('fecha docs');
  if (cerrado === 'SI' && !fechaParaInput(fila.fechaCierre)) errores.push('fecha cierre');
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

/**
 * Excel en formato exacto de la plantilla SURA Facilitadores Terremoto
 * (hoja «Plantilla» + hoja de valores permitidos).
 */
export async function descargarPlantillaFacilitadores(filas = []) {
  const lista = deduplicarFilasFacilitadores(filas);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Arnald · Grupo Proser';
  workbook.created = new Date();

  const headers = [...COLUMNAS_EXPORT_FACILITADORES];
  const ws = workbook.addWorksheet('Plantilla', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  ws.columns = headers.map((h) => ({
    width: Math.max(14, Math.min(28, h.length + 2)),
  }));

  const headerRow = ws.addRow(headers);
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
    const fechasYmD = {
      3: fechaParaPlantillaSura(f.fechaAsignacion),
      4: fechaParaPlantillaSura(f.fechaPrimerContacto),
      6: fechaParaPlantillaSura(f.fechaVisita),
      10: fechaParaPlantillaSura(f.fechaInformePreliminar),
      12: fechaParaPlantillaSura(f.fechaInforme),
      14: fechaParaPlantillaSura(f.fechaDocumentacionCompleta),
      16: fechaParaPlantillaSura(f.fechaCierre),
    };
    const row = ws.addRow([
      digitsReclamacion(f.reclamacion),
      String(f.proveedor || '').trim() || PROVEEDOR_FACILITADORES_SURA,
      fechasYmD[3],
      fechasYmD[4],
      sinoConDefault(f.visitaRealizada, { permitirNA: true }),
      fechasYmD[6],
      criterioConDefault(f.criterioDetalle),
      String(f.ultimoComentario || '').trim(),
      sinoConDefault(f.informePreliminarEnviado, { permitirNA: true }),
      fechasYmD[10],
      sinoConDefault(f.informeEnviado, { permitirNA: true }),
      fechasYmD[12],
      sinoConDefault(f.documentacionCompleta, { permitirNA: true }),
      fechasYmD[14],
      sinoConDefault(f.casoCerrado, { permitirNA: false }),
      fechasYmD[16],
      estadoParaPlantillaSura(f.estadoSiniestro),
      tipoViviendaConDefault(f.tipoVivienda),
    ]);
    row.height = 18;
    row.eachCell((cell, c) => {
      estiloCeldaBase(cell, {
        center: ![2, 8].includes(c),
        fill: fillSolid('FFFFFFFF'),
      });
      // Reclamación y fechas: texto fijo YYYY-MM-DD (Excel no las convierte a dd/mm).
      if (c === 1 || fechasYmD[c] !== undefined) {
        cell.value = c === 1 ? String(cell.value ?? '') : String(fechasYmD[c] ?? '');
        cell.numFmt = '@';
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
  }

  const wsVals = workbook.addWorksheet('Valores');
  wsVals.getCell(2, 2).value = 'VISITA_REALIZADA';
  wsVals.getCell(2, 3).value = 'INFORME_PRELIMINAR_ENVIADO';
  wsVals.getCell(2, 4).value = 'INFORME_FINAL_ENVIADO';
  wsVals.getCell(2, 5).value = 'DOCUMENTACION_COMPLETA';
  wsVals.getCell(2, 6).value = 'CASO_CERRADO';
  wsVals.getCell(2, 7).value = 'TIPO_VIVIENDA';
  wsVals.getCell(2, 8).value = 'ESTADO_SINIESTRO';
  ['SI', 'NO', 'N/A'].forEach((v, i) => {
    wsVals.getCell(3 + i, 2).value = v;
    wsVals.getCell(3 + i, 3).value = v;
    wsVals.getCell(3 + i, 4).value = v;
    wsVals.getCell(3 + i, 5).value = v;
  });
  wsVals.getCell(3, 6).value = 'SI';
  wsVals.getCell(4, 6).value = 'NO';
  wsVals.getCell(3, 7).value = 'RURAL';
  wsVals.getCell(4, 7).value = 'URBANA';
  ['OBJETADO', 'ANULADO', 'DESISTIDO', 'TRAMITADO', 'ABIERTO', 'CANCELADO SURA'].forEach(
    (v, i) => {
      wsVals.getCell(3 + i, 8).value = v;
    }
  );

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const fecha = new Date().toISOString().slice(0, 10);
  saveAs(blob, `Plantilla_Facilitadores_Terremoto_${fecha}.xlsx`);
}

export function filaParaInput(fila = {}) {
  return {
    ...fila,
    fechaAsignacion: fechaParaInput(fila.fechaAsignacion),
    fechaPrimerContacto: fechaParaInput(fila.fechaPrimerContacto),
    fechaVisita: fechaParaInput(fila.fechaVisita),
    fechaInformePreliminar: fechaParaInput(fila.fechaInformePreliminar),
    fechaInforme: fechaParaInput(fila.fechaInforme),
    fechaDocumentacionCompleta: fechaParaInput(fila.fechaDocumentacionCompleta),
    fechaCierre: fechaParaInput(fila.fechaCierre),
    visitaRealizada: sinoConDefault(fila.visitaRealizada, { permitirNA: false }),
    informePreliminarEnviado: sinoConDefault(fila.informePreliminarEnviado, { permitirNA: false }),
    informeEnviado: sinoConDefault(fila.informeEnviado, { permitirNA: false }),
    documentacionCompleta: sinoConDefault(fila.documentacionCompleta, { permitirNA: false }),
    casoCerrado: sinoConDefault(fila.casoCerrado, { permitirNA: false }),
    criterioDetalle: criterioConDefault(fila.criterioDetalle),
    estadoSiniestro: normalizarEstadoFacilitador(fila.estadoSiniestro) || 'Abierto',
    tipoVivienda: tipoViviendaConDefault(fila.tipoVivienda),
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
