/**
 * Helpers del boletín diario Allianz (corte día a día, America/Bogota).
 * Independiente del boletín semanal.
 */

import { homologarEstadoAllianz } from './allianzHelpers.js';
import {
  isoDateBogota,
  parseFechaCaso,
  sumarDiasUtc,
} from './boletinSemanalAllianzHelpers.js';

const TZ = 'America/Bogota';
const CORTES_KEY = 'allianz.boletinDiario.cortes';

/** Categorías del tablero «Gestión terremoto» / comparativo (mutuamente excluyentes). */
export const CATEGORIAS_GESTION_TERREMOTO = [
  {
    id: 'verificacion',
    label: 'Verificación (no atendidos)',
    labelCorto: 'Verificación',
    descripcion:
      'Asignados en proceso de verificación de pérdidas mediante llamadas a los asegurados',
  },
  {
    id: 'enInspeccion',
    label: 'En inspección',
    labelCorto: 'En inspección',
    descripcion: 'En proceso de inspección',
  },
  {
    id: 'enLiquidacion',
    label: 'En liquidación',
    labelCorto: 'En liquidación',
    descripcion: 'En proceso de liquidación',
  },
  {
    id: 'liquidados',
    label: 'Liquidación concluida y en recolecta de documentos',
    labelCorto: 'Liq. concluida',
    descripcion: 'Liquidación concluida y en recolecta de documentos',
  },
  {
    id: 'pendientesPagoAlfa',
    label: 'Cerrados',
    labelCorto: 'Cerrados',
    descripcion: 'Cerrados',
  },
  {
    id: 'objetados',
    label: 'Objetados',
    labelCorto: 'Objetados',
    descripcion: 'Objetados',
  },
  {
    id: 'perdidasTotales',
    label: 'Pérdidas totales',
    labelCorto: 'Pérdidas totales',
    descripcion: 'Pérdidas totales confirmadas',
  },
  {
    id: 'desistimientos',
    label: 'Desistimientos',
    labelCorto: 'Desistimientos',
    descripcion: 'Desistimientos',
  },
];

const ORDEN_ETAPA = {
  verificacion: 0,
  enInspeccion: 1,
  enLiquidacion: 2,
  liquidados: 3,
  pendientesPagoAlfa: 3,
  objetados: 3,
  perdidasTotales: 3,
  desistimientos: 3,
};

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

