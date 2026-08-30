import * as XLSX from 'xlsx';
import {
  homologarCiudadAllianz,
  homologarEstadoAllianz,
  resolverUbicacionAllianz,
  normalizarGradoAfectacionAllianz,
  normalizarSiNoAllianz,
} from './allianzHelpers.js';

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

/** Mapeo de encabezados hoja BD / PENDIENTES / CAT_ALLIANZ → campos del caso. */
const HEADER_MAP = {
  SINIESTRO: 'siniestro',
  'WF SINIESTRO ZURICH': 'siniestro',
  'WF SINIESTRO': 'siniestro',
  'Z CLAIM': 'siniestro',
  ZCLAIM: 'siniestro',
  IDENTIFICACION: 'identificacion',
  CEDULA: 'identificacion',
  'ID ASEGURO': 'identificacion',
  'ID ASEGURADO': 'identificacion',
  'TIPO IDENTIFICACION': 'tipoIdentificacion',
  'TIPO DE IDENTIFICACION': 'tipoIdentificacion',
  'TIPO DOCUMENTO': 'tipoIdentificacion',
  'TIPO DE DOCUMENTO': 'tipoIdentificacion',
  ASEGURADO: 'asegurado',
  NOMBRE: 'asegurado',
  'NOMBRE ASEGURADO': 'asegurado',
  'INSURED NAME': 'asegurado',
  TOMADOR: 'tomador',
  'N POLIZA': 'numeroPoliza',
  'NUMERO POLIZA': 'numeroPoliza',
  'NO POLIZA': 'numeroPoliza',
  POLIZA: 'numeroPoliza',
  'TIPO POLIZA': 'tipoPoliza',
  'TIPO DE POLIZA': 'tipoPoliza',
  RAMO: 'tipoPoliza',
  LOB: 'tipoPoliza',
  'IPZ BUSINESS': 'tomador',
  'IPS CLAIM ID': 'zc',
  CAUSA: 'causa',
  'CAUSA SINIESTRO': 'causa',
  'CAUSA DEL SINIESTRO': 'causa',
  'DIRECCION PREDIO': 'direccionPredio',
  'DIRECCION DEL RIESGO': 'direccionPredio',
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
  'NUMERO TELEFONICO ASEGURADO': 'celular',
  'CONTACT NUMBER': 'celular',
  CIUDAD: 'ciudad',
  'CIUDAD NOMBRE': 'ciudad',
  DEPARTAMENTO: 'departamento',
  'FECHA SINIESTRO': 'fechaSiniestro',
  'FECHA DE SINIESTRO': 'fechaSiniestro',
  DOL: 'fechaSiniestro',
  'FECHA DE AVISO': 'fechaCasoNuevo',
  FNOL: 'fechaCasoNuevo',
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
  'SEVERIDAD CAT': 'severidadCat',
  SEVERIDAD: 'severidadCat',
  'NIVEL SEVERIDAD': 'severidadCat',
  'NIVEL CAT': 'severidadCat',
  'ACCESO PREDIO': 'accesoPredio',
  ACCESO: 'accesoPredio',
  'OBSERVACIONES CAT': 'observacionesCat',
  'OBSERVACIONES INSPECCION': 'observacionesCat',
  OBSERVACIONES: 'observacionesCat',
  'RISK ID': 'riskId',
  RISKID: 'riskId',
  'DISTANCIA EPICENTRO KM': 'distanciaEpicentroKm',
  'DISTANCIA EPICENTRO': 'distanciaEpicentroKm',
  'TIPO NEGOCIO HOMOLOGADO': 'tipoNegocioHomologado',
  'TIPO NEGOCIO': 'tipoNegocioHomologado',
  'CAT UBICACION REFERENCIA': 'catUbicacionReferencia',
  'UBICACION REFERENCIA': 'catUbicacionReferencia',
  'ADDRESS NUMBER': 'addressNumber',
  'DIRECCION INSPECCION SUGERIDA': 'direccionInspeccionSugerida',
  'LINK GOOGLE MAPS': 'linkGoogleMaps',
  'GOOGLE MAPS': 'linkGoogleMaps',
  'GRUPO INSPECCION': 'grupoInspeccion',
  AFECTACION: 'afectacion',
  'GRADO AFECTACION': 'gradoAfectacion',
  'GRADO AFETACION': 'gradoAfectacion',
  'LUCRO CESANTE': 'lucroCesante',
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
  // dd/mm/yyyy o mm/dd/yyyy
  const mdy = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (mdy) {
    let [, a, b, c] = mdy;
    let year = Number(c);
    if (year < 100) year += 2000;
    let month = Number(a);
    let day = Number(b);
    // Si el primero > 12, es dd/mm; si no, en consolidado Allianz suele ser m/d/yy (Excel US)
    if (month > 12 && day <= 12) {
      month = Number(b);
      day = Number(a);
    }
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
  'fechaAsignacion',
  'fechaVisita',
  'fechaCasoNuevo',
  'fechaCoordinandoInspeccion',
  'fechaAnalisisCaso',
  'fechaSolicitudDocumento',
  'fechaRecepcionDocumento',
  'fechaObjecion',
  'fechaAutorizacionAnalista',
  'fechaCasoParaPago',
]);

