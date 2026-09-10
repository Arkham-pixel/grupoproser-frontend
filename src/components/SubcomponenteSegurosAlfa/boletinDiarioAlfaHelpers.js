/**
 * Helpers del boletín diario Seguros Alfa (corte día a día, America/Bogota).
 * Independiente del boletín semanal.
 */

import {
  homologarEstadoGestionAlfa,
  homologarEstadoSiniestroAlfa,
  homologarTipoPerdidaAlfa,
} from './segurosAlfaHelpers.js';
import {
  isoDateBogota,
  parseFechaCaso,
  sumarDiasUtc,
} from './boletinSemanalAlfaHelpers.js';

const TZ = 'America/Bogota';
const CORTES_KEY = 'segurosAlfa.boletinDiario.cortes';

/** Categorías del tablero «Gestión terremoto» / comparativo (mutuamente excluyentes). */
export const CATEGORIAS_GESTION_TERREMOTO = [
  {
    id: 'enGestion',
    label: 'En gestión (por llamar)',
    labelCorto: 'En gestión',
    descripcion: 'Estado gestión: EN GESTIÓN — pendientes de primer contacto / verificación por llamada',
  },
  {
    id: 'sinRespuesta',
    label: 'Sin respuesta efectiva',
    labelCorto: 'Sin respuesta',
    descripcion: 'Estado gestión: SIN RESPUESTA EFECTIVA — se llamó y no hubo contacto útil',
  },
  {
    id: 'enInspeccion',
    label: 'Contactado / programado',
    labelCorto: 'Contactado',
    descripcion: 'Estado gestión: CONTACTADO/PROGRAMADO — en proceso de inspección',
  },
  {
    id: 'enLiquidacion',
    label: 'Inspeccionado',
    labelCorto: 'Inspeccionado',
    descripcion: 'Estado gestión: INSPECCIONADO — en liquidación / solicitud de documentos',
  },
  {
    id: 'liquidados',
    label: 'Liquidado / acept. cifras',
    labelCorto: 'Liquidado',
    descripcion: 'Gestión LIQUIDADO o siniestro PENDIENTE ACEPTACION CIFRAS — recolecta de documentos',
  },
  {
    id: 'pendientesPagoAlfa',
    label: 'Cerrado / proceso de pago',
    labelCorto: 'Cerrados',
    descripcion: 'Estado siniestro: CERRADO o PROCESO DE PAGO',
  },
  {
    id: 'objetados',
    label: 'Objetados',
    labelCorto: 'Objetados',
    descripcion: 'Estado siniestro: OBJETADO',
  },
  {
    id: 'perdidasTotales',
    label: 'Pérdidas totales',
    labelCorto: 'Pérdidas totales',
    descripcion: 'Tipo de pérdida: TOTAL',
  },
  {
    id: 'desistimientos',
    label: 'Desistimientos',
    labelCorto: 'Desistimientos',
    descripcion: 'Estado siniestro: DESISTIDO',
  },
];

/** Orden de avance para detectar retrocesos (menor = más temprano). */
const ORDEN_ETAPA = {
  enGestion: 0,
  sinRespuesta: 0,
  /** @deprecated Cortes viejos en localStorage */
  verificacion: 0,
  enInspeccion: 1,
  enLiquidacion: 2,
  liquidados: 3,
  pendientesPagoAlfa: 3,
  objetados: 3,
  perdidasTotales: 3,
  desistimientos: 3,
};

