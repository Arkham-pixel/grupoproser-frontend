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

export function descargarPlantillaFacilitadores(filas = []) {
  const data = (Array.isArray(filas) ? filas : []).map((f) => ({
    RECLAMACION: digitsReclamacion(f.reclamacion),
    PROVEEDOR_ASSIGNADO_A_SERVICIO: f.proveedor || PROVEEDOR_FACILITADORES_SURA,
    INFORMACIÓN: String(f.informacion ?? '0'),
    FECHA_ASIGNACION: fechaExcel(f.fechaAsignacion),
    FECHA_PRIMER_CONTACTO: fechaExcel(f.fechaPrimerContacto),
    VISITA_REALIZADA: normalizarSinoNa(f.visitaRealizada),
    FECHA_VISITA: fechaExcel(f.fechaVisita),
    CRITERIO_DETALLE: normalizarCriterioFacilitador(f.criterioDetalle),
    ULTIMO_COMENTARIO: String(f.ultimoComentario || ''),
    INFORME_ENVIADO: normalizarSinoNa(f.informeEnviado),
    FECHA_INFORME: fechaExcel(f.fechaInforme),
    DOCUMENTACION_COMPLETA: normalizarSinoNa(f.documentacionCompleta),
    FECHA_DOCUMENTACION_COMPLETA: fechaExcel(f.fechaDocumentacionCompleta),
    CASO_CERRADO: normalizarSinoNa(f.casoCerrado, { permitirNA: false }),
    FECHA_CIERRE: fechaExcel(f.fechaCierre),
    ESTADO_SINIESTRO: normalizarEstadoFacilitador(f.estadoSiniestro),
  }));
  const ws = XLSX.utils.json_to_sheet(data, { header: COLUMNAS_EXPORT_FACILITADORES });
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let r = 1; r <= range.e.r; r += 1) {
    const addr = XLSX.utils.encode_cell({ r, c: 0 });
    const cell = ws[addr];
    if (cell) {
      cell.t = 's';
      cell.v = String(cell.v ?? '');
      cell.z = '@';
    }
  }
  ws['!cols'] = COLUMNAS_EXPORT_FACILITADORES.map((h) => ({ wch: Math.max(18, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BD');
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `plantilla-facilitadores-sura-${fecha}.xlsx`);
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
