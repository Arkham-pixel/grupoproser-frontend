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
/**
 * v6: corte de referencia = último corte operativo guardado (no calendario D-1).
 * Evita inventar ejes AI/AJ con el estado actual (ayer ≈ hoy).
 */
const CORTES_KEY = 'segurosAlfa.boletinDiario.cortes.v6';

/**
 * Tablero «Gestión terremoto» / comparativo (8 tarjetas, mutuamente excluyentes).
 * Misma composición visual de siempre; textos alineados al catálogo actual.
 */
export const CATEGORIAS_GESTION_TERREMOTO = [
  {
    id: 'enGestion',
    label: 'PTE CONTACTO / SIN RESPUESTA',
    labelCorto: 'Pte contacto',
    descripcion:
      'PTE CONTACTO, SOLICITUD DTOS y SIN RESPUESTA EFECTIVA — verificación de pérdidas mediante llamadas',
  },
  {
    id: 'enInspeccion',
    label: 'CONTACTADO Y PROGRAMADO',
    labelCorto: 'Contactado',
    descripcion: 'CONTACTADO Y PROGRAMADO — en proceso de inspección',
  },
  {
    id: 'enLiquidacion',
    label: 'INSPECCIONADO',
    labelCorto: 'Inspeccionado',
    descripcion: 'INSPECCIONADO — en proceso de liquidación / documentos',
  },
  {
    id: 'liquidados',
    label: 'LIQUIDADO / ACEPT. CIFRAS',
    labelCorto: 'Liquidado',
    descripcion: 'LIQUIDADO o PENDIENTE ACEPTACION CIFRAS — recolecta de documentos',
  },
  {
    id: 'pendientesPagoAlfa',
    label: 'CERRADO / PROCESO DE PAGO',
    labelCorto: 'Cerrados',
    descripcion: 'CERRADO o PROCESO DE PAGO',
  },
  {
    id: 'objetados',
    label: 'OBJETADO',
    labelCorto: 'Objetados',
    descripcion: 'OBJETADO',
  },
  {
    id: 'perdidasTotales',
    label: 'PÉRDIDA TOTAL',
    labelCorto: 'Pérdida total',
    descripcion: 'Pérdidas totales confirmadas (tipo de pérdida TOTAL)',
  },
  {
    id: 'desistimientos',
    label: 'DESISTIDO',
    labelCorto: 'Desistimientos',
    descripcion: 'DESISTIDO',
  },
];

/** 2. Estado de gestión actual (conteo exacto Excel AI). */
export const FILAS_ESTADO_GESTION_ACTUAL = [
  { id: 'enGestion', label: 'En gestión' },
  { id: 'contactadoProgramado', label: 'Contactado - Programado' },
  { id: 'inspeccionado', label: 'Inspeccionado' },
  { id: 'liquidado', label: 'Liquidado' },
  { id: 'sinRespuesta', label: 'Sin respuesta efectiva' },
  { id: 'cerrado', label: 'Cerrado' },
];

/** 3. Estado del siniestro (conteo exacto Excel AJ). */
export const FILAS_ESTADO_SINIESTRO_ACTUAL = [
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'pendienteAceptacion', label: 'Pendientes aceptación cifras' },
  { id: 'procesoPago', label: 'Proceso de pago' },
  { id: 'cerrados', label: 'Cerrados' },
  { id: 'objetados', label: 'Objetados' },
  { id: 'desistidos', label: 'Desistidos' },
];

/** 4. Cierres del día (movimientos del día de corte). */
export const FILAS_CIERRES_DEL_DIA = [
  { id: 'cerradosTotales', label: 'Casos cerrados totalmente' },
  { id: 'enviadosPago', label: 'Casos enviados a pago' },
  { id: 'objetados', label: 'Casos objetados' },
  { id: 'desistidos', label: 'Casos desistidos' },
  { id: 'perdidasTotales', label: 'Pérdidas totales identificadas' },
];

/** 5. Clasificación de pérdidas (stock actual). */
export const FILAS_CLASIFICACION_PERDIDAS = [
  { id: 'parcial', label: 'Pérdida parcial' },
  { id: 'total', label: 'Pérdida total' },
  { id: 'inhabitable', label: 'Inhabitable' },
];

