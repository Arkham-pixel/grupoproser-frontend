/**
 * Indicadores históricos de gestión — módulo COMPLEX.
 * Tiempos entre etapas de trazabilidad y agrupación por responsable.
 */

import {
  elegirNombreMostrarResponsable,
  resolverAgrupacionCaso,
} from './responsableAgrupacionUtils.js';
import { SECUENCIA_INDICADORES_TIEMPO } from '../config/protocoloSiniestrosDefaults.js';
import {
  parsearFechaHoraComplex,
  parsearFechaSoloDiaComplex,
} from './complexFechaHoraUtils.js';
import { diasHabilesColombiaEntre } from './festivosColombia.js';

/** Periodo mínimo solicitado: año 2025 en adelante. */
export const FECHA_INICIO_INDICADORES_COMPLEX = new Date(2025, 0, 1, 0, 0, 0);
export const FECHA_INICIO_INDICADORES_COMPLEX_LABEL = '01/01/2025';

const CAMPOS_FECHA_CAMEL_SNAKE = [
  ['fchaAsgncion', 'fcha_asgncion'],
  ['fchaContIni', 'fcha_cont_ini'],
  ['fchaInspccion', 'fcha_inspccion'],
  ['fchaSoliDocu', 'fcha_soli_docu'],
  ['fchaInfoPrelm', 'fcha_info_prelm'],
  ['fchaInfoFnal', 'fcha_info_fnal'],
  ['fchaRepoActi', 'fcha_repo_acti'],
  ['fchaProgInspeccion', 'fcha_prog_inspeccion'],
  ['fchaAceptacionCifrasAseguradora', 'fcha_aceptacion_cifras_aseguradora'],
  ['fchaEnvioFiniquito', 'fcha_envio_finiquito'],
  ['fchaFinqtoIndem', 'fcha_finqto_indem'],
  ['fchaFactra', 'fcha_factra'],
  ['codiRespnsble', 'codi_responble'],
  ['codiAsgrdra', 'codi_asgrdra'],
  ['tipoPoliza', 'tipo_poliza'],
];

/** Activación del nuevo protocolo de gestión en Arnald (misma referencia que Riesgos). */
export const FECHA_INICIO_PROTOCOLO_COMPLEX = new Date(2025, 9, 1, 0, 0, 0);
export const FECHA_INICIO_PROTOCOLO_COMPLEX_LABEL = '01/10/2025';

export function parsearFechaComplex(valor) {
  return parsearFechaHoraComplex(valor);
}

export function sincronizarCasoComplex(caso) {
  if (!caso || typeof caso !== 'object') return caso;
  const resultado = { ...caso };

  CAMPOS_FECHA_CAMEL_SNAKE.forEach(([camel, snake]) => {
    const camelVal = resultado[camel];
    const snakeVal = resultado[snake];
    if (camelVal !== undefined && camelVal !== null && camelVal !== '') {
      resultado[snake] = camelVal;
    } else if (snakeVal !== undefined && snakeVal !== null && snakeVal !== '') {
      resultado[camel] = snakeVal;
    }
  });

  return resultado;
}

function fusionarCamposCaso(base, overlay) {
  const resultado = { ...base };
  Object.entries(overlay).forEach(([clave, valor]) => {
    if (valor === undefined || valor === null) return;
    if (typeof valor === 'string' && valor.trim() === '') return;
    resultado[clave] = valor;
  });
  return resultado;
}

