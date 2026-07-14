import { obtenerSeguimientoTrazabilidad } from '../config/seguimientosTrazabilidadProtocolo.js';
import { GRACIA_ESPERA_EXTERNA_DIAS_HABILES } from '../config/protocoloSiniestrosDefaults.js';
import { diasHabilesColombiaEntre } from './festivosColombia.js';

function parsearFecha(valor) {
  if (!valor) return null;
  const s = String(valor);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  if (s.includes('T')) {
    const [part] = s.split('T');
    const [y, m, d] = part.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const f = new Date(valor);
  if (Number.isNaN(f.getTime())) return null;
  return new Date(f.getFullYear(), f.getMonth(), f.getDate());
}

export function filtrarHistorialSeguimiento(historialDocs, tipoHistorial) {
  if (!Array.isArray(historialDocs)) return [];
  return historialDocs.filter(
    (d) => d.tipo === tipoHistorial || d.categoria === tipoHistorial
  );
}

export function ultimaFechaHistorialSeguimiento(historialDocs, tipoHistorial) {
  const fechas = filtrarHistorialSeguimiento(historialDocs, tipoHistorial)
    .map((d) => parsearFecha(d.fecha || d.fechaSubida))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime());
  return fechas[0] || null;
}

/**
 * Estado operativo del seguimiento según protocolo (ventana activa, plazo, retraso).
 */
export function evaluarSeguimientoProtocolo({
  formData = {},
  historialDocs = [],
  tipoHistorial,
  protocolo,
}) {
  const cfg =
    obtenerSeguimientoTrazabilidad(tipoHistorial) ||
    protocolo?.seguimientosRecurrentes?.find(
      (s) => s.historialTipo === tipoHistorial
    );
  if (!cfg) return null;

  const segProto = protocolo?.seguimientosRecurrentes?.find(
    (s) => s.id === (cfg.protocoloId || cfg.id)
  );
  const intervaloDias = segProto?.intervaloDias ?? cfg.intervaloDias ?? 15;
  const referenciaCampo = segProto?.referencia ?? cfg.referenciaCampo;
  const hastaCampo = segProto?.campoFechaHasta ?? cfg.hastaCampo;
  const dependenciaExterna = segProto?.dependenciaExterna !== false;
  const graciaDiasHabiles =
    segProto?.graciaDiasHabiles ??
    protocolo?.graciaEsperaExternaDiasHabiles ??
    GRACIA_ESPERA_EXTERNA_DIAS_HABILES;

  const fechaHasta = parsearFecha(formData[hastaCampo]);
  const fechaRef = parsearFecha(formData[referenciaCampo]);
  const completado = Boolean(fechaHasta);
  const activo = Boolean(fechaRef) && !completado;

  const ultimaHistorial = ultimaFechaHistorialSeguimiento(historialDocs, tipoHistorial);
  const ultimaSync = cfg.campoSyncFecha
    ? parsearFecha(formData[cfg.campoSyncFecha])
    : null;
  const fechaUltima =
    ultimaHistorial ||
    (ultimaSync && fechaRef && ultimaSync >= fechaRef ? ultimaSync : null) ||
    null;

  const puntoConteo = fechaUltima && fechaRef && fechaUltima > fechaRef ? fechaUltima : fechaRef;

  let diasDesdeUltimo = null;
  let diasRetraso = 0;
  let enGraciaExterna = false;
  let tiempoLimite = intervaloDias;

  if (activo && puntoConteo) {
    const hoy = new Date();
    const hoyLocal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    diasDesdeUltimo = (hoyLocal.getTime() - puntoConteo.getTime()) / (1000 * 3600 * 24);

    // Sin seguimientos previos: la prórroga de gracia (espera de terceros) NO genera retraso.
    if (!fechaUltima && dependenciaExterna && fechaRef) {
      const diasHabiles = diasHabilesColombiaEntre(fechaRef, hoyLocal);
      tiempoLimite = graciaDiasHabiles;
      if (diasHabiles < graciaDiasHabiles) {
        enGraciaExterna = true;
        diasRetraso = 0;
      } else {
        // Solo cuenta retraso lo que supera la gracia (no se imputan los 10 días hábiles).
        diasRetraso = Math.max(0, diasHabiles - graciaDiasHabiles);
      }
    } else if (diasDesdeUltimo > intervaloDias) {
      diasRetraso = diasDesdeUltimo - intervaloDias;
    }
  }

  return {
    cfg,
    intervaloDias,
    graciaDiasHabiles,
    dependenciaExterna,
    enGraciaExterna,
    tiempoLimite,
    activo,
    completado,
    fechaRef,
    fechaHasta,
    fechaUltima: fechaUltima || puntoConteo,
    diasDesdeUltimo: diasDesdeUltimo != null ? Math.max(0, diasDesdeUltimo) : null,
    diasRetraso: Math.max(0, diasRetraso),
    esUrgente: activo && diasRetraso > 0,
    esReciente:
      activo &&
      (enGraciaExterna ||
        (diasDesdeUltimo != null && diasRetraso === 0 && diasDesdeUltimo <= intervaloDias)),
  };
}

export function validarAltaSeguimiento(estado) {
  if (!estado) return { ok: false, mensaje: 'Configuración de seguimiento no encontrada.' };
  if (estado.completado) {
    return {
      ok: false,
      mensaje: 'Esta fase del protocolo ya está cerrada; no corresponde registrar nuevos seguimientos.',
    };
  }
  if (!estado.fechaRef) {
    const campo = estado.cfg?.referenciaCampo;
    return {
      ok: false,
      mensaje: `Debe registrar primero la fecha de referencia del protocolo (${campo}) antes de agregar seguimientos.`,
    };
  }
  return { ok: true };
}

export function calcularDiasInfoSeguimientoTrazabilidad({
  tipoHistorial,
  formData,
  historialDocs,
  protocolo,
}) {
  const estado = evaluarSeguimientoProtocolo({
    formData,
    historialDocs,
    tipoHistorial,
    protocolo,
  });
  if (!estado || estado.completado || !estado.activo) return null;
  if (estado.diasDesdeUltimo == null) return null;

  return {
    dias: estado.diasDesdeUltimo,
    diasRetraso: estado.diasRetraso,
    tiempoLimite: estado.tiempoLimite ?? estado.intervaloDias,
    fecha: estado.fechaUltima,
    fechaReferencia: estado.fechaRef,
    documentoAnterior: false,
    esReciente: estado.esReciente,
    esUrgente: estado.esUrgente,
    enGraciaExterna: Boolean(estado.enGraciaExterna),
    tieneDocumentos: filtrarHistorialSeguimiento(historialDocs, tipoHistorial).length > 0,
    mostrarHoras: false,
  };
}