/** Orden de avance para detectar retrocesos (menor = más temprano). */
const ORDEN_ETAPA = {
  enGestion: 0,
  sinRespuesta: 0,
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
 * Clasificación mutuamente excluyente de las 8 gráficas (lineamiento visual original),
 * usando el catálogo dual actual.
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
  if (tipoPerdida === 'TOTAL' || esPerdidaTotalTexto(textoLibre)) return 'perdidasTotales';
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
  if (estadoGestion === 'CONTACTADO Y PROGRAMADO') return 'enInspeccion';
  // PTE CONTACTO / SOLICITUD DTOS / SIN RESPUESTA EFECTIVA → misma tarjeta
  return 'enGestion';
}

function desgloseCasoTerremoto(caso = {}, cat) {
  const estadoSiniestro = homologarEstadoSiniestroAlfa(caso.estado, caso);
  const estadoGestion = homologarEstadoGestionAlfa(caso.estadoGestion || caso.estado);
  if (cat === 'enGestion') {
    if (estadoGestion === 'SIN RESPUESTA EFECTIVA') return 'SIN RESPUESTA EFECTIVA';
    if (estadoGestion === 'SOLICITUD DTOS') return 'SOLICITUD DTOS';
    return 'PTE CONTACTO';
  }
  if (cat === 'enInspeccion') return 'CONTACTADO Y PROGRAMADO';
  if (cat === 'enLiquidacion') return 'INSPECCIONADO';
  if (cat === 'liquidados') {
    if (estadoSiniestro === 'PENDIENTE ACEPTACION CIFRAS') {
      return 'PENDIENTE ACEPTACION CIFRAS';
    }
    return 'LIQUIDADO';
  }
  if (cat === 'pendientesPagoAlfa') {
    return estadoSiniestro === 'PROCESO DE PAGO' ? 'PROCESO DE PAGO' : 'CERRADO';
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

/** Bucket exacto ESTADO GESTION (AI). */
export function clasificarBucketGestionExacto(caso = {}) {
  const g = homologarEstadoGestionAlfa(caso.estadoGestion || caso.estado);
  if (g === 'CONTACTADO Y PROGRAMADO') return 'contactadoProgramado';
  if (g === 'INSPECCIONADO') return 'inspeccionado';
  if (g === 'LIQUIDADO') return 'liquidado';
  if (g === 'SIN RESPUESTA EFECTIVA') return 'sinRespuesta';
  if (g === 'SIN PÓLIZA') return 'cerrado';
  if (g === 'SOLICITUD DTOS') return 'solicitudDtos';
  return 'enGestion';
}

/** Bucket exacto ESTADO SINIESTRO (AJ). */
export function clasificarBucketSiniestroExacto(caso = {}) {
  const s = homologarEstadoSiniestroAlfa(caso.estado, caso);
  if (s === 'DESISTIDO') return 'desistidos';
  if (s === 'OBJETADO') return 'objetados';
  if (s === 'CERRADO') return 'cerrados';
  if (s === 'PROCESO DE PAGO') return 'procesoPago';
  if (s === 'PENDIENTE ACEPTACION CIFRAS') return 'pendienteAceptacion';
  return 'pendientes';
}

export function contarEstadoGestionExacto(casos = []) {
  const counts = Object.fromEntries(FILAS_ESTADO_GESTION_ACTUAL.map((c) => [c.id, 0]));
  for (const caso of Array.isArray(casos) ? casos : []) {
    const cat = clasificarBucketGestionExacto(caso);
    counts[cat] = (counts[cat] || 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, total };
}

export function contarEstadoSiniestroExacto(casos = []) {
  const counts = Object.fromEntries(FILAS_ESTADO_SINIESTRO_ACTUAL.map((c) => [c.id, 0]));
  for (const caso of Array.isArray(casos) ? casos : []) {
    const cat = clasificarBucketSiniestroExacto(caso);
    counts[cat] = (counts[cat] || 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, total };
}

function compararFilasExactas(defs, countsAyer, countsHoy) {
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

/** ¿Hubo movimiento/cierre relevante del caso en el día isoDia? */
export function casoConMovimientoEnDia(caso = {}, isoDia) {
  if (!isoDia) return false;
  const marcas = [
    caso.fechaEnvioAseguradora,
    caso.fechaLiquidado,
    caso.fechaCierre,
    caso.fechaDesistimiento,
    caso.updatedAt,
  ];
  return marcas.some((f) => {
    const parsed = parseFechaCaso(f);
    return parsed ? fechaEnDiaIso(parsed, isoDia) : false;
  });
}

/**
 * 4. Cierres del día: resultados alcanzados durante el día de corte.
 * Exclusivo por estado de siniestro; pérdidas totales se suma aparte si aplica.
 */
export function contarCierresDelDia(casos = [], isoDia) {
  const counts = Object.fromEntries(FILAS_CIERRES_DEL_DIA.map((c) => [c.id, 0]));

  for (const caso of Array.isArray(casos) ? casos : []) {
    if (!casoConMovimientoEnDia(caso, isoDia)) continue;

    const s = homologarEstadoSiniestroAlfa(caso.estado, caso);
    const tipoPerdida = homologarTipoPerdidaAlfa(caso.tipoPerdida);
    const esPerdidaTotal =
      tipoPerdida === 'TOTAL' || esPerdidaTotalTexto(caso.observacionesGestion, caso.observacionLlamada, s);

    if (s === 'DESISTIDO') counts.desistidos += 1;
    else if (s === 'OBJETADO') counts.objetados += 1;
    else if (s === 'CERRADO') counts.cerradosTotales += 1;
    else if (s === 'PROCESO DE PAGO') counts.enviadosPago += 1;

    if (esPerdidaTotal) counts.perdidasTotales += 1;
  }

  const filas = FILAS_CIERRES_DEL_DIA.map((meta) => ({
    ...meta,
    cantidad: Number(counts[meta.id] || 0),
  }));
  const total = filas.reduce((a, f) => a + f.cantidad, 0);
  return { counts, filas, total };
}

/**
 * 5. Clasificación de pérdidas: stock actual PARCIAL / TOTAL / INHABITABLE.
 */
export function contarClasificacionPerdidas(casos = []) {
  const counts = { parcial: 0, total: 0, inhabitable: 0, sinClasificar: 0 };

  for (const caso of Array.isArray(casos) ? casos : []) {
    const tipo = homologarTipoPerdidaAlfa(caso.tipoPerdida);
    if (tipo === 'PARCIAL') counts.parcial += 1;
    else if (tipo === 'TOTAL') counts.total += 1;
    else if (tipo === 'INHABITABLE') counts.inhabitable += 1;
    else if (esPerdidaTotalTexto(caso.observacionesGestion, caso.observacionLlamada, caso.estado)) {
      counts.total += 1;
    } else {
      counts.sinClasificar += 1;
    }
  }

  const filas = FILAS_CLASIFICACION_PERDIDAS.map((meta) => ({
    ...meta,
    cantidad: Number(counts[meta.id] || 0),
  }));
  const total = filas.reduce((a, f) => a + f.cantidad, 0);
  return { counts, filas, total };
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
    estadoGestion === 'PTE CONTACTO' ||
    estadoGestion === 'SOLICITUD DTOS'
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
  if (estadoGestion === 'CONTACTADO Y PROGRAMADO') return 'solicitanInspeccion';
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
    gestionExacta: { ...(conteo.gestionExacta || {}) },
    siniestroExacto: { ...(conteo.siniestroExacto || {}) },
    fuente: conteo.fuente || 'live',
  };
}

function sumaCounts(obj) {
  return Object.values(obj || {}).reduce((a, b) => a + (Number(b) || 0), 0);
}

/** Mapea categoría del tablero 8 → bucket exacto ESTADO GESTION (AI). */
function mapClassicCatToGestionExact(cat) {
  if (cat === 'enInspeccion') return 'contactadoProgramado';
  if (cat === 'enLiquidacion') return 'inspeccionado';
  if (cat === 'liquidados') return 'liquidado';
  if (cat === 'sinRespuesta') return 'sinRespuesta';
  if (
    cat === 'pendientesPagoAlfa' ||
    cat === 'objetados' ||
    cat === 'perdidasTotales' ||
    cat === 'desistimientos'
  ) {
    return 'liquidado';
  }
  return 'enGestion';
}

/** Mapea categoría del tablero 8 → bucket exacto ESTADO SINIESTRO (AJ). */
function mapClassicCatToSiniestroExact(cat) {
  if (cat === 'desistimientos') return 'desistidos';
  if (cat === 'objetados') return 'objetados';
  if (cat === 'pendientesPagoAlfa') return 'procesoPago';
  if (cat === 'liquidados') return 'pendienteAceptacion';
  return 'pendientes';
}

/**
 * Aproxima ejes AI/AJ desde el conteo clásico del comparativo.
 * Así “última actualización” refleja la misma variación día a día que ya funciona
 * en la tabla de clasificación (cuando aún no hay snapshot exacto guardado).
 */
export function aproximarEjesExactosDesdeCounts(counts = {}) {
  const gestionExacta = Object.fromEntries(FILAS_ESTADO_GESTION_ACTUAL.map((c) => [c.id, 0]));
  const siniestroExacto = Object.fromEntries(FILAS_ESTADO_SINIESTRO_ACTUAL.map((c) => [c.id, 0]));
  for (const [cat, n] of Object.entries(counts || {})) {
    const num = Number(n) || 0;
    if (!num) continue;
    const g = mapClassicCatToGestionExact(cat);
    const s = mapClassicCatToSiniestroExact(cat);
    gestionExacta[g] = (gestionExacta[g] || 0) + num;
    siniestroExacto[s] = (siniestroExacto[s] || 0) + num;
  }
  return { gestionExacta, siniestroExacto };
}

/**
 * Cortes previos al día consultado, del más reciente al más antiguo.
 * Sirve para saltar fines de semana / días sin consulta (domingo no se trabaja).
 */
export function listarCortesOperativosAnteriores(isoHoy) {
  const all = loadCortesDiarios();
  return Object.keys(all)
    .filter((iso) => iso < isoHoy && Number(all[iso]?.total) > 0)
    .sort()
    .reverse()
    .map((iso) => ({ iso, corte: all[iso] }));
}

/**
 * Último corte operativo antes de isoHoy.
 * Prefiere un snapshot que ya traiga ejes exactos AI/AJ reales (guardados en vivo).
 */
export function resolverCorteOperativoAnterior(isoHoy) {
  const previos = listarCortesOperativosAnteriores(isoHoy);
  if (!previos.length) return { iso: null, corte: null, fuente: null };

  const conExacto = previos.find(
    (p) =>
      sumaCounts(p.corte?.gestionExacta) > 0 && sumaCounts(p.corte?.siniestroExacto) > 0
  );
  if (conExacto) {
    return {
      iso: conExacto.iso,
      corte: conExacto.corte,
      fuente: conExacto.corte.fuente || 'guardado',
    };
  }

  const top = previos[0];
  return {
    iso: top.iso,
    corte: top.corte,
    fuente: top.corte.fuente || 'guardado',
  };
}

/**
 * Completa ejes exactos del corte de referencia.
 * 1) Si ya trae AI/AJ, los usa.
 * 2) Si no, los aproxima desde counts del comparativo (misma variación día a día).
 */
export function asegurarEjesExactosCorte(corte) {
  if (!corte) return corte;
  if (sumaCounts(corte.gestionExacta) > 0 && sumaCounts(corte.siniestroExacto) > 0) {
    return corte;
  }
  if (sumaCounts(corte.counts) <= 0) return corte;
  const approx = aproximarEjesExactosDesdeCounts(corte.counts);
  return {
    ...corte,
    gestionExacta: approx.gestionExacta,
    siniestroExacto: approx.siniestroExacto,
  };
}

/**
 * @deprecated Preferir asegurarEjesExactosCorte / aproximarEjesExactosDesdeCounts.
 */
export function completarEjesExactosCorte(corte, casos, isoCorte, { persistir = false } = {}) {
  const enriched = asegurarEjesExactosCorte(corte);
  if (persistir && enriched && Number(enriched.total) > 0 && isoCorte) {
    saveCorteDiario(isoCorte, enriched);
  }
  return enriched;
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
 * Por defecto NO inventa ejes AI/AJ con el estado actual (haría ayer ≈ hoy).
 */
export function reconstruirCorteDesdeCasos(casos = [], isoCorte, { incluirEjesExactos = false } = {}) {
  const counts = Object.fromEntries(CATEGORIAS_GESTION_TERREMOTO.map((c) => [c.id, 0]));
  const gestionExacta = Object.fromEntries(FILAS_ESTADO_GESTION_ACTUAL.map((c) => [c.id, 0]));
  const siniestroExacto = Object.fromEntries(FILAS_ESTADO_SINIESTRO_ACTUAL.map((c) => [c.id, 0]));
  const porCaso = {};

  for (const caso of Array.isArray(casos) ? casos : []) {
    const cat = clasificarCasoAlCorte(caso, isoCorte);
    if (!cat) continue;
    counts[cat] = (counts[cat] || 0) + 1;
    const id = casoIdAlfa(caso);
    if (id) porCaso[id] = cat;

    if (incluirEjesExactos) {
      const g = clasificarBucketGestionExacto(caso);
      const s = clasificarBucketSiniestroExacto(caso);
      gestionExacta[g] = (gestionExacta[g] || 0) + 1;
      siniestroExacto[s] = (siniestroExacto[s] || 0) + 1;
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    total,
    counts,
    porCaso,
    gestionExacta: incluirEjesExactos ? gestionExacta : {},
    siniestroExacto: incluirEjesExactos ? siniestroExacto : {},
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
 * Tablas 2/3 usan el mismo esquema del comparativo (Ayer | Variación | Hoy),
 * con estados exactos AI/AJ. Si el corte previo no tiene ejes exactos, se
 * aproximan desde el conteo clásico (misma variación que ya se ve en clasificación).
 */
export function calcularBoletinDiarioAlfa(casos = [], { fechaCorte = new Date(), persistirCorte = true } = {}) {
  const isoHoy = isoDateBogota(fechaCorte);

  const gestionHoy = contarGestionTerremoto(casos);
  const gestionExactaHoy = contarEstadoGestionExacto(casos);
  const siniestroExactoHoy = contarEstadoSiniestroExacto(casos);
  const snapshotHoy = snapshotDesdeConteo({
    ...gestionHoy,
    gestionExacta: gestionExactaHoy.counts,
    siniestroExacto: siniestroExactoHoy.counts,
    fuente: 'live',
  });

  // Misma resolución de “ayer” que el comparativo clásico
  const operativo = resolverCorteOperativoAnterior(isoHoy);
  let isoAyer = operativo.iso;
  let corteAyer = operativo.corte;
  let fuenteAyer = operativo.fuente;

  if (!corteAyer || !Number(corteAyer.total)) {
    isoAyer = isoDateBogota(diaBogotaDesdeOffset(-1, fechaCorte));
    const guardado = getCorteDiario(isoAyer);
    if (guardado && Number(guardado.total) > 0) {
      corteAyer = guardado;
      fuenteAyer = guardado.fuente || 'guardado';
    } else {
      corteAyer = reconstruirCorteDesdeCasos(casos, isoAyer, { incluirEjesExactos: false });
      fuenteAyer = 'reconstruido';
      if (persistirCorte && Number(corteAyer.total) > 0) {
        saveCorteDiario(isoAyer, { ...corteAyer, fuente: 'reconstruido' });
      }
    }
  }

  // Completar AI/AJ del corte previo:
  // - Si fue snapshot live de otro día → usar ejes exactos guardados
  // - Si no → aproximar desde counts clásicos (misma variación del comparativo)
  const exactoLivePrevio =
    isoAyer &&
    isoAyer < isoHoy &&
    corteAyer?.fuente === 'live' &&
    sumaCounts(corteAyer?.gestionExacta) > 0 &&
    sumaCounts(corteAyer?.siniestroExacto) > 0;

  if (!exactoLivePrevio) {
    corteAyer = asegurarEjesExactosCorte({
      ...corteAyer,
      gestionExacta: {},
      siniestroExacto: {},
    });
  }

  const tieneExactoAyer =
    sumaCounts(corteAyer?.gestionExacta) > 0 && sumaCounts(corteAyer?.siniestroExacto) > 0;

  if (persistirCorte) {
    saveCorteDiario(isoHoy, snapshotHoy);
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
  const cierresDelDia = contarCierresDelDia(casos, isoHoy);
  const clasificacionPerdidas = contarClasificacionPerdidas(casos);

  const gestionExactaAyer = tieneExactoAyer ? corteAyer.gestionExacta : {};
  const siniestroExactoAyer = tieneExactoAyer ? corteAyer.siniestroExacto : {};

  const estadoGestionActual = {
    filas: compararFilasExactas(
      FILAS_ESTADO_GESTION_ACTUAL,
      gestionExactaAyer,
      gestionExactaHoy.counts
    ),
    totalHoy: gestionExactaHoy.total,
    referenciaDisponible: tieneExactoAyer,
  };

  const estadoSiniestroActual = {
    filas: compararFilasExactas(
      FILAS_ESTADO_SINIESTRO_ACTUAL,
      siniestroExactoAyer,
      siniestroExactoHoy.counts
    ),
    totalHoy: siniestroExactoHoy.total,
    referenciaDisponible: tieneExactoAyer,
  };

  return {
    isoHoy,
    isoAyer,
    etiquetaHoy: etiquetaFechaLarga(isoHoy),
    etiquetaAyer: etiquetaFechaLarga(isoAyer),
    etiquetaHoyCorta: etiquetaFechaCorta(isoHoy),
    etiquetaAyerCorta: etiquetaFechaCorta(isoAyer),
    gestionTerremoto: gestionHoy,
    estadoGestionActual,
    estadoSiniestroActual,
    cierresDelDia,
    clasificacionPerdidas,
    comparativo,
    discriminada,
    corteAyerDisponible: Boolean(corteAyer && Number(corteAyer.total) > 0),
    referenciaExactaDisponible: tieneExactoAyer,
    fuenteAyer,
  };
}
