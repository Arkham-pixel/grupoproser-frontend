import { parseFecha } from '../SubcomponenteDashboardCatastrofico/dashboardCatastroficoStats.js';
import {
  ESTADOS_ZURICH,
  ESTADO_ZURICH_DEFAULT,
  ESTADO_ZURICH_ASIGNADO,
  ESTADO_ZURICH_INSPECCION_COORDINADA,
  ESTADO_ZURICH_ANALISIS,
  ESTADO_ZURICH_PENDIENTE_DOCS,
  ESTADO_ZURICH_LIQUIDAR,
  ESTADO_ZURICH_AUTORIDAD_DELEGADA,
  ESTADO_ZURICH_ACEPTACION_CLIENTE,
  ESTADO_ZURICH_FINALIZADO,
  diasEnEstadoZurich,
  etiquetaTipoPolizaZurich,
  esEstadoCerradoZurich,
  esEstadoPendienteDocsZurich,
  homologarCiudadZurich,
  homologarEstadoZurich,
} from './zurichHelpers.js';

export const DIAS_ESTANCADO_ZURICH = 15;
export const LIMITE_ESTANCADOS_ZURICH = 20;

/** En el listado Zurich solo cierra FINALIZADO. */
const ESTADOS_TRAMITE = new Set([
  ESTADO_ZURICH_DEFAULT,
  ESTADO_ZURICH_ASIGNADO,
  ESTADO_ZURICH_INSPECCION_COORDINADA,
]);

const CUBETAS_ANTIGUEDAD = ['0-7 d', '8-15 d', '16-30 d', '31-45 d', '46+ d'];

function claveEstado(valor) {
  return homologarEstadoZurich(valor);
}

export function esCarteraAbiertaZurich(estado) {
  return !esEstadoCerradoZurich(estado);
}

export function fechaAltaListadoZurich(caso = {}) {
  return parseFecha(caso.fechaCasoNuevo || caso.fechaAsignacion || caso.createdAt);
}

export function diasEnEstadoNumeroZurich(caso = {}) {
  const n = Number(diasEnEstadoZurich(caso));
  return Number.isFinite(n) ? n : null;
}

function mediana(nums) {
  const arr = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!arr.length) return null;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : Math.round(((arr[mid - 1] + arr[mid]) / 2) * 10) / 10;
}

function etiquetaMes(clave) {
  const [y, m] = String(clave).split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  if (Number.isNaN(date.getTime())) return clave;
  return date.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }).replace('.', '');
}

