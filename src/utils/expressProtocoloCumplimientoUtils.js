/**
 * Cumplimiento ANS Express (etapas cerradas dentro del plazo).
 */

import {
  ETAPAS_PROTOCOLO_EXPRESS_DEFAULT,
  INDICADORES_CUMPLIMIENTO_EXPRESS,
} from '../config/protocoloExpressDefaults.js';
import { parsearFechaHoraComplex } from './complexFechaHoraUtils.js';
import { diasHabilesColombiaEntre } from './festivosColombia.js';

function diasHabilesEntre(inicio, fin) {
  const a = parsearFechaHoraComplex(inicio);
  const b = parsearFechaHoraComplex(fin);
  if (!a || !b || b < a) return null;
  return diasHabilesColombiaEntre(a, b);
}

function diasCalendarioEntre(inicio, fin) {
  const a = parsearFechaHoraComplex(inicio);
  const b = parsearFechaHoraComplex(fin);
  if (!a || !b || b < a) return null;
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

function medirTranscurrido(inicio, fin, unidad) {
  if (unidad === 'dias_habiles') return diasHabilesEntre(inicio, fin);
  if (unidad === 'dias') return diasCalendarioEntre(inicio, fin);
  const a = parsearFechaHoraComplex(inicio);
  const b = parsearFechaHoraComplex(fin);
  if (!a || !b) return null;
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

function obtenerEtapa(protocolo, etapaId) {
  const etapas = protocolo?.etapas?.length ? protocolo.etapas : ETAPAS_PROTOCOLO_EXPRESS_DEFAULT;
  return etapas.find((e) => e.id === etapaId) || null;
}

function resolverFechaReferencia(caso, etapa) {
  if (etapa?.referencia === 'fechaReconsideracion' && reconsideracionExpressOmitida(caso)) {
    if (etapa.referenciaAlternativa) {
      return parsearFechaHoraComplex(caso[etapa.referenciaAlternativa]);
    }
    return null;
  }
  const principal = parsearFechaHoraComplex(caso[etapa.referencia]);
  if (principal) return principal;
  if (etapa.referenciaAlternativa) {
    return parsearFechaHoraComplex(caso[etapa.referenciaAlternativa]);
  }
  return null;
}

function resolverFechaCierreEtapa(caso, etapa) {
  const principal = parsearFechaHoraComplex(caso[etapa.campoFecha]);
  if (principal) return principal;
  if (etapa.criterioCompletitud === 'definicionODocsAdicionalesExpress') {
    return parsearFechaHoraComplex(caso.fechaSolicitudDocumentosAdicionales);
  }
  return null;
}

function esFechaPlausible(fecha) {
  if (!fecha) return false;
  const maxima = new Date();
  maxima.setFullYear(maxima.getFullYear() + 1);
  return fecha.getFullYear() >= 2015 && fecha <= maxima;
}

export function evaluarCumplimientoEtapaExpress(caso, etapa) {
  if (!etapa?.limite || etapa.alertaVencimiento === false) return null;
  if (etapa.dependenciaExterna) return null;
  if (etapa.id === 'reconsideracion' && reconsideracionExpressOmitida(caso)) return null;

  const fechaReferencia = resolverFechaReferencia(caso, etapa);
  const fechaCierre = resolverFechaCierreEtapa(caso, etapa);
  if (!fechaReferencia || !fechaCierre) return null;
  if (!esFechaPlausible(fechaReferencia) || !esFechaPlausible(fechaCierre)) return null;

  const limiteEfectivo = etapa.limiteMaximo || etapa.limite;
  const transcurrido = medirTranscurrido(fechaReferencia, fechaCierre, limiteEfectivo.unidad);
  if (transcurrido == null) return null;

  return {
    cumple: transcurrido <= limiteEfectivo.valor,
    transcurrido,
    limite: limiteEfectivo.valor,
    unidad: limiteEfectivo.unidad,
  };
}

function reconsideracionExpressOmitida(caso) {
  const flag = String(caso?.reconsideracionAplica ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (flag === 'no_aplica' || flag === 'noaplica') return true;
  if (flag === 'aplica') return false;
  if (caso?.fechaReconsideracion) return false;
  return Boolean(
    caso?.fechaDocumentosPago ||
      caso?.fechaFiniquitosFirmado ||
      caso?.fechaCargueFiniquito ||
      caso?.fechaCierre
  );
}

export function crearAcumuladorCumplimientoExpress() {
  const acumulador = { general: { cumplidos: 0, evaluables: 0 } };
  INDICADORES_CUMPLIMIENTO_EXPRESS.forEach(({ muestra }) => {
    acumulador[muestra] = { cumplidos: 0, evaluables: 0 };
  });
  return acumulador;
}

export function porcentajeCumplimiento(cumplidos, evaluables) {
  if (!evaluables) return null;
  return (cumplidos / evaluables) * 100;
}

export function formatearPorcentajeCumplimiento(porcentaje) {
  if (porcentaje == null || Number.isNaN(porcentaje)) return '—';
  return `${porcentaje.toFixed(1)}%`;
}

export function claseColorCumplimiento(porcentaje) {
  if (porcentaje == null || Number.isNaN(porcentaje)) return 'text-gray-400';
  if (porcentaje >= 80) return 'text-emerald-600 dark:text-emerald-400 font-semibold';
  if (porcentaje >= 50) return 'text-amber-600 dark:text-amber-400 font-semibold';
  return 'text-red-600 dark:text-red-400 font-semibold';
}

export function colorBarraCumplimiento(porcentaje) {
  if (porcentaje == null || Number.isNaN(porcentaje)) return '#9CA3AF';
  if (porcentaje >= 80) return '#059669';
  if (porcentaje >= 50) return '#D97706';
  return '#DC2626';
}

export function datosChartCumplimientoExpress(cumplimientoGlobales, indicadores = []) {
  return indicadores
    .filter((ind) => ind.etapaId && ind.muestra)
    .map((ind) => {
      const datos = cumplimientoGlobales?.[ind.muestra];
      const evaluables = datos?.evaluables ?? 0;
      const porcentaje = evaluables > 0 ? (datos?.porcentaje ?? 0) : 0;
      return {
        clave: ind.clave,
        muestra: ind.muestra,
        nombre: ind.label,
        nombreCorto: ind.label.length > 28 ? `${ind.label.slice(0, 26)}…` : ind.label,
        porcentaje,
        cumplidos: datos?.cumplidos ?? 0,
        evaluables,
        sinDatos: evaluables === 0,
      };
    });
}

function acumularCumplimiento(acumulador, caso, protocolo) {
  INDICADORES_CUMPLIMIENTO_EXPRESS.forEach(({ muestra, etapaId }) => {
    const etapa = obtenerEtapa(protocolo, etapaId);
    const resultado = evaluarCumplimientoEtapaExpress(caso, etapa);
    if (!resultado) return;
    acumulador[muestra].evaluables += 1;
    acumulador.general.evaluables += 1;
    if (resultado.cumple) {
      acumulador[muestra].cumplidos += 1;
      acumulador.general.cumplidos += 1;
    }
  });
}

export function mapearCumplimientoExpress(acumulador) {
  const resultado = {
    general: {
      cumplidos: acumulador.general.cumplidos,
      evaluables: acumulador.general.evaluables,
      porcentaje: porcentajeCumplimiento(
        acumulador.general.cumplidos,
        acumulador.general.evaluables
      ),
    },
  };
  INDICADORES_CUMPLIMIENTO_EXPRESS.forEach(({ muestra }) => {
    const datos = acumulador[muestra];
    resultado[muestra] = {
      cumplidos: datos.cumplidos,
      evaluables: datos.evaluables,
      porcentaje: porcentajeCumplimiento(datos.cumplidos, datos.evaluables),
    };
  });
  return resultado;
}

export function calcularCumplimientoExpressGlobales(casos, protocolo) {
  const acumulador = crearAcumuladorCumplimientoExpress();
  casos.forEach((caso) => acumularCumplimiento(acumulador, caso, protocolo));
  return mapearCumplimientoExpress(acumulador);
}

export function agruparCumplimientoExpress(casos, resolverGrupo, protocolo) {
  const mapa = {};
  casos.forEach((caso) => {
    const grupo = resolverGrupo(caso);
    if (!grupo?.clave) return;
    if (!mapa[grupo.clave]) {
      mapa[grupo.clave] = {
        clave: grupo.clave,
        nombre: grupo.nombre || 'Sin dato',
        ...crearAcumuladorCumplimientoExpress(),
      };
    }
    acumularCumplimiento(mapa[grupo.clave], caso, protocolo);
  });

  return Object.values(mapa)
    .map((item) => ({
      clave: item.clave,
      nombre: item.nombre,
      ...mapearCumplimientoExpress(item),
    }))
    .sort((a, b) => (b.general.evaluables || 0) - (a.general.evaluables || 0));
}
