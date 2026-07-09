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
    const fchaAsgncion = parsearFechaSoloDiaComplex(caso.fchaAsgncion);
    if (!fchaAsgncion) return false;
    if (desde && fchaAsgncion < desde) return false;
    if (hasta && fchaAsgncion > hasta) return false;
    return true;
  });
}

export function esCasoProtocoloNuevo(caso) {
  const fchaAsgncion = parsearFechaComplex(caso?.fchaAsgncion);
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

export function obtenerFechaCierre(caso) {
  return (
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
  const fecha = parsearFechaSoloDiaComplex(obtenerFechaCierre(caso));
  if (!fecha) return false;
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

export function casoCerradoEnPeriodo(caso, fechaDesde, fechaHasta) {
  return fechaEnPeriodo(obtenerFechaCierre(caso), fechaDesde, fechaHasta);
}

export function calcularDiasEntre(inicio, fin) {
  const fechaInicio = parsearFechaComplex(inicio);
  const fechaFin = parsearFechaComplex(fin);
  if (!fechaInicio || !fechaFin) return null;

  const diferenciaMs = fechaFin.getTime() - fechaInicio.getTime();
  if (diferenciaMs < 0) return null;

  return diferenciaMs / (1000 * 60 * 60 * 24);
}

/** Tiempo entre dos campos del caso; con hito anterior alternativo si falta el inmediato. */
export function calcularDiasSecuenciaIndicador(caso, { desde, hasta, fallbackDesde }) {
  if (!caso?.[hasta]) return null;
  const inicio = caso[desde] || (fallbackDesde ? caso[fallbackDesde] : null);
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

export function formatearTiempoPromedio(diasPromedio) {
  if (diasPromedio == null || Number.isNaN(diasPromedio)) return '—';

  if (diasPromedio < 1) {
    const horas = Math.round(diasPromedio * 24);
    if (horas <= 0) return '< 1 hora';
    return horas === 1 ? '~1 hora' : `~${horas} horas`;
  }

  const dias = Math.round(diasPromedio);
  return dias === 1 ? '~1 día' : `~${dias} días`;
}

function crearAcumuladorIndicadores() {
  return crearAcumuladorMuestrasSecuencia({
    esperaDocumentos: 0,
    totalCasos: 0,
  });
}

function acumularTiempos(acumulador, caso) {
  acumulador.totalCasos++;
  acumularMuestrasSecuencia(acumulador, caso);

  if (casoEnEsperaDocumentos(caso)) {
    acumulador.esperaDocumentos++;
  }
}

function promediarEtapa(etapa) {
  if (!etapa || etapa.conteo === 0) return null;
  return etapa.suma / etapa.conteo;
}

export function casoEnEsperaDocumentos(caso) {
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
