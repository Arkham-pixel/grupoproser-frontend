/**
 * Indicadores de tiempos promedio ANS Express.
 */

import {
  CODIGOS_ESTADO_EXPRESS_SIN_PROTOCOLO,
  FECHA_INICIO_PROTOCOLO_EXPRESS,
  INDICADORES_PROTOCOLO_EXPRESS_DEF,
  SECUENCIA_INDICADORES_TIEMPO_EXPRESS,
} from '../config/protocoloExpressDefaults.js';
import { parsearFechaHoraComplex } from './complexFechaHoraUtils.js';
import { crearFechaLocal } from './fechaUtils.js';
import { diasHabilesColombiaEntre } from './festivosColombia.js';

/**
 * Los ANS Express se miden en días hábiles: nunca se convierte a horas.
 */
export function formatearDiasHabilesPromedio(diasHabiles) {
  if (diasHabiles == null || Number.isNaN(diasHabiles)) return '—';
  if (diasHabiles <= 0) return 'Mismo día hábil';

  const redondeado = Math.round(diasHabiles * 10) / 10;
  if (redondeado < 1) return '< 1 día hábil';

  const texto = Number.isInteger(redondeado) ? String(redondeado) : redondeado.toFixed(1);
  return redondeado === 1 ? '1 día hábil' : `${texto} días hábiles`;
}