/** Clasificación de gestiones discriminadas por comentario / movimiento. */
export const CATEGORIAS_GESTION_DISCRIMINADA = [
  {
    id: 'contactadosSinExito',
    label: 'Contactados sin éxito',
    descripcion: 'Gestión telefónica realizada sin contacto efectivo',
  },
  {
    id: 'pendienteInformacion',
    label: 'Pendiente de información',
    descripcion: 'Casos pendientes de documentos o información del asegurado',
  },
  {
    id: 'enLiquidacion',
    label: 'En liquidación',
    descripcion: 'Casos en trámite de liquidación',
  },
  {
    id: 'solicitanInspeccion',
    label: 'Solicitan inspección',
    descripcion: 'Asegurados que requieren programación de inspección',
  },
  {
    id: 'accesoRestringido',
    label: 'Acceso restringido',
    descripcion: 'Ingreso restringido al inmueble para continuar la revisión',
  },
  {
    id: 'pendienteInforme',
    label: 'Pendiente de informe',
    descripcion: 'Casos pendientes de emisión del informe técnico',
  },
  {
    id: 'desistimientoTramite',
    label: 'Desistimiento en trámite',
    descripcion: 'Caso en proceso de formalización del desistimiento',
  },
  {
    id: 'perdidaTotal',
    label: 'Pérdida total',
    descripcion: 'Caso reportado con pérdida total',
  },
];

function normTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function casoIdAlfa(caso) {
  return String(caso?._id || caso?.id || caso?.consecutivo || caso?.siniestro || '');
}

export function esPerdidaTotalTexto(...textos) {
  const t = normTexto(textos.filter(Boolean).join(' '));
  if (!t) return false;
  return (
    t.includes('perdida total') ||
    t.includes('perdidas totales') ||
    /\bpt\b/.test(t) ||
    t.includes('siniestro total')
  );
}

/**
 * Asigna un caso a una categoría del tablero gestión terremoto.
 * Cada tarjeta refleja un estado oficial (gestión o siniestro) para lectura clara.
 */
export function clasificarCasoGestionTerremoto(caso = {}) {
  const estadoSiniestro = homologarEstadoSiniestroAlfa(caso.estado, caso);
  const estadoGestion = homologarEstadoGestionAlfa(caso.estadoGestion || caso.estado);
  const tipoPerdida = homologarTipoPerdidaAlfa(caso.tipoPerdida);
  const textoLibre = [caso.observacionLlamada, caso.observacionesGestion, caso.cobertura]
    .filter(Boolean)
    .join(' ');

  if (estadoSiniestro === 'DESISTIDO') return 'desistimientos';
  if (estadoSiniestro === 'OBJETADO') return 'objetados';
  if (tipoPerdida === 'TOTAL' || esPerdidaTotalTexto(textoLibre, estadoSiniestro)) {
    return 'perdidasTotales';
  }
  if (estadoSiniestro === 'CERRADO' || estadoSiniestro === 'PROCESO DE PAGO') {
    return 'pendientesPagoAlfa';
  }
  if (
    estadoSiniestro === 'PENDIENTE ACEPTACION CIFRAS' ||
    estadoGestion === 'LIQUIDADO'
  ) {
    return 'liquidados';
  }
  if (estadoGestion === 'INSPECCIONADO') return 'enLiquidacion';
  if (estadoGestion === 'CONTACTADO/PROGRAMADO') return 'enInspeccion';
  if (estadoGestion === 'SIN RESPUESTA EFECTIVA') return 'sinRespuesta';
  return 'enGestion';
}

/** Detalle interno de una tarjeta (p. ej. CERRADO vs PROCESO DE PAGO). */
function desgloseCasoTerremoto(caso = {}, cat) {
  const estadoSiniestro = homologarEstadoSiniestroAlfa(caso.estado, caso);
  const estadoGestion = homologarEstadoGestionAlfa(caso.estadoGestion || caso.estado);
  if (cat === 'enGestion') return 'EN GESTIÓN';
  if (cat === 'sinRespuesta') return 'SIN RESPUESTA EFECTIVA';
  if (cat === 'enInspeccion') return 'CONTACTADO/PROGRAMADO';
  if (cat === 'enLiquidacion') return 'INSPECCIONADO';
  if (cat === 'liquidados') {
    if (estadoSiniestro === 'PENDIENTE ACEPTACION CIFRAS') {
      return 'PENDIENTE ACEPTACION CIFRAS';
    }
    return 'LIQUIDADO';
  }
  if (cat === 'pendientesPagoAlfa') {
    if (estadoSiniestro === 'PROCESO DE PAGO') return 'PROCESO DE PAGO';
    return 'CERRADO';
  }
  if (cat === 'objetados') return 'OBJETADO';
  if (cat === 'perdidasTotales') return 'PÉRDIDA TOTAL';
  if (cat === 'desistimientos') return 'DESISTIDO';
  return estadoGestion || estadoSiniestro || '—';
}

