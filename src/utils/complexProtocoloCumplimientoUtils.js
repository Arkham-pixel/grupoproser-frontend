/**
 * Porcentaje de cumplimiento de indicadores del protocolo COMPLEX.
 * Mide cada etapa contra el plazo del protocolo (horas o días calendario).
 */

import { ETAPAS_PROTOCOLO_DEFAULT } from '../config/protocoloSiniestrosDefaults.js';
import { parsearFechaComplex } from './complexTrazabilidadUtils.js';
import { parsearFechaSoloDiaComplex } from './complexFechaHoraUtils.js';
import { elegirNombreMostrarResponsable } from './responsableAgrupacionUtils.js';
import { diasHabilesColombiaEntre } from './festivosColombia.js';

/** Indicadores con plazo medible en el protocolo (sin cierre de caso). */
export const INDICADORES_CUMPLIMIENTO_PROTOCOLO = [
  { muestra: 'asignacionContacto', etapaId: 'contactoInicial' },
  { muestra: 'contactoInspeccion', etapaId: 'inspeccion' },
  { muestra: 'inspeccionSolicitudDocs', etapaId: 'solicitudDocs' },
  { muestra: 'etapaPreliminar', etapaId: 'informePreliminar' },
  { muestra: 'ultimoDocInformeFinal', etapaId: 'informeFinal' },
  // autorizacionCifras es dependenciaExterna: no entra al % del ajustador
  { muestra: 'aprobacionPresentacion', etapaId: 'presentacionCifras' },
];

function mismoDiaCalendario(a, b) {
  const inicio = parsearFechaSoloDiaComplex(a);
  const fin = parsearFechaSoloDiaComplex(b);
  if (!inicio || !fin) return null;
  return (
    inicio.getFullYear() === fin.getFullYear() &&
    inicio.getMonth() === fin.getMonth() &&
    inicio.getDate() === fin.getDate()
  );
}