function diasEntre(inicio, fin, unidad = 'dias') {
  const a = parsearFechaHoraComplex(inicio);
  const b = parsearFechaHoraComplex(fin);
  if (!a || !b || b < a) return null;
  if (unidad === 'dias_habiles') return diasHabilesColombiaEntre(a, b);
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

export function casoExpressEnProtocolo(caso) {
  const codigo = String(caso?.estadoProceso ?? '').trim();
  if (CODIGOS_ESTADO_EXPRESS_SIN_PROTOCOLO.includes(codigo)) return false;
  return true;
}

function normalizarTextoEstadoExpress(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

/** Códigos de catálogo Express que cierran/finalizan el caso. */
export const CODIGOS_ESTADO_EXPRESS_CERRADO = ['2', '4', '5'];

/**
 * Nombres canónicos de estados finalizados (el nombre del estado implica cierre).
 * Incluye variantes del filtro de reporte: liquidar, objetado, desistido, etc.
 */
export const NOMBRES_ESTADO_EXPRESS_CERRADO = [
  'DESISTIDO',
  'LIQUIDAR SINIESTRO',
  'OBJETADO POR INDEMNIZACIONES',
  'LIQUIDAR SINIESTRO - OBJETADO POR INDEMNIZACIONES',
  'CASO CERRADO',
  'CERRADO',
  'ANULADO',
  'ANULAR',
  'PRESCRITO',
  'NO RESPONSABILIDAD DEL ASEGURADO',
  'NO RESPONSABILIDAD ASEGURADO',
];

const SET_NOMBRES_ESTADO_EXPRESS_CERRADO = new Set(
  NOMBRES_ESTADO_EXPRESS_CERRADO.map(normalizarTextoEstadoExpress)
);

/**
 * ¿El estado (código o nombre) indica caso cerrado/finalizado?
 * No cuenta «EN ESPERA DE DESISTIMIENTO» ni estados en gestión.
 */
export function esEstadoExpressCerrado(valorEstado) {
  const raw = String(valorEstado ?? '').trim();
  if (!raw) return false;
  if (CODIGOS_ESTADO_EXPRESS_CERRADO.includes(raw)) return true;

  const estado = normalizarTextoEstadoExpress(raw);
  if (!estado || estado === 'SIN_ESTADO' || estado === 'SIN ESTADO') return false;
  if (SET_NOMBRES_ESTADO_EXPRESS_CERRADO.has(estado)) return true;

  if (estado.includes('ESPERA DE DESISTIMIENTO')) return false;
  if (estado.includes('OBJETADO')) return true;
  if (estado.includes('DESISTIDO')) return true;
  if (estado.includes('LIQUIDAR')) return true;
  if (estado.includes('ANULAD')) return true;
  if (estado.includes('PRESCRIT')) return true;
  if (estado.includes('NO RESPONSABILIDAD')) return true;
  if (estado === 'CASO CERRADO' || estado === 'CERRADO') return true;
  return false;
}

/**
 * Caso cerrado/finalizado Express: estado de proceso con nombre de cierre
 * (Liquidar siniestro, Objetado, Desistido, Anulado, Prescrito, Casó cerrado, etc.).
 */
export function casoExpressCerrado(caso, obtenerNombreEstado) {
  const raw = caso?.estadoProceso;
  if (esEstadoExpressCerrado(raw)) return true;
  if (typeof obtenerNombreEstado === 'function') {
    const nombre = obtenerNombreEstado(raw);
    if (nombre && esEstadoExpressCerrado(nombre)) return true;
  }
  return false;
}

/**
 * Conteo de casos cerrados desglosado por nombre de estado (para gráfica).
 */
export function datosChartEstadosCerradosExpress(casos, obtenerNombreEstado) {
  const conteo = new Map();

  (casos || []).forEach((caso) => {
    if (!casoExpressCerrado(caso, obtenerNombreEstado)) return;
    const raw = caso?.estadoProceso;
    const nombre =
      (typeof obtenerNombreEstado === 'function' && obtenerNombreEstado(raw)) ||
      String(raw || '').trim() ||
      'Sin estado';
    const clave = normalizarTextoEstadoExpress(nombre) || 'SIN ESTADO';
    const actual = conteo.get(clave) || { nombre, cantidad: 0 };
    actual.cantidad += 1;
    if (!actual.nombre || actual.nombre === String(raw)) actual.nombre = nombre;
    conteo.set(clave, actual);
  });

  return [...conteo.values()]
    .map((item) => ({
      nombre: item.nombre,
      nombreCorto:
        item.nombre.length > 28 ? `${item.nombre.slice(0, 26)}…` : item.nombre,
      cantidad: item.cantidad,
    }))
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'));
}

export function fechaReferenciaProtocoloExpress(caso) {
  return (
    parsearFechaHoraComplex(caso?.avisoSiniestro) ||
    parsearFechaHoraComplex(caso?.avisoSiniestroCompania) ||
    parsearFechaHoraComplex(caso?.createdAt) ||
    parsearFechaHoraComplex(caso?.fechaSiniestro)
  );
}

/** YYYY-MM-DD del aviso (mismo criterio que el reporte Express). */
export function fechaAvisoExpressISO(caso) {
  const date = crearFechaLocal(caso?.avisoSiniestro);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Filtro por aviso de siniestro — igual que el reporte Express.
 * No excluye Desistido ni aplica el piso ANS de julio.
 */
export function filtrarCasosPorAvisoExpress(casos, desde, hasta) {
  const tieneRango = Boolean(desde || hasta);
  return (casos || []).filter((caso) => {
    if (!tieneRango) return true;
    const iso = fechaAvisoExpressISO(caso);
    if (!iso) return false;
    if (desde && iso < desde) return false;
    if (hasta && iso > hasta) return false;
    return true;
  });
}

export function filtrarCasosProtocoloExpress(casos, desde, hasta) {
  const inicioProtocolo = parsearFechaHoraComplex(FECHA_INICIO_PROTOCOLO_EXPRESS);
  const desdeFiltro = parsearFechaHoraComplex(desde);
  const hastaFiltro = parsearFechaHoraComplex(hasta);

  return (casos || []).filter((caso) => {
    if (!casoExpressEnProtocolo(caso)) return false;
    const fecha = fechaReferenciaProtocoloExpress(caso);
    if (!fecha) return false;
    if (inicioProtocolo && fecha < inicioProtocolo) return false;
    if (desdeFiltro) {
      const d = new Date(desdeFiltro.getFullYear(), desdeFiltro.getMonth(), desdeFiltro.getDate());
      if (fecha < d) return false;
    }
    if (hastaFiltro) {
      const h = new Date(
        hastaFiltro.getFullYear(),
        hastaFiltro.getMonth(),
        hastaFiltro.getDate(),
        23,
        59,
        59,
        999
      );
      if (fecha > h) return false;
    }
    return true;
  });
}

function resolverHastaTramo(caso, tramo) {
  const principal = parsearFechaHoraComplex(caso[tramo.hasta]);
  if (principal) return principal;
  if (tramo.hastaAlternativo) return parsearFechaHoraComplex(caso[tramo.hastaAlternativo]);
  return null;
}

function resolverDesdeTramo(caso, tramo) {
  if (tramo?.desde === 'fechaReconsideracion') {
    const flag = String(caso?.reconsideracionAplica ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
    const omitida =
      flag === 'no_aplica' ||
      flag === 'noaplica' ||
      (flag !== 'aplica' && !caso?.fechaReconsideracion);
    if (omitida && tramo.fallbackDesde) {
      return parsearFechaHoraComplex(caso[tramo.fallbackDesde]);
    }
  }
  const principal = parsearFechaHoraComplex(caso[tramo.desde]);
  if (principal) return principal;
  if (tramo.fallbackDesde) return parsearFechaHoraComplex(caso[tramo.fallbackDesde]);
  return null;
}

export function calcularDiasSecuenciaExpress(caso, tramo) {
  if (tramo?.muestra === 'reconsideracion') {
    const flag = String(caso?.reconsideracionAplica ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
    if (flag === 'no_aplica' || flag === 'noaplica') return null;
    if (flag !== 'aplica' && !caso?.fechaReconsideracion) return null;
  }
  const desde = resolverDesdeTramo(caso, tramo);
  const hasta = resolverHastaTramo(caso, tramo);
  if (!desde || !hasta) return null;
  return diasEntre(desde, hasta, tramo.unidad || 'dias_habiles');
}

function crearAcumuladorIndicadores() {
  const muestras = {};
  const sumas = {};
  INDICADORES_PROTOCOLO_EXPRESS_DEF.forEach((ind) => {
    muestras[ind.muestra] = 0;
    sumas[ind.muestra] = 0;
  });
  return {
    totalCasos: 0,
    cerradosPeriodo: 0,
    muestras,
    sumas,
  };
}

function acumularIndicadores(acumulador, caso, obtenerNombreEstado) {
  acumulador.totalCasos += 1;
  if (casoExpressCerrado(caso, obtenerNombreEstado)) acumulador.cerradosPeriodo += 1;

  SECUENCIA_INDICADORES_TIEMPO_EXPRESS.forEach((tramo) => {
    const dias = calcularDiasSecuenciaExpress(caso, tramo);
    if (dias == null) return;
    acumulador.sumas[tramo.muestra] += dias;
    acumulador.muestras[tramo.muestra] += 1;
  });
}

function mapearIndicadores(acumulador) {
  const resultado = {
    totalCasos: acumulador.totalCasos,
    cerradosPeriodo: acumulador.cerradosPeriodo,
    muestras: { ...acumulador.muestras },
  };

  INDICADORES_PROTOCOLO_EXPRESS_DEF.forEach((ind) => {
    const n = acumulador.muestras[ind.muestra] || 0;
    resultado[ind.clave] = n > 0 ? acumulador.sumas[ind.muestra] / n : null;
  });

  return resultado;
}

export function calcularIndicadoresExpressGlobales(casos, obtenerNombreEstado) {
  const acumulador = crearAcumuladorIndicadores();
  casos.forEach((caso) => acumularIndicadores(acumulador, caso, obtenerNombreEstado));
  return mapearIndicadores(acumulador);
}

export function resolverGrupoResponsableExpress(caso, obtenerNombre) {
  const raw = String(caso?.responsable || '').trim();
  if (!raw) return { clave: 'sin-responsable', nombre: 'Sin responsable' };
  const nombre = typeof obtenerNombre === 'function' ? obtenerNombre(raw) || raw : raw;
  return { clave: `resp:${raw}`, nombre };
}

export function resolverGrupoAseguradoraExpress(caso, obtenerNombre) {
  const raw = String(caso?.aseguradora || '').trim();
  if (!raw) return { clave: 'sin-aseguradora', nombre: 'Sin aseguradora' };
  const nombre = typeof obtenerNombre === 'function' ? obtenerNombre(raw) || raw : raw;
  return { clave: `aseg:${raw}`, nombre };
}

export function agruparIndicadoresExpress(casos, resolverGrupo, obtenerNombreEstado) {
  const mapa = {};
  casos.forEach((caso) => {
    const grupo = resolverGrupo(caso);
    if (!grupo?.clave) return;
    if (!mapa[grupo.clave]) {
      mapa[grupo.clave] = {
        clave: grupo.clave,
        nombre: grupo.nombre,
        ...crearAcumuladorIndicadores(),
      };
    }
    acumularIndicadores(mapa[grupo.clave], caso, obtenerNombreEstado);
  });

  return Object.values(mapa)
    .map((item) => ({
      clave: item.clave,
      nombre: item.nombre,
      ...mapearIndicadores(item),
    }))
    .sort((a, b) => b.totalCasos - a.totalCasos);
}