export function combinarCasosComplex(siniestros = [], complex = []) {
  const map = new Map();
  const indicePorId = new Map();
  const indicePorAjuste = new Map();

  const registrar = (casoRaw) => {
    const caso = sincronizarCasoComplex(casoRaw);
    const id = caso._id != null ? String(caso._id) : '';
    const ajste = String(caso.nmroAjste || caso.numero_ajuste || '').trim();

    let claveMapa = null;
    if (id && indicePorId.has(id)) claveMapa = indicePorId.get(id);
    else if (ajste && indicePorAjuste.has(ajste)) claveMapa = indicePorAjuste.get(ajste);

    if (claveMapa != null) {
      const fusionado = sincronizarCasoComplex(
        fusionarCamposCaso(map.get(claveMapa), caso)
      );
      map.set(claveMapa, fusionado);
      if (id) indicePorId.set(id, claveMapa);
      if (ajste) indicePorAjuste.set(ajste, claveMapa);
      return;
    }

    const clave = id || (ajste ? `ajuste:${ajste}` : `sin-clave:${map.size}`);
    map.set(clave, caso);
    if (id) indicePorId.set(id, clave);
    if (ajste) indicePorAjuste.set(ajste, clave);
  };

  // Siniestros primero; Complex después (sus datos no vacíos prevalecen al fusionar).
  siniestros.forEach(registrar);
  complex.forEach(registrar);

  return Array.from(map.values());
}

export function filtrarCasosPorPeriodo(casos, fechaDesde, fechaHasta, fechaMinima = FECHA_INICIO_INDICADORES_COMPLEX) {
  const desde = fechaDesde ? parsearFechaSoloDiaComplex(fechaDesde) : fechaMinima;
  const hasta = fechaHasta ? parsearFechaSoloDiaComplex(fechaHasta) : null;

  return casos.filter((caso) => {
    const fchaAsgncion = obtenerFechaAsignacionCaso(caso);
    if (!fchaAsgncion) return false;
    if (desde && fchaAsgncion < desde) return false;
    if (hasta && fchaAsgncion > hasta) return false;
    return true;
  });
}

/** Fecha de asignación con los mismos fallbacks que el reporte COMPLEX. */
export function obtenerFechaAsignacionCaso(caso) {
  return (
    parsearFechaSoloDiaComplex(caso?.fchaAsgncion) ||
    parsearFechaSoloDiaComplex(caso?.fecha_asignacion_form) ||
    parsearFechaSoloDiaComplex(caso?.fecha_asignacion) ||
    parsearFechaSoloDiaComplex(caso?.fcha_asgncion) ||
    null
  );
}

export function esCasoProtocoloNuevo(caso) {
  const fchaAsgncion =
    parsearFechaComplex(caso?.fchaAsgncion) ||
    parsearFechaComplex(caso?.fecha_asignacion_form) ||
    parsearFechaComplex(caso?.fecha_asignacion);
  if (fchaAsgncion) {
    return fchaAsgncion >= FECHA_INICIO_PROTOCOLO_COMPLEX;
  }

  const createdAt = parsearFechaComplex(caso?.createdAt);
  if (createdAt) {
    return createdAt >= FECHA_INICIO_PROTOCOLO_COMPLEX;
  }

  return false;
}

export function filtrarCasosProtocolo(casos, fechaDesde, fechaHasta) {
  return filtrarCasosPorPeriodo(
    casos.filter(esCasoProtocoloNuevo),
    fechaDesde,
    fechaHasta,
    FECHA_INICIO_PROTOCOLO_COMPLEX
  );
}

/** Código de estado FACTURADO en COMPLEX (cierre operativo del área). */
export const CODIGO_ESTADO_FACTURADO = '17';

export function obtenerCodigoEstadoCaso(caso) {
  const raw =
    caso?.codiEstdo ??
    caso?.codi_estado ??
    caso?.codiEstado ??
    caso?.codi_estdo ??
    caso?.estado ??
    caso?.estadoProceso ??
    null;
  if (raw == null || raw === '') return '';
  return String(raw).trim();
}

/**
 * Cerrado para COMPLEX = estado FACTURADO (código 17 o descripción).
 * No se usa CERRADO/FINALIZADO ni solo fecha de finiquito.
 */