const HEADERS_QUE_NO_SON_DATOS = new Set([
  'Z CLAIM',
  'ID ASEGURADO',
  'ID ASEGURO',
  'INSURED NAME',
  'NOMBRE ASEGURADO',
  'WF SINIESTRO ZURICH',
  'WF SINIESTRO',
  'SINIESTRO',
  'IDENTIFICACION',
  'ASEGURADO',
]);

const homologarTipoPolizaExcel = (valor) => {
  const t = normHeader(valor);
  if (!t) return { tipoPoliza: null, tipoPolizaOtro: null };
  if (t === 'HOGAR' || t === 'HOMEOWNERS') return { tipoPoliza: 'HOGAR', tipoPolizaOtro: null };
  if (t === 'INCENDIO' || t === 'PROPERTY') return { tipoPoliza: 'INCENDIO', tipoPolizaOtro: null };
  if (t === 'TERREMOTO') return { tipoPoliza: 'TERREMOTO', tipoPolizaOtro: null };
  if (t === 'TODO RIESGO' || t === 'TODO RIESGO DAÑOS' || t === 'TRD') {
    return { tipoPoliza: 'TODO RIESGO', tipoPolizaOtro: null };
  }
  if (t === 'PYME') return { tipoPoliza: 'PYME', tipoPolizaOtro: null };
  if (t === 'INDUSTRIAL') return { tipoPoliza: 'INDUSTRIAL', tipoPolizaOtro: null };
  if (t === 'OTRO' || t === 'OTROS') return { tipoPoliza: 'OTRO', tipoPolizaOtro: null };
  return { tipoPoliza: 'OTRO', tipoPolizaOtro: String(valor).trim() };
};

const filaPareceEncabezado = (caso) => {
  const id = normHeader(caso.identificacion);
  const stro = normHeader(caso.siniestro);
  const aseg = normHeader(caso.asegurado);
  return (
    HEADERS_QUE_NO_SON_DATOS.has(id) ||
    HEADERS_QUE_NO_SON_DATOS.has(stro) ||
    HEADERS_QUE_NO_SON_DATOS.has(aseg)
  );
};

const CAMPOS_NUMERO = new Set([
  'valorAseguradoInmueble',
  'valorAseguradoContenidos',
  'valorReservaPreventivaPromedio',
  'valorComercialInmueble',
  'reserva',
  'valorReclamado',
  'valorLiquidado',
  'severidadCat',
  'distanciaEpicentroKm',
]);

const parseSeveridadCat = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null;
  const texto = String(valor)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase();
  const digito = texto.match(/\b([1-6])\b/);
  if (digito) return Number(digito[1]);
  const n = parseNumeroCelda(valor);
  if (n != null && n >= 1 && n <= 6) return Math.round(n);
  return null;
};

