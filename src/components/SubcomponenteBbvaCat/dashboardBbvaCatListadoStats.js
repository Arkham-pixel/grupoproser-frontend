import { parseFecha } from '../SubcomponenteDashboardCatastrofico/dashboardCatastroficoStats.js';
import {
  ESTADOS_BBVA_CAT,
  diasEnEstadoBbvaCat,
  etiquetaTipoPolizaBbvaCat,
  homologarCiudadBbvaCat,
  homologarEstadoBbvaCat,
  numeroGuardadoBbvaCat,
  tieneReservaAjustadorBbvaCat,
} from './bbvaCatHelpers.js';

export const DIAS_ESTANCADO_BBVA_CAT = 15;
export const LIMITE_GRANDES_PERDIDAS_BBVA_CAT = 10;

const ESTADOS_CERRADOS = new Set(['PAGADO', 'OBJETADO', 'DESISTIMIENTO']);
const ESTADOS_TRAMITE = new Set(['CASO NUEVO', 'COORDINANDO INSPECCIÓN', 'ANÁLISIS DEL CASO']);
const ESTADOS_LISTOS_PAGO = new Set(['AUTORIZACIÓN ANALISTA', 'CASO AJUSTADO', 'CASO PARA PAGO']);
/** Caso nuevo + coordinando (pedido Santiago / reunión). */
const ESTADOS_POR_AVANZAR = new Set(['CASO NUEVO', 'COORDINANDO INSPECCIÓN']);
/** Desde análisis en adelante (pedido Santiago / reunión). */
const ESTADOS_AVANZADOS = new Set([
  'ANÁLISIS DEL CASO',
  'PENDIENTE DE DOCUMENTO',
  'OBJECIÓN',
  'OBJETADO',
  'AUTORIZACIÓN ANALISTA',
  'CASO AJUSTADO',
  'CASO PARA PAGO',
  'PAGADO',
  'DESISTIMIENTO',
]);

const CUBETAS_ANTIGUEDAD = ['0-7 d', '8-15 d', '16-30 d', '31-45 d', '46+ d'];

function claveEstado(valor) {
  return homologarEstadoBbvaCat(valor);
}

export function esEstadoPorAvanzarBbvaCat(estado) {
  return ESTADOS_POR_AVANZAR.has(claveEstado(estado));
}

export function esEstadoAvanzadoBbvaCat(estado) {
  return ESTADOS_AVANZADOS.has(claveEstado(estado));
}

export function esCarteraAbiertaBbvaCat(estado) {
  return !ESTADOS_CERRADOS.has(claveEstado(estado));
}

export function fechaAltaListadoBbvaCat(caso = {}) {
  return parseFecha(caso.fechaCasoNuevo || caso.fechaAsignacion || caso.createdAt);
}

