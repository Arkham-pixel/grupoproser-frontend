import * as XLSX from 'xlsx';

const normHeader = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/[°º]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Mapeo de encabezados hoja BD / PENDIENTES / Casos → campos del caso. */
const HEADER_MAP = {
  SINIESTRO: 'siniestro',
  IDENTIFICACION: 'identificacion',
  CEDULA: 'identificacion',
  'NUMERO DOCUMENTO': 'identificacion',
  'N DOCUMENTO': 'identificacion',
  ASEGURADO: 'asegurado',
  NOMBRE: 'asegurado',
  TOMADOR: 'tomador',
  'N POLIZA': 'numeroPoliza',
  'NUMERO POLIZA': 'numeroPoliza',
  'NO POLIZA': 'numeroPoliza',
  'DIRECCION PREDIO': 'direccionPredio',
  'N CREDITO': 'numeroCredito',
  'NUMERO CREDITO': 'numeroCredito',
  'NO CREDITO': 'numeroCredito',
  CREDITO: 'numeroCredito',
  'INFORMACION DE CONTACTO': 'informacionContacto',
  CONTACTO: 'informacionContacto',
  CORREO: 'correo',
  EMAIL: 'correo',
  CELULAR: 'celular',
  'TELEFONO CELULAR': 'celular',
  MOVIL: 'celular',
  CIUDAD: 'ciudad',
  SEDE: 'sede',
  'SEDE RIESGO': 'sede',
  'SEDE (RIESGO)': 'sede',
  DEPARTAMENTO: 'departamento',
  'FECHA SINIESTRO': 'fechaSiniestro',
  'FECHA INICIO': 'fechaInicioPoliza',
  'FECHA INICIO POLIZA': 'fechaInicioPoliza',
  'FECHA INICIO DE LA POLIZA': 'fechaInicioPoliza',
  'VIGENCIA DESDE': 'fechaInicioPoliza',
  'VIGENCIA INICIO': 'fechaInicioPoliza',
  'FECHA FIN': 'fechaFinPoliza',
  'FECHA FIN POLIZA': 'fechaFinPoliza',
  'FECHA FIN DE LA POLIZA': 'fechaFinPoliza',
  'VIGENCIA HASTA': 'fechaFinPoliza',
  'VIGENCIA FIN': 'fechaFinPoliza',
  'VALOR ASEGURADO INMUEBLE': 'valorAseguradoInmueble',
  'VALOR ASEGURADO CONTENIDOS': 'valorAseguradoContenidos',
  COBERTURA: 'cobertura',
  CAUSA: 'causa_siniestro',
  'CAUSA SINIESTRO': 'causa_siniestro',
  'TIPO POLIZA': 'tipoPoliza',
  'TIPO DE POLIZA': 'tipoPoliza',
  'TIPO DE DOCUMENTO': 'tipoDucumento',
  'TIPO DOCUMENTO': 'tipoDucumento',
  'FUNCIONARIO ASEGURADORA': 'funcAsgrdraNombre',
  'CODIGO WORKFLOW': 'codWorkflow',
  INTERMEDIARIO: 'nombIntermediario',
  'FECHA ASIGNACION': 'fchaAsgncion',
  'FECHA DE ASIGNACION': 'fchaAsgncion',
  'DESCRIPCION DEL ESTADO': 'descripcionEstado',
  'DESCRIPCION DEL SINIESTRO': 'descSinstro',
  'ESTADO PAGO PRIMAS': 'estadoPagoPrimas',
  'CANAL DE RADICACION': 'canalRadicacion',
  CANAL: 'canalRadicacion',
  'VALOR RESERVA PREVENTIVA PROMEDIO': 'valorReservaPreventivaPromedio',
  'VALOR COMERCIAL INMUEBLE': 'valorComercialInmueble',
  RESERVA: 'reserva',
  'OBSERVACION RESERVA': 'observacionReserva',
  'OBSERVACION DE RESERVA': 'observacionReserva',
  'VALOR RECLAMADO': 'valorReclamado',
  'VALOR LIQUIDADO': 'valorLiquidado',
  'FECHA LLAMADA': 'fechaLlamada',
  'FECHA DE LLAMADA': 'fechaLlamada',
  'OBSERVACION LLAMADA': 'observacionLlamada',
  'OBSERVACION DE LLAMADA': 'observacionLlamada',
  'FECHA INSPECCION': 'fechaInspeccion',
  'FECHA ULTIMO DOCUMENTO': 'fechaUltimoDocumento',
  'FECHA LIQUIDADO': 'fechaLiquidado',
  'FECHA ACEPTACION LIQUIDACION': 'fechaAceptacionLiquidacion',
  'FECHA ENVIO A LA ASEGURADORA': 'fechaEnvioAseguradora',
  ESTADO: 'estado',
  'ESTADO FINAL': 'estado',
};

const fechaBogotaIso = (date) => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // fallback abajo
  }
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const excelSerialToIso = (serial) => {
  const n = Number(serial);
  if (Number.isNaN(n)) return null;
  // Excel serial → UTC medianoche + offset típico CO (-5h) al leer con cellDates
  const utc = Date.UTC(1899, 11, 30) + Math.round(n * 86400000);
  return fechaBogotaIso(new Date(utc));
};