export function casoIdAllianz(caso) {
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

export function clasificarCasoGestionTerremoto(caso = {}) {
  const estado = homologarEstadoAllianz(caso.estado);
  const textoLibre = [caso.observacionLlamada, caso.observacionesGestion, caso.cobertura]
    .filter(Boolean)
    .join(' ');

  if (estado === 'ANULADO' || (textoLibre && /desist/.test(normTexto(textoLibre)))) return 'desistimientos';
  if (esPerdidaTotalTexto(textoLibre, estado)) return 'perdidasTotales';
  if (estado === 'OBJECIÓN' || estado === 'OBJETADO') return 'objetados';
  if (estado === 'CASO PARA PAGO' || estado === 'PAGADO') return 'pendientesPagoAlfa';
  if (estado === 'AUTORIZACIÓN ANALISTA') return 'liquidados';
  if (estado === 'ANÁLISIS DEL CASO' || estado === 'PENDIENTE DE DOCUMENTO') return 'enLiquidacion';
  if (estado === 'COORDINANDO INSPECCIÓN') return 'enInspeccion';
  return 'verificacion';
}

export function contarGestionTerremoto(casos = []) {
  const counts = Object.fromEntries(CATEGORIAS_GESTION_TERREMOTO.map((cat) => [cat.id, 0]));
  const porCaso = {};
  for (const caso of Array.isArray(casos) ? casos : []) {
    const cat = clasificarCasoGestionTerremoto(caso);
    counts[cat] = (counts[cat] || 0) + 1;
    const id = casoIdAllianz(caso);
    if (id) porCaso[id] = cat;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const filas = CATEGORIAS_GESTION_TERREMOTO.map((meta) => {
    const cantidad = counts[meta.id] || 0;
    const pctVal = total > 0 ? Math.round((cantidad / total) * 1000) / 10 : 0;
    return { ...meta, cantidad, pct: pctVal };
  });
  return { counts, filas, total, porCaso };
}

export function casosConGestionEfectiva(counts = {}) {
  return Object.entries(counts).reduce((acc, [id, n]) => {
    if (id === 'verificacion') return acc;
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

export function clasificarGestionDiscriminada(caso = {}) {
  const texto = normTexto(
    [caso.observacionLlamada, caso.observacionesGestion].filter(Boolean).join(' ')
  );
  const estado = homologarEstadoAllianz(caso.estado);

  if (esPerdidaTotalTexto(texto, estado)) return 'perdidaTotal';
  if (
    texto.includes('acceso restring') ||
    texto.includes('ingreso restring') ||
    texto.includes('no dejan ingres') ||
    texto.includes('no permiten ingres')
  ) {
    return 'accesoRestringido';
  }
  if (texto.includes('desist') || estado === 'ANULADO' || estado === 'DESISTIDO') {
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
  if (texto.includes('liquidacion') || texto.includes('en liquidacion')) {
    return 'enLiquidacion';
  }
  if (
    texto.includes('documento') ||
    texto.includes('informacion') ||
    texto.includes('pendiente de info')
  ) {
    return 'pendienteInformacion';
  }
  if (
    texto.includes('sin respuesta') ||
    texto.includes('no contesta') ||
    texto.includes('sin contacto') ||
    texto.includes('no logr')
  ) {
    return 'contactadosSinExito';
  }

  if (estado === 'ANULADO') return 'desistimientoTramite';
  if (estado === 'ANÁLISIS DEL CASO' || estado === 'AUTORIZACIÓN ANALISTA') return 'enLiquidacion';
  if (estado === 'PENDIENTE DE DOCUMENTO' || estado === 'OBJECIÓN' || estado === 'OBJETADO') return 'pendienteInformacion';
  if (estado === 'COORDINANDO INSPECCIÓN') return 'solicitanInspeccion';
  if (texto) return 'contactadosSinExito';
  return null;
}

export function contarGestionDiscriminada(casos = [], isoDia) {
  const counts = Object.fromEntries(CATEGORIAS_GESTION_DISCRIMINADA.map((cat) => [cat.id, 0]));
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

  return { counts, cards, total: incluidos };
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

export function fechaIngresoCasoAllianz(caso = {}) {
  return (
    parseFechaCaso(caso.createdAt) ||
    parseFechaCaso(caso.fechaAviso) ||
    parseFechaCaso(caso.fechaSiniestro) ||
    parseFechaCaso(caso.fechaCasoNuevo) ||
    null
  );
}

export function casoExistiaAlCorte(caso, isoCorte) {
  const ingreso = fechaIngresoCasoAllianz(caso);
  if (!ingreso) return true;
  return isoDateBogota(ingreso) <= isoCorte;
}

export function clasificarCasoAlCorte(caso = {}, isoCorte) {
  if (!casoExistiaAlCorte(caso, isoCorte)) return null;

  const upd = parseFechaCaso(caso.updatedAt);
  const updIso = upd ? isoDateBogota(upd) : null;
  const pudoCambiarDespues = Boolean(updIso && updIso > isoCorte);

  if (!pudoCambiarDespues) {
    return clasificarCasoGestionTerremoto(caso);
  }

  if (fechaIsoOnOrBefore(caso.fechaCasoPagado, isoCorte) || fechaIsoOnOrBefore(caso.fechaCasoParaPago, isoCorte)) return 'pendientesPagoAlfa';
  if (fechaIsoOnOrBefore(caso.fechaObjetado, isoCorte) || fechaIsoOnOrBefore(caso.fechaObjecion, isoCorte)) return 'objetados';
  if (fechaIsoOnOrBefore(caso.fechaAutorizacionAnalista, isoCorte)) return 'liquidados';
  if (
    fechaIsoOnOrBefore(caso.fechaAnalisisCaso, isoCorte) ||
    fechaIsoOnOrBefore(caso.fechaSolicitudDocumento, isoCorte) ||
    fechaIsoOnOrBefore(caso.fechaRecepcionDocumento, isoCorte)
  ) {
    return 'enLiquidacion';
  }
  if (
    fechaIsoOnOrBefore(caso.fechaCoordinandoInspeccion, isoCorte) ||
    fechaIsoOnOrBefore(caso.fechaLlamada, isoCorte)
  ) {
    return 'enInspeccion';
  }
  return 'verificacion';
}

export function reconstruirCorteDesdeCasos(casos = [], isoCorte) {
  const counts = Object.fromEntries(CATEGORIAS_GESTION_TERREMOTO.map((cat) => [cat.id, 0]));
  const porCaso = {};

  for (const caso of Array.isArray(casos) ? casos : []) {
    const cat = clasificarCasoAlCorte(caso, isoCorte);
    if (!cat) continue;
    counts[cat] = (counts[cat] || 0) + 1;
    const id = casoIdAllianz(caso);
    if (id) porCaso[id] = cat;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { total, counts, porCaso, fuente: 'reconstruido', isoCorte };
}

export function contarNuevasAsignacionesDia(casos = [], isoDia) {
  let n = 0;
  for (const caso of Array.isArray(casos) ? casos : []) {
    const ingreso = fechaIngresoCasoAllianz(caso);
    if (ingreso && isoDateBogota(ingreso) === isoDia) n += 1;
  }
  return n;
}

export function calcularComparativoDiario({
  hoy,
  ayer,
  isoHoy,
  isoAyer,
  nuevasAsignaciones = null,
  fuenteAyer = null,
} = {}) {
  const filas = CATEGORIAS_GESTION_TERREMOTO.map((meta) => {
    const a = Number(ayer?.counts?.[meta.id] || 0);
    const h = Number(hoy?.counts?.[meta.id] || 0);
    return {
      ...meta,
      ayer: a,
      hoy: h,
      variacion: h - a,
      pctAyer: pct(a, ayer?.total || 0),
      pctHoy: pct(h, hoy?.total || 0),
    };
  });

  const totalAyer = Number(ayer?.total || 0);
  const totalHoy = Number(hoy?.total || 0);
  const variacionTotal = totalHoy - totalAyer;
  const gestionAyer = casosConGestionEfectiva(ayer?.counts || {});
  const gestionHoy = casosConGestionEfectiva(hoy?.counts || {});
  const incrementoGestion = gestionHoy - gestionAyer;
  const pctBase =
    totalAyer > 0 ? Math.round((variacionTotal / totalAyer) * 1000) / 10 : null;

  let retrocesos = 0;
  const porCasoAyer = ayer?.porCaso || {};
  const porCasoHoy = hoy?.porCaso || {};
  for (const [id, catAyer] of Object.entries(porCasoAyer)) {
    const catHoy = porCasoHoy[id];
    if (!catHoy) continue;
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

export function calcularBoletinDiarioAllianz(casos = [], { fechaCorte = new Date(), persistirCorte = true } = {}) {
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