const parseAccesoPredio = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null;
  const t = String(valor)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase();
  if (/^(SI|YES|TRUE|1)$/.test(t)) return 'SI';
  if (/^(NO|FALSE|0)$/.test(t)) return 'NO';
  if (/PARCIAL/.test(t)) return 'PARCIAL';
  if (['SI', 'NO', 'PARCIAL'].includes(t)) return t;
  return null;
};

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
    if (
      campos.has('identificacion') ||
      campos.has('riskId') ||
      (campos.has('siniestro') && campos.has('estado')) ||
      (campos.has('asegurado') && campos.has('riskId')) ||
      (campos.has('siniestro') && campos.has('asegurado'))
    ) {
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
      if (campo === 'severidadCat') {
        caso[campo] = parseSeveridadCat(raw);
      } else if (campo === 'afectacion' || campo === 'lucroCesante') {
        const v = normalizarSiNoAllianz(raw);
        caso[campo] = v === 'SI' || v === 'NO' ? v : raw == null || raw === '' ? null : String(raw).trim();
      } else if (campo === 'gradoAfectacion') {
        const v = normalizarGradoAfectacionAllianz(raw);
        caso[campo] = /^[1-6]$/.test(v) ? v : raw == null || raw === '' ? null : String(raw).trim();
      } else if (campo === 'accesoPredio') {
        caso[campo] = parseAccesoPredio(raw);
      } else if (campo === 'addressNumber' || campo === 'riskId') {
        // Conservar texto (PD 1, SC) o número como string
        if (raw === null || raw === undefined || raw === '') caso[campo] = null;
        else if (typeof raw === 'number' && Number.isFinite(raw) && Math.abs(raw) < 1e-6) {
          // Excel a veces mete basura científica (5e-87); tratar como vacío
          caso[campo] = null;
        } else {
          caso[campo] = String(raw).trim();
        }
      } else if (CAMPOS_FECHA.has(campo)) {
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
    if (filaPareceEncabezado(caso)) continue;
    if (!caso.identificacion && caso.riskId) {
      // Identificación única por Risk ID + asegurado (el Excel reutiliza Risk ID)
      const aseg = String(caso.asegurado || '')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^A-Za-z0-9]+/g, '')
        .slice(0, 24)
        .toUpperCase();
      caso.identificacion = aseg ? `${caso.riskId}-${aseg}` : String(caso.riskId);
    }
    if (!caso.identificacion) continue;
    if (!caso.estado) caso.estado = 'CASO NUEVO';
    caso.estado = homologarEstadoAllianz(caso.estado);
    if (!caso.ciudad && caso.catUbicacionReferencia) {
      caso.ciudad = caso.catUbicacionReferencia;
    }
    if (caso.ciudad) {
      const ub = resolverUbicacionAllianz(caso.ciudad, caso.departamento);
      caso.ciudad = ub.ciudad || homologarCiudadAllianz(caso.ciudad) || caso.ciudad;
      if (ub.departamento) caso.departamento = ub.departamento;
    }
    if (!caso.direccionPredio && caso.addressNumber && /[A-Za-z#]/.test(String(caso.addressNumber))) {
      caso.direccionPredio = caso.addressNumber;
    }
    if (caso.tipoPoliza) {
      const ramo = homologarTipoPolizaExcel(caso.tipoPoliza);
      caso.tipoPoliza = ramo.tipoPoliza;
      if (ramo.tipoPolizaOtro) caso.tipoPolizaOtro = ramo.tipoPolizaOtro;
    }
    if (!caso.tipoIdentificacion && /^\d{5,}$/.test(String(caso.identificacion || '').replace(/\D/g, ''))) {
      caso.tipoIdentificacion = 'CC';
    }
    if (!caso.telefonoAsegurado && caso.celular) caso.telefonoAsegurado = caso.celular;
    if (!caso.correoAsegurado && caso.correo) caso.correoAsegurado = caso.correo;
    if (!caso.informacionContacto) {
      caso.informacionContacto = [caso.celular, caso.correo].filter(Boolean).join(' | ') || null;
    }
    casos.push(caso);
  }

  return { casos, headerRowIdx };
};

const elegirHojasCandidatas = (workbook) => {
  const nombres = workbook.SheetNames || [];
  const orden = [];
  const bd = nombres.find((n) => normHeader(n) === 'BD');
  const pendientes = nombres.find((n) => normHeader(n) === 'PENDIENTES');
  const baseAllianz = nombres.find((n) => /BASE ALLIANZ/i.test(n));
  if (baseAllianz) orden.push(baseAllianz);
  if (bd) orden.push(bd);
  if (pendientes) orden.push(pendientes);
  nombres.forEach((n) => {
    if (!orden.includes(n)) orden.push(n);
  });
  return orden;
};

/**
 * Lee un Excel consolidado (preferencia hoja BD; si está vacía usa PENDIENTES) y
 * devuelve filas listas para /importar.
 */
