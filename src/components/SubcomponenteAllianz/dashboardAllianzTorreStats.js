import { parseFecha } from '../SubcomponenteDashboardCatastrofico/dashboardCatastroficoStats.js';
import {
  ESTADOS_ALLIANZ,
  ESTADO_ALLIANZ_DEFAULT,
  ESTADO_ALLIANZ_INSPECCION,
  ESTADO_ALLIANZ_PENDIENTE_DOCS,
  ESTADO_ALLIANZ_OBJECION,
  ESTADO_ALLIANZ_AUTORIZACION,
  ESTADOS_TEMPRANOS_ALLIANZ,
  casoAtendidoAllianz,
  casoInspeccionadoAllianz,
  coincideFiltroCiudadAllianz,
  coincideFiltroTexto,
  diasEnEstadoAllianz,
  etiquetaTipoPolizaAllianz,
  esEstadoCerradoAllianz,
  esEstadoPendienteDocsAllianz,
  fechaEnRango,
  homologarCiudadAllianz,
  homologarEstadoAllianz,
  normTexto,
  resolverDepartamentoAllianz,
  ultimaGestionAllianz,
} from './allianzHelpers.js';
import { FILTROS_TORRE_VACIOS, TORRE_CONFIG_ALLIANZ_DEFAULT } from './dashboardAllianzTorreConfig.js';

const MS_DIA = 86400000;
const RANK_ALERTA = { critico: 0, alto: 1, medio: 2 };

export const TRAMOS_ETAPA_ALLIANZ = [
  { id: 'nuevo-insp', desde: 'fechaCasoNuevo', hasta: 'fechaCoordinandoInspeccion' },
  { id: 'insp-visita', desde: 'fechaCoordinandoInspeccion', hasta: 'fechaVisita' },
  { id: 'visita-analisis', desde: 'fechaVisita', hasta: 'fechaAnalisisCaso' },
  { id: 'analisis-docs', desde: 'fechaAnalisisCaso', hasta: 'fechaSolicitudDocumento' },
  { id: 'docs-auth', desde: 'fechaSolicitudDocumento', hasta: 'fechaAutorizacionAnalista' },
  { id: 'auth-pago', desde: 'fechaAutorizacionAnalista', hasta: 'fechaCasoParaPago' },
  { id: 'pago-cierre', desde: 'fechaCasoParaPago', hasta: 'fechaCasoPagado' },
];

export function fechaAltaListadoAllianz(caso = {}) {
  return parseFecha(caso.fechaCasoNuevo || caso.fechaAsignacion || caso.createdAt);
}

export function fechaCierreListadoAllianz(caso = {}) {
  return parseFecha(
    caso.fechaCasoPagado ||
      caso.fechaObjetado ||
      caso.fechaAnulado ||
      caso.fechaLiquidado ||
      caso.fechaFinalizado
  );
}