export function esCasoFacturado(caso) {
  const codigo = obtenerCodigoEstadoCaso(caso);
  if (!codigo) return false;

  // Código numérico o string "17"
  if (codigo === CODIGO_ESTADO_FACTURADO || Number(codigo) === 17) return true;

  const normalizado = codigo.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalizado === 'FACTURADO' || normalizado.includes('FACTURADO')) return true;

  const descripcion = String(
    caso?.descEstdo || caso?.descEstado || caso?.nombreEstado || caso?.estadoNombre || ''
  )
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (descripcion === 'FACTURADO' || descripcion.includes('FACTURADO')) return true;

  return false;
}

export function esCasoCerrado(caso) {
  return esCasoFacturado(caso);
}

function normalizarTextoEstado(valor) {
  return String(valor || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Resuelve el nombre legible del estado del caso (código → catálogo, o texto directo).
 */
export function resolverNombreEstadoCaso(caso, catalogoEstados = []) {
  const codigo = obtenerCodigoEstadoCaso(caso);
  if (!codigo) return 'SIN ESTADO';

  const codigoNorm = String(codigo).trim();
  const catalogo = Array.isArray(catalogoEstados) ? catalogoEstados : [];

  const porCodigo = catalogo.find((e) => {
    const c = String(e?.codiEstdo ?? e?.codiEstado ?? e?.codigo ?? '').trim();
    return c === codigoNorm || Number(c) === Number(codigoNorm);
  });
  if (porCodigo) {
    return String(
      porCodigo.descEstdo || porCodigo.descEstado || porCodigo.descripcion || codigoNorm
    ).trim();
  }

  // Si el campo ya trae el nombre (no solo código numérico)
  if (Number.isNaN(Number(codigoNorm))) return codigoNorm;

  const descripcionDirecta = String(
    caso?.descEstdo || caso?.descEstado || caso?.nombreEstado || ''
  ).trim();
  return descripcionDirecta || `Estado ${codigoNorm}`;
}

/**
 * Clasificación de negocio para el consolidado histórico:
 * - cierreExitoso: FACTURADO (pagado / éxito)
 * - otrosCerrados: DESISTIDO, ANULADO, CANCELADO
 * - enGestion: resto de estados activos
 */
export function clasificarCategoriaEstado(nombreEstado) {
  const n = normalizarTextoEstado(nombreEstado);
  if (!n || n === 'SIN ESTADO') return 'enGestion';

  if (n === 'FACTURADO' || n.includes('FACTURADO')) return 'cierreExitoso';

  if (
    n.includes('DESISTIDO') ||
    n.includes('ANULADO') ||
    n === 'CANCELADO' ||
    n.includes('CANCELADO')
  ) {
    return 'otrosCerrados';
  }

  return 'enGestion';
}

function etiquetaCategoriaEstado(categoria) {
  if (categoria === 'cierreExitoso') return 'Cerrado — éxito (facturado)';
  if (categoria === 'otrosCerrados') return 'Cerrado — desistido/anulado';
  return 'En gestión';
}

/**
 * Consolidado real por estado (misma lógica de conteo que el reporte por filtro de estado).
 * Devuelve:
 * - cada estado individual con cantidad
 * - casos cerrados desglosados (facturado vs desistido/anulado)
 * - estados en gestión individuales
 * - consolidado completo con totales
 */
export function calcularConsolidadoEstados(casos = [], catalogoEstados = []) {
  const porEstadoMap = new Map();

  casos.forEach((caso) => {
    const nombre = resolverNombreEstadoCaso(caso, catalogoEstados);
    const clave = normalizarTextoEstado(nombre) || 'SIN ESTADO';
    const actual = porEstadoMap.get(clave) || { estado: nombre, cantidad: 0 };
    actual.cantidad += 1;
    if (nombre.length > String(actual.estado).length) actual.estado = nombre;
    porEstadoMap.set(clave, actual);
  });

  const porEstado = Array.from(porEstadoMap.values())
    .map((fila) => {
      const categoria = clasificarCategoriaEstado(fila.estado);
      return {
        estado: fila.estado,
        cantidad: fila.cantidad,
        categoria,
        etiquetaCategoria: etiquetaCategoriaEstado(categoria),
        esCerrado: categoria === 'cierreExitoso' || categoria === 'otrosCerrados',
      };
    })
    .sort((a, b) => {
      // Cerrados primero (facturado, luego otros), después en gestión por cantidad
      const ordenCat = { cierreExitoso: 0, otrosCerrados: 1, enGestion: 2 };
      const da = ordenCat[a.categoria] ?? 3;
      const db = ordenCat[b.categoria] ?? 3;
      if (da !== db) return da - db;
      return b.cantidad - a.cantidad;
    });

  const cerradosDetalle = porEstado.filter((f) => f.esCerrado);
  const enGestionDetalle = porEstado.filter((f) => !f.esCerrado);

  const cierreExitoso = cerradosDetalle
    .filter((f) => f.categoria === 'cierreExitoso')
    .reduce((s, f) => s + f.cantidad, 0);
  const otrosCerrados = cerradosDetalle
    .filter((f) => f.categoria === 'otrosCerrados')
    .reduce((s, f) => s + f.cantidad, 0);
  const enGestion = enGestionDetalle.reduce((s, f) => s + f.cantidad, 0);
  const totalCerrados = cierreExitoso + otrosCerrados;
  const total = casos.length;

  const pct = (parte) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : 0);
  const porcentajeCierreExitoso = pct(cierreExitoso);
  const porcentajeOtrosCerrados = pct(otrosCerrados);
  const porcentajeCierreTotal = pct(totalCerrados);
  const porcentajeEnGestion = pct(enGestion);

  const consolidadoCompleto = [
    ...porEstado.map((f) => ({
      estado: f.estado,
      cantidad: f.cantidad,
      porcentaje: pct(f.cantidad),
      categoria: f.categoria,
      etiquetaCategoria: f.etiquetaCategoria,
      esCerrado: f.esCerrado,
    })),
    {
      estado: 'TOTAL GENERAL',
      cantidad: total,
      porcentaje: total > 0 ? 100 : 0,
      categoria: 'total',
      etiquetaCategoria: 'Consolidado',
      esCerrado: false,
      esTotal: true,
    },
  ];

  return {
    total,
    cierreExitoso,
    otrosCerrados,
    enGestion,
    totalCerrados,
    porcentajeCierreExitoso,
    porcentajeOtrosCerrados,
    porcentajeCierreTotal,
    porcentajeEnGestion,
    porEstado,
    cerradosDetalle,
    enGestionDetalle,
    consolidadoCompleto,
    resumenCategorias: [
      {
        categoria: 'Cerrado — éxito (FACTURADO)',
        cantidad: cierreExitoso,
        porcentaje: porcentajeCierreExitoso,
        detalle: 'Caso pagado / cerrado con éxito en la empresa',
      },
      {
        categoria: 'Cerrado — desistido / anulado',
        cantidad: otrosCerrados,
        porcentaje: porcentajeOtrosCerrados,
        detalle: 'Cierre sin facturación exitosa (finalizado)',
      },
      {
        categoria: 'Total casos cerrados',
        cantidad: totalCerrados,
        porcentaje: porcentajeCierreTotal,
        detalle: 'Facturado + desistido + anulado',
      },
      {
        categoria: 'En gestión',
        cantidad: enGestion,
        porcentaje: porcentajeEnGestion,
        detalle: 'Pendientes, coordinación, liquidación, honorarios, etc.',
      },
      {
        categoria: 'TOTAL GENERAL',
        cantidad: total,
        porcentaje: total > 0 ? 100 : 0,
        detalle: 'Cerrados + en gestión',
      },
    ],
  };
}

/** Fecha de cierre operativo: factura primero; si no, finiquito/indemnización. */
export function obtenerFechaCierre(caso) {
  return (
    caso?.fchaFactra ||
    caso?.fcha_factra ||
    caso?.fechaFactura ||
    caso?.fecha_factura ||
    caso?.fchaEnvioFiniquito ||
    caso?.fcha_envio_finiquito ||
    caso?.fchaFinqtoIndem ||
    caso?.fcha_finqto_indem ||
    null
  );
}

export function obtenerFechaReferenciaEsperaDocs(caso) {
  return parsearFechaComplex(caso?.fchaSoliDocu) || parsearFechaComplex(caso?.fchaInspccion);
}

export function casoPendienteDocsMas30Dias(caso, fechaReferencia = new Date()) {
  if (!casoEnEsperaDocumentos(caso)) return false;

  const inicioEspera = obtenerFechaReferenciaEsperaDocs(caso);
  if (!inicioEspera) return false;

  const hoy = parsearFechaComplex(fechaReferencia) || new Date();
  const dias = calcularDiasEntre(inicioEspera, hoy);
  return dias != null && dias > 30;
}

export function casoRecibidoEnMes(caso, anio, mes) {
  const fecha = parsearFechaSoloDiaComplex(caso?.fchaAsgncion);
  if (!fecha) return false;
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1;
}

export function casoCerradoEnMes(caso, anio, mes) {
  if (!esCasoFacturado(caso)) return false;
  const fecha = parsearFechaSoloDiaComplex(obtenerFechaCierre(caso));
  if (!fecha) {
    // Facturado sin fecha de factura/finiquito: cuenta en el mes de asignación.
    const asignacion = parsearFechaSoloDiaComplex(caso?.fchaAsgncion);
    if (!asignacion) return false;
    return asignacion.getFullYear() === anio && asignacion.getMonth() === mes - 1;
  }
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1;
}

export function fechaEnPeriodo(fecha, fechaDesde, fechaHasta, fechaMinima = null) {
  const valor = parsearFechaSoloDiaComplex(fecha);
  if (!valor) return false;

  const desde = fechaDesde ? parsearFechaSoloDiaComplex(fechaDesde) : fechaMinima;
  const hasta = fechaHasta ? parsearFechaSoloDiaComplex(fechaHasta) : null;

  if (desde && valor < desde) return false;
  if (hasta && valor > hasta) return false;
  return true;
}

/**
 * Caso cerrado dentro del universo ya filtrado por periodo de asignación.
 * Criterio de negocio COMPLEX: estado FACTURADO (código 17).
 */
export function casoCerradoEnPeriodo(caso, _fechaDesde, _fechaHasta) {
  void _fechaDesde;
  void _fechaHasta;
  return esCasoFacturado(caso);
}

/** Fechas de hitos anteriores a 2024 se tratan como corruptas (p. ej. Excel → 1902). */
const FECHA_MINIMA_HITO_VALIDO = new Date(2024, 0, 1, 0, 0, 0);

function fechaMaximaHitoValido() {
  const hoy = new Date();
  return new Date(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate());
}

export function esFechaHitoValidaParaIndicador(valor) {
  const fecha = parsearFechaComplex(valor);
  if (!fecha) return false;
  return fecha >= FECHA_MINIMA_HITO_VALIDO && fecha <= fechaMaximaHitoValido();
}

export function calcularDiasEntre(inicio, fin) {
  const fechaInicio = parsearFechaComplex(inicio);
  const fechaFin = parsearFechaComplex(fin);
  if (!fechaInicio || !fechaFin) return null;

  const diferenciaMs = fechaFin.getTime() - fechaInicio.getTime();
  if (diferenciaMs < 0) return null;

  return diferenciaMs / (1000 * 60 * 60 * 24);
}

/** Días hábiles Colombia entre dos fechas (excluye sábados, domingos y festivos). */
export function calcularDiasHabilesEntre(inicio, fin) {
  const fechaInicio = parsearFechaComplex(inicio);
  const fechaFin = parsearFechaComplex(fin);
  if (!fechaInicio || !fechaFin || fechaFin < fechaInicio) return null;
  return diasHabilesColombiaEntre(fechaInicio, fechaFin);
}

/** Tiempo entre dos campos del caso; con hito anterior alternativo si falta el inmediato. */
export function calcularDiasSecuenciaIndicador(caso, { desde, hasta, fallbackDesde, unidad }) {
  if (!caso?.[hasta]) return null;
  const inicio = caso[desde] || (fallbackDesde ? caso[fallbackDesde] : null);
  if (!esFechaHitoValidaParaIndicador(inicio) || !esFechaHitoValidaParaIndicador(caso[hasta])) {
    return null;
  }
  if (unidad === 'dias_habiles') {
    return calcularDiasHabilesEntre(inicio, caso[hasta]);
  }
  return calcularDiasEntre(inicio, caso[hasta]);
}

function crearAcumuladorMuestrasSecuencia(extra = {}) {
  const acumulador = { ...extra };
  SECUENCIA_INDICADORES_TIEMPO.forEach(({ muestra }) => {
    acumulador[muestra] = { suma: 0, conteo: 0 };
  });
  return acumulador;
}

function acumularMuestrasSecuencia(acumulador, caso) {
  SECUENCIA_INDICADORES_TIEMPO.forEach((tramo) => {
    // Esperas de terceros (aseguradora/cliente) no deben afectar promedios del ajustador.
    if (tramo.imputableAjustador === false) return;

    const dias = calcularDiasSecuenciaIndicador(caso, tramo);
    if (dias != null) {
      acumulador[tramo.muestra].suma += dias;
      acumulador[tramo.muestra].conteo++;
    }
  });
}

function muestrasSecuenciaDesdeAcumulador(acumulador) {
  const muestras = {};
  SECUENCIA_INDICADORES_TIEMPO.forEach(({ muestra }) => {
    muestras[muestra] = acumulador[muestra]?.conteo ?? 0;
  });
  return muestras;
}

function promediosSecuenciaDesdeAcumulador(acumulador, prefijo = 'promedio') {
  const clavePorMuestra = {
    asignacionContacto: `${prefijo}AsignacionContacto`,
    contactoInspeccion: `${prefijo}ContactoInspeccion`,
    inspeccionSolicitudDocs: `${prefijo}InspeccionSolicitudDocs`,
    etapaPreliminar: `${prefijo}EtapaPreliminar`,
    ultimoDocInformeFinal: `${prefijo}UltimoDocInformeFinal`,
    informeFinalAutorizacion: `${prefijo}InformeFinalAutorizacion`,
    aprobacionPresentacion: `${prefijo}AprobacionPresentacion`,
  };

  const resultado = {};
  SECUENCIA_INDICADORES_TIEMPO.forEach(({ muestra }) => {
    const clave = clavePorMuestra[muestra];
    if (clave) resultado[clave] = promediarEtapa(acumulador[muestra]);
  });
  return resultado;
}

export function formatearTiempoPromedio(diasPromedio, t, unidad) {
  if (diasPromedio == null || Number.isNaN(diasPromedio)) return '—';

  const tr = typeof t === 'function' ? t : null;
  const base = 'complex.ui.indicadores_protocolo_complex';
  const esHabiles = unidad === 'dias_habiles';

  if (diasPromedio < 1) {
    const horas = Math.round(diasPromedio * 24);
    if (horas <= 0) {
      return tr ? tr(`${base}.tiempo_menos_1_hora`) : '< 1 hour';
    }
    if (horas === 1) {
      return tr ? tr(`${base}.tiempo_1_hora`) : '~1 hour';
    }
    return tr ? tr(`${base}.tiempo_n_horas`, { n: horas }) : `~${horas} hours`;
  }

  const dias = Math.round(diasPromedio);
  if (esHabiles) {
    if (dias === 1) {
      return tr ? tr(`${base}.tiempo_1_dia_habil`) : '~1 business day';
    }
    return tr ? tr(`${base}.tiempo_n_dias_habiles`, { n: dias }) : `~${dias} business days`;
  }
  if (dias === 1) {
    return tr ? tr(`${base}.tiempo_1_dia`) : '~1 day';
  }
  return tr ? tr(`${base}.tiempo_n_dias`, { n: dias }) : `~${dias} days`;
}

function crearAcumuladorIndicadores() {
  return crearAcumuladorMuestrasSecuencia({
    esperaDocumentos: 0,
    cerradosPeriodo: 0,
    totalCasos: 0,
  });
}

function acumularTiempos(acumulador, caso) {
  acumulador.totalCasos++;
  acumularMuestrasSecuencia(acumulador, caso);

  if (casoEnEsperaDocumentos(caso)) {
    acumulador.esperaDocumentos++;
  }

  if (esCasoFacturado(caso)) {
    acumulador.cerradosPeriodo++;
  }
}

function promediarEtapa(etapa) {
  if (!etapa || etapa.conteo === 0) return null;
  return etapa.suma / etapa.conteo;
}

export function casoEnEsperaDocumentos(caso) {
  // Un caso facturado ya está cerrado: no puede seguir en "espera de documentos".
  if (esCasoFacturado(caso)) return false;

  const tieneSolicitudDocs = Boolean(parsearFechaComplex(caso.fchaSoliDocu));
  const tieneInspeccion = Boolean(parsearFechaComplex(caso.fchaInspccion));
  const tieneUltimoDocumento = Boolean(parsearFechaComplex(caso.fchaRepoActi));
  const tieneInformeFinal = Boolean(parsearFechaComplex(caso.fchaInfoFnal));

  return (tieneSolicitudDocs || tieneInspeccion) && !tieneUltimoDocumento && !tieneInformeFinal;
}

export function calcularIndicadoresGlobales(casos) {
  const acumulador = crearAcumuladorIndicadores();
  casos.forEach((caso) => acumularTiempos(acumulador, caso));

  return {
    totalCasos: acumulador.totalCasos,
    ...promediosSecuenciaDesdeAcumulador(acumulador, 'promedio'),
    casosEsperaDocumentos: acumulador.esperaDocumentos,
    cerradosPeriodo: acumulador.cerradosPeriodo,
    muestras: muestrasSecuenciaDesdeAcumulador(acumulador),
  };
}

export function calcularIndicadoresPorResponsable(casos, obtenerNombreResponsable, opciones = {}) {
  const { catalogoResponsables = [] } = opciones;
  const mapa = {};

  casos.forEach((caso) => {
    const { clave, nombre } = resolverAgrupacionCaso(
      caso,
      catalogoResponsables,
      obtenerNombreResponsable
    );

    if (!mapa[clave]) {
      mapa[clave] = {
        clave,
        nombre: nombre || 'Sin asignar',
        ...crearAcumuladorIndicadores(),
      };
    } else {
      mapa[clave].nombre = elegirNombreMostrarResponsable(mapa[clave].nombre, nombre);
    }

    acumularTiempos(mapa[clave], caso);
  });

  return Object.values(mapa)
    .map((item) => ({
      nombre: item.nombre,
      totalCasos: item.totalCasos,
      ...promediosSecuenciaDesdeAcumulador(item, 'promedio'),
      casosEsperaDocumentos: item.esperaDocumentos,
      cerradosPeriodo: item.cerradosPeriodo,
      muestras: muestrasSecuenciaDesdeAcumulador(item),
    }))
    .sort((a, b) => b.totalCasos - a.totalCasos);
}

// ─── Indicadores nuevo protocolo ───────────────────────────────────────────

function crearAcumuladorProtocolo() {
  return crearAcumuladorMuestrasSecuencia({
    asignacionCierre: { suma: 0, conteo: 0 },
    esperaDocumentos: 0,
    pendientesDocs30Dias: 0,
    cerradosPeriodo: 0,
    totalCasos: 0,
  });
}

function acumularIndicadoresProtocolo(acumulador, caso, periodo = {}) {
  const { fechaDesde, fechaHasta } = periodo;
  acumulador.totalCasos++;

  acumularMuestrasSecuencia(acumulador, caso);

  const diasCierre = calcularDiasEntre(caso.fchaAsgncion, obtenerFechaCierre(caso));
  if (diasCierre != null) {
    acumulador.asignacionCierre.suma += diasCierre;
    acumulador.asignacionCierre.conteo++;
  }

  if (casoEnEsperaDocumentos(caso)) {
    acumulador.esperaDocumentos++;
  }

  if (casoPendienteDocsMas30Dias(caso)) {
    acumulador.pendientesDocs30Dias++;
  }

  if (casoCerradoEnPeriodo(caso, fechaDesde, fechaHasta)) {
    acumulador.cerradosPeriodo++;
  }
}

function mapearAcumuladorProtocolo(acumulador, nombre, clave) {
  return {
    clave,
    nombre,
    totalCasos: acumulador.totalCasos,
    ...promediosSecuenciaDesdeAcumulador(acumulador, 'promedio'),
    promedioAsignacionCierre: promediarEtapa(acumulador.asignacionCierre),
    casosEsperaDocumentos: acumulador.esperaDocumentos,
    pendientesDocs30Dias: acumulador.pendientesDocs30Dias,
    cerradosPeriodo: acumulador.cerradosPeriodo,
    muestras: {
      ...muestrasSecuenciaDesdeAcumulador(acumulador),
      asignacionCierre: acumulador.asignacionCierre.conteo,
    },
  };
}

export function calcularIndicadoresProtocoloGlobales(casos, periodo = {}) {
  const acumulador = crearAcumuladorProtocolo();
  casos.forEach((caso) => acumularIndicadoresProtocolo(acumulador, caso, periodo));
  return mapearAcumuladorProtocolo(acumulador, 'General', 'general');
}

export function agruparIndicadoresProtocolo(casos, resolverGrupo, opciones = {}) {
  const { periodo = {}, catalogoResponsables = [] } = opciones;
  const mapa = {};

  casos.forEach((caso) => {
    const grupo = resolverGrupo(caso, catalogoResponsables);
    if (!grupo?.clave) return;

    if (!mapa[grupo.clave]) {
      mapa[grupo.clave] = {
        clave: grupo.clave,
        nombre: grupo.nombre || 'Sin dato',
        ...crearAcumuladorProtocolo(),
      };
    } else if (grupo.nombre) {
      mapa[grupo.clave].nombre = elegirNombreMostrarResponsable(
        mapa[grupo.clave].nombre,
        grupo.nombre
      );
    }

    acumularIndicadoresProtocolo(mapa[grupo.clave], caso, periodo);
  });

  return Object.values(mapa)
    .map((item) => mapearAcumuladorProtocolo(item, item.nombre, item.clave))
    .sort((a, b) => b.totalCasos - a.totalCasos);
}

export function resolverGrupoAjustador(caso, catalogoResponsables, obtenerNombreResponsable) {
  return resolverAgrupacionCaso(caso, catalogoResponsables, obtenerNombreResponsable);
}

export function resolverGrupoCompania(caso, obtenerNombreCompania) {
  const codigo = caso?.codiAsgrdra || caso?.codi_asgrdra || '';
  const nombre =
    typeof obtenerNombreCompania === 'function'
      ? obtenerNombreCompania(codigo, caso)
      : codigo || 'Sin compañía';

  return {
    clave: codigo ? `asg:${codigo}` : 'sin_compania',
    nombre: nombre || 'Sin compañía',
  };
}

export function resolverGrupoRamo(caso) {
  const ramo = String(caso?.tipoPoliza || caso?.tipo_poliza || caso?.amprAfctdo || '').trim();
  return {
    clave: ramo ? `ramo:${ramo.toLowerCase()}` : 'sin_ramo',
    nombre: ramo || 'Sin ramo',
  };
}