const parseFechaCelda = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null;
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return fechaBogotaIso(valor);
  }
  if (typeof valor === 'number') return excelSerialToIso(valor);
  const texto = String(valor).trim();
  if (!texto) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10);
  // SURA (Colombia): dd/mm/yyyy. Solo se intercambia si el mes queda inválido.
  const dmy = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    let day = Number(dmy[1]);
    let month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    if (month > 12 && day <= 12) {
      const tmp = day;
      day = month;
      month = tmp;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return null;
};

const parseNumeroCelda = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number' && !Number.isNaN(valor)) return valor;
  const texto = String(valor).trim();
  if (!texto) return null;
  if (/^(n\/?a|null|undefined|desiste|por confirmar|por confrimar|-)$/i.test(texto)) {
    return null;
  }
  // Si no hay dígitos, no es un valor numérico (texto libre en columna de valor)
  if (!/\d/.test(texto)) return null;
  const limpio = texto.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  if (!limpio || limpio === '-' || limpio === '.' || limpio === '-.') return null;
  const n = Number(limpio);
  return Number.isNaN(n) ? null : n;
};

const CAMPOS_FECHA = new Set([
  'fechaSiniestro',
  'fechaInicioPoliza',
  'fechaFinPoliza',
  'fechaLlamada',
  'fechaInspeccion',
  'fechaUltimoDocumento',
  'fechaLiquidado',
  'fechaAceptacionLiquidacion',
  'fechaEnvioAseguradora',
  'fchaAsgncion',
]);

const CAMPOS_NUMERO = new Set([
  'valorAseguradoInmueble',
  'valorAseguradoContenidos',
  'valorReservaPreventivaPromedio',
  'valorComercialInmueble',
  'reserva',
  'valorReclamado',
  'valorLiquidado',
]);

const filaTieneDatos = (caso) =>
  Object.values(caso).some((v) => v !== null && v !== undefined && String(v).trim() !== '');

const parsearHojaACasos = (sheet) => {
  const matriz = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  if (!matriz.length) return { casos: [], headerRowIdx: -1 };

  let headerRowIdx = -1;
  let colMap = {};
  for (let r = 0; r < Math.min(matriz.length, 30); r += 1) {
    const row = matriz[r] || [];
    const provisional = {};
    row.forEach((celda, c) => {
      const campo = HEADER_MAP[normHeader(celda)];
      if (campo) provisional[c] = campo;
    });
    const campos = new Set(Object.values(provisional));
    if (campos.has('identificacion') || (campos.has('siniestro') && campos.has('estado'))) {
      headerRowIdx = r;
      colMap = provisional;
      break;
    }
  }

  if (headerRowIdx < 0) return { casos: [], headerRowIdx: -1 };

  const casos = [];
  for (let r = headerRowIdx + 1; r < matriz.length; r += 1) {
    const row = matriz[r] || [];
    const caso = {};
    Object.entries(colMap).forEach(([colStr, campo]) => {
      const col = Number(colStr);
      const raw = row[col];
      if (CAMPOS_FECHA.has(campo)) {
        caso[campo] = parseFechaCelda(raw);
      } else if (CAMPOS_NUMERO.has(campo)) {
        caso[campo] = parseNumeroCelda(raw);
      } else if (raw === null || raw === undefined || raw === '') {
        caso[campo] = null;
      } else {
        caso[campo] = String(raw).trim();
      }
    });
    if (!filaTieneDatos(caso)) continue;
    if (!caso.identificacion) continue;
    if (!caso.estado) caso.estado = 'CASO NUEVO';
    if (!caso.cobertura && caso.causa_siniestro) caso.cobertura = caso.causa_siniestro;
    if (!caso.causa_siniestro && caso.cobertura) caso.causa_siniestro = caso.cobertura;
    casos.push(caso);
  }

  return { casos, headerRowIdx };
};

const elegirHojasCandidatas = (workbook) => {
  const nombres = workbook.SheetNames || [];
  const orden = [];
  const bd = nombres.find((n) => normHeader(n) === 'BD');
  const pendientes = nombres.find((n) => normHeader(n) === 'PENDIENTES');
  const casosHoja = nombres.find((n) => normHeader(n) === 'CASOS');
  if (bd) orden.push(bd);
  if (pendientes) orden.push(pendientes);
  if (casosHoja) orden.push(casosHoja);
  nombres.forEach((n) => {
    if (!orden.includes(n)) orden.push(n);
  });
  return orden;
};

/**
 * Lee un Excel consolidado (preferencia hoja BD; si está vacía usa PENDIENTES) y
 * devuelve filas listas para /importar.
 */
export const parsearCasosSuraDesdeExcel = async (file) => {
  if (!file) throw new Error('No se seleccionó archivo');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  if (!workbook.SheetNames?.length) throw new Error('El archivo no contiene hojas válidas');

  let hojaUsada = null;
  let casos = [];

  for (const nombre of elegirHojasCandidatas(workbook)) {
    const sheet = workbook.Sheets[nombre];
    if (!sheet) continue;
    const parseado = parsearHojaACasos(sheet);
    if (parseado.casos.length > 0) {
      hojaUsada = nombre;
      casos = parseado.casos;
      break;
    }
  }

  if (!hojaUsada) {
    throw new Error(
      'No se encontraron filas con IDENTIFICACIÓN/CÉDULA en hojas BD, PENDIENTES o Casos'
    );
  }

  return { hoja: hojaUsada, casos };
};
