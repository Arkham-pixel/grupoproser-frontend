/**
 * Boletín diario Seguros Alfa unificado (5 secciones).
 * Mapea `estado` + `tipoPerdida` a las etiquetas pedidas por la compañía.
 */

import {
  homologarEstadoAlfa,
  homologarTipoPerdidaAlfa,
} from './segurosAlfaHelpers.js';
import {
  isoDateBogota,
  parseFechaCaso,
  sumarDiasUtc,
} from './boletinSemanalAlfaHelpers.js';

const TZ = 'America/Bogota';
const CORTES_KEY = 'segurosAlfa.boletinDiario.cortes.v2';

/** 1. Resumen general de cartera */
export const FILAS_RESUMEN_CARTERA = [
  { id: 'total', label: 'Total casos asignados' },
  { id: 'sinContactar', label: 'Sin contactar' },
  { id: 'enGestion', label: 'En gestión' },
  { id: 'contactadoProgramado', label: 'Contactado - Programado' },
  { id: 'inspeccionado', label: 'Inspeccionado' },
  { id: 'liquidado', label: 'Liquidado' },
  { id: 'pendienteAceptacion', label: 'Pendiente aceptación de cifras' },
  { id: 'procesoPago', label: 'En proceso de pago' },
  { id: 'cerrados', label: 'Cerrados totalmente' },
  { id: 'objetados', label: 'Objetados' },
  { id: 'desistidos', label: 'Desistidos' },
];

/** 2. Estado de gestión actual */
export const FILAS_ESTADO_GESTION = [
  { id: 'enGestion', label: 'En gestión' },
  { id: 'contactadoProgramado', label: 'Contactado - Programado' },
  { id: 'inspeccionado', label: 'Inspeccionado' },
  { id: 'liquidado', label: 'Liquidado' },
  { id: 'sinRespuesta', label: 'Sin respuesta efectiva' },
];

/** 3. Estado del siniestro */
export const FILAS_ESTADO_SINIESTRO = [
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'pendienteAceptacion', label: 'Pendientes aceptación cifras' },
  { id: 'procesoPago', label: 'Proceso de pago' },
  { id: 'cerrados', label: 'Cerrados' },
  { id: 'objetados', label: 'Objetados' },
  { id: 'desistidos', label: 'Desistidos' },
];

/** 4. Cierres del día */
export const FILAS_CIERRES_DIA = [
  { id: 'cerrados', label: 'Casos cerrados totalmente' },
  { id: 'enviadosPago', label: 'Casos enviados a pago' },
  { id: 'objetados', label: 'Casos objetados' },
  { id: 'desistidos', label: 'Casos desistidos' },
  { id: 'perdidasTotales', label: 'Pérdidas totales identificadas' },
];

/** 5. Clasificación de pérdidas */
export const FILAS_CLASIFICACION_PERDIDAS = [
  { id: 'parcial', label: 'Pérdida parcial' },
  { id: 'total', label: 'Pérdida total' },
  { id: 'sinClasificar', label: 'Sin clasificar' },
];

export function casoIdAlfa(caso) {
  return String(caso?._id || caso?.id || caso?.consecutivo || caso?.siniestro || '');
}

export function diaBogotaDesdeOffset(offsetDias = 0, ref = new Date()) {
  const isoHoy = isoDateBogota(ref);
  const [y, m, d] = isoHoy.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return sumarDiasUtc(base, offsetDias);
}

export function etiquetaFechaLarga(isoOrDate) {
  const iso = typeof isoOrDate === 'string' ? isoOrDate : isoDateBogota(isoOrDate);
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dt);
}

