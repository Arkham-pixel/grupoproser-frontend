import { formatDate, parseDate } from './expressHelpers.js';

export const MESES_EXPRESS = [
  { value: 1, label: 'ENERO' },
  { value: 2, label: 'FEBRERO' },
  { value: 3, label: 'MARZO' },
  { value: 4, label: 'ABRIL' },
  { value: 5, label: 'MAYO' },
  { value: 6, label: 'JUNIO' },
  { value: 7, label: 'JULIO' },
  { value: 8, label: 'AGOSTO' },
  { value: 9, label: 'SEPTIEMBRE' },
  { value: 10, label: 'OCTUBRE' },
  { value: 11, label: 'NOVIEMBRE' },
  { value: 12, label: 'DICIEMBRE' },
];

export const etiquetaMesAnio = (mes, anio) => {
  const m = MESES_EXPRESS.find((item) => item.value === Number(mes));
  return `${m?.label ?? mes} / ${anio}`;
};

const getMonthSafe = (fecha) => fecha.getMonth() + 1;
const getYearSafe = (fecha) => fecha.getFullYear();
const getDaySafe = (fecha) => fecha.getDate();

/** Formato tipo Excel: 4/05/2026 */
export const formatFechaAvisoExcel = (value) => {
  const fecha = parseDate(value);
  if (!fecha) return '';
  const dia = getDaySafe(fecha);
  const mes = String(getMonthSafe(fecha)).padStart(2, '0');
  const anio = getYearSafe(fecha);
  return `${dia}/${mes}/${anio}`;
};

const mismaFechaCalendario = (fecha, mes, anio) =>
  getMonthSafe(fecha) === Number(mes) && getYearSafe(fecha) === Number(anio);

export const filtrarPorMesAnioAviso = (siniestros, mes, anio) =>
  (siniestros ?? []).filter((item) => {
    const fecha = parseDate(item.avisoSiniestro);
    return fecha && mismaFechaCalendario(fecha, mes, anio);
  });

export const filtrarPorAnioAviso = (siniestros, anio) =>
  (siniestros ?? []).filter((item) => {
    const fechaAviso = parseDate(item.avisoSiniestro);
    if (anio === 'TODOS') {
      // En modo total general se cuentan solo casos con aviso informado,
      // igual que el pivote de Excel (COUNTA de aviso ajustador).
      return Boolean(fechaAviso);
    }
    const fecha = fechaAviso || parseDate(item.createdAt);
    return fecha && getYearSafe(fecha) === Number(anio);
  });

/** Clave YYYY-MM-DD en calendario local (misma lógica que el filtro por mes) */
const claveFechaDia = (value) => formatDate(value) || null;

/** Tabla 1: asignación por ajustador — avisos del mes agrupados por fecha */
export function buildAsignacionPorAjustador(casos, obtenerNombreResponsable) {
  const porAjustador = new Map();

  for (const caso of casos) {
    const nombre =
      (obtenerNombreResponsable?.(caso.responsable) || caso.responsable || 'Sin ajustador').toUpperCase();
    const claveDia = claveFechaDia(caso.avisoSiniestro);
    if (!claveDia) continue;

    if (!porAjustador.has(nombre)) {
      porAjustador.set(nombre, new Map());
    }
    const porFecha = porAjustador.get(nombre);
    porFecha.set(claveDia, (porFecha.get(claveDia) || 0) + 1);
  }

  const grupos = [...porAjustador.entries()]
    .map(([ajustador, fechasMap]) => {
      const filas = [...fechasMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([iso, cantidad]) => ({
          fecha: formatFechaAvisoExcel(iso),
          cantidad,
        }));
      const total = filas.reduce((sum, f) => sum + f.cantidad, 0);
      return { ajustador, filas, total };
    })
    .sort((a, b) => a.ajustador.localeCompare(b.ajustador, 'es'));

  const granTotal = grupos.reduce((sum, g) => sum + g.total, 0);
  return { grupos, granTotal };
}

