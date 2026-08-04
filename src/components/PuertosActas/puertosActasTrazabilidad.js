import * as XLSX from 'xlsx';
import { CODIGOS_ESTADO_FILTRO } from './puertosEstadoLabels.js';

export const FILTROS_PUERTOS_VACIOS = {
  q: '',
  tipo: '',
  estado: '',
  regional: '',
  cliente: '',
  fechaDesde: '',
  fechaHasta: '',
};

export const OPCIONES_TIPO = [
  { value: '', label: 'Todos los tipos' },
  { value: 'caso_exportacion', label: 'Caso exportación' },
  { value: 'inspeccion_asegurado', label: 'Inspección asegurado' },
  { value: 'acta', label: 'Acta' },
];

export const OPCIONES_ESTADO = CODIGOS_ESTADO_FILTRO;

const TIPO_LABEL = {
  acta: 'Acta',
  caso_exportacion: 'Caso exportación',
  inspeccion_asegurado: 'Inspección asegurado',
};

export function contarFiltrosActivos(filtros = {}) {
  return Object.entries(filtros).filter(([, v]) => String(v || '').trim()).length;
}

export function filtrosParaApi(filtros = {}) {
  const out = { limit: 500 };
  if (filtros.q?.trim()) out.q = filtros.q.trim();
  if (filtros.tipo) out.tipo = filtros.tipo;
  if (filtros.estado) out.estado = filtros.estado;
  if (filtros.regional?.trim()) out.regional = filtros.regional.trim();
  if (filtros.cliente?.trim()) out.cliente = filtros.cliente.trim();
  if (filtros.fechaDesde) out.fechaDesde = filtros.fechaDesde;
  if (filtros.fechaHasta) out.fechaHasta = filtros.fechaHasta;
  return out;
}

/** Filas para trazabilidad en Excel (encabezados en español). */
export function filasTrazabilidadExcel(registros = []) {
  return registros.map((r) => ({
    'Tipo registro': TIPO_LABEL[r.tipoRegistro] || r.tipoRegistro || '',
    'Consecutivo / N° acta': r.consecutivo || r.nroReferencia || '',
    'N° solicitud': r.numeroSolicitud || '',
    Cliente: r.asegurado || '',
    Aseguradora: r.aseguradora || '',
    'Exportador / Beneficiario': r.beneficiario || r.mercancia || '',
    'Regional / Ciudad': r.regional || '',
    Lugar: r.lugar || '',
    'Tipo inspección': r.tipoInspeccion || '',
    Actividad: r.actividad || '',
    Inspector: r.inspector || '',
    'Fecha inspección': r.fecha || '',
    'Fecha asignación': r.fechaAsignacion || '',
    'Fecha informe': r.fechaInforme || '',
    'Avance (secciones)': r.avance || '',
    'Creado por': r.creadoPor || '',
    'Última edición por': r.actualizadoPor || '',
    'Fecha creación': r.fechaCreacion || '',
    'Última actualización': r.fechaActualizacion || '',
    'ID sistema': r.id || '',
  }));
}

export function exportarTrazabilidadPuertosExcel(registros = []) {
  if (!registros.length) {
    throw new Error('No hay registros para exportar. Ajuste los filtros o cree casos.');
  }

  const rows = filasTrazabilidadExcel(registros);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Trazabilidad Puertos');

  const resumen = [
    { Métrica: 'Total registros exportados', Valor: registros.length },
    {
      Métrica: 'Casos exportación',
      Valor: registros.filter((r) => r.tipoRegistro === 'caso_exportacion').length,
    },
    { Métrica: 'Actas', Valor: registros.filter((r) => r.tipoRegistro === 'acta').length },
    {
      Métrica: 'Inspección asegurado',
      Valor: registros.filter((r) => r.tipoRegistro === 'inspeccion_asegurado').length,
    },
    { Métrica: 'Fecha exportación', Valor: new Date().toLocaleString('es-CO') },
  ];
  const hojaResumen = XLSX.utils.json_to_sheet(resumen);
  XLSX.utils.book_append_sheet(workbook, hojaResumen, 'Resumen');

  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `trazabilidad-puertos-${fecha}.xlsx`);
}
