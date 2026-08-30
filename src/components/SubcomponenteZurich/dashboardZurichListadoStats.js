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
  homologarCausaZurich,
  homologarEstadoZurich,
} from './zurichHelpers.js';

export const DIAS_ESTANCADO_ZURICH = 15;
export const LIMITE_ESTANCADOS_ZURICH = 20;
export const LIMITE_GRANDES_PERDIDAS_ZURICH = 10;

export const CORTE_PROSER_ZURICH = 'proser';
export const CORTE_ASEGURADO_ZURICH = 'asegurado';
export const CORTE_ZURICH_ZURICH = 'zurich';
export const CORTE_CERRADO_ZURICH = 'cerrado';

const CORTES_ABIERTOS_ZURICH = [CORTE_PROSER_ZURICH, CORTE_ASEGURADO_ZURICH, CORTE_ZURICH_ZURICH];

/** Quién tiene la pelota: Proser (ajuste), asegurado/intermediario (docs) o Zurich (autoridad / aceptación). */
export function corteCarteraZurich(estado) {
  const e = claveEstado(estado);
  if (e === ESTADO_ZURICH_FINALIZADO) return CORTE_CERRADO_ZURICH;
  if (esEstadoPendienteDocsZurich(e)) return CORTE_ASEGURADO_ZURICH;
  if (e === ESTADO_ZURICH_AUTORIDAD_DELEGADA || e === ESTADO_ZURICH_ACEPTACION_CLIENTE) {
    return CORTE_ZURICH_ZURICH;
  }
  return CORTE_PROSER_ZURICH;
}

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

function nombrePersonaCaso(valor) {
  if (valor == null || valor === '') return '';
  if (Array.isArray(valor)) {
    return valor.map(nombrePersonaCaso).filter(Boolean).join(', ');
  }
  if (typeof valor === 'object') {
    return String(valor.nombre || valor.nombreCompleto || valor.label || valor.login || '').trim();
  }
  return String(valor).trim();
}