export const parsearCasosAllianzDesdeExcel = async (file) => {
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
      'No se encontraron filas válidas (IDENTIFICACIÓN/CÉDULA o Risk ID) en el Excel'
    );
  }

  if (/BASE ALLIANZ/i.test(hojaUsada)) {
    casos = casos.map((caso) => ({
      ...caso,
      causa: caso.causa || 'TERREMOTO',
      canalRadicacion: caso.canalRadicacion || 'ALLIANZ',
      tomador: caso.tomador || 'ALLIANZ SEGUROS',
    }));
  }

  return { hoja: hojaUsada, casos };
};

const HEADER_MAP_LISTADO = {
  ZC: 'zc',
  STRO: 'siniestro',
  SINIESTRO: 'siniestro',
  'N SINIESTRO': 'siniestro',
  'NO SINIESTRO': 'siniestro',
  ASEGURADO: 'asegurado',
  NOMBRE: 'asegurado',
  IDENTIFICACION: 'identificacion',
  CEDULA: 'identificacion',
  'TIPO IDENTIFICACION': 'tipoIdentificacion',
  'TIPO DE IDENTIFICACION': 'tipoIdentificacion',
  'TIPO DOCUMENTO': 'tipoIdentificacion',
  'TIPO DE DOCUMENTO': 'tipoIdentificacion',
  POLIZA: 'numeroPoliza',
  'N POLIZA': 'numeroPoliza',
  'NUMERO POLIZA': 'numeroPoliza',
  'NO POLIZA': 'numeroPoliza',
  'TIPO POLIZA': 'tipoPoliza',
  'TIPO DE POLIZA': 'tipoPoliza',
  RAMO: 'tipoPoliza',
  CAUSA: 'causa',
  'CAUSA SINIESTRO': 'causa',
  'CAUSA DEL SINIESTRO': 'causa',
  INTERMEDIARIO: 'intermediario',
  'CONTACTO INTERMEDIARIO': 'contactoIntermediario',
  'CORREO INTERMEDIARIO': 'correoIntermediario',
  'TELEFONO INTERMEDIARIO': 'telefonoIntermediario',
  'CONTACTO ASEGURADO': 'contactoAsegurado',
  'TELEFONO ASEGURADO': 'telefonoAsegurado',
  'TEL ASEGURADO': 'telefonoAsegurado',
  'CELULAR ASEGURADO': 'telefonoAsegurado',
  'CORREO ASEGURADO': 'correoAsegurado',
  'EMAIL ASEGURADO': 'correoAsegurado',
  'MAIL ASEGURADO': 'correoAsegurado',
  CIUDAD: 'ciudad',
  'FECHA ASIGNACION': 'fechaAsignacion',
  'FECHA VISITA': 'fechaVisita',
  INSPECTOR: 'inspector',
  AJUSTADOR: 'ajustador',
  ESTADO: 'estado',
  OBSERVACIONES: 'observaciones',
  OBSERVACION: 'observaciones',
  NOTAS: 'observaciones',
};