export function contarGestionTerremoto(casos = []) {
  const counts = Object.fromEntries(CATEGORIAS_GESTION_TERREMOTO.map((c) => [c.id, 0]));
  const desgloseCounts = Object.fromEntries(CATEGORIAS_GESTION_TERREMOTO.map((c) => [c.id, {}]));
  const porCaso = {};
  for (const caso of Array.isArray(casos) ? casos : []) {
    const cat = clasificarCasoGestionTerremoto(caso);
    counts[cat] = (counts[cat] || 0) + 1;
    const detalle = desgloseCasoTerremoto(caso, cat);
    const bag = desgloseCounts[cat] || (desgloseCounts[cat] = {});
    bag[detalle] = (bag[detalle] || 0) + 1;
    const id = casoIdAlfa(caso);
    if (id) porCaso[id] = cat;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const filas = CATEGORIAS_GESTION_TERREMOTO.map((meta) => {
    const cantidad = counts[meta.id] || 0;
    const pct = total > 0 ? Math.round((cantidad / total) * 1000) / 10 : 0;
    const desglose = Object.entries(desgloseCounts[meta.id] || {})
      .map(([label, n]) => ({ label, cantidad: n }))
      .sort((a, b) => b.cantidad - a.cantidad);
    return { ...meta, cantidad, pct, desglose };
  });
  return { counts, filas, total, porCaso };
}

/** Casos con gestión efectiva = todo excepto por llamar / sin respuesta. */
export function casosConGestionEfectiva(counts = {}) {
  return Object.entries(counts).reduce((acc, [id, n]) => {
    if (id === 'enGestion' || id === 'sinRespuesta' || id === 'verificacion') return acc;
    return acc + (Number(n) || 0);
  }, 0);
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

/**
 * Clasifica un comentario/estado en categoría de gestión discriminada.
 * Orden: más específico primero.
 */
export function clasificarGestionDiscriminada(caso = {}) {
  const texto = normTexto(
    [caso.observacionLlamada, caso.observacionesGestion].filter(Boolean).join(' ')
  );
  const estadoSiniestro = homologarEstadoSiniestroAlfa(caso.estado, caso);
  const estadoGestion = homologarEstadoGestionAlfa(caso.estadoGestion || caso.estado);
  const tipoPerdida = homologarTipoPerdidaAlfa(caso.tipoPerdida);

  if (tipoPerdida === 'TOTAL' || esPerdidaTotalTexto(texto, estadoSiniestro)) {
    return 'perdidaTotal';
  }
  if (
    texto.includes('acceso restring') ||
    texto.includes('ingreso restring') ||
    texto.includes('no dejan ingres') ||
    texto.includes('no permiten ingres')
  ) {
    return 'accesoRestringido';
  }
  if (texto.includes('desist') || estadoSiniestro === 'DESISTIDO') {
    return 'desistimientoTramite';
  }
  if (
    texto.includes('pendiente de informe') ||
    texto.includes('pendiente informe') ||
    texto.includes('emitir informe') ||
    texto.includes('informe tecnico') ||
    texto.includes('informe técnico')
  ) {
    return 'pendienteInforme';
  }
  if (
    texto.includes('solicita inspeccion') ||
    texto.includes('solicitan inspeccion') ||
    texto.includes('requiere inspeccion') ||
    texto.includes('programar inspeccion') ||
    texto.includes('agendar inspeccion')
  ) {
    return 'solicitanInspeccion';
  }
  if (
    texto.includes('liquidacion') ||
    texto.includes('en liquidacion') ||
    estadoGestion === 'INSPECCIONADO' ||
    estadoGestion === 'LIQUIDADO'
  ) {
    return 'enLiquidacion';
  }
  if (
    texto.includes('documento') ||
    texto.includes('informacion') ||
    texto.includes('pendiente de info') ||
    estadoGestion === 'EN GESTIÓN'
  ) {
    return 'pendienteInformacion';
  }
  if (
    texto.includes('sin respuesta') ||
    texto.includes('no contesta') ||
    texto.includes('sin contacto') ||
    texto.includes('no logr') ||
    estadoGestion === 'SIN RESPUESTA EFECTIVA'
  ) {
    return 'contactadosSinExito';
  }
  if (estadoGestion === 'CONTACTADO/PROGRAMADO') return 'solicitanInspeccion';
  if (texto) return 'contactadosSinExito';
  return null;
}

/**
 * Gestiones del día: fechaLlamada en el día, o sin fechaLlamada → updatedAt en el día,
 * siempre que haya comentario o movimiento clasificable.
 */
export function contarGestionDiscriminada(casos = [], isoDia) {
  const counts = Object.fromEntries(CATEGORIAS_GESTION_DISCRIMINADA.map((c) => [c.id, 0]));
  let incluidos = 0;

  for (const caso of Array.isArray(casos) ? casos : []) {
    const fLlamada = parseFechaCaso(caso.fechaLlamada);
    const fUpd = parseFechaCaso(caso.updatedAt);
    const enDia = fLlamada
      ? fechaEnDiaIso(fLlamada, isoDia)
      : fechaEnDiaIso(fUpd, isoDia);
    if (!enDia) continue;

    const cat = clasificarGestionDiscriminada(caso);
    if (!cat) continue;
    counts[cat] = (counts[cat] || 0) + 1;
    incluidos += 1;
  }

  const cards = CATEGORIAS_GESTION_DISCRIMINADA.map((meta) => ({
    ...meta,
    cantidad: counts[meta.id] || 0,
  }));

  return {
    counts,
    cards,
    total: incluidos,
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
    all[isoDia] = {
      ...snapshot,
      guardadoEn: new Date().toISOString(),
    };
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

export function snapshotDesdeConteo(conteo) {
  return {
    total: conteo.total,
    counts: { ...conteo.counts },
    porCaso: { ...conteo.porCaso },
    fuente: conteo.fuente || 'live',
  };
}

function pct(parte, total) {
  if (!total) return 0;
  return Math.round((parte / total) * 1000) / 10;
}

function fechaIsoOnOrBefore(value, isoCorte) {
  const f = parseFechaCaso(value);
  if (!f) return false;
  return isoDateBogota(f) <= isoCorte;
}

/** Fecha de ingreso del caso a la base (asignación / alta). */
export function fechaIngresoCasoAlfa(caso = {}) {
  return (
    parseFechaCaso(caso.createdAt) ||
    parseFechaCaso(caso.fechaAviso) ||
    parseFechaCaso(caso.fechaSiniestro) ||
    null
  );
}

export function casoExistiaAlCorte(caso, isoCorte) {
  const ingreso = fechaIngresoCasoAlfa(caso);
  if (!ingreso) return true;
  return isoDateBogota(ingreso) <= isoCorte;
}

/**
 * Clasifica el caso como estaba al cierre del día isoCorte.
 * Si no hubo cambios después del corte, usa el estado actual.
 * Si hubo updates posteriores, retrocede con hitos (llamada / inspección / liquidación).
 */
export function clasificarCasoAlCorte(caso = {}, isoCorte) {
  if (!casoExistiaAlCorte(caso, isoCorte)) return null;

  const upd = parseFechaCaso(caso.updatedAt);
  const updIso = upd ? isoDateBogota(upd) : null;
  const pudoCambiarDespues = Boolean(updIso && updIso > isoCorte);

  if (!pudoCambiarDespues) {
    return clasificarCasoGestionTerremoto(caso);
  }

  // El estado actual puede ser de hoy: reconstruir con hitos ≤ corte.
  if (fechaIsoOnOrBefore(caso.fechaLiquidado, isoCorte)) return 'liquidados';
  if (fechaIsoOnOrBefore(caso.fechaEnvioAseguradora, isoCorte)) return 'pendientesPagoAlfa';
  if (
    fechaIsoOnOrBefore(caso.fechaInspeccion, isoCorte) ||
    fechaIsoOnOrBefore(caso.fechaUltimoDocumento, isoCorte)
  ) {
    return 'enLiquidacion';
  }
  if (fechaIsoOnOrBefore(caso.fechaLlamada, isoCorte)) return 'enInspeccion';
  return 'enGestion';
}

/**
 * Reconstruye el corte de un día desde la cartera (sin depender de localStorage).
 */
export function reconstruirCorteDesdeCasos(casos = [], isoCorte) {
  const counts = Object.fromEntries(CATEGORIAS_GESTION_TERREMOTO.map((c) => [c.id, 0]));
  const porCaso = {};

  for (const caso of Array.isArray(casos) ? casos : []) {
    const cat = clasificarCasoAlCorte(caso, isoCorte);
    if (!cat) continue;
    counts[cat] = (counts[cat] || 0) + 1;
    const id = casoIdAlfa(caso);
    if (id) porCaso[id] = cat;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    total,
    counts,
    porCaso,
    fuente: 'reconstruido',
    isoCorte,
  };
}

export function contarNuevasAsignacionesDia(casos = [], isoDia) {
  let n = 0;
  for (const caso of Array.isArray(casos) ? casos : []) {
    const ingreso = fechaIngresoCasoAlfa(caso);
    if (ingreso && isoDateBogota(ingreso) === isoDia) n += 1;
  }
  return n;
}

/** Migra cortes viejos con `verificacion` → `enGestion` (+ `sinRespuesta` si existía). */
function normalizarCountsCorteLegacy(counts = {}) {
  const next = { ...(counts || {}) };
  if (next.verificacion != null) {
    next.enGestion = Number(next.enGestion || 0) + Number(next.verificacion || 0);
    delete next.verificacion;
  }
  return next;
}

/**
 * Compara corte de hoy vs ayer (snapshot guardado o conteo reconstruido).
 */
export function calcularComparativoDiario({
  hoy,
  ayer,
  isoHoy,
  isoAyer,
  nuevasAsignaciones = null,
  fuenteAyer = null,
} = {}) {
  const countsAyer = normalizarCountsCorteLegacy(ayer?.counts);
  const countsHoy = normalizarCountsCorteLegacy(hoy?.counts);
  const totalAyerNorm =
    Number(ayer?.total) || Object.values(countsAyer).reduce((a, b) => a + (Number(b) || 0), 0);
  const totalHoyNorm =
    Number(hoy?.total) || Object.values(countsHoy).reduce((a, b) => a + (Number(b) || 0), 0);

  const filas = CATEGORIAS_GESTION_TERREMOTO.map((meta) => {
    const a = Number(countsAyer?.[meta.id] || 0);
    const h = Number(countsHoy?.[meta.id] || 0);
    return {
      ...meta,
      ayer: a,
      hoy: h,
      variacion: h - a,
      pctAyer: pct(a, totalAyerNorm),
      pctHoy: pct(h, totalHoyNorm),
    };
  });

  const totalAyer = totalAyerNorm;
  const totalHoy = totalHoyNorm;
  const variacionTotal = totalHoy - totalAyer;
  const gestionAyer = casosConGestionEfectiva(countsAyer);
  const gestionHoy = casosConGestionEfectiva(countsHoy);
  const incrementoGestion = gestionHoy - gestionAyer;
  const pctBase =
    totalAyer > 0 ? Math.round((variacionTotal / totalAyer) * 1000) / 10 : null;

  let retrocesos = 0;
  const porCasoAyer = ayer?.porCaso || {};
  const porCasoHoy = hoy?.porCaso || {};
  for (const [id, catAyerRaw] of Object.entries(porCasoAyer)) {
    const catHoyRaw = porCasoHoy[id];
    if (!catHoyRaw) continue;
    const catAyer = catAyerRaw === 'verificacion' ? 'enGestion' : catAyerRaw;
    const catHoy = catHoyRaw === 'verificacion' ? 'enGestion' : catHoyRaw;
    const oA = ORDEN_ETAPA[catAyer] ?? 0;
    const oH = ORDEN_ETAPA[catHoy] ?? 0;
    if (oH < oA) retrocesos += 1;
  }

  const nuevas =
    nuevasAsignaciones != null ? Number(nuevasAsignaciones) : Math.max(0, variacionTotal);

  return {
    filas,
    isoHoy,
    isoAyer,
    totalAyer,
    totalHoy,
    variacionTotal,
    gestionAyer,
    gestionHoy,
    incrementoGestion,
    pctGestionAyer: pct(gestionAyer, totalAyer),
    pctGestionHoy: pct(gestionHoy, totalHoy),
    pctIncrementoBase: pctBase,
    nuevasAsignaciones: Math.max(0, nuevas),
    retrocesos,
    tieneAyer: Boolean(ayer && totalAyer > 0),
    fuenteAyer: fuenteAyer || ayer?.fuente || null,
  };
}

/**
 * Calcula el boletín diario completo.
 * Guarda el corte del día seleccionado para futuros comparativos.
 * Si no hay corte de ayer en el navegador, lo reconstruye desde fechas/hitos de los casos.
 */
export function calcularBoletinDiarioAlfa(casos = [], { fechaCorte = new Date(), persistirCorte = true } = {}) {
  const isoHoy = isoDateBogota(fechaCorte);
  const fechaAyer = diaBogotaDesdeOffset(-1, fechaCorte);
  const isoAyer = isoDateBogota(fechaAyer);

  const gestionHoy = contarGestionTerremoto(casos);
  const snapshotHoy = snapshotDesdeConteo({ ...gestionHoy, fuente: 'live' });

  if (persistirCorte) {
    saveCorteDiario(isoHoy, snapshotHoy);
  }

  const corteAyerGuardado = getCorteDiario(isoAyer);
  let corteAyer = corteAyerGuardado;
  let fuenteAyer = corteAyerGuardado ? 'guardado' : null;

  if (!corteAyer || !Number(corteAyer.total)) {
    corteAyer = reconstruirCorteDesdeCasos(casos, isoAyer);
    fuenteAyer = 'reconstruido';
    // Persistir reconstrucción para no volver a cero en la misma sesión / mañana
    if (persistirCorte && Number(corteAyer.total) > 0) {
      saveCorteDiario(isoAyer, { ...corteAyer, fuente: 'reconstruido' });
    }
  } else {
    fuenteAyer = corteAyerGuardado.fuente === 'reconstruido' ? 'reconstruido' : 'guardado';
  }

  const nuevasAsignaciones = contarNuevasAsignacionesDia(casos, isoHoy);

  const comparativo = calcularComparativoDiario({
    hoy: snapshotHoy,
    ayer: corteAyer,
    isoHoy,
    isoAyer,
    nuevasAsignaciones,
    fuenteAyer,
  });

  const discriminada = contarGestionDiscriminada(casos, isoHoy);

  return {
    isoHoy,
    isoAyer,
    etiquetaHoy: etiquetaFechaLarga(isoHoy),
    etiquetaAyer: etiquetaFechaLarga(isoAyer),
    etiquetaHoyCorta: etiquetaFechaCorta(isoHoy),
    etiquetaAyerCorta: etiquetaFechaCorta(isoAyer),
    gestionTerremoto: gestionHoy,
    comparativo,
    discriminada,
    corteAyerDisponible: Boolean(corteAyer && Number(corteAyer.total) > 0),
    fuenteAyer,
  };
}