function agruparConteo(casos, getter, { vacio = 'Sin dato', limite = 10, etiquetaOtros = 'Otros' } = {}) {
  const map = new Map();
  for (const caso of casos) {
    const raw = String(getter(caso) ?? '').trim();
    const key = raw || vacio;
    map.set(key, (map.get(key) || 0) + 1);
  }
  const ordenado = [...map.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'));
  if (!limite || limite <= 0 || ordenado.length <= limite) return ordenado;
  const cabeza = ordenado.slice(0, limite);
  const resto = ordenado.slice(limite).reduce((suma, fila) => suma + fila.cantidad, 0);
  if (resto > 0) cabeza.push({ nombre: etiquetaOtros, cantidad: resto });
  return cabeza;
}

function agruparSuma(casos, getterNombre, getterValor, { vacio = 'Sin dato', limite = 8 } = {}) {
  const map = new Map();
  for (const caso of casos) {
    const monto = Number(getterValor(caso));
    if (!Number.isFinite(monto) || monto <= 0) continue;
    const raw = String(getterNombre(caso) ?? '').trim();
    const key = raw || vacio;
    map.set(key, (map.get(key) || 0) + monto);
  }
  return [...map.entries()]
    .map(([nombre, valor]) => ({ nombre, valor }))
    .sort((a, b) => b.valor - a.valor || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, limite);
}

function reservaNumero(caso = {}) {
  const n = Number(caso.reserva);
  return Number.isFinite(n) && n > 0 ? n : 0;
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
  const cubetasReserva = new Map(CUBETAS_ANTIGUEDAD.map((r) => [r, 0]));
  const corteMap = new Map(
    CORTES_ABIERTOS_ZURICH.map((id) => [id, { id, cantidad: 0, reserva: 0, dias: [] }])
  );
  const diasAbiertos = [];
  const estancados = [];
  const grandesPerdidas = [];

  let carteraAbierta = 0;
  let enTramite = 0;
  let pendienteDocumento = 0;
  let enLiquidar = 0;
  let enAutoridadDelegada = 0;
  let enAceptacionCliente = 0;
  let enAnalisis = 0;
  let finalizados = 0;
  let reservaAbierta = 0;
  let casosConReserva = 0;
  let valorAseguradoInmueble = 0;
  let valorReclamado = 0;
  let valorLiquidado = 0;
  let casosConAsegurado = 0;
  let casosConReclamado = 0;
  let casosConLiquidado = 0;

  for (const caso of lista) {
    const estado = claveEstado(caso.estado);
    porEstadoMap.set(estado, (porEstadoMap.get(estado) || 0) + 1);

    const abierto = esCarteraAbiertaZurich(estado);
    const reserva = reservaNumero(caso);
    if (abierto) {
      carteraAbierta += 1;
      if (reserva > 0) {
        reservaAbierta += reserva;
        casosConReserva += 1;
      }
      const corte = corteCarteraZurich(estado);
      const bucket = corteMap.get(corte);
      if (bucket) {
        bucket.cantidad += 1;
        bucket.reserva += reserva;
      }
    }
    if (ESTADOS_TRAMITE.has(estado)) enTramite += 1;
    if (esEstadoPendienteDocsZurich(estado)) pendienteDocumento += 1;
    if (estado === ESTADO_ZURICH_LIQUIDAR) enLiquidar += 1;
    if (estado === ESTADO_ZURICH_AUTORIDAD_DELEGADA) enAutoridadDelegada += 1;
    if (estado === ESTADO_ZURICH_ACEPTACION_CLIENTE) enAceptacionCliente += 1;
    if (estado === ESTADO_ZURICH_ANALISIS) enAnalisis += 1;
    if (estado === ESTADO_ZURICH_FINALIZADO) finalizados += 1;

    const aseguradoInmueble = Number(caso.valorAseguradoInmueble);
    if (Number.isFinite(aseguradoInmueble) && aseguradoInmueble > 0) {
      valorAseguradoInmueble += aseguradoInmueble;
      casosConAsegurado += 1;
    }
    const reclamado = Number(caso.valorReclamado);
    if (Number.isFinite(reclamado) && reclamado > 0) {
      valorReclamado += reclamado;
      casosConReclamado += 1;
    }
    const liquidado = Number(caso.valorLiquidado);
    if (Number.isFinite(liquidado) && liquidado > 0) {
      valorLiquidado += liquidado;
      casosConLiquidado += 1;
    }

    const dias = diasEnEstadoNumeroZurich(caso);
    if (abierto && dias != null) {
      const cubeta = cubetaDias(dias);
      diasAbiertos.push(dias);
      cubetas.set(cubeta, (cubetas.get(cubeta) || 0) + 1);
      if (reserva > 0) cubetasReserva.set(cubeta, (cubetasReserva.get(cubeta) || 0) + reserva);
      const corte = corteCarteraZurich(estado);
      const bucket = corteMap.get(corte);
      if (bucket) bucket.dias.push(dias);
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
          reserva,
        });
      }
    }

    if (abierto && reserva > 0) {
      grandesPerdidas.push({
        id: caso._id,
        zc: caso.zc || '',
        siniestro: caso.siniestro || '',
        asegurado: caso.asegurado || '',
        ciudad: homologarCiudadZurich(caso.ciudad) || caso.ciudad || '',
        estado,
        reserva,
        dias: diasEnEstadoNumeroZurich(caso),
      });
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
  grandesPerdidas.sort((a, b) => b.reserva - a.reserva || String(a.zc).localeCompare(String(b.zc), 'es'));

  const porEstado = [
    ...ESTADOS_ZURICH.map((estado) => ({ estado, cantidad: porEstadoMap.get(estado) || 0 })),
    ...[...porEstadoMap.entries()]
      .filter(([estado]) => !ESTADOS_ZURICH.includes(estado) && (porEstadoMap.get(estado) || 0) > 0)
      .map(([estado, cantidad]) => ({ estado, cantidad })),
  ];

  const porCorte = CORTES_ABIERTOS_ZURICH.map((id) => {
    const bucket = corteMap.get(id);
    return {
      id,
      cantidad: bucket?.cantidad || 0,
      reserva: bucket?.reserva || 0,
      medianaDias: mediana(bucket?.dias || []),
    };
  });

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
      reservaAbierta,
      casosConReserva,
      valorAseguradoInmueble,
      valorReclamado,
      valorLiquidado,
      casosConAsegurado,
      casosConReclamado,
      casosConLiquidado,
    },
    porEstado,
    porCorte,
    porCiudad: agruparConteo(lista, (c) => homologarCiudadZurich(c.ciudad), { vacio: 'Sin ciudad' }),
    reservaPorCiudad: agruparSuma(
      lista.filter((c) => esCarteraAbiertaZurich(c.estado)),
      (c) => homologarCiudadZurich(c.ciudad),
      reservaNumero,
      { vacio: 'Sin ciudad' }
    ),
    porAjustador: agruparConteo(lista, (c) => nombrePersonaCaso(c.ajustador), {
      vacio: 'Sin ajustador',
      limite: 0,
    }),
    porInspector: agruparConteo(lista, (c) => nombrePersonaCaso(c.inspector), {
      vacio: 'Sin inspector',
      limite: 0,
    }),
    porTipoPoliza: agruparConteo(lista, (c) => etiquetaTipoPolizaZurich(c), { vacio: 'Sin tipo de póliza' }),
    porCausa: agruparConteo(lista, (c) => homologarCausaZurich(c.causa), { vacio: 'TERREMOTO' }),
    porIntermediario: agruparConteo(lista, (c) => c.intermediario, { vacio: 'Sin intermediario' }),
    porModalidad: agruparConteo(lista, (c) => c.modalidadAtencion, { vacio: 'Sin modalidad' }),
    tendenciaMensual: [...mensual.values()].sort((a, b) => (a.mes > b.mes ? 1 : -1)).slice(-12),
    antigüedad: CUBETAS_ANTIGUEDAD.map((rango) => ({ rango, cantidad: cubetas.get(rango) || 0 })),
    antigüedadReserva: CUBETAS_ANTIGUEDAD.map((rango) => ({
      rango,
      valor: cubetasReserva.get(rango) || 0,
    })),
    estancados: estancados.slice(0, LIMITE_ESTANCADOS_ZURICH),
    grandesPerdidas: grandesPerdidas.slice(0, LIMITE_GRANDES_PERDIDAS_ZURICH),
  };
}