const limpiarTextoListado = (raw) => {
  if (raw === null || raw === undefined || raw === '') return '';
  return String(raw)
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const parsearHojaListadoCliente = (sheet) => {
  const matriz = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  if (!matriz.length) return { casos: [], headerRowIdx: -1 };

  let headerRowIdx = -1;
  let colMap = {};
  const columnasSinMapa = [];

  for (let r = 0; r < Math.min(matriz.length, 20); r += 1) {
    const row = matriz[r] || [];
    const provisional = {};
    const sinMapa = [];
    row.forEach((celda, c) => {
      const header = normHeader(celda);
      if (header === 'ITEM') return;
      const campo = HEADER_MAP_LISTADO[header];
      if (campo) provisional[c] = campo;
      else sinMapa.push(c);
    });
    const campos = new Set(Object.values(provisional));
    if (campos.has('siniestro') && (campos.has('asegurado') || campos.has('ciudad'))) {
      headerRowIdx = r;
      colMap = provisional;
      columnasSinMapa.push(...sinMapa);
      break;
    }
  }

  if (headerRowIdx < 0) return { casos: [], headerRowIdx: -1 };

  const casos = [];
  for (let r = headerRowIdx + 1; r < matriz.length; r += 1) {
    const row = matriz[r] || [];
    const caso = {
      zc: '',
      siniestro: '',
      identificacion: '',
      tipoIdentificacion: '',
      numeroPoliza: '',
      tipoPoliza: '',
      causa: '',
      asegurado: '',
      intermediario: '',
      correoIntermediario: '',
      telefonoIntermediario: '',
      contactoIntermediario: '',
      telefonoAsegurado: '',
      correoAsegurado: '',
      contactoAsegurado: '',
      ciudad: '',
      observaciones: '',
      inspector: '',
      ajustador: '',
      fechaAsignacion: '',
      fechaVisita: '',
      estado: 'CASO NUEVO',
    };
    Object.entries(colMap).forEach(([colStr, campo]) => {
      const raw = row[Number(colStr)];
      if (campo === 'fechaAsignacion' || campo === 'fechaVisita') {
        caso[campo] = parseFechaCelda(raw) || '';
        return;
      }
      caso[campo] = limpiarTextoListado(raw);
    });
    if (/^pendiente$/i.test(caso.fechaVisita)) caso.fechaVisita = '';
    if (!caso.intermediario && caso.contactoIntermediario && !caso.contactoIntermediario.includes('|')) {
      caso.intermediario = caso.contactoIntermediario;
    }
    caso.contactoIntermediario = [
      caso.intermediario,
      caso.correoIntermediario,
      caso.telefonoIntermediario,
    ]
      .map((x) => String(x || '').trim())
      .filter(Boolean)
      .join(' | ');
    const contactoAseguradoTexto = String(caso.contactoAsegurado || '').trim();
    if (contactoAseguradoTexto && !caso.telefonoAsegurado && !caso.correoAsegurado) {
      const email = contactoAseguradoTexto.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      if (email) caso.correoAsegurado = email[0];
      const resto = email
        ? contactoAseguradoTexto.replace(email[0], ' ').replace(/[|,;]/g, ' ').trim()
        : contactoAseguradoTexto;
      if (resto.replace(/\D/g, '').length >= 7) caso.telefonoAsegurado = resto;
    }
    caso.contactoAsegurado = [caso.telefonoAsegurado, caso.correoAsegurado]
      .map((x) => String(x || '').trim())
      .filter(Boolean)
      .join(' | ');
    const extras = columnasSinMapa
      .map((c) => limpiarTextoListado(row[c]))
      .filter((txt) => txt && !/^pendiente$/i.test(txt));
    if (extras.length) {
      caso.observaciones = [caso.observaciones, ...extras].filter(Boolean).join(' | ');
    }
    if (!caso.siniestro && !caso.asegurado) continue;
    if (!caso.identificacion) {
      if (caso.siniestro) caso.identificacion = caso.siniestro;
    }
    if (!caso.estado || caso.estado === '0') caso.estado = 'CASO NUEVO';
    caso.estado = homologarEstadoAllianz(caso.estado);
    if (caso.ciudad) {
      const ub = resolverUbicacionAllianz(caso.ciudad, caso.departamento);
      caso.ciudad = ub.ciudad || homologarCiudadAllianz(caso.ciudad) || caso.ciudad;
      if (ub.departamento) caso.departamento = ub.departamento;
    }
    casos.push(caso);
  }

  return { casos, headerRowIdx };
};

/**
 * Lee el listado breve de cliente (siniestro, asegurado, contactos, ciudad).
 */
export const parsearListadoClienteAllianzDesdeExcel = async (file) => {
  if (!file) throw new Error('No se seleccionó archivo');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  if (!workbook.SheetNames?.length) throw new Error('El archivo no contiene hojas válidas');

  let hojaUsada = null;
  let casos = [];

  for (const nombre of workbook.SheetNames) {
    const sheet = workbook.Sheets[nombre];
    if (!sheet) continue;
    const parseado = parsearHojaListadoCliente(sheet);
    if (parseado.casos.length > 0) {
      hojaUsada = nombre;
      casos = parseado.casos;
      break;
    }
  }

  if (!hojaUsada) {
    throw new Error(
      'No se encontró el listado de siniestros. Use columnas SINIESTRO, ASEGURADO, INTERMEDIARIO y CIUDAD.'
    );
  }

  return { hoja: hojaUsada, casos, modo: 'listado' };
};

