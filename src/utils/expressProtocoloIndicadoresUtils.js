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

export function fechaReferenciaProtocoloExpress(caso) {
  return (
    parsearFechaHoraComplex(caso?.avisoSiniestro) ||
    parsearFechaHoraComplex(caso?.avisoSiniestroCompania) ||
    parsearFechaHoraComplex(caso?.createdAt) ||
    parsearFechaHoraComplex(caso?.fechaSiniestro)
  );
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
  const principal = parsearFechaHoraComplex(caso[tramo.desde]);
  if (principal) return principal;
  if (tramo.fallbackDesde) return parsearFechaHoraComplex(caso[tramo.fallbackDesde]);
  return null;
}

export function calcularDiasSecuenciaExpress(caso, tramo) {
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

function acumularIndicadores(acumulador, caso) {
  acumulador.totalCasos += 1;
  if (caso?.fechaCierre) acumulador.cerradosPeriodo += 1;

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

export function calcularIndicadoresExpressGlobales(casos) {
  const acumulador = crearAcumuladorIndicadores();
  casos.forEach((caso) => acumularIndicadores(acumulador, caso));
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

export function agruparIndicadoresExpress(casos, resolverGrupo) {
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
    acumularIndicadores(mapa[grupo.clave], caso);
  });

  return Object.values(mapa)
    .map((item) => ({
      clave: item.clave,
      nombre: item.nombre,
      ...mapearIndicadores(item),
    }))
    .sort((a, b) => b.totalCasos - a.totalCasos);
}
