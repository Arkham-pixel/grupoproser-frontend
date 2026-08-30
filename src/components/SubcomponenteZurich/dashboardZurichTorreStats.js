import { parseFecha } from '../SubcomponenteDashboardCatastrofico/dashboardCatastroficoStats.js';
import {
  ESTADOS_ZURICH,
  ESTADO_ZURICH_DEFAULT,
  ESTADO_ZURICH_LIQUIDAR,
  ESTADO_ZURICH_AUTORIDAD_DELEGADA,
  ESTADO_ZURICH_ACEPTACION_CLIENTE,
  ESTADO_ZURICH_FINALIZADO,
  ESTADOS_TEMPRANOS_ZURICH,
  diasEnEstadoZurich,
  etiquetaTipoPolizaZurich,
  esEstadoCerradoZurich,
  esEstadoPendienteDocsZurich,
  homologarCiudadZurich,
  homologarCausaZurich,
  homologarEstadoZurich,
  coincideFiltroCiudadZurich,
  coincideFiltroCausaZurich,
  coincideFiltroTexto,
  fechaEnRango,
  ultimaGestionZurich,
  resolverDepartamentoZurich,
  normTexto,
} from './zurichHelpers.js';
import { FILTROS_TORRE_VACIOS, TORRE_CONFIG_ZURICH_DEFAULT } from './dashboardZurichTorreConfig.js';

const MS_DIA = 86400000;
const RANK_ALERTA = { critico: 0, alto: 1, medio: 2 };

export const TRAMOS_ETAPA_ZURICH = [
  { id: 'nuevo-asignado', desde: 'fechaCasoNuevo', hasta: 'fechaAsignacion' },
  { id: 'asignado-insp', desde: 'fechaAsignacion', hasta: 'fechaCoordinandoInspeccion' },
  { id: 'insp-analisis', desde: 'fechaCoordinandoInspeccion', hasta: 'fechaAnalisisCaso' },
  { id: 'analisis-docs', desde: 'fechaAnalisisCaso', hasta: 'fechaInformePreliminar' },
  { id: 'docs-liquidar', desde: 'fechaInformePreliminar', hasta: 'fechaInformeFinal' },
  { id: 'liquidar-autoridad', desde: 'fechaInformeFinal', hasta: 'fechaAutoridadDelegada' },
  { id: 'autoridad-aceptacion', desde: 'fechaAutoridadDelegada', hasta: 'fechaAceptacionCliente' },
  { id: 'aceptacion-final', desde: 'fechaAceptacionCliente', hasta: 'fechaFinalizado' },
];

export function fechaAltaListadoZurich(caso = {}) {
  return parseFecha(caso.fechaCasoNuevo || caso.fechaAsignacion || caso.createdAt);
}