function horasEntre(inicio, fin) {
  const a = parsearFechaComplex(inicio);
  const b = parsearFechaComplex(fin);
  if (!a || !b) return null;
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

function diasCalendarioEntre(inicio, fin) {
  const a = parsearFechaComplex(inicio);
  const b = parsearFechaComplex(fin);
  if (!a || !b || b < a) return null;
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

function diasHabilesEntre(inicio, fin) {
  const a = parsearFechaComplex(inicio);
  const b = parsearFechaComplex(fin);
  if (!a || !b || b < a) return null;
  return diasHabilesColombiaEntre(a, b);
}

function medirTranscurrido(inicio, fin, unidad) {
  if (unidad === 'mismo_dia') {
    const mismo = mismoDiaCalendario(inicio, fin);
    return mismo == null ? null : mismo ? 0 : 1;
  }
  if (unidad === 'dias_habiles') {
    return diasHabilesEntre(inicio, fin);
  }
  if (unidad === 'dias') {
    return diasCalendarioEntre(inicio, fin);
  }
  if (unidad === 'horas') {
    return horasEntre(inicio, fin);
  }
  return diasCalendarioEntre(inicio, fin);
}

function obtenerEtapa(protocolo, etapaId) {
  const etapas = protocolo?.etapas?.length ? protocolo.etapas : ETAPAS_PROTOCOLO_DEFAULT;
  return etapas.find((e) => e.id === etapaId) || null;
}

function resolverFechaReferenciaCaso(caso, etapa) {
  const principal = parsearFechaComplex(caso[etapa.referencia]);
  if (principal) return principal;
  if (etapa.referenciaAlternativa) {
    return parsearFechaComplex(caso[etapa.referenciaAlternativa]);
  }
  return null;
}

/**
 * Evalúa si el caso cumplió el plazo del indicador cuando ya tiene fecha de cierre de etapa.
 */
function esFechaPlausibleCumplimiento(fecha) {
  if (!fecha) return false;
  const maxima = new Date();
  maxima.setFullYear(maxima.getFullYear() + 1);
  return fecha.getFullYear() >= 2015 && fecha <= maxima;
}

export function evaluarCumplimientoIndicadorProtocolo(caso, etapa) {
  if (!etapa?.limite || etapa.alertaVencimiento === false) return null;
  // Esperas de terceros no deben afectar el % de cumplimiento del ajustador.
  if (etapa.dependenciaExterna) return null;

  const fechaReferencia = resolverFechaReferenciaCaso(caso, etapa);
  const fechaCierre = parsearFechaComplex(caso[etapa.campoFecha]);
  if (!fechaReferencia || !fechaCierre) return null;
  // Fechas corruptas (p. ej. año 1902 por serial Excel) no deben evaluar cumplimiento.
  if (!esFechaPlausibleCumplimiento(fechaReferencia) || !esFechaPlausibleCumplimiento(fechaCierre)) {
    return null;
  }

  const limiteEfectivo = etapa.limiteMaximo || etapa.limite;
  const transcurrido = medirTranscurrido(
    fechaReferencia,
    fechaCierre,
    limiteEfectivo.unidad
  );
  if (transcurrido == null) return null;

  return {
    cumple: transcurrido <= limiteEfectivo.valor,
    transcurrido,
    limite: limiteEfectivo.valor,
    unidad: limiteEfectivo.unidad,
  };
}

export function crearAcumuladorCumplimientoProtocolo() {
  const acumulador = {
    general: { cumplidos: 0, evaluables: 0 },
  };

  INDICADORES_CUMPLIMIENTO_PROTOCOLO.forEach(({ muestra }) => {
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

/** Datos para gráfico de barras: % cumplimiento por indicador vs protocolo. */
export function datosChartCumplimientoProtocolo(cumplimientoGlobales, indicadores = []) {
  return indicadores
    .filter((ind) => ind.etapaId && ind.muestra)
    .map((ind) => {
      const datos = cumplimientoGlobales?.[ind.muestra];
      return {
        clave: ind.clave,
        muestra: ind.muestra,
        nombre: ind.label,
        nombreCorto: ind.label.length > 26 ? `${ind.label.slice(0, 24)}…` : ind.label,
        porcentaje: datos?.porcentaje ?? null,
        cumplidos: datos?.cumplidos ?? 0,
        evaluables: datos?.evaluables ?? 0,
      };
    })
    .filter((item) => item.evaluables > 0);
}

function acumularCumplimientoProtocolo(acumulador, caso, protocolo) {
  INDICADORES_CUMPLIMIENTO_PROTOCOLO.forEach(({ muestra, etapaId }) => {
    const etapa = obtenerEtapa(protocolo, etapaId);
    const resultado = evaluarCumplimientoIndicadorProtocolo(caso, etapa);
    if (!resultado) return;

    acumulador[muestra].evaluables++;
    acumulador.general.evaluables++;
    if (resultado.cumple) {
      acumulador[muestra].cumplidos++;
      acumulador.general.cumplidos++;
    }
  });
}

export function mapearCumplimientoProtocolo(acumulador) {
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

  INDICADORES_CUMPLIMIENTO_PROTOCOLO.forEach(({ muestra }) => {
    const datos = acumulador[muestra];
    resultado[muestra] = {
      cumplidos: datos.cumplidos,
      evaluables: datos.evaluables,
      porcentaje: porcentajeCumplimiento(datos.cumplidos, datos.evaluables),
    };
  });

  return resultado;
}

export function calcularCumplimientoProtocoloGlobales(casos, protocolo) {
  const acumulador = crearAcumuladorCumplimientoProtocolo();
  casos.forEach((caso) => acumularCumplimientoProtocolo(acumulador, caso, protocolo));
  return mapearCumplimientoProtocolo(acumulador);
}

export function agruparCumplimientoProtocolo(casos, resolverGrupo, protocolo, opciones = {}) {
  const { catalogoResponsables = [] } = opciones;
  const mapa = {};

  casos.forEach((caso) => {
    const grupo = resolverGrupo(caso, catalogoResponsables);
    if (!grupo?.clave) return;

    if (!mapa[grupo.clave]) {
      mapa[grupo.clave] = {
        clave: grupo.clave,
        nombre: grupo.nombre || 'Sin dato',
        ...crearAcumuladorCumplimientoProtocolo(),
      };
    } else if (grupo.nombre) {
      mapa[grupo.clave].nombre = elegirNombreMostrarResponsable(
        mapa[grupo.clave].nombre,
        grupo.nombre
      );
    }

    acumularCumplimientoProtocolo(mapa[grupo.clave], caso, protocolo);
  });

  return Object.values(mapa)
    .map((item) => ({
      clave: item.clave,
      nombre: item.nombre,
      ...mapearCumplimientoProtocolo(item),
    }))
    .sort((a, b) => (b.general.evaluables || 0) - (a.general.evaluables || 0));
}
