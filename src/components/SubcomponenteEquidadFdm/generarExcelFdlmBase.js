import { convertirFechaParaExcelDate } from '../../utils/fechaUtils.js';
import { esCasoNuevoFdm } from './equidadFdmHelpers.js';
import * as XLSX from 'xlsx';

const fechaExcel = (value) => convertirFechaParaExcelDate(value) || '';

const vacioONumero = (value) =>
  value === null || value === undefined || value === '' ? '' : value;

/**
 * Fila en el mismo orden/nombres del Excel
 * "TERREMOTO 10 AGOSTO 2026 FDLM Base".
 */
export const buildFilaExcelFdlm = (caso = {}) => ({
  NUEVO: esCasoNuevoFdm(caso) ? 'SI' : 'NO',
  EVENTO: caso.evento || '',
  CONSECUTIVO: caso.consecutivo || '',
  CASO: caso.caso || '',
  SINIESTRO: caso.siniestro || '',
  'FECHA DE REGISTRO': fechaExcel(caso.fechaRegistro || caso.fechaAviso),
  NOMBRE: caso.nombre || '',
  CEDULA: caso.cedula || '',
  CELULAR: caso.celular || '',
  CORREO: caso.correo || '',
  'DIRECCIÓN AFECTADA': caso.direccionAfectada || '',
  'OFICINA RADICADORA': caso.oficinaRadicadora || '',
  'CIUDAD / MUNICIPIO': caso.municipio || '',
  DEPARTAMENTO: caso.departamento || '',
  AIF: caso.aif || '',
  'PÓLIZA DAÑOS VIGENTE (SI/NO)': caso.polizaDanosVigente || '',
  'POLIZA AFECTAR': caso.polizaAfectar || '',
  ORDEN: caso.orden || '',
  'VIGENCIA POLIZA': caso.vigenciaPoliza || '',
  'AFECTACIONES ANTERIORES': caso.afectacionesAnteriores || '',
  'SINIESTRO INDEMNIZADO': caso.siniestroIndemnizado || '',
  EDIFICIO: vacioONumero(caso.valorEdificio),
  CONTENIDO: vacioONumero(caso.valorContenido),
  'VALORES QUE SE PUEDE INDEMNIZAR': vacioONumero(caso.valoresIndemnizables),
  'SUBSIDIO EMPRESARIAL': caso.subsidioEmpresarial || '',
  Cobertura: caso.cobertura || '',
  PRIMAS: caso.primas || '',
  'TIPO DE NEGOCIO': caso.tipoNegocio || '',
  'Pérdida por contenidos': vacioONumero(caso.perdidaContenidos),
  'Pérdida por Edificio': vacioONumero(caso.perdidaEdificio),
  'Total Pérdida': vacioONumero(caso.totalPerdida),
  Deducible: vacioONumero(caso.deducible),
  'Total Liquidado': vacioONumero(caso.totalLiquidado),
  Subsidio: vacioONumero(caso.subsidio),
  'VALOR INDEMNIZADO(AJUSTADOR)': vacioONumero(caso.valorIndemnizadoAjustador),
  'FECHA DE LIQUIDACION': fechaExcel(caso.fechaLiquidacion),
  'FECHA DE AVISO': fechaExcel(caso.fechaAviso),
  'VALOR DE OBJECION': caso.valorObjecion || '',
  'FECHA DE CAUSACION': fechaExcel(caso.fechaCausacion),
  'VALOR INDEMNIZADO': vacioONumero(caso.valorIndemnizado),
  'FECHA DE GIRO': fechaExcel(caso.fechaGiro),
  ESTADO: caso.estado || '',
  Observaciones: caso.observaciones || '',
  DETALLE: caso.detalle || '',
});

const COLUMNAS_FECHA = [
  'FECHA DE REGISTRO',
  'FECHA DE LIQUIDACION',
  'FECHA DE AVISO',
  'FECHA DE CAUSACION',
  'FECHA DE GIRO',
];

const aplicarFormatoFechas = (worksheet, encabezados) => {
  const indices = COLUMNAS_FECHA.map((nombre) => encabezados.indexOf(nombre)).filter((idx) => idx >= 0);
  if (!indices.length || !worksheet['!ref']) return;
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let r = 1; r <= range.e.r; r += 1) {
    for (const c of indices) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (worksheet[addr] && worksheet[addr].t === 'd' && !worksheet[addr].z) {
        worksheet[addr].z = 'dd/mm/yyyy';
      }
    }
  }
};

const buildHojaTd = (casos = []) => {
  const agrupado = casos.reduce((acc, item) => {
    const key = String(item.municipio || 'SIN MUNICIPIO').replace(/\s+/g, ' ').trim().toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const filas = Object.entries(agrupado)
    .map(([ciudad, cantidad]) => ({ CIUDAD: ciudad, CANTIDAD: cantidad }))
    .sort((a, b) => b.CANTIDAD - a.CANTIDAD);
  filas.push({ CIUDAD: 'Total general', CANTIDAD: casos.length });
  return XLSX.utils.json_to_sheet(filas);
};

export const descargarExcelFdlmBase = (casos = [], { nombreArchivo } = {}) => {
  const rows = casos.map((item) => buildFilaExcelFdlm(item));
  const avisados = XLSX.utils.json_to_sheet(rows, { cellDates: true });
  const encabezados = rows.length > 0 ? Object.keys(rows[0]) : [];
  aplicarFormatoFechas(avisados, encabezados);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, buildHojaTd(casos), 'TD');
  XLSX.utils.book_append_sheet(workbook, avisados, '4_Avisados-FDM');

  const esTerremoto = casos.length > 0 && casos.every((c) => /TERREMOTO|TEMBLOR/i.test(`${c.evento || ''} ${c.cobertura || ''}`));
  const nombre =
    nombreArchivo ||
    (esTerremoto
      ? `TERREMOTO 10 AGOSTO 2026 FDLM Base.xlsx`
      : `FDLM Base ${new Date().toISOString().slice(0, 10)}.xlsx`);
  XLSX.writeFile(workbook, nombre);
};