/** Tabla 2: estado de casos asignados en el mes por ajustador */
export function buildEstadoPorAjustadorMes(casos, obtenerNombreResponsable, obtenerNombreEstado) {
  const porAjustador = new Map();

  for (const caso of casos) {
    const ajustador =
      (obtenerNombreResponsable?.(caso.responsable) || caso.responsable || 'Sin ajustador').toUpperCase();
    const estado = (
      obtenerNombreEstado?.(caso.estadoProceso) ||
      caso.estadoProceso ||
      'Sin estado'
    ).toUpperCase();

    if (!porAjustador.has(ajustador)) {
      porAjustador.set(ajustador, new Map());
    }
    const porEstado = porAjustador.get(ajustador);
    porEstado.set(estado, (porEstado.get(estado) || 0) + 1);
  }

  const grupos = [...porAjustador.entries()]
    .map(([ajustador, estadosMap]) => {
      const filas = [...estadosMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b, 'es'))
        .map(([estado, cantidad]) => ({ estado, cantidad }));
      const total = filas.reduce((sum, f) => sum + f.cantidad, 0);
      return { ajustador, filas, total };
    })
    .sort((a, b) => a.ajustador.localeCompare(b.ajustador, 'es'));

  const granTotal = grupos.reduce((sum, g) => sum + g.total, 0);
  return { grupos, granTotal };
}

/** Tabla 3: estado actual del total de casos del año */
export function buildEstadoTotalAnio(casos, obtenerNombreEstado) {
  const porEstado = new Map();

  for (const caso of casos) {
    const estado = (
      obtenerNombreEstado?.(caso.estadoProceso) ||
      caso.estadoProceso ||
      'Sin estado'
    ).toUpperCase();
    porEstado.set(estado, (porEstado.get(estado) || 0) + 1);
  }

  const filas = [...porEstado.entries()]
    .map(([estado, cantidad]) => ({ estado, cantidad }))
    .sort((a, b) => a.cantidad - b.cantidad);

  const granTotal = filas.reduce((sum, f) => sum + f.cantidad, 0);
  return { filas, granTotal };
}

/** Conteo por ajustador de casos con una fecha de hito informada (mes filtrado por esa fecha) */
export function buildConteoHitoPorAjustador(casos, campoFecha, obtenerNombreResponsable) {
  const porAjustador = new Map();

  for (const caso of casos) {
    const claveDia = formatDate(caso[campoFecha]);
    if (!claveDia) continue;
    const ajustador =
      (obtenerNombreResponsable?.(caso.responsable) || caso.responsable || 'Sin ajustador').toUpperCase();
    if (!porAjustador.has(ajustador)) {
      porAjustador.set(ajustador, new Map());
    }
    const porFecha = porAjustador.get(ajustador);
    porFecha.set(claveDia, (porFecha.get(claveDia) || 0) + 1);
  }

  const grupos = [...porAjustador.entries()]
    .map(([ajustador, fechasMap]) => {
      const filas = [...fechasMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([iso, cantidad]) => ({
          fecha: formatFechaAvisoExcel(iso),
          cantidad,
        }));
      return {
        ajustador,
        filas,
        total: filas.reduce((sum, f) => sum + f.cantidad, 0),
      };
    })
    .sort((a, b) => a.ajustador.localeCompare(b.ajustador, 'es'));

  const granTotal = grupos.reduce((sum, g) => sum + g.total, 0);
  return { grupos, granTotal };
}

export function estadosToChartData(filasEstado) {
  return (filasEstado ?? []).map((f) => ({
    estado: f.estado,
    cantidad: f.cantidad,
  }));
}

export function estadosMesToChartData(grupos) {
  const mapa = new Map();
  for (const grupo of grupos ?? []) {
    for (const fila of grupo.filas) {
      mapa.set(fila.estado, (mapa.get(fila.estado) || 0) + fila.cantidad);
    }
  }
  return [...mapa.entries()].map(([estado, cantidad]) => ({ estado, cantidad }));
}

export const esEstadoComplex = (estado) =>
  String(estado || '')
    .toUpperCase()
    .includes('COMPLEX');