function claveMes(date) {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function cubetaDias(dias) {
  if (dias <= 7) return CUBETAS_ANTIGUEDAD[0];
  if (dias <= 15) return CUBETAS_ANTIGUEDAD[1];
  if (dias <= 30) return CUBETAS_ANTIGUEDAD[2];
  if (dias <= 45) return CUBETAS_ANTIGUEDAD[3];
  return CUBETAS_ANTIGUEDAD[4];
}

function agruparConteo(casos, getter, { vacio = 'Sin dato', limite = 10 } = {}) {
  const map = new Map();
  for (const caso of casos) {
    const raw = String(getter(caso) ?? '').trim();
    const key = raw || vacio;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, limite);
}

function motivoEstancado(caso = {}) {
  const estado = claveEstado(caso.estado);
  if (esEstadoPendienteDocsZurich(estado)) {
    return String(caso.documentoFaltante || caso.observacionPendienteDocumento || '').trim();
  }
  return String(caso.observaciones || '').trim();
}

/**
 * KPIs y series del dashboard de cartera (listado Zurich).
 * porAjustador / porInspector son para usuarios internos; la UI de la
 * cuenta cliente Zurich no los muestra.
 */
export function construirDashboardZurichListado(casos = []) {
  const lista = Array.isArray(casos) ? casos : [];
  const totalCasos = lista.length;

  const porEstadoMap = new Map(ESTADOS_ZURICH.map((e) => [e, 0]));
  const mensual = new Map();
  const cubetas = new Map(CUBETAS_ANTIGUEDAD.map((r) => [r, 0]));
  const diasAbiertos = [];
  const estancados = [];

  let carteraAbierta = 0;
  let enTramite = 0;
  let pendienteDocumento = 0;
  let enLiquidar = 0;
  let enAutoridadDelegada = 0;
  let enAceptacionCliente = 0;
  let enAnalisis = 0;
  let finalizados = 0;

  for (const caso of lista) {
    const estado = claveEstado(caso.estado);
    porEstadoMap.set(estado, (porEstadoMap.get(estado) || 0) + 1);

    const abierto = esCarteraAbiertaZurich(estado);
    if (abierto) carteraAbierta += 1;
    if (ESTADOS_TRAMITE.has(estado)) enTramite += 1;
    if (esEstadoPendienteDocsZurich(estado)) pendienteDocumento += 1;
    if (estado === ESTADO_ZURICH_LIQUIDAR) enLiquidar += 1;
    if (estado === ESTADO_ZURICH_AUTORIDAD_DELEGADA) enAutoridadDelegada += 1;
    if (estado === ESTADO_ZURICH_ACEPTACION_CLIENTE) enAceptacionCliente += 1;
    if (estado === ESTADO_ZURICH_ANALISIS) enAnalisis += 1;
    if (estado === ESTADO_ZURICH_FINALIZADO) finalizados += 1;

    const dias = diasEnEstadoNumeroZurich(caso);
    if (abierto && dias != null) {
      const cubeta = cubetaDias(dias);
      diasAbiertos.push(dias);
      cubetas.set(cubeta, (cubetas.get(cubeta) || 0) + 1);
      if (dias >= DIAS_ESTANCADO_ZURICH) {
        estancados.push({
          id: caso._id,
          zc: caso.zc || '',
          siniestro: caso.siniestro || '',
          asegurado: caso.asegurado || '',
          ciudad: homologarCiudadZurich(caso.ciudad) || caso.ciudad || '',
          estado,
          dias,
          motivo: motivoEstancado(caso),
        });
      }
    }

    const fAlta = fechaAltaListadoZurich(caso);
    if (fAlta) {
      const clave = claveMes(fAlta);
      if (!mensual.has(clave)) {
        mensual.set(clave, { mes: clave, etiqueta: etiquetaMes(clave), altas: 0, pagados: 0 });
      }
      mensual.get(clave).altas += 1;
    }
    const fPago = parseFecha(caso.fechaFinalizado || caso.fechaLiquidado || caso.fechaCasoParaPago);
    if (fPago) {
      const clave = claveMes(fPago);
      if (!mensual.has(clave)) {
        mensual.set(clave, { mes: clave, etiqueta: etiquetaMes(clave), altas: 0, pagados: 0 });
      }
      mensual.get(clave).pagados += 1;
    }
  }

  estancados.sort((a, b) => b.dias - a.dias || String(a.zc).localeCompare(String(b.zc), 'es'));

  const porEstado = [
    ...ESTADOS_ZURICH.map((estado) => ({ estado, cantidad: porEstadoMap.get(estado) || 0 })),
    ...[...porEstadoMap.entries()]
      .filter(([estado]) => !ESTADOS_ZURICH.includes(estado) && (porEstadoMap.get(estado) || 0) > 0)
      .map(([estado, cantidad]) => ({ estado, cantidad })),
  ];

  return {
    kpis: {
      totalCasos,
      carteraAbierta,
      enTramite,
      pendienteDocumento,
      enObjecion: 0,
      objetados: 0,
      listosPago: enAnalisis,
      pagados: finalizados,
      enLiquidar,
      enAutoridadDelegada,
      enAceptacionCliente,
      finalizados,
      estancados: estancados.length,
      medianaDias: mediana(diasAbiertos),
      porcentajePagados: totalCasos === 0 ? 0 : Math.round((finalizados / totalCasos) * 100),
    },
    porEstado,
    porCiudad: agruparConteo(lista, (c) => homologarCiudadZurich(c.ciudad), { vacio: 'Sin ciudad' }),
    porAjustador: agruparConteo(lista, (c) => c.ajustador, { vacio: 'Sin ajustador' }),
    porInspector: agruparConteo(lista, (c) => c.inspector, { vacio: 'Sin inspector' }),
    porTipoPoliza: agruparConteo(lista, (c) => etiquetaTipoPolizaZurich(c), { vacio: 'Sin tipo de póliza' }),
    porCausa: agruparConteo(lista, (c) => c.causa, { vacio: 'Sin causa' }),
    porIntermediario: agruparConteo(lista, (c) => c.intermediario, { vacio: 'Sin intermediario' }),
    porModalidad: agruparConteo(lista, (c) => c.modalidadAtencion, { vacio: 'Sin modalidad' }),
    tendenciaMensual: [...mensual.values()].sort((a, b) => (a.mes > b.mes ? 1 : -1)).slice(-12),
    antigüedad: CUBETAS_ANTIGUEDAD.map((rango) => ({ rango, cantidad: cubetas.get(rango) || 0 })),
    estancados: estancados.slice(0, LIMITE_ESTANCADOS_ZURICH),
  };
}
