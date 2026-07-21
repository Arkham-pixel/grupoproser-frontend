import {
  GRACIA_ESPERA_EXTERNA_DIAS_HABILES,
  MAPEO_TRAZABILIDAD_PROTOCOLO,
  etiquetaLimiteTipoTrazabilidad,
  resolverEtapaProtocoloPorTipo,
} from '../../config/protocoloSiniestrosDefaults.js';
import { esDiaHabilColombia } from '../../utils/festivosColombia.js';

/** Etapas de trazabilidad Complex (sin iconos) para subtareas / protocolo. */
export const ETAPAS_TRAZABILIDAD_SUBTAREA = [
  { tipo: 'recepcionAsignacion', titulo: 'Recepción de asignación' },
  { tipo: 'carguePlataforma', titulo: 'Cargue y asignación interna' },
  { tipo: 'contactoInicial', titulo: 'Contacto Inicial' },
  { tipo: 'coordinacionInspeccion', titulo: 'Coordinación de Inspección' },
  { tipo: 'inspeccion', titulo: 'Inspección' },
  { tipo: 'solicitudDocs', titulo: 'Solicitud Docs' },
  { tipo: 'informePreliminar', titulo: 'Informe Preliminar' },
  { tipo: 'seguimientoDocsPendientes', titulo: 'Seguimiento docs pendientes' },
  { tipo: 'ultimoDocumento', titulo: 'Último Documento' },
  { tipo: 'informeFinal', titulo: 'Informe Final' },
  { tipo: 'seguimientoAutorizacionCompania', titulo: 'Seguimiento autorización compañía' },
  { tipo: 'presentacionCifras', titulo: 'Presentación de Cifras' },
  { tipo: 'seguimientoDocumentosPago', titulo: 'Seguimiento docs de pago' },
  { tipo: 'envioFiniquito', titulo: 'Envío de Finiquito' },
];

/** Alias de compatibilidad (HMR / imports antiguos). */
export const ETAPAS_TRAZABILIDAD = ETAPAS_TRAZABILIDAD_SUBTAREA;

export function resolverCasoId(caso) {
  if (!caso) return '';
  const raw = caso._id ?? caso.id;
  if (!raw) return '';
  if (typeof raw === 'object' && raw.$oid) return String(raw.$oid);
  return String(raw);
}

function parsearFecha(valor) {
  if (!valor) return null;
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return new Date(valor.getTime());
  const str = String(valor).trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  const f = new Date(str);
  return Number.isNaN(f.getTime()) ? null : f;
}

function sumarHoras(fecha, horas) {
  const out = new Date(fecha.getTime());
  out.setTime(out.getTime() + horas * 60 * 60 * 1000);
  return out;
}

function sumarDiasCalendario(fecha, dias) {
  const out = new Date(fecha.getTime());
  out.setDate(out.getDate() + dias);
  return out;
}

function sumarDiasHabiles(fecha, dias) {
  if (!dias || dias <= 0) return new Date(fecha.getTime());
  const out = new Date(fecha.getTime());
  let restan = dias;
  while (restan > 0) {
    out.setDate(out.getDate() + 1);
    if (esDiaHabilColombia(out)) restan -= 1;
  }
  return out;
}

function finDelDia(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 0, 0);
}