export function montoCargadoZurich(valor) {
  if (valor == null || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

export function reservaPositivaZurich(caso = {}) {
  const n = montoCargadoZurich(caso.reserva);
  return n != null && n > 0 ? n : 0;
}

export function casoTieneReservaZurich(caso = {}) {
  return reservaPositivaZurich(caso) > 0;
}

export function campoCompletoZurich(valor) {
  if (valor == null || valor === '') return false;
  if (typeof valor === 'number') return Number.isFinite(valor);
  const t = String(valor).trim();
  if (!t || t === '—' || t === '-') return false;
  return true;
}

export function diasEnEstadoNumeroZurich(caso = {}) {
  const n = Number(diasEnEstadoZurich(caso));
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

export function diasAntiguedadTotalZurich(caso = {}, hoy = new Date()) {
  const alta = fechaAltaListadoZurich(caso);
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

export function clasificarDocumentoFaltanteZurich(texto, config = TORRE_CONFIG_ZURICH_DEFAULT) {
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

export function clasificarAnsZurich(caso = {}, config = TORRE_CONFIG_ZURICH_DEFAULT, hoy = new Date()) {
  const ans = config.ans || TORRE_CONFIG_ZURICH_DEFAULT.ans;
  const inicio = fechaAltaListadoZurich(caso);
  const estado = homologarEstadoZurich(caso.estado);
  const finInsp = parseFecha(caso.fechaVisita || caso.fechaCoordinandoInspeccion);
  const finLiq = parseFecha(caso.fechaFinalizado || caso.fechaInformeFinal);
  const diasInsp = inicio ? diasEntreFechas(inicio, finInsp || hoy) : null;
  const diasLiq = inicio ? diasEntreFechas(inicio, finLiq || hoy) : null;
  const inspeccionAbierta = !finInsp && ESTADOS_TEMPRANOS_ZURICH.has(estado);
  const liquidacionAbierta = !finLiq && !esEstadoCerradoZurich(estado);

  return {
    inspeccion: clasificarPlazo(diasInsp, ans.inspeccionDias, ans.proximoPct),
    liquidacion: clasificarPlazo(diasLiq, ans.liquidacionDias, ans.proximoPct),
    diasInspeccion: diasInsp,
    diasLiquidacion: diasLiq,
    inspeccionAbierta,
    liquidacionAbierta,
  };
}

export function clasificarAlertaZurich(caso = {}, config = TORRE_CONFIG_ZURICH_DEFAULT, hoy = new Date()) {
  const a = config.alertas || TORRE_CONFIG_ZURICH_DEFAULT.alertas;
  const estado = homologarEstadoZurich(caso.estado);
  if (esEstadoCerradoZurich(estado)) return null;

  const diasEstado = diasEnEstadoNumeroZurich(caso);
  const diasTotal = diasAntiguedadTotalZurich(caso, hoy);
  const reserva = reservaPositivaZurich(caso);
  const docs = clasificarDocumentoFaltanteZurich(caso.documentoFaltante, config);
  const ans = clasificarAnsZurich(caso, config, hoy);
  const ultima = ultimaGestionZurich(caso);
  const diasSinGestion = ultima ? diasEntreFechas(ultima, hoy) : diasEstado;
  const tipos = [];

  if (ans.inspeccion === 'vencido' || ans.liquidacion === 'vencido') tipos.push('fueraAns');
  if (diasEstado != null && diasEstado >= a.diasEstadoAlto) tipos.push('diasEstado');
  if (diasTotal != null && diasTotal >= a.diasTotalCritico) tipos.push('antiguedadTotal');
  if (reserva >= a.reservaAlta) tipos.push('reservaAlta');
  if (docs) tipos.push('documento');
  if (estado === ESTADO_ZURICH_LIQUIDAR) tipos.push('liquidar');
  if (estado === ESTADO_ZURICH_AUTORIDAD_DELEGADA) tipos.push('autoridad');
  if (estado === ESTADO_ZURICH_ACEPTACION_CLIENTE) tipos.push('aceptacion');
  if (esEstadoPendienteDocsZurich(estado)) tipos.push('pendienteDocs');
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
    estado === ESTADO_ZURICH_LIQUIDAR ||
    estado === ESTADO_ZURICH_AUTORIDAD_DELEGADA ||
    estado === ESTADO_ZURICH_ACEPTACION_CLIENTE ||
    esEstadoPendienteDocsZurich(estado)
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
  const n = montoCargadoZurich(caso.reserva);
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

export function aplicarFiltrosTorreZurich(
  casos = [],
  filtros = FILTROS_TORRE_VACIOS,
  config = TORRE_CONFIG_ZURICH_DEFAULT
) {
  const f = { ...FILTROS_TORRE_VACIOS, ...(filtros || {}) };
  return (Array.isArray(casos) ? casos : []).filter((item) => {
    if (f.ciudad) {
      if (normTexto(f.ciudad) === 'SIN CIUDAD') {
        if (homologarCiudadZurich(item.ciudad) || String(item.ciudad || '').trim()) return false;
      } else if (!coincideFiltroCiudadZurich(item.ciudad, f.ciudad)) return false;
    }
    if (f.departamento && !coincideFiltroTexto(resolverDepartamentoZurich(item), f.departamento)) {
      return false;
    }
    if (f.estado && homologarEstadoZurich(item.estado) !== f.estado) return false;
    if (f.tipoPoliza) {
      if (normTexto(f.tipoPoliza) === 'SIN TIPO DE POLIZA') {
        if (String(etiquetaTipoPolizaZurich(item) || '').trim()) return false;
      } else if (!coincideFiltroTexto(etiquetaTipoPolizaZurich(item), f.tipoPoliza)) return false;
    }
    if (f.causa && !coincideFiltroCausaZurich(item.causa, f.causa)) return false;
    if (f.modalidad) {
      if (normTexto(f.modalidad) === 'SIN MODALIDAD') {
        if (String(item.modalidadAtencion || '').trim()) return false;
      } else if (!coincideFiltroTexto(item.modalidadAtencion, f.modalidad)) return false;
    }
    if (f.intermediario && !coincideFiltroTexto(item.intermediario, f.intermediario)) return false;
    if (f.abiertoCerrado === 'abierto' && esEstadoCerradoZurich(item.estado)) return false;
    if (f.abiertoCerrado === 'cerrado' && !esEstadoCerradoZurich(item.estado)) return false;
    if (f.conReserva === 'si' && !casoTieneReservaZurich(item)) return false;
    if (f.conReserva === 'no' && casoTieneReservaZurich(item)) return false;
    if (!coincideRangoReserva(item, f.reservaRango, config)) return false;
    if (f.antiguedadRango) {
      const cubeta = cubetaPorDias(diasEnEstadoNumeroZurich(item), config.cubetasAntiguedad);
      const cubetaHeat = cubetaPorDias(diasEnEstadoNumeroZurich(item), config.cubetasDiasHeatmap);
      if (cubeta !== f.antiguedadRango && cubetaHeat !== f.antiguedadRango) return false;
    }
    if (f.antiguedadTotalRango) {
      const cubeta = cubetaPorDias(diasAntiguedadTotalZurich(item), config.cubetasAntiguedad);
      if (cubeta !== f.antiguedadTotalRango) return false;
    }
    if (f.documentoCategoria) {
      const doc = clasificarDocumentoFaltanteZurich(item.documentoFaltante, config);
      if (!doc || doc.id !== f.documentoCategoria) return false;
    }
    if (f.ansInspeccion || f.ansLiquidacion || f.nivelAlerta) {
      const ans = clasificarAnsZurich(item, config);
      if (f.ansInspeccion && ans.inspeccion !== f.ansInspeccion) return false;
      if (f.ansLiquidacion && ans.liquidacion !== f.ansLiquidacion) return false;
      if (f.nivelAlerta) {
        const alerta = clasificarAlertaZurich(item, config);
        if (!alerta || alerta.nivel !== f.nivelAlerta) return false;
      }
    }
    if (f.fechaDesde || f.fechaHasta) {
      if (!fechaEnRango(fechaAltaListadoZurich(item), f.fechaDesde, f.fechaHasta)) return false;
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
    const reserva = reservaPositivaZurich(caso);
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
    const alta = fechaAltaListadoZurich(caso);
    const fin = parseFecha(caso.fechaFinalizado);
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
      const alta = fechaAltaListadoZurich(caso);
      const cierre = parseFecha(caso.fechaFinalizado);
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
 * Motor de la torre: una cartera filtrada → todos los indicadores de las pestañas.
 */
export function construirTorreZurich(
  casos = [],
  config = TORRE_CONFIG_ZURICH_DEFAULT,
  { granularidad = 'semana', hayFiltroFecha = false } = {}
) {
  const lista = Array.isArray(casos) ? casos : [];
  const hoy = new Date();
  const cubetasHeat = config.cubetasDiasHeatmap || [];
  const cubetasAge = config.cubetasAntiguedad || [];
  const rangos = config.rangosReserva || [];

  const porEstadoMap = new Map(
    ESTADOS_ZURICH.map((e) => [e, { estado: e, cantidad: 0, reserva: 0, alertas: 0, criticos: 0 }])
  );
  const heat = new Map();
  const ageEstado = new Map(cubetasAge.map((c) => [c.id, { id: c.id, label: c.label, cantidad: 0, reserva: 0 }]));
  const ageTotal = new Map(cubetasAge.map((c) => [c.id, { id: c.id, label: c.label, cantidad: 0, reserva: 0 }]));
  const docsMap = new Map();
  const tramosDias = Object.fromEntries(TRAMOS_ETAPA_ZURICH.map((t) => [t.id, []]));
  const severidad = rangos.map((r) => ({ ...r, cantidad: 0, reserva: 0 }));
  const ansInsp = vaciosAns();
  const ansLiq = vaciosAns();
  const pareto = [];
  const intervencion = [];
  const topReservas = [];

  let carteraAbierta = 0;
  let finalizados = 0;
  let nuevosEstado = 0;
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
    const estado = homologarEstadoZurich(caso.estado);
    const abierto = !esEstadoCerradoZurich(estado);
    const reserva = reservaPositivaZurich(caso);
    const diasEstado = diasEnEstadoNumeroZurich(caso);
    const diasTotal = diasAntiguedadTotalZurich(caso, hoy);
    const alerta = clasificarAlertaZurich(caso, config, hoy);
    const ans = clasificarAnsZurich(caso, config, hoy);

    if (!porEstadoMap.has(estado)) {
      porEstadoMap.set(estado, { estado, cantidad: 0, reserva: 0, alertas: 0, criticos: 0 });
    }
    const bucketEstado = porEstadoMap.get(estado);
    bucketEstado.cantidad += 1;
    if (abierto && reserva > 0) bucketEstado.reserva += reserva;
    if (alerta) {
      bucketEstado.alertas += 1;
      if (alerta.nivel === 'critico') bucketEstado.criticos += 1;
    }

    if (abierto) {
      carteraAbierta += 1;
      if (reserva > 0) {
        reservaAbierta += reserva;
        abiertosConReserva += 1;
        casosConReserva += 1;
        pareto.push({
          id: caso._id,
          zc: caso.zc || '',
          siniestro: caso.siniestro || '',
          asegurado: caso.asegurado || '',
          ciudad: homologarCiudadZurich(caso.ciudad) || caso.ciudad || '',
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
          ciudad: homologarCiudadZurich(caso.ciudad) || caso.ciudad || '',
          estado,
          reserva,
          dias: diasEstado,
          alerta: alerta?.nivel || null,
        });
      }
    }
    if (estado === ESTADO_ZURICH_DEFAULT) nuevosEstado += 1;
    if (estado === ESTADO_ZURICH_FINALIZADO) finalizados += 1;

    const asegurado = montoCargadoZurich(caso.valorAseguradoInmueble);
    if (asegurado != null && asegurado > 0) {
      valorAsegurado += asegurado;
      casosConAsegurado += 1;
    }
    const reclamado = montoCargadoZurich(caso.valorReclamado);
    if (reclamado != null && reclamado > 0) {
      valorReclamado += reclamado;
      casosConReclamado += 1;
    }
    const liquidado = montoCargadoZurich(caso.valorLiquidado);
    if (liquidado != null && liquidado > 0) {
      valorLiquidado += liquidado;
      casosConLiquidado += 1;
    }
    if (reclamado != null && liquidado != null && montoCargadoZurich(caso.reserva) != null) {
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
        ciudad: homologarCiudadZurich(caso.ciudad) || caso.ciudad || '',
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

    const doc = clasificarDocumentoFaltanteZurich(caso.documentoFaltante, config);
    if (doc) {
      if (!docsMap.has(doc.id)) docsMap.set(doc.id, { id: doc.id, label: doc.label, cantidad: 0, reserva: 0 });
      const fila = docsMap.get(doc.id);
      fila.cantidad += 1;
      fila.reserva += reserva;
    }

    for (const tramo of TRAMOS_ETAPA_ZURICH) {
      const d = diasEntreFechas(caso[tramo.desde], caso[tramo.hasta]);
      if (d != null) tramosDias[tramo.id].push(d);
    }

    const nReserva = montoCargadoZurich(caso.reserva);
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
      if (campoCompletoZurich(caso[campo.campo])) completitudHits[campo.id] += 1;
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
    ...ESTADOS_ZURICH.map((estado) => {
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
      .filter((fila) => !ESTADOS_ZURICH.includes(fila.estado) && fila.cantidad > 0)
      .map((fila) => ({
        ...fila,
        pctAbiertos: pct(fila.cantidad, Math.max(carteraAbierta, 1)),
        alerta: fila.criticos > 0,
      })),
  ];

  const reservaPorEstado = porEstado
    .filter((f) => f.estado !== ESTADO_ZURICH_FINALIZADO && f.reserva > 0)
    .map((f) => ({ nombre: f.estado, valor: f.reserva, cantidad: f.cantidad }))
    .sort((a, b) => b.valor - a.valor);

  const tiemposEtapa = TRAMOS_ETAPA_ZURICH.map((tramo) => ({
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
    porCiudad: agruparConteoYReserva(lista, (c) => homologarCiudadZurich(c.ciudad), {
      vacio: 'Sin ciudad',
    }),
    porTipoPoliza: agruparConteoYReserva(lista, (c) => etiquetaTipoPolizaZurich(c), {
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