export function etiquetaFechaCorta(isoOrDate) {
  const iso = typeof isoOrDate === 'string' ? isoOrDate : isoDateBogota(isoOrDate);
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

function fechaEnDiaIso(fecha, isoDia) {
  if (!fecha || !isoDia) return false;
  return isoDateBogota(fecha) === isoDia;
}

function aceptoCifras(caso = {}) {
  const acep = String(caso?.liquidador?.aceptacionIndemnizacion || '')
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (acep === 'ACEPTO') return true;
  if (caso.fechaAceptacionLiquidacion) return true;
  return false;
}

function tipoPerdidaCaso(caso = {}) {
  const tip = homologarTipoPerdidaAlfa(caso.tipoPerdida);
  if (tip) return tip;
  return '';
}

/**
 * Bucket exclusivo del resumen / siniestro a partir del estado Arnald.
 */
export function clasificarBucketCartera(caso = {}) {
  const estado = homologarEstadoAlfa(caso.estado, caso);

  if (estado === 'DESISTIDO') return 'desistidos';
  if (estado === 'OBJETADO') return 'objetados';
  if (estado === 'CERRADO') return 'cerrados';
  if (estado === 'ENVIADO ASEGURADORA') return 'procesoPago';
  if (estado === 'LIQUIDADO') {
    return aceptoCifras(caso) ? 'liquidado' : 'pendienteAceptacion';
  }
  if (estado === 'Inspeccionado') return 'inspeccionado';
  if (estado === 'Contactado y programado') return 'contactadoProgramado';
  if (estado === 'Sin respuesta') return 'sinRespuesta';
  if (estado === 'Solicitud de documentos') return 'enGestion';
  return 'sinContactar';
}

/** Buckets de la tabla «Estado de gestión». */
export function clasificarBucketGestion(caso = {}) {
  const b = clasificarBucketCartera(caso);
  if (b === 'sinRespuesta') return 'sinRespuesta';
  if (b === 'contactadoProgramado') return 'contactadoProgramado';
  if (b === 'inspeccionado') return 'inspeccionado';
  if (b === 'liquidado' || b === 'pendienteAceptacion') return 'liquidado';
  if (b === 'enGestion' || b === 'sinContactar') return 'enGestion';
  // Cierres / pago / objeción no cuentan en gestión operativa
  return null;
}

/** Buckets de la tabla «Estado del siniestro». */
export function clasificarBucketSiniestro(caso = {}) {
  const b = clasificarBucketCartera(caso);
  if (b === 'desistidos') return 'desistidos';
  if (b === 'objetados') return 'objetados';
  if (b === 'cerrados') return 'cerrados';
  if (b === 'procesoPago') return 'procesoPago';
  if (b === 'pendienteAceptacion') return 'pendienteAceptacion';
  // Liquidado con aceptación / en gestión operativa → aún pendientes de cierre siniestro
  return 'pendientes';
}

function emptyCounts(filas) {
  return Object.fromEntries(filas.map((f) => [f.id, 0]));
}

function filasConCantidad(defs, counts) {
  return defs.map((meta) => ({
    ...meta,
    cantidad: Number(counts[meta.id] || 0),
  }));
}

export function contarResumenCartera(casos = []) {
  const counts = emptyCounts(FILAS_RESUMEN_CARTERA);
  const porCaso = {};
  let total = 0;
  for (const caso of Array.isArray(casos) ? casos : []) {
    total += 1;
    const bucket = clasificarBucketCartera(caso);
    if (counts[bucket] != null) counts[bucket] += 1;
    const id = casoIdAlfa(caso);
    if (id) porCaso[id] = bucket;
  }
  counts.total = total;
  return {
    counts,
    filas: filasConCantidad(FILAS_RESUMEN_CARTERA, counts),
    total,
    porCaso,
  };
}

export function contarEstadoGestion(casos = []) {
  const counts = emptyCounts(FILAS_ESTADO_GESTION);
  const porCaso = {};
  for (const caso of Array.isArray(casos) ? casos : []) {
    const bucket = clasificarBucketGestion(caso);
    if (!bucket) continue;
    counts[bucket] = (counts[bucket] || 0) + 1;
    const id = casoIdAlfa(caso);
    if (id) porCaso[id] = bucket;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, filas: filasConCantidad(FILAS_ESTADO_GESTION, counts), total, porCaso };
}

export function contarEstadoSiniestro(casos = []) {
  const counts = emptyCounts(FILAS_ESTADO_SINIESTRO);
  const porCaso = {};
  for (const caso of Array.isArray(casos) ? casos : []) {
    const bucket = clasificarBucketSiniestro(caso);
    counts[bucket] = (counts[bucket] || 0) + 1;
    const id = casoIdAlfa(caso);
    if (id) porCaso[id] = bucket;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, filas: filasConCantidad(FILAS_ESTADO_SINIESTRO, counts), total, porCaso };
}

export function contarClasificacionPerdidas(casos = []) {
  const counts = emptyCounts(FILAS_CLASIFICACION_PERDIDAS);
  for (const caso of Array.isArray(casos) ? casos : []) {
    const tip = tipoPerdidaCaso(caso);
    if (tip === 'PARCIAL') counts.parcial += 1;
    else if (tip === 'TOTAL') counts.total += 1;
    else counts.sinClasificar += 1;
  }
  return {
    counts,
    filas: filasConCantidad(FILAS_CLASIFICACION_PERDIDAS, counts),
    total: Object.values(counts).reduce((a, b) => a + b, 0),
  };
}

/**
 * Cierres / movimientos del día ISO (Bogotá).
 */
export function contarCierresDelDia(casos = [], isoDia) {
  const counts = emptyCounts(FILAS_CIERRES_DIA);
  for (const caso of Array.isArray(casos) ? casos : []) {
    const estado = homologarEstadoAlfa(caso.estado, caso);
    const tip = tipoPerdidaCaso(caso);

    if (estado === 'CERRADO' && fechaEnDiaIso(parseFechaCaso(caso.fechaEnvioAseguradora) || parseFechaCaso(caso.updatedAt), isoDia)) {
      counts.cerrados += 1;
    }
    if (fechaEnDiaIso(parseFechaCaso(caso.fechaEnvioAseguradora), isoDia)) {
      counts.enviadosPago += 1;
    }
    if (estado === 'OBJETADO' && fechaEnDiaIso(parseFechaCaso(caso.updatedAt), isoDia)) {
      counts.objetados += 1;
    }
    if (estado === 'DESISTIDO' && fechaEnDiaIso(parseFechaCaso(caso.updatedAt), isoDia)) {
      counts.desistidos += 1;
    }
    if (
      tip === 'TOTAL' &&
      (fechaEnDiaIso(parseFechaCaso(caso.updatedAt), isoDia) ||
        fechaEnDiaIso(parseFechaCaso(caso.fechaLiquidado), isoDia))
    ) {
      counts.perdidasTotales += 1;
    }
  }
  return {
    counts,
    filas: filasConCantidad(FILAS_CIERRES_DIA, counts),
    total: Object.values(counts).reduce((a, b) => a + b, 0),
  };
}

export function loadCortesDiarios() {
  try {
    const raw = JSON.parse(localStorage.getItem(CORTES_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

export function saveCorteDiario(isoDia, snapshot) {
  try {
    const all = loadCortesDiarios();
    all[isoDia] = { ...snapshot, guardadoEn: new Date().toISOString() };
    localStorage.setItem(CORTES_KEY, JSON.stringify(all));
    return all[isoDia];
  } catch {
    return snapshot;
  }
}

export function getCorteDiario(isoDia) {
  const all = loadCortesDiarios();
  return all[isoDia] || null;
}

function snapshotUnificado(casos) {
  const resumen = contarResumenCartera(casos);
  const gestion = contarEstadoGestion(casos);
  const siniestro = contarEstadoSiniestro(casos);
  const perdidas = contarClasificacionPerdidas(casos);
  return {
    fuente: 'live',
    total: resumen.total,
    resumen: resumen.counts,
    gestion: gestion.counts,
    siniestro: siniestro.counts,
    perdidas: perdidas.counts,
    porCasoGestion: gestion.porCaso,
    porCasoSiniestro: siniestro.porCaso,
  };
}

function fechaIngresoCasoAlfa(caso = {}) {
  return (
    parseFechaCaso(caso.createdAt) ||
    parseFechaCaso(caso.fechaAviso) ||
    parseFechaCaso(caso.fechaSiniestro) ||
    null
  );
}

function casoExistiaAlCorte(caso, isoCorte) {
  const ingreso = fechaIngresoCasoAlfa(caso);
  if (!ingreso) return true;
  return isoDateBogota(ingreso) <= isoCorte;
}

function fechaIsoOnOrBefore(value, isoCorte) {
  const f = parseFechaCaso(value);
  if (!f) return false;
  return isoDateBogota(f) <= isoCorte;
}

/**
 * Reconstruye buckets al cierre de un día (aprox. por hitos).
 */
export function reconstruirCorteDesdeCasos(casos = [], isoCorte) {
  const gestion = emptyCounts(FILAS_ESTADO_GESTION);
  const siniestro = emptyCounts(FILAS_ESTADO_SINIESTRO);
  const resumen = emptyCounts(FILAS_RESUMEN_CARTERA);
  const porCasoGestion = {};
  const porCasoSiniestro = {};
  let total = 0;

  for (const caso of Array.isArray(casos) ? casos : []) {
    if (!casoExistiaAlCorte(caso, isoCorte)) continue;
    total += 1;

    // Retroceder estado con hitos ≤ corte si updatedAt es posterior
    const upd = parseFechaCaso(caso.updatedAt);
    const updIso = upd ? isoDateBogota(upd) : null;
    const pudoCambiarDespues = Boolean(updIso && updIso > isoCorte);

    let casoProxy = caso;
    if (pudoCambiarDespues) {
      let estadoProxy = 'Sin contactar';
      if (fechaIsoOnOrBefore(caso.fechaEnvioAseguradora, isoCorte)) {
        estadoProxy = 'ENVIADO ASEGURADORA';
      } else if (fechaIsoOnOrBefore(caso.fechaLiquidado, isoCorte)) {
        estadoProxy = 'LIQUIDADO';
      } else if (
        fechaIsoOnOrBefore(caso.fechaInspeccion, isoCorte) ||
        fechaIsoOnOrBefore(caso.fechaUltimoDocumento, isoCorte)
      ) {
        estadoProxy = 'Inspeccionado';
      } else if (fechaIsoOnOrBefore(caso.fechaLlamada, isoCorte)) {
        estadoProxy = 'Contactado y programado';
      }
      casoProxy = { ...caso, estado: estadoProxy };
    }

    const bCartera = clasificarBucketCartera(casoProxy);
    if (resumen[bCartera] != null) resumen[bCartera] += 1;

    const bGes = clasificarBucketGestion(casoProxy);
    if (bGes) {
      gestion[bGes] = (gestion[bGes] || 0) + 1;
      const id = casoIdAlfa(caso);
      if (id) porCasoGestion[id] = bGes;
    }

    const bSin = clasificarBucketSiniestro(casoProxy);
    siniestro[bSin] = (siniestro[bSin] || 0) + 1;
    const id = casoIdAlfa(caso);
    if (id) porCasoSiniestro[id] = bSin;
  }

  resumen.total = total;
  return {
    fuente: 'reconstruido',
    total,
    resumen,
    gestion,
    siniestro,
    perdidas: emptyCounts(FILAS_CLASIFICACION_PERDIDAS),
    porCasoGestion,
    porCasoSiniestro,
    isoCorte,
  };
}

function compararFilas(defs, countsAyer, countsHoy) {
  return defs.map((meta) => {
    const ayer = Number(countsAyer?.[meta.id] || 0);
    const hoy = Number(countsHoy?.[meta.id] || 0);
    return {
      ...meta,
      ayer,
      hoy,
      avance: hoy - ayer,
    };
  });
}

/**
 * Calcula el boletín diario unificado (5 secciones).
 */
export function calcularBoletinDiarioAlfa(
  casos = [],
  { fechaCorte = new Date(), persistirCorte = true } = {}
) {
  const isoHoy = isoDateBogota(fechaCorte);
  const fechaAyer = diaBogotaDesdeOffset(-1, fechaCorte);
  const isoAyer = isoDateBogota(fechaAyer);

  const snapshotHoy = snapshotUnificado(casos);
  if (persistirCorte) {
    saveCorteDiario(isoHoy, snapshotHoy);
  }

  let corteAyer = getCorteDiario(isoAyer);
  let fuenteAyer = corteAyer ? corteAyer.fuente || 'guardado' : null;
  if (!corteAyer || !Number(corteAyer.total)) {
    corteAyer = reconstruirCorteDesdeCasos(casos, isoAyer);
    fuenteAyer = 'reconstruido';
    if (persistirCorte && Number(corteAyer.total) > 0) {
      saveCorteDiario(isoAyer, { ...corteAyer, fuente: 'reconstruido' });
    }
  }

  const resumenHoy = contarResumenCartera(casos);
  const gestionHoy = contarEstadoGestion(casos);
  const siniestroHoy = contarEstadoSiniestro(casos);
  const perdidas = contarClasificacionPerdidas(casos);
  const cierresDia = contarCierresDelDia(casos, isoHoy);

  const gestion = {
    filas: compararFilas(FILAS_ESTADO_GESTION, corteAyer?.gestion, snapshotHoy.gestion),
    totalAyer: Object.values(corteAyer?.gestion || {}).reduce((a, b) => a + (Number(b) || 0), 0),
    totalHoy: gestionHoy.total,
  };

  const siniestro = {
    filas: compararFilas(FILAS_ESTADO_SINIESTRO, corteAyer?.siniestro, snapshotHoy.siniestro),
    totalAyer: Object.values(corteAyer?.siniestro || {}).reduce((a, b) => a + (Number(b) || 0), 0),
    totalHoy: siniestroHoy.total,
  };

  return {
    isoHoy,
    isoAyer,
    etiquetaHoy: etiquetaFechaLarga(isoHoy),
    etiquetaAyer: etiquetaFechaLarga(isoAyer),
    etiquetaHoyCorta: etiquetaFechaCorta(isoHoy),
    etiquetaAyerCorta: etiquetaFechaCorta(isoAyer),
    resumen: resumenHoy,
    gestion,
    siniestro,
    cierresDia,
    perdidas,
    corteAyerDisponible: Boolean(corteAyer && Number(corteAyer.total) > 0),
    fuenteAyer,
    // Compat mínima por si algo legacy lee estas claves
    gestionTerremoto: resumenHoy,
    comparativo: { filas: gestion.filas, tieneAyer: Boolean(corteAyer?.total), fuenteAyer },
    discriminada: { cards: [], total: 0 },
  };
}

/* —— Compat export aliases (imports antiguos) —— */
export const CATEGORIAS_GESTION_TERREMOTO = FILAS_RESUMEN_CARTERA.map((f) => ({
  ...f,
  labelCorto: f.label,
  descripcion: f.label,
}));
export const CATEGORIAS_GESTION_DISCRIMINADA = [];
export function esPerdidaTotalTexto() {
  return false;
}
export function clasificarCasoGestionTerremoto(caso) {
  return clasificarBucketCartera(caso);
}
export function contarGestionTerremoto(casos) {
  return contarResumenCartera(casos);
}