export function montoCargadoAllianz(valor) {
  if (valor == null || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

export function reservaPositivaAllianz(caso = {}) {
  const n = montoCargadoAllianz(caso.reserva) ?? montoCargadoAllianz(caso.valorReservaPreventivaPromedio);
  return n != null && n > 0 ? n : 0;
}

export function casoTieneReservaAllianz(caso = {}) {
  return reservaPositivaAllianz(caso) > 0;
}

export function campoCompletoAllianz(valor) {
  if (valor == null || valor === '') return false;
  if (typeof valor === 'number') return Number.isFinite(valor);
  const t = String(valor).trim();
  if (!t || t === '—' || t === '-') return false;
  return true;
}

export function diasEnEstadoNumeroAllianz(caso = {}) {
  const n = Number(diasEnEstadoAllianz(caso));
  return Number.isFinite(n) ? n : null;
}

function inicioDia(date) {
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function diasEntreFechas(a, b) {
  const ia = inicioDia(parseFecha(a));
  const ib = inicioDia(parseFecha(b));
  if (ia == null || ib == null) return null;
  return Math.max(0, Math.round((ib - ia) / MS_DIA));
}

export function diasAntiguedadTotalAllianz(caso = {}, hoy = new Date()) {
  const alta = fechaAltaListadoAllianz(caso);
  if (!alta) return null;
  return diasEntreFechas(alta, hoy);
}

export function cubetaPorDias(dias, cubetas = []) {
  if (dias == null || !Number.isFinite(dias)) return null;
  for (const cubeta of cubetas) {
    if (dias < cubeta.min) continue;
    if (cubeta.max == null || dias <= cubeta.max) return cubeta.id;
  }
  return cubetas[cubetas.length - 1]?.id || null;
}

function mediana(nums) {
  const arr = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!arr.length) return null;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : Math.round(((arr[mid - 1] + arr[mid]) / 2) * 10) / 10;
}

function pct(parte, total) {
  if (!total) return 0;
  return Math.round((parte / total) * 1000) / 10;
}

export function clasificarDocumentoFaltanteAllianz(texto, config = TORRE_CONFIG_ALLIANZ_DEFAULT) {
  const raw = String(texto || '').trim();
  if (!raw) return null;
  const clave = normTexto(raw);
  const categorias = config.documentos?.categorias || [];
  for (const cat of categorias) {
    if (cat.id === 'otro') continue;
    const patrones = cat.patrones || [];
    if (patrones.some((p) => clave.includes(normTexto(p)))) {
      return { id: cat.id, label: cat.label, texto: raw };
    }
  }
  const otro = categorias.find((c) => c.id === 'otro') || { id: 'otro', label: 'Otro documento' };
  return { id: otro.id, label: otro.label, texto: raw };
}

function clasificarPlazo(dias, limite, proximoPct) {
  if (dias == null || !Number.isFinite(dias) || !limite) return 'sinDato';
  if (dias > limite) return 'vencido';
  if (dias >= limite * proximoPct) return 'proximo';
  return 'dentro';
}

function fechaFinInspeccionAllianz(caso = {}, estado) {
  const visita = parseFecha(caso.fechaVisita || caso.fechaInspeccion);
  if (visita) return visita;
  if (!ESTADOS_TEMPRANOS_ALLIANZ.has(estado)) {
    return parseFecha(caso.fechaAnalisisCaso || caso.fechaCoordinandoInspeccion);
  }
  return null;
}

export function clasificarAnsAllianz(caso = {}, config = TORRE_CONFIG_ALLIANZ_DEFAULT, hoy = new Date()) {
  const ans = config.ans || TORRE_CONFIG_ALLIANZ_DEFAULT.ans;
  const inicio = fechaAltaListadoAllianz(caso);
  const estado = homologarEstadoAllianz(caso.estado);
  const finInsp = fechaFinInspeccionAllianz(caso, estado);
  const finLiq = fechaCierreListadoAllianz(caso);
  const diasInsp = inicio ? diasEntreFechas(inicio, finInsp || hoy) : null;
  const diasLiq = inicio ? diasEntreFechas(inicio, finLiq || hoy) : null;
  const inspeccionAbierta = !finInsp && ESTADOS_TEMPRANOS_ALLIANZ.has(estado);
  const liquidacionAbierta = !finLiq && !esEstadoCerradoAllianz(estado);

  return {
    inspeccion: clasificarPlazo(diasInsp, ans.inspeccionDias, ans.proximoPct),
    liquidacion: clasificarPlazo(diasLiq, ans.liquidacionDias, ans.proximoPct),
    diasInspeccion: diasInsp,
    diasLiquidacion: diasLiq,
    inspeccionAbierta,
    liquidacionAbierta,
  };
}

export function clasificarAlertaAllianz(caso = {}, config = TORRE_CONFIG_ALLIANZ_DEFAULT, hoy = new Date()) {
  const a = config.alertas || TORRE_CONFIG_ALLIANZ_DEFAULT.alertas;
  const estado = homologarEstadoAllianz(caso.estado);
  if (esEstadoCerradoAllianz(estado)) return null;

  const diasEstado = diasEnEstadoNumeroAllianz(caso);
  const diasTotal = diasAntiguedadTotalAllianz(caso, hoy);
  const reserva = reservaPositivaAllianz(caso);
  const docs = clasificarDocumentoFaltanteAllianz(caso.documentoFaltante, config);
  const ans = clasificarAnsAllianz(caso, config, hoy);
  const ultima = ultimaGestionAllianz(caso);
  const diasSinGestion = ultima ? diasEntreFechas(ultima, hoy) : diasEstado;
  const tipos = [];

  if (ans.inspeccion === 'vencido' || ans.liquidacion === 'vencido') tipos.push('fueraAns');
  if (diasEstado != null && diasEstado >= a.diasEstadoAlto) tipos.push('diasEstado');
  if (diasTotal != null && diasTotal >= a.diasTotalCritico) tipos.push('antiguedadTotal');
  if (reserva >= a.reservaAlta) tipos.push('reservaAlta');
  if (docs) tipos.push('documento');
  if (estado === ESTADO_ALLIANZ_OBJECION) tipos.push('objecion');
  if (estado === ESTADO_ALLIANZ_AUTORIZACION) tipos.push('autorizacion');
  if (esEstadoPendienteDocsAllianz(estado)) tipos.push('pendienteDocs');
  if (diasSinGestion != null && diasSinGestion >= a.diasSinGestionMedio) tipos.push('sinGestion');

  let nivel = null;
  if (
    ans.inspeccion === 'vencido' ||
    ans.liquidacion === 'vencido' ||
    (diasEstado != null && diasEstado >= a.diasEstadoCritico) ||
    (diasTotal != null && diasTotal >= a.diasTotalCritico) ||
    reserva >= a.reservaCritica
  ) {
    nivel = 'critico';
  } else if (
    ans.inspeccion === 'proximo' ||
    ans.liquidacion === 'proximo' ||
    (diasEstado != null && diasEstado >= a.diasEstadoAlto) ||
    reserva >= a.reservaAlta ||
    docs ||
    estado === ESTADO_ALLIANZ_OBJECION ||
    estado === ESTADO_ALLIANZ_AUTORIZACION ||
    esEstadoPendienteDocsAllianz(estado)
  ) {
    nivel = 'alto';
  } else if (
    (diasEstado != null && diasEstado >= a.diasEstadoMedio) ||
    (diasSinGestion != null && diasSinGestion >= a.diasSinGestionMedio)
  ) {
    nivel = 'medio';
  }

  if (!nivel) return null;
  return {
    nivel,
    tipos,
    diasEstado,
    diasTotal,
    diasSinGestion,
    reserva,
    documento: docs,
    ans,
  };
}

function coincideRangoReserva(caso, rangoId, config) {
  if (!rangoId) return true;
  const rango = (config.rangosReserva || []).find((r) => r.id === rangoId);
  if (!rango) return true;
  const n = montoCargadoAllianz(caso.reserva) ?? montoCargadoAllianz(caso.valorReservaPreventivaPromedio);
  if (n == null) return false;
  if (n < rango.min) return false;
  if (rango.max != null && n >= rango.max) return false;
  return true;
}

function coincideBusqueda(caso, texto) {
  const q = String(texto || '').trim().toLowerCase();
  if (!q) return true;
  const hay = [caso.zc, caso.siniestro, caso.asegurado, caso.ciudad, caso.numeroPoliza]
    .map((v) => String(v || '').toLowerCase())
    .join(' ');
  return hay.includes(q);
}

export function aplicarFiltrosTorreAllianz(
  casos = [],
  filtros = FILTROS_TORRE_VACIOS,
  config = TORRE_CONFIG_ALLIANZ_DEFAULT
) {
  const f = { ...FILTROS_TORRE_VACIOS, ...(filtros || {}) };
  return (Array.isArray(casos) ? casos : []).filter((item) => {
    if (f.ciudad) {
      if (normTexto(f.ciudad) === 'SIN CIUDAD') {
        if (homologarCiudadAllianz(item.ciudad) || String(item.ciudad || '').trim()) return false;
      } else if (!coincideFiltroCiudadAllianz(item.ciudad, f.ciudad)) return false;
    }
    if (f.departamento && !coincideFiltroTexto(resolverDepartamentoAllianz(item), f.departamento)) {
      return false;
    }
    if (f.estado && homologarEstadoAllianz(item.estado) !== f.estado) return false;
    if (f.tipoPoliza) {
      if (normTexto(f.tipoPoliza) === 'SIN TIPO DE POLIZA') {
        if (String(etiquetaTipoPolizaAllianz(item) || '').trim()) return false;
      } else if (!coincideFiltroTexto(etiquetaTipoPolizaAllianz(item), f.tipoPoliza)) return false;
    }
    if (f.causa && !coincideFiltroTexto(item.causa, f.causa)) return false;
    if (f.modalidad) {
      if (normTexto(f.modalidad) === 'SIN MODALIDAD') {
        if (String(item.modalidadAtencion || '').trim()) return false;
      } else if (!coincideFiltroTexto(item.modalidadAtencion, f.modalidad)) return false;
    }
    if (f.intermediario && !coincideFiltroTexto(item.intermediario, f.intermediario)) return false;
    if (f.abiertoCerrado === 'abierto' && esEstadoCerradoAllianz(item.estado)) return false;
    if (f.abiertoCerrado === 'cerrado' && !esEstadoCerradoAllianz(item.estado)) return false;
    if (f.conReserva === 'si' && !casoTieneReservaAllianz(item)) return false;
    if (f.conReserva === 'no' && casoTieneReservaAllianz(item)) return false;
    if (!coincideRangoReserva(item, f.reservaRango, config)) return false;
    if (f.antiguedadRango) {
      const cubeta = cubetaPorDias(diasEnEstadoNumeroAllianz(item), config.cubetasAntiguedad);
      const cubetaHeat = cubetaPorDias(diasEnEstadoNumeroAllianz(item), config.cubetasDiasHeatmap);
      if (cubeta !== f.antiguedadRango && cubetaHeat !== f.antiguedadRango) return false;
    }
    if (f.antiguedadTotalRango) {
      const cubeta = cubetaPorDias(diasAntiguedadTotalAllianz(item), config.cubetasAntiguedad);
      if (cubeta !== f.antiguedadTotalRango) return false;
    }
    if (f.documentoCategoria) {
      const doc = clasificarDocumentoFaltanteAllianz(item.documentoFaltante, config);
      if (!doc || doc.id !== f.documentoCategoria) return false;
    }
    if (f.ansInspeccion || f.ansLiquidacion || f.nivelAlerta) {
      const ans = clasificarAnsAllianz(item, config);
      if (f.ansInspeccion && ans.inspeccion !== f.ansInspeccion) return false;
      if (f.ansLiquidacion && ans.liquidacion !== f.ansLiquidacion) return false;
      if (f.nivelAlerta) {
        const alerta = clasificarAlertaAllianz(item, config);
        if (!alerta || alerta.nivel !== f.nivelAlerta) return false;
      }
    }
    if (f.fechaDesde || f.fechaHasta) {
      if (!fechaEnRango(fechaAltaListadoAllianz(item), f.fechaDesde, f.fechaHasta)) return false;
    }
    if (f.busqueda && !coincideBusqueda(item, f.busqueda)) return false;
    return true;
  });
}

export function filtrosTorreActivos(filtros = FILTROS_TORRE_VACIOS) {
  return Object.entries({ ...FILTROS_TORRE_VACIOS, ...(filtros || {}) }).filter(([, v]) =>
    String(v || '').trim()
  );
}

function agruparConteoYReserva(casos, getter, { vacio = 'Sin dato', limite = 0 } = {}) {
  const map = new Map();
  for (const caso of casos) {
    const raw = String(getter(caso) ?? '').trim();
    const key = raw || vacio;
    if (!map.has(key)) map.set(key, { nombre: key, cantidad: 0, reserva: 0, conReserva: 0 });
    const fila = map.get(key);
    fila.cantidad += 1;
    const reserva = reservaPositivaAllianz(caso);
    if (reserva > 0) {
      fila.reserva += reserva;
      fila.conReserva += 1;
    }
  }
  const totalReserva = [...map.values()].reduce((s, f) => s + f.reserva, 0);
  const ordenado = [...map.values()]
    .map((fila) => ({
      ...fila,
      promedio: fila.conReserva ? fila.reserva / fila.conReserva : 0,
      pct: pct(fila.reserva, totalReserva),
    }))
    .sort((a, b) => b.reserva - a.reserva || b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'));
  if (!limite || limite <= 0 || ordenado.length <= limite) return ordenado;
  const cabeza = ordenado.slice(0, limite);
  const resto = ordenado.slice(limite);
  if (!resto.length) return cabeza;
  const otros = resto.reduce(
    (acc, fila) => {
      acc.cantidad += fila.cantidad;
      acc.reserva += fila.reserva;
      acc.conReserva += fila.conReserva;
      return acc;
    },
    { nombre: 'Otros', cantidad: 0, reserva: 0, conReserva: 0 }
  );
  otros.promedio = otros.conReserva ? otros.reserva / otros.conReserva : 0;
  otros.pct = pct(otros.reserva, totalReserva);
  cabeza.push(otros);
  return cabeza;
}

function inicioSemanaLunes(date) {
  const x = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function claveBucket(date, granularidad) {
  if (!date) return '';
  if (granularidad === 'dia') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  const ini = inicioSemanaLunes(date);
  return `${ini.getFullYear()}-${String(ini.getMonth() + 1).padStart(2, '0')}-${String(ini.getDate()).padStart(2, '0')}`;
}

function etiquetaBucket(clave, granularidad) {
  const [y, m, d] = String(clave).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return clave;
  if (granularidad === 'dia') {
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }).replace('.', '');
  }
  return `Sem ${date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }).replace('.', '')}`;
}

function finBucket(clave, granularidad) {
  const [y, m, d] = String(clave).split('-').map(Number);
  const ini = new Date(y, m - 1, d, 23, 59, 59, 999);
  if (granularidad === 'dia') return ini;
  const fin = new Date(ini);
  fin.setDate(fin.getDate() + 6);
  return fin;
}

function construirSerieFlujo(casos, granularidad, config) {
  const fechas = [];
  for (const caso of casos) {
    const alta = fechaAltaListadoAllianz(caso);
    const fin = fechaCierreListadoAllianz(caso);
    if (alta) fechas.push(alta);
    if (fin) fechas.push(fin);
  }
  if (!fechas.length) return { serie: [], indiceEvacuacion: null, ingresosPeriodo: 0, finalizadosPeriodo: 0 };

  const max = new Date();
  let min = new Date(Math.min(...fechas.map((f) => f.getTime())));
  if (granularidad === 'dia') {
    const corte = new Date(max);
    corte.setDate(corte.getDate() - (config.serieDiariaMaxDias || 45));
    if (min < corte) min = corte;
  } else {
    const corte = new Date(max);
    corte.setDate(corte.getDate() - (config.serieSemanalMaxSemanas || 16) * 7);
    if (min < corte) min = corte;
  }

  const claves = [];
  const cursor = granularidad === 'dia' ? new Date(min) : inicioSemanaLunes(min);
  const tope = granularidad === 'dia' ? max : inicioSemanaLunes(max);
  while (cursor <= tope) {
    claves.push(claveBucket(cursor, granularidad));
    cursor.setDate(cursor.getDate() + (granularidad === 'dia' ? 1 : 7));
  }

  const serie = claves.map((clave) => {
    const fin = finBucket(clave, granularidad);
    const iniMs = inicioDia(parseFecha(clave));
    const finMs = inicioDia(fin);
    let ingresos = 0;
    let finalizados = 0;
    let backlog = 0;
    for (const caso of casos) {
      const alta = fechaAltaListadoAllianz(caso);
      const cierre = fechaCierreListadoAllianz(caso);
      const altaMs = inicioDia(alta);
      const cierreMs = inicioDia(cierre);
      if (altaMs != null && altaMs >= iniMs && altaMs <= finMs) ingresos += 1;
      if (cierreMs != null && cierreMs >= iniMs && cierreMs <= finMs) finalizados += 1;
      if (altaMs != null && altaMs <= finMs && (cierreMs == null || cierreMs > finMs)) backlog += 1;
    }
    return { clave, etiqueta: etiquetaBucket(clave, granularidad), ingresos, finalizados, backlog };
  });

  const ingresosPeriodo = serie.reduce((s, f) => s + f.ingresos, 0);
  const finalizadosPeriodo = serie.reduce((s, f) => s + f.finalizados, 0);
  const indiceEvacuacion = ingresosPeriodo === 0 ? null : pct(finalizadosPeriodo, ingresosPeriodo);

  return { serie, indiceEvacuacion, ingresosPeriodo, finalizadosPeriodo };
}

function vaciosAns() {
  return { dentro: 0, proximo: 0, vencido: 0, sinDato: 0, total: 0 };
}

/**
 * Motor de la torre Allianz: una cartera filtrada → indicadores de las pestañas.
 */
export function construirTorreAllianz(
  casos = [],
  config = TORRE_CONFIG_ALLIANZ_DEFAULT,
  { granularidad = 'semana', hayFiltroFecha = false } = {}
) {
  const lista = Array.isArray(casos) ? casos : [];
  const hoy = new Date();
  const cubetasHeat = config.cubetasDiasHeatmap || [];
  const cubetasAge = config.cubetasAntiguedad || [];
  const rangos = config.rangosReserva || [];

  const porEstadoMap = new Map(
    ESTADOS_ALLIANZ.map((e) => [e, { estado: e, cantidad: 0, reserva: 0, alertas: 0, criticos: 0 }])
  );
  const heat = new Map();
  const ageEstado = new Map(cubetasAge.map((c) => [c.id, { id: c.id, label: c.label, cantidad: 0, reserva: 0 }]));
  const ageTotal = new Map(cubetasAge.map((c) => [c.id, { id: c.id, label: c.label, cantidad: 0, reserva: 0 }]));
  const docsMap = new Map();
  const tramosDias = Object.fromEntries(TRAMOS_ETAPA_ALLIANZ.map((t) => [t.id, []]));
  const severidad = rangos.map((r) => ({ ...r, cantidad: 0, reserva: 0 }));
  const ansInsp = vaciosAns();
  const ansLiq = vaciosAns();
  const pareto = [];
  const intervencion = [];
  const topReservas = [];

  let carteraAbierta = 0;
  let finalizados = 0;
  let nuevosEstado = 0;
  let atendidos = 0;
  let inspecciones = 0;
  let enInspeccion = 0;
  let pendienteDocumento = 0;
  let reservaAbierta = 0;
  let casosConReserva = 0;
  let abiertosConReserva = 0;
  let valorAsegurado = 0;
  let valorReclamado = 0;
  let valorLiquidado = 0;
  let casosConAsegurado = 0;
  let casosConReclamado = 0;
  let casosConLiquidado = 0;
  let casosTriplete = 0;
  let criticos = 0;
  let altos = 0;
  let medios = 0;

  const completitudHits = Object.fromEntries((config.completitudCampos || []).map((c) => [c.id, 0]));

  for (const caso of lista) {
    const estado = homologarEstadoAllianz(caso.estado);
    const abierto = !esEstadoCerradoAllianz(estado);
    const reserva = reservaPositivaAllianz(caso);
    const diasEstado = diasEnEstadoNumeroAllianz(caso);
    const diasTotal = diasAntiguedadTotalAllianz(caso, hoy);
    const alerta = clasificarAlertaAllianz(caso, config, hoy);
    const ans = clasificarAnsAllianz(caso, config, hoy);

    if (!porEstadoMap.has(estado)) {
      porEstadoMap.set(estado, { estado, cantidad: 0, reserva: 0, alertas: 0, criticos: 0 });
    }
    const bucketEstado = porEstadoMap.get(estado);
    bucketEstado.cantidad += 1;
    const cuentaReserva = abierto && reserva > 0;
    if (cuentaReserva) bucketEstado.reserva += reserva;
    if (alerta) {
      bucketEstado.alertas += 1;
      if (alerta.nivel === 'critico') bucketEstado.criticos += 1;
    }

    if (abierto) {
      carteraAbierta += 1;
      if (cuentaReserva) {
        reservaAbierta += reserva;
        abiertosConReserva += 1;
        casosConReserva += 1;
        pareto.push({
          id: caso._id,
          zc: caso.zc || '',
          siniestro: caso.siniestro || '',
          asegurado: caso.asegurado || '',
          ciudad: homologarCiudadAllianz(caso.ciudad) || caso.ciudad || '',
          estado,
          reserva,
          dias: diasEstado,
          alerta: alerta?.nivel || null,
        });
        topReservas.push({
          id: caso._id,
          zc: caso.zc || '',
          siniestro: caso.siniestro || '',
          asegurado: caso.asegurado || '',
          ciudad: homologarCiudadAllianz(caso.ciudad) || caso.ciudad || '',
          estado,
          reserva,
          dias: diasEstado,
          alerta: alerta?.nivel || null,
        });
      }
    }
    if (estado === ESTADO_ALLIANZ_DEFAULT) nuevosEstado += 1;
    if (esEstadoCerradoAllianz(estado)) finalizados += 1;
    if (casoAtendidoAllianz(caso)) atendidos += 1;
    if (casoInspeccionadoAllianz(caso)) inspecciones += 1;
    if (estado === ESTADO_ALLIANZ_INSPECCION) enInspeccion += 1;
    if (estado === ESTADO_ALLIANZ_PENDIENTE_DOCS) pendienteDocumento += 1;

    const asegurado = montoCargadoAllianz(caso.valorAseguradoInmueble);
    if (asegurado != null && asegurado > 0) {
      valorAsegurado += asegurado;
      casosConAsegurado += 1;
    }
    const reclamado = montoCargadoAllianz(caso.valorReclamado);
    if (reclamado != null && reclamado > 0) {
      valorReclamado += reclamado;
      casosConReclamado += 1;
    }
    const liquidado = montoCargadoAllianz(caso.valorLiquidado);
    if (liquidado != null && liquidado > 0) {
      valorLiquidado += liquidado;
      casosConLiquidado += 1;
    }
    if (
      reclamado != null &&
      liquidado != null &&
      (montoCargadoAllianz(caso.reserva) != null || montoCargadoAllianz(caso.valorReservaPreventivaPromedio) != null)
    ) {
      casosTriplete += 1;
    }

    if (alerta) {
      if (alerta.nivel === 'critico') criticos += 1;
      else if (alerta.nivel === 'alto') altos += 1;
      else medios += 1;
      intervencion.push({
        id: caso._id,
        zc: caso.zc || '',
        siniestro: caso.siniestro || '',
        asegurado: caso.asegurado || '',
        ciudad: homologarCiudadAllianz(caso.ciudad) || caso.ciudad || '',
        estado,
        reserva,
        diasEstado,
        diasTotal,
        nivel: alerta.nivel,
        tipos: alerta.tipos,
        documento: alerta.documento?.texto || '',
      });
    }

    const cubetaHeat = cubetaPorDias(diasEstado, cubetasHeat);
    if (cubetaHeat && abierto) {
      const key = `${estado}|${cubetaHeat}`;
      if (!heat.has(key)) heat.set(key, { estado, cubetaId: cubetaHeat, cantidad: 0, reserva: 0 });
      const celda = heat.get(key);
      celda.cantidad += 1;
      celda.reserva += reserva;
    }
    const cubAge = cubetaPorDias(diasEstado, cubetasAge);
    if (cubAge && abierto && ageEstado.has(cubAge)) {
      ageEstado.get(cubAge).cantidad += 1;
      ageEstado.get(cubAge).reserva += reserva;
    }
    const cubTot = cubetaPorDias(diasTotal, cubetasAge);
    if (cubTot && abierto && ageTotal.has(cubTot)) {
      ageTotal.get(cubTot).cantidad += 1;
      ageTotal.get(cubTot).reserva += reserva;
    }

    ansInsp[ans.inspeccion] += 1;
    ansInsp.total += 1;
    ansLiq[ans.liquidacion] += 1;
    ansLiq.total += 1;

    const doc = clasificarDocumentoFaltanteAllianz(caso.documentoFaltante, config);
    if (doc) {
      if (!docsMap.has(doc.id)) docsMap.set(doc.id, { id: doc.id, label: doc.label, cantidad: 0, reserva: 0 });
      const fila = docsMap.get(doc.id);
      fila.cantidad += 1;
      fila.reserva += reserva;
    }

    for (const tramo of TRAMOS_ETAPA_ALLIANZ) {
      const hasta = tramo.hasta === 'fechaVisita'
        ? caso.fechaVisita || caso.fechaInspeccion
        : caso[tramo.hasta];
      const d = diasEntreFechas(caso[tramo.desde], hasta);
      if (d != null) tramosDias[tramo.id].push(d);
    }

    const nReserva = montoCargadoAllianz(caso.reserva) ?? montoCargadoAllianz(caso.valorReservaPreventivaPromedio);
    if (nReserva != null && nReserva >= 0) {
      const rango = rangos.find((r) => nReserva >= r.min && (r.max == null || nReserva < r.max));
      if (rango) {
        const fila = severidad.find((s) => s.id === rango.id);
        if (fila) {
          fila.cantidad += 1;
          fila.reserva += nReserva > 0 ? nReserva : 0;
        }
      }
    }

    for (const campo of config.completitudCampos || []) {
      const valor = campo.campo === 'reserva'
        ? caso.reserva || caso.valorReservaPreventivaPromedio
        : caso[campo.campo];
      if (campoCompletoAllianz(valor)) completitudHits[campo.id] += 1;
    }
  }

  pareto.sort((a, b) => b.reserva - a.reserva);
  const totalPareto = pareto.reduce((s, f) => s + f.reserva, 0);
  let acum = 0;
  const paretoFilas = pareto.map((fila, idx) => {
    acum += fila.reserva;
    const pctAcum = pct(acum, totalPareto);
    return {
      ...fila,
      pct: pct(fila.reserva, totalPareto),
      pctAcum,
      rank: idx + 1,
      top1: idx === 0,
      top5: idx < 5,
      top10: idx < 10,
      top20: idx < 20,
    };
  });
  const concentracion = {
    top1: paretoFilas[0]?.pct || 0,
    top5: paretoFilas[4]?.pctAcum || paretoFilas[paretoFilas.length - 1]?.pctAcum || 0,
    top10: paretoFilas[9]?.pctAcum || paretoFilas[paretoFilas.length - 1]?.pctAcum || 0,
    top20: paretoFilas[19]?.pctAcum || paretoFilas[paretoFilas.length - 1]?.pctAcum || 0,
  };

  intervencion.sort((a, b) => {
    const ra = RANK_ALERTA[a.nivel] ?? 9;
    const rb = RANK_ALERTA[b.nivel] ?? 9;
    return ra - rb || (b.reserva || 0) - (a.reserva || 0);
  });
  topReservas.sort((a, b) => b.reserva - a.reserva);

  const flujo = construirSerieFlujo(lista, granularidad, config);
  const totalCasos = lista.length;
  const nuevos = hayFiltroFecha ? totalCasos : nuevosEstado;
  const coberturaReserva = carteraAbierta === 0 ? null : pct(abiertosConReserva, carteraAbierta);

  const porEstado = [
    ...ESTADOS_ALLIANZ.map((estado) => {
      const fila = porEstadoMap.get(estado) || {
        estado,
        cantidad: 0,
        reserva: 0,
        alertas: 0,
        criticos: 0,
      };
      return {
        ...fila,
        pctAbiertos: pct(fila.cantidad, Math.max(carteraAbierta, 1)),
        alerta: fila.criticos > 0,
      };
    }),
    ...[...porEstadoMap.values()]
      .filter((fila) => !ESTADOS_ALLIANZ.includes(fila.estado) && fila.cantidad > 0)
      .map((fila) => ({
        ...fila,
        pctAbiertos: pct(fila.cantidad, Math.max(carteraAbierta, 1)),
        alerta: fila.criticos > 0,
      })),
  ];

  const reservaPorEstado = porEstado
    .filter((f) => !esEstadoCerradoAllianz(f.estado) && f.reserva > 0)
    .map((f) => ({ nombre: f.estado, valor: f.reserva, cantidad: f.cantidad }))
    .sort((a, b) => b.valor - a.valor);

  const tiemposEtapa = TRAMOS_ETAPA_ALLIANZ.map((tramo) => ({
    id: tramo.id,
    mediana: mediana(tramosDias[tramo.id]),
    n: tramosDias[tramo.id].length,
  })).filter((t) => t.n > 0);

  const mostrarTriplete = casosTriplete >= (config.umbralComparacionTriplete || 10);

  return {
    kpis: {
      totalCasos,
      carteraAbierta,
      nuevos,
      atendidos,
      inspecciones,
      enInspeccion,
      pendienteDocumento,
      finalizados,
      porcentajeFinalizados: totalCasos === 0 ? 0 : Math.round((finalizados / totalCasos) * 100),
      reservaAbierta,
      casosConReserva,
      abiertosConReserva,
      coberturaReserva,
      valorAsegurado,
      valorReclamado,
      valorLiquidado,
      casosConAsegurado,
      casosConReclamado,
      casosConLiquidado,
      casosTriplete,
      criticos,
      altos,
      medios,
      indiceEvacuacion: flujo.indiceEvacuacion,
      ingresosPeriodo: flujo.ingresosPeriodo,
      finalizadosPeriodo: flujo.finalizadosPeriodo,
    },
    porEstado,
    reservaPorEstado,
    serieFlujo: flujo.serie,
    pareto: paretoFilas.slice(0, 20),
    concentracion,
    intervencion: intervencion.slice(0, config.limiteIntervencion || 25),
    heatmap: {
      cubetas: cubetasHeat,
      celdas: Object.fromEntries(heat),
    },
    antiguedadEstado: cubetasAge.map((c) => ageEstado.get(c.id)),
    antiguedadTotal: cubetasAge.map((c) => ageTotal.get(c.id)),
    tiemposEtapa,
    ansInspeccion: { ...ansInsp, limite: config.ans?.inspeccionDias },
    ansLiquidacion: { ...ansLiq, limite: config.ans?.liquidacionDias },
    documentos: [...docsMap.values()].sort((a, b) => b.cantidad - a.cantidad),
    severidad,
    porCiudad: agruparConteoYReserva(lista, (c) => homologarCiudadAllianz(c.ciudad), {
      vacio: 'Sin ciudad',
    }),
    porTipoPoliza: agruparConteoYReserva(lista, (c) => etiquetaTipoPolizaAllianz(c), {
      vacio: 'Sin tipo de póliza',
    }),
    porModalidad: agruparConteoYReserva(lista, (c) => c.modalidadAtencion, { vacio: 'Sin modalidad' }),
    topReservas: topReservas.slice(0, config.limiteTopReservas || 15).map((fila) => ({
      ...fila,
      pct: pct(fila.reserva, reservaAbierta),
    })),
    completitud: (config.completitudCampos || []).map((c) => ({
      id: c.id,
      campo: c.campo,
      pct: pct(completitudHits[c.id] || 0, totalCasos || 1),
      n: completitudHits[c.id] || 0,
    })),
    mostrarTriplete,
    triplete: mostrarTriplete
      ? [
          { nombre: 'Reclamado', valor: valorReclamado },
          { nombre: 'Reserva', valor: reservaAbierta },
          { nombre: 'Liquidado', valor: valorLiquidado },
        ]
      : [],
  };
}