function aInputDate(fecha) {
  if (!fecha) return '';
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fechaAsignacionCaso(caso) {
  return (
    parsearFecha(caso?.fchaAsgncion) ||
    parsearFecha(caso?.fecha_asignacion_form) ||
    parsearFecha(caso?.fechaAsignacion) ||
    parsearFecha(caso?.fecha_asignacion) ||
    parsearFecha(caso?.createdAt) ||
    parsearFecha(caso?.updatedAt)
  );
}

function resolverFechaReferencia(caso, etapaLike) {
  if (etapaLike?.referencia) {
    const principal = parsearFecha(caso?.[etapaLike.referencia]);
    if (principal) return principal;
  }
  if (etapaLike?.referenciaAlternativa) {
    const alt = parsearFecha(caso?.[etapaLike.referenciaAlternativa]);
    if (alt) return alt;
  }
  return fechaAsignacionCaso(caso);
}

function normalizarEtiquetaPlazo(etiqueta, etapaLike) {
  if (etiqueta && !String(etiqueta).includes('undefined')) return etiqueta;
  const lim = etapaLike?.limite;
  if (lim && lim.valor != null && lim.unidad) {
    if (lim.unidad === 'horas') return `${lim.valor} horas`;
    if (lim.unidad === 'dias_habiles') return `${lim.valor} días hábiles`;
    if (lim.unidad === 'dias') return `${lim.valor} día(s)`;
    if (lim.unidad === 'mismo_dia') return 'mismo día';
  }
  return 'Sin plazo fijo de alerta (ventana operativa 15 días)';
}

/**
 * Calcula fecha límite de una bandeja de trazabilidad según el protocolo.
 * @returns {{ fechaLimite: Date|null, fechaLimiteInput: string, etiquetaPlazo: string|null, etapaProtocolo: object|null, fechaReferencia: Date|null }}
 */
export function calcularFechaLimiteTrazabilidad(caso, tipoTrazabilidad, protocolo) {
  const cfg = MAPEO_TRAZABILIDAD_PROTOCOLO[tipoTrazabilidad] || {};
  const etapaLike = resolverEtapaProtocoloPorTipo(tipoTrazabilidad, protocolo);
  const etiquetaPlazo = normalizarEtiquetaPlazo(
    etiquetaLimiteTipoTrazabilidad(tipoTrazabilidad, protocolo),
    etapaLike
  );
  const fechaReferencia = resolverFechaReferencia(caso, etapaLike);

  if (!fechaReferencia) {
    return {
      fechaLimite: null,
      fechaLimiteInput: '',
      etiquetaPlazo,
      etapaProtocolo: etapaLike,
      fechaReferencia: null,
      etapaProtocoloId: cfg?.etapaId || cfg?.seguimientoId || cfg?.esperaExternaId || '',
    };
  }

  let fechaLimite = null;

  if (cfg?.esperaExternaId || cfg?.seguimientoId) {
    const gracia =
      protocolo?.graciaEsperaExternaDiasHabiles ?? GRACIA_ESPERA_EXTERNA_DIAS_HABILES;
    fechaLimite = sumarDiasHabiles(fechaReferencia, Number(gracia) || 10);
  } else if (etapaLike?.limite && etapaLike.limite.valor != null) {
    const { valor, unidad } = etapaLike.limite;
    const n = Number(valor);
    if (unidad === 'horas') {
      fechaLimite = sumarHoras(fechaReferencia, Number.isFinite(n) ? n : 0);
    } else if (unidad === 'dias') {
      fechaLimite = sumarDiasCalendario(fechaReferencia, Number.isFinite(n) ? n : 0);
    } else if (unidad === 'dias_habiles') {
      fechaLimite = sumarDiasHabiles(fechaReferencia, Number.isFinite(n) ? n : 0);
    } else if (unidad === 'mismo_dia') {
      fechaLimite = finDelDia(fechaReferencia);
    }
  }

  // Etapas sin límite de alerta (p. ej. acreditación / último documento)
  if (!fechaLimite) {
    fechaLimite = sumarDiasCalendario(fechaReferencia, 15);
  }

  return {
    fechaLimite,
    fechaLimiteInput: aInputDate(fechaLimite),
    etiquetaPlazo,
    etapaProtocolo: etapaLike,
    fechaReferencia,
    etapaProtocoloId: cfg?.etapaId || cfg?.seguimientoId || cfg?.esperaExternaId || etapaLike?.id || '',
  };
}

function campoFechaEtapa(tipo, protocolo) {
  const etapa = resolverEtapaProtocoloPorTipo(tipo, protocolo);
  if (etapa?.campoFecha) return etapa.campoFecha;
  const mapa = {
    recepcionAsignacion: 'fchaAsgncion',
    carguePlataforma: 'fchaAsgncion',
    contactoInicial: 'fchaContIni',
    coordinacionInspeccion: 'fchaProgInspeccion',
    inspeccion: 'fchaInspccion',
    solicitudDocs: 'fchaSoliDocu',
    informePreliminar: 'fchaInfoPrelm',
    seguimientoDocsPendientes: 'fchaUltSegui',
    ultimoDocumento: 'fchaRepoActi',
    informeFinal: 'fchaInfoFnal',
    seguimientoAutorizacionCompania: 'fchaAceptacionCifrasAseguradora',
    presentacionCifras: 'fchaPresentacionCifras',
    seguimientoDocumentosPago: 'fchaUltSegui',
    envioFiniquito: 'fchaEnvioFiniquito',
  };
  return mapa[tipo] || null;
}

export function etapaTrazabilidadCompleta(caso, tipo, protocolo) {
  const campo = campoFechaEtapa(tipo, protocolo);
  if (!campo) return false;
  return Boolean(parsearFecha(caso?.[campo]));
}

/** Lista etapas de trazabilidad con plazo de protocolo y estado del caso. */
export function listarTareasTrazabilidad(caso, protocolo, subtareas = []) {
  return ETAPAS_TRAZABILIDAD_SUBTAREA.map(({ tipo, titulo }) => {
    const plazo = calcularFechaLimiteTrazabilidad(caso, tipo, protocolo);
    const completa = etapaTrazabilidadCompleta(caso, tipo, protocolo);
    const vinculadas = (subtareas || []).filter((s) => s.etapaTrazabilidad === tipo);
    let semaforo = 'verde';
    if (completa) semaforo = 'verde';
    else if (plazo.fechaLimite && plazo.fechaLimite < new Date()) semaforo = 'rojo';
    else if (vinculadas.some((s) => s.estado === 'en_progreso' || s.estado === 'pendiente')) {
      semaforo = 'amarillo';
    } else if (!completa) semaforo = 'amarillo';

    return {
      tipo,
      titulo,
      completa,
      semaforo,
      etiquetaPlazo: plazo.etiquetaPlazo,
      fechaLimite: plazo.fechaLimite,
      fechaLimiteInput: plazo.fechaLimiteInput,
      fechaReferencia: plazo.fechaReferencia,
      etapaProtocoloId: plazo.etapaProtocoloId,
      subtareas: vinculadas,
    };
  });
}
