/**
 * Trazabilidad de riesgos: separación Arnald vs plataforma anterior
 * y cálculo de cumplimiento sin penalizar casos históricos sin fechas.
 */

import {
  elegirNombreMostrarResponsable,
  resolverAgrupacionCaso,
} from './responsableAgrupacionUtils.js';

/** Fecha desde la cual los casos se gestionan en Arnald (misma referencia que migración Excel). */
export const FECHA_INICIO_ARNALD_RIESGO = new Date(2025, 9, 1, 12, 0, 0);

export const FECHA_INICIO_ARNALD_RIESGO_LABEL = '01/10/2025';

const TIEMPOS_LIMITE = {
  contactoInicial: 0.5,
  inspeccion: 1,
  informeFinal: 2,
};

const ETAPAS_TRAZABILIDAD = ['contactoInicial', 'inspeccion', 'informeFinal'];

export function parsearFechaRiesgo(valor) {
  if (!valor) return null;
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor;

  if (typeof valor === 'string' && valor.includes('T')) {
    const [fechaPart] = valor.split('T');
    const [year, month, day] = fechaPart.split('-').map(Number);
    if (year && month && day) return new Date(year, month - 1, day);
  }

  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Caso gestionado en Arnald: prioriza fecha de asignación del caso.
 * Los importados de la plataforma anterior conservan fchaAsgncion antigua
 * aunque createdAt sea reciente por la migración.
 */
export function esCasoArnald(caso) {
  const fchaAsgncion = parsearFechaRiesgo(caso?.fchaAsgncion);
  if (fchaAsgncion) {
    return fchaAsgncion >= FECHA_INICIO_ARNALD_RIESGO;
  }

  const createdAt = parsearFechaRiesgo(caso?.createdAt);
  if (createdAt) {
    return createdAt >= FECHA_INICIO_ARNALD_RIESGO;
  }

  return false;
}

export function esCasoHistoricoPlataformaAnterior(caso) {
  return !esCasoArnald(caso);
}

export function obtenerFechasTrazabilidadFaltantes(caso) {
  const faltantes = [];
  if (!parsearFechaRiesgo(caso?.fchaContIni)) faltantes.push('contactoInicial');
  if (!parsearFechaRiesgo(caso?.fchaInspccion)) faltantes.push('inspeccion');
  if (!parsearFechaRiesgo(caso?.fchaInforme)) faltantes.push('informeFinal');
  return faltantes;
}

export function casoRequiereCorreccionTrazabilidad(caso) {
  if (!esCasoHistoricoPlataformaAnterior(caso)) return false;
  return obtenerFechasTrazabilidadFaltantes(caso).length > 0;
}

export function calcularRetrasoEtapaRiesgo(caso, etapa, opciones = {}) {
  const { usarFechaActualSiPendiente = false } = opciones;
  let fechaReferencia = null;
  let fechaCompletado = null;
  let limite = 0;

  switch (etapa) {
    case 'contactoInicial':
      fechaReferencia = parsearFechaRiesgo(caso?.fchaAsgncion);
      fechaCompletado = parsearFechaRiesgo(caso?.fchaContIni);
      limite = TIEMPOS_LIMITE.contactoInicial;
      break;
    case 'inspeccion':
      fechaReferencia =
        parsearFechaRiesgo(caso?.fchaContIni) || parsearFechaRiesgo(caso?.fchaAsgncion);
      fechaCompletado = parsearFechaRiesgo(caso?.fchaInspccion);
      limite = TIEMPOS_LIMITE.inspeccion;
      break;
    case 'informeFinal':
      fechaReferencia =
        parsearFechaRiesgo(caso?.fchaInspccion) ||
        parsearFechaRiesgo(caso?.fchaContIni) ||
        parsearFechaRiesgo(caso?.fchaAsgncion);
      fechaCompletado = parsearFechaRiesgo(caso?.fchaInforme);
      limite = TIEMPOS_LIMITE.informeFinal;
      break;
    default:
      return null;
  }

  if (!fechaReferencia) return null;
  if (!fechaCompletado && !usarFechaActualSiPendiente) return null;

  const fechaFinal = fechaCompletado || new Date();
  const fechaLimite = new Date(fechaReferencia.getTime() + limite * 24 * 60 * 60 * 1000);
  const diferenciaDias = (fechaFinal - fechaLimite) / (24 * 60 * 60 * 1000);

  return {
    etapa,
    diasRetraso: diferenciaDias > 0 ? diferenciaDias : 0,
    enTiempo: diferenciaDias <= 0,
    completado: Boolean(fechaCompletado),
  };
}

function acumularCumplimiento(mapa, claveGrupo, nombreVisible, caso, opcionesRetraso) {
  if (!mapa[claveGrupo]) {
    mapa[claveGrupo] = {
      nombre: nombreVisible,
      totalCasos: 0,
      casosCumplidos: 0,
      casosRetrasados: 0,
      totalDiasRetraso: 0,
    };
  } else {
    mapa[claveGrupo].nombre = elegirNombreMostrarResponsable(
      mapa[claveGrupo].nombre,
      nombreVisible
    );
  }

  const responsable = mapa[claveGrupo];
  let tieneAlMenosUnaEtapa = false;
  let todasCumplidas = true;
  let casoConRetraso = false;

  ETAPAS_TRAZABILIDAD.forEach((etapa) => {
    const retraso = calcularRetrasoEtapaRiesgo(caso, etapa, opcionesRetraso);
    if (!retraso) return;

    tieneAlMenosUnaEtapa = true;
    if (retraso.diasRetraso > 0) {
      todasCumplidas = false;
      casoConRetraso = true;
      responsable.totalDiasRetraso += retraso.diasRetraso;
    }
  });

  if (!tieneAlMenosUnaEtapa) return;

  responsable.totalCasos++;
  if (casoConRetraso) responsable.casosRetrasados++;
  if (todasCumplidas) responsable.casosCumplidos++;
}

export function calcularCumplimientoPorResponsable(casos, obtenerNombreResponsable, opciones = {}) {
  const {
    soloArnald = true,
    usarFechaActualSiPendiente = false,
    limite = 15,
    catalogoResponsables = [],
  } = opciones;

  const mapa = {};

  casos.forEach((caso) => {
    if (soloArnald && !esCasoArnald(caso)) return;

    const { clave, nombre } = resolverAgrupacionCaso(
      caso,
      catalogoResponsables,
      obtenerNombreResponsable
    );
    if (clave === 'sin_asignar') return;

    acumularCumplimiento(mapa, clave, nombre, caso, { usarFechaActualSiPendiente });
  });

  return Object.values(mapa)
    .map((datos) => ({
      nombre: datos.nombre,
      totalCasos: datos.totalCasos,
      casosCumplidos: datos.casosCumplidos,
      casosRetrasados: datos.casosRetrasados,
      porcentajeCumplimiento:
        datos.totalCasos > 0
          ? ((datos.casosCumplidos / datos.totalCasos) * 100).toFixed(1)
          : '0',
      promedioDiasRetraso:
        datos.casosRetrasados > 0
          ? (datos.totalDiasRetraso / datos.casosRetrasados).toFixed(1)
          : '0',
    }))
    .sort((a, b) => b.totalCasos - a.totalCasos)
    .slice(0, limite);
}

export function calcularRetrasosPorEtapa(casos, opciones = {}) {
  const { soloArnald = true, usarFechaActualSiPendiente = true } = opciones;

  const conteo = {
    contactoInicial: 0,
    inspeccion: 0,
    informeFinal: 0,
  };

  casos.forEach((caso) => {
    if (soloArnald && !esCasoArnald(caso)) return;

    ETAPAS_TRAZABILIDAD.forEach((etapa) => {
      const retraso = calcularRetrasoEtapaRiesgo(caso, etapa, { usarFechaActualSiPendiente });
      if (retraso && retraso.diasRetraso > 0) {
        conteo[etapa]++;
      }
    });
  });

  return [
    { etapa: 'Contacto Inicial', retrasados: conteo.contactoInicial, limite: '12 horas' },
    { etapa: 'Inspección', retrasados: conteo.inspeccion, limite: '24 horas' },
    { etapa: 'Informe Final', retrasados: conteo.informeFinal, limite: '2 días' },
  ];
}

export function calcularHistoricosPendientesCorreccion(casos, obtenerNombreResponsable, opciones = {}) {
  const { limite = 15, catalogoResponsables = [] } = opciones;
  const mapa = {};

  casos.forEach((caso) => {
    if (!casoRequiereCorreccionTrazabilidad(caso)) return;

    const { clave, nombre } = resolverAgrupacionCaso(
      caso,
      catalogoResponsables,
      obtenerNombreResponsable
    );

    if (!mapa[clave]) {
      mapa[clave] = {
        nombre,
        totalHistoricos: 0,
        sinContacto: 0,
        sinInspeccion: 0,
        sinInforme: 0,
        pendientesCorreccion: 0,
      };
    } else {
      mapa[clave].nombre = elegirNombreMostrarResponsable(mapa[clave].nombre, nombre);
    }

    const item = mapa[clave];
    item.totalHistoricos++;
    item.pendientesCorreccion++;

    const faltantes = obtenerFechasTrazabilidadFaltantes(caso);
    if (faltantes.includes('contactoInicial')) item.sinContacto++;
    if (faltantes.includes('inspeccion')) item.sinInspeccion++;
    if (faltantes.includes('informeFinal')) item.sinInforme++;
  });

  return Object.values(mapa)
    .sort((a, b) => b.pendientesCorreccion - a.pendientesCorreccion)
    .slice(0, limite);
}

export function resumirSegmentacionTrazabilidad(casos) {
  let casosArnald = 0;
  let casosHistoricos = 0;
  let historicosPendientes = 0;

  casos.forEach((caso) => {
    if (esCasoArnald(caso)) {
      casosArnald++;
    } else {
      casosHistoricos++;
      if (casoRequiereCorreccionTrazabilidad(caso)) historicosPendientes++;
    }
  });

  return { casosArnald, casosHistoricos, historicosPendientes };
}