export function diasEnEstadoNumeroBbvaCat(caso = {}) {
  const n = Number(diasEnEstadoBbvaCat(caso));
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

function reservaBbvaNumero(caso = {}) {
  const n = Number(caso.reserva);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function reservaAjustadorNumero(caso = {}) {
  const n = numeroGuardadoBbvaCat(caso.valorLiquidado);
  return n != null && n > 0 ? n : 0;
}

function valorALiquidarNumero(caso = {}) {
  const n = numeroGuardadoBbvaCat(caso.valorALiquidar);
  return n != null && n > 0 ? n : 0;
}

/** Valor a liquidar de cartera: solo pago / pagado. El liquidador en reserva no cuenta. */
function esEstadoConValorALiquidarCartera(estado) {
  const e = claveEstado(estado);
  return ESTADOS_LISTOS_PAGO.has(e) || e === 'PAGADO';
}

function tieneValorALiquidarCartera(caso = {}) {
  if (!esEstadoConValorALiquidarCartera(caso.estado)) return false;
  return valorALiquidarNumero(caso) > 0;
}

function montoPositivo(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function inicioDiaLocal(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function modalidadBbvaCat(caso = {}) {
  return String(caso.modalidadAtencion || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function esVideoperitajeBbvaCat(caso = {}) {
  const mod = modalidadBbvaCat(caso);
  if (mod.includes('VIDEOPERITAJE') || mod.includes('VIDEO')) return true;
  if (mod.includes('CAMPO') || mod.includes('PRESENCIAL')) return false;
  return Boolean(parseFecha(caso.fechaVisita));
}

function esPresencialBbvaCat(caso = {}) {
  const mod = modalidadBbvaCat(caso);
  return mod.includes('CAMPO') || mod.includes('PRESENCIAL');
}

function tieneAsignacionBbvaCat(caso = {}) {
  return Boolean(parseFecha(caso.fechaAsignacion));
}

/** Contactado: ya hay visita, coordinación o salió de CASO NUEVO. */
function esContactadoBbvaCat(caso = {}) {
  if (parseFecha(caso.fechaVisita) || parseFecha(caso.fechaCoordinandoInspeccion)) return true;
  const estado = claveEstado(caso.estado);
  return Boolean(estado && estado !== 'CASO NUEVO');
}

function casoDocumentadoBbvaCat(caso = {}) {
  if (caso.tieneInforme || (caso.informeUnico && typeof caso.informeUnico === 'object')) return true;
  const n = Number(caso.nArchivos);
  if (Number.isFinite(n) && n > 0) return true;
  return Array.isArray(caso.archivos) && caso.archivos.length > 0;
}

/**
 * Tablas de reunión BBVA: pivot por estado (cuenta + reservas) y panel operativo.
 * Reserva actuarial = suma valorEstimadoAseguradora. Reserva ajustador = suma valorLiquidado.
 * Videoperitajes: modalidad VIDEOPERITAJE o fechaVisita (Calendly); realizados/programados por fechaVisita vs hoy.
 */
export function construirResumenReunionBbvaCat(casos = [], ahora = new Date()) {
  const lista = Array.isArray(casos) ? casos : [];
  const hoy = inicioDiaLocal(ahora);

  const actuarialMap = new Map(ESTADOS_BBVA_CAT.map((e) => [e, 0]));
  const ajustadorMap = new Map(ESTADOS_BBVA_CAT.map((e) => [e, 0]));
  const cuentaMap = new Map(ESTADOS_BBVA_CAT.map((e) => [e, 0]));

  let asignados = 0;
  let contactados = 0;
  let videoTotal = 0;
  let videoRealizados = 0;
  let videoProgramados = 0;
  let presencialTotal = 0;
  let presencialRealizados = 0;
  let presencialProgramados = 0;
  let cierresDocumentados = 0;
  let cierresNoDocumentados = 0;

  for (const caso of lista) {
    const estado = claveEstado(caso.estado);
    cuentaMap.set(estado, (cuentaMap.get(estado) || 0) + 1);
    const actuarial = montoPositivo(caso.valorEstimadoAseguradora);
    if (actuarial > 0) actuarialMap.set(estado, (actuarialMap.get(estado) || 0) + actuarial);
    const ajustador = reservaAjustadorNumero(caso);
    if (ajustador > 0) ajustadorMap.set(estado, (ajustadorMap.get(estado) || 0) + ajustador);

    if (tieneAsignacionBbvaCat(caso)) {
      asignados += 1;
      if (esContactadoBbvaCat(caso)) contactados += 1;
    }

    const fVisita = parseFecha(caso.fechaVisita);
    const visitaPasada = fVisita ? fVisita <= hoy : false;
    const visitaFutura = fVisita ? fVisita > hoy : false;

    if (esVideoperitajeBbvaCat(caso)) {
      videoTotal += 1;
      if (visitaPasada) videoRealizados += 1;
      else if (visitaFutura) videoProgramados += 1;
      else if (fVisita) videoRealizados += 1;
    } else if (esPresencialBbvaCat(caso)) {
      presencialTotal += 1;
      if (visitaPasada) presencialRealizados += 1;
      else if (visitaFutura) presencialProgramados += 1;
    }

    if (!esCarteraAbiertaBbvaCat(estado)) {
      if (casoDocumentadoBbvaCat(caso)) cierresDocumentados += 1;
      else cierresNoDocumentados += 1;
    }
  }

  const porEstado = [
    ...ESTADOS_BBVA_CAT.map((estado) => ({
      estado,
      cantidad: cuentaMap.get(estado) || 0,
      reservaActuarial: actuarialMap.get(estado) || 0,
      reservaAjustador: ajustadorMap.get(estado) || 0,
    })),
    ...[...cuentaMap.entries()]
      .filter(([estado]) => !ESTADOS_BBVA_CAT.includes(estado) && (cuentaMap.get(estado) || 0) > 0)
      .map(([estado]) => ({
        estado,
        cantidad: cuentaMap.get(estado) || 0,
        reservaActuarial: actuarialMap.get(estado) || 0,
        reservaAjustador: ajustadorMap.get(estado) || 0,
      })),
  ].filter((f) => f.cantidad > 0);

  const totales = porEstado.reduce(
    (acc, fila) => {
      acc.cantidad += fila.cantidad;
      acc.reservaActuarial += fila.reservaActuarial;
      acc.reservaAjustador += fila.reservaAjustador;
      return acc;
    },
    { cantidad: 0, reservaActuarial: 0, reservaAjustador: 0 }
  );

  const subtotalPorAvanzar = porEstado.reduce(
    (acc, fila) => {
      if (!esEstadoPorAvanzarBbvaCat(fila.estado)) return acc;
      acc.cantidad += fila.cantidad;
      acc.reservaActuarial += fila.reservaActuarial;
      acc.reservaAjustador += fila.reservaAjustador;
      return acc;
    },
    { cantidad: 0, reservaActuarial: 0, reservaAjustador: 0 }
  );

  const subtotalAvanzados = porEstado.reduce(
    (acc, fila) => {
      if (!esEstadoAvanzadoBbvaCat(fila.estado)) return acc;
      acc.cantidad += fila.cantidad;
      acc.reservaActuarial += fila.reservaActuarial;
      acc.reservaAjustador += fila.reservaAjustador;
      return acc;
    },
    { cantidad: 0, reservaActuarial: 0, reservaAjustador: 0 }
  );

  const pct = (parte, total) =>
    total > 0 ? Math.round((parte / total) * 10000) / 100 : 0;

  return {
    porEstado,
    totales,
    subtotalPorAvanzar,
    subtotalAvanzados,
    operativo: {
      asignados,
      contactados,
      pctContactados: pct(contactados, asignados),
      videoperitajes: {
        total: videoTotal,
        realizados: videoRealizados,
        programados: videoProgramados,
        pctSobreAsignados: pct(videoTotal, asignados),
        pctRealizados: pct(videoRealizados, videoTotal),
        pctProgramados: pct(videoProgramados, videoTotal),
      },
      presencial: {
        total: presencialTotal,
        realizados: presencialRealizados,
        programados: presencialProgramados,
        pctSobreAsignados: pct(presencialTotal, asignados),
        pctRealizados: pct(presencialRealizados, presencialTotal),
        pctProgramados: pct(presencialProgramados, presencialTotal),
      },
      cierres: {
        documentados: cierresDocumentados,
        noDocumentados: cierresNoDocumentados,
        total: cierresDocumentados + cierresNoDocumentados,
      },
    },
  };
}

/**
 * KPIs y series del dashboard de cartera (vista cliente BBVA).
 * Cuantía probable = mediana por caso. Reserva ajustador = suma de valorLiquidado.
 * Valor a liquidar = suma solo en autorización / caso para pago / pagado.
 * No se usa el total del liquidador mientras se envían reservas.
 */
export function construirDashboardBbvaCatListado(casos = []) {
  const lista = Array.isArray(casos) ? casos : [];
  const totalCasos = lista.length;

  const porEstadoMap = new Map(ESTADOS_BBVA_CAT.map((e) => [e, 0]));
  const reservaEstadoMap = new Map(ESTADOS_BBVA_CAT.map((e) => [e, 0]));
  const mensual = new Map();
  const cubetas = new Map(CUBETAS_ANTIGUEDAD.map((r) => [r, 0]));
  const cubetasReserva = new Map(CUBETAS_ANTIGUEDAD.map((r) => [r, 0]));
  const diasAbiertos = [];
  const grandesPerdidas = [];
  let nEstancados = 0;

  let carteraAbierta = 0;
  let enTramite = 0;
  let pendienteDocumento = 0;
  let enObjecion = 0;
  let objetados = 0;
  let desistimientos = 0;
  let listosPago = 0;
  let pagados = 0;
  let reservaAbierta = 0;
  let casosConReserva = 0;
  let valorAseguradoInmueble = 0;
  let valorReclamado = 0;
  let valorLiquidado = 0;
  let valorALiquidar = 0;
  let casosConAsegurado = 0;
  let casosConReclamado = 0;
  let casosConLiquidado = 0;
  let casosConValorALiquidar = 0;
  let casosConEstimado = 0;
  let completitudNinguno = 0;
  let completitudSoloReserva = 0;
  let completitudSoloALiquidar = 0;
  let completitudAmbos = 0;
  const estimadosPorCaso = [];

  for (const caso of lista) {
    const estado = claveEstado(caso.estado);
    porEstadoMap.set(estado, (porEstadoMap.get(estado) || 0) + 1);

    const abierto = esCarteraAbiertaBbvaCat(estado);
    const reservaBbva = reservaBbvaNumero(caso);
    const reservaAjustador = reservaAjustadorNumero(caso);
    if (abierto) {
      carteraAbierta += 1;
      if (reservaBbva > 0) {
        reservaAbierta += reservaBbva;
        casosConReserva += 1;
      }
      if (reservaAjustador > 0) {
        reservaEstadoMap.set(estado, (reservaEstadoMap.get(estado) || 0) + reservaAjustador);
      }
    }
    if (ESTADOS_TRAMITE.has(estado)) enTramite += 1;
    if (estado === 'PENDIENTE DE DOCUMENTO') pendienteDocumento += 1;
    if (estado === 'OBJECIÓN') enObjecion += 1;
    if (estado === 'OBJETADO') objetados += 1;
    if (estado === 'DESISTIMIENTO') desistimientos += 1;
    if (ESTADOS_LISTOS_PAGO.has(estado)) listosPago += 1;
    if (estado === 'PAGADO') pagados += 1;

    const aseguradoInmueble = montoPositivo(caso.valorAseguradoInmueble);
    if (aseguradoInmueble > 0) {
      valorAseguradoInmueble += aseguradoInmueble;
      casosConAsegurado += 1;
    }
    const reclamado = montoPositivo(caso.valorReclamado);
    if (reclamado > 0) {
      valorReclamado += reclamado;
      casosConReclamado += 1;
    }
    const liquidado = montoPositivo(caso.valorLiquidado);
    if (liquidado > 0) {
      valorLiquidado += liquidado;
      casosConLiquidado += 1;
    }
    const tieneReservaAjustador = tieneReservaAjustadorBbvaCat(caso);
    const tieneALiquidar = tieneValorALiquidarCartera(caso);
    if (tieneALiquidar) {
      casosConValorALiquidar += 1;
      valorALiquidar += valorALiquidarNumero(caso);
    }
    if (!tieneReservaAjustador && !tieneALiquidar) completitudNinguno += 1;
    else if (tieneReservaAjustador && !tieneALiquidar) completitudSoloReserva += 1;
    else if (!tieneReservaAjustador && tieneALiquidar) completitudSoloALiquidar += 1;
    else completitudAmbos += 1;
    const estimado = montoPositivo(caso.valorEstimadoAseguradora);
    if (estimado > 0) {
      casosConEstimado += 1;
      estimadosPorCaso.push(estimado);
    }

    const dias = diasEnEstadoNumeroBbvaCat(caso);
    if (abierto && dias != null) {
      const cubeta = cubetaDias(dias);
      diasAbiertos.push(dias);
      cubetas.set(cubeta, (cubetas.get(cubeta) || 0) + 1);
      if (reservaAjustador > 0) {
        cubetasReserva.set(cubeta, (cubetasReserva.get(cubeta) || 0) + reservaAjustador);
      }
      if (dias >= DIAS_ESTANCADO_BBVA_CAT) nEstancados += 1;
    }

    if (abierto && reservaAjustador > 0) {
      grandesPerdidas.push({
        id: caso._id,
        zc: caso.zc || '',
        siniestro: caso.siniestro || '',
        asegurado: caso.asegurado || '',
        ciudad: homologarCiudadBbvaCat(caso.ciudad) || caso.ciudad || '',
        estado,
        reserva: reservaAjustador,
        dias: diasEnEstadoNumeroBbvaCat(caso),
      });
    }

    const fAlta = fechaAltaListadoBbvaCat(caso);
    if (fAlta) {
      const clave = claveMes(fAlta);
      if (!mensual.has(clave)) {
        mensual.set(clave, { mes: clave, etiqueta: etiquetaMes(clave), altas: 0, pagados: 0, reserva: 0 });
      }
      const fila = mensual.get(clave);
      fila.altas += 1;
      fila.reserva += reservaAjustador;
    }
    const fPago = parseFecha(caso.fechaCasoPagado);
    if (fPago) {
      const clave = claveMes(fPago);
      if (!mensual.has(clave)) {
        mensual.set(clave, { mes: clave, etiqueta: etiquetaMes(clave), altas: 0, pagados: 0, reserva: 0 });
      }
      mensual.get(clave).pagados += 1;
    }
  }

  grandesPerdidas.sort((a, b) => b.reserva - a.reserva || String(a.zc).localeCompare(String(b.zc), 'es'));

  const estimadosUnicos = [...new Set(estimadosPorCaso)];
  const estimadoPorCaso =
    estimadosUnicos.length === 1 ? estimadosUnicos[0] : mediana(estimadosPorCaso);

  const porEstado = [
    ...ESTADOS_BBVA_CAT.map((estado) => ({ estado, cantidad: porEstadoMap.get(estado) || 0 })),
    ...[...porEstadoMap.entries()]
      .filter(([estado]) => !ESTADOS_BBVA_CAT.includes(estado) && (porEstadoMap.get(estado) || 0) > 0)
      .map(([estado, cantidad]) => ({ estado, cantidad })),
  ];

  const reservaPorEstado = ESTADOS_BBVA_CAT
    .map((estado) => ({ nombre: estado, valor: reservaEstadoMap.get(estado) || 0 }))
    .filter((f) => f.valor > 0);

  return {
    kpis: {
      totalCasos,
      carteraAbierta,
      enTramite,
      pendienteDocumento,
      enObjecion,
      objetados,
      desistimientos,
      listosPago,
      pagados,
      estancados: nEstancados,
      medianaDias: mediana(diasAbiertos),
      porcentajePagados: totalCasos === 0 ? 0 : Math.round((pagados / totalCasos) * 100),
      reservaAbierta,
      casosConReserva,
      valorAseguradoInmueble,
      valorReclamado,
      valorLiquidado,
      valorALiquidar,
      casosConAsegurado,
      casosConReclamado,
      casosConLiquidado,
      casosConValorALiquidar,
      estimadoPorCaso,
      casosConEstimado,
      estimadoEsUnico: estimadosUnicos.length === 1,
      completitud: {
        ninguno: completitudNinguno,
        soloReserva: completitudSoloReserva,
        soloALiquidar: completitudSoloALiquidar,
        ambos: completitudAmbos,
      },
    },
    porEstado,
    reservaPorEstado,
    porCiudad: agruparConteo(lista, (c) => homologarCiudadBbvaCat(c.ciudad), { vacio: 'Sin ciudad' }),
    reservaPorCiudad: agruparSuma(
      lista.filter((c) => esCarteraAbiertaBbvaCat(c.estado)),
      (c) => homologarCiudadBbvaCat(c.ciudad),
      reservaAjustadorNumero,
      { vacio: 'Sin ciudad' }
    ),
    porTipoPoliza: agruparConteo(lista, (c) => etiquetaTipoPolizaBbvaCat(c), { vacio: 'Sin tipo de póliza' }),
    porCausa: agruparConteo(lista, (c) => c.causa, { vacio: 'Sin causa' }),
    porIntermediario: agruparConteo(lista, (c) => c.intermediario, { vacio: 'Sin intermediario' }),
    porModalidad: agruparConteo(lista, (c) => c.modalidadAtencion, { vacio: 'Sin modalidad' }),
    tendenciaMensual: [...mensual.values()].sort((a, b) => (a.mes > b.mes ? 1 : -1)).slice(-12),
    antigüedad: CUBETAS_ANTIGUEDAD.map((rango) => ({
      rango,
      cantidad: cubetas.get(rango) || 0,
      reserva: cubetasReserva.get(rango) || 0,
    })),
    grandesPerdidas: grandesPerdidas.slice(0, LIMITE_GRANDES_PERDIDAS_BBVA_CAT),
    reunion: construirResumenReunionBbvaCat(lista),
  };
}
