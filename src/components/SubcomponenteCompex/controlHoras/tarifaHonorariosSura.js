/**
 * Honorarios SURA — Control de horas (correo operativo Oscar).
 *
 * Topes máximos por tipología de gestión:
 * - Preliminar + Final ≈ $3.000.000
 * - Informe único ≈ $2.500.000
 * - Informe único de objeción ≈ $2.000.000
 * - Desistidos con gestión e informe interno ≈ $1.000.000
 * - Cancelado SURA / dado de baja por aseguradora → $0 (no se cobra)
 *
 * El valor sugerido baja o sube según distancia/zona para que no salgan
 * todos iguales; Bernardo/Ligia pueden editar dentro del tope.
 */

import { zonaAtencionSura } from '../../SubcomponenteSura/suraZonas.js';

export const VALOR_HORA_SURA = 187400;

export const TOPES_HONORARIOS_SURA = Object.freeze({
  preliminar_final: 3_000_000,
  unico: 2_500_000,
  objetado: 2_000_000,
  desistido: 1_000_000,
  cancelado_sura: 0,
});

/** Franja de distancia → factor sobre el tope (siempre ≤ 1). */
export const FRANJAS_DISTANCIA_SURA = Object.freeze([
  { id: 'corta', label: 'Corta (local / zona cafetera)', kmHasta: 80, factor: 0.78 },
  { id: 'media', label: 'Media (occidente / regional)', kmHasta: 200, factor: 0.88 },
  { id: 'larga', label: 'Larga (Chocó / fuera de zona)', kmHasta: Number.POSITIVE_INFINITY, factor: 0.96 },
]);

function norm(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase();
}

function parseNumeroFlexible(valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const limpio = String(valor)
    .replace(/[$\s]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

/** Cancelado por SURA / dado de baja: no se factura. */
export function esCanceladoSuraSinCobro(caso = {}) {
  const campos = [
    caso.estadoFacilitador,
    caso.estado,
    caso.descripcionEstado,
    caso.estado_siniestro,
  ];
  return campos.some((v) => {
    const e = norm(v);
    if (!e) return false;
    if (e.includes('CANCELADO SURA') || e.includes('CANCELADO POR SURA')) return true;
    if (e === 'CANCELADO' || e.startsWith('CANCELADO ')) return true;
    if (e.includes('DADO DE BAJA')) return true;
    return false;
  });
}

/**
 * Tipología de cobro según estado + informes del caso.
 */
export function resolverTipoHonorariosSura(caso = {}) {
  if (esCanceladoSuraSinCobro(caso)) return 'cancelado_sura';

  // Tipología ya guardada en el control (Excel / tarifario) manda sobre comentarios libres.
  const tipoguardado = String(caso.control_horas?._tipo_honorarios || caso._tipo_honorarios || '')
    .toLowerCase()
    .trim();
  if (tipoguardado && TOPES_HONORARIOS_SURA[tipoguardado] != null) {
    return tipoguardado;
  }

  // Solo el estado operativo (no el "último comentario" libre).
  const estado = norm(caso.estado || caso.estadoFacilitador);
  if (estado.includes('DESIST')) return 'desistido';
  if (estado.includes('OBJET')) return 'objetado';

  const tipoInf = String(caso.informeUnico?.tipoInforme || caso.tipoInforme || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');

  const tienePrelim =
    Boolean(caso.fchaInfoPrelm) ||
    tipoInf.includes('prelim') ||
    norm(caso.estado).includes('PRELIMINAR');
  const tieneFinal =
    Boolean(caso.fchaInfoFnal) ||
    tipoInf.includes('final') ||
    tipoInf.includes('unic') ||
    norm(caso.estado).includes('UNICO') ||
    norm(caso.estado).includes('FINAL');

  // Informe final en operación = hubo preliminar + final (tope $3M).
  if (tipoInf.includes('final') || (tienePrelim && tieneFinal)) return 'preliminar_final';
  if (tipoInf.includes('unic') && !tienePrelim) return 'unico';
  if (tieneFinal && !tienePrelim) return 'unico';
  if (tipoInf.includes('prelim')) return 'preliminar_final';
  return 'preliminar_final';
}

/** Liquidador de plantilla (preliminar | unico) a partir del tipo de cobro. */
export function tipoLiquidadorDesdeHonorariosSura(tipoHonorarios) {
  if (
    tipoHonorarios === 'unico' ||
    tipoHonorarios === 'objetado' ||
    tipoHonorarios === 'desistido' ||
    tipoHonorarios === 'cancelado_sura'
  ) {
    return 'unico';
  }
  return 'preliminar';
}

export function etiquetaTipoHonorariosSura(tipo) {
  const mapa = {
    preliminar_final: 'Preliminar + Final',
    unico: 'Informe único',
    objetado: 'Informe único de objeción',
    desistido: 'Desistido (gestión + informe interno)',
    cancelado_sura: 'Cancelado SURA (sin cobro)',
  };
  return mapa[tipo] || tipo;
}

/**
 * Estima km de desplazamiento para facturación.
 * Prioridad: campo explícito → distancia a centro de bloque → heurística por zona.
 */
export function estimarDistanciaKmSura(caso = {}) {
  const explicito = parseNumeroFlexible(
    caso.distanciaKmFacturacion ?? caso.distanciaKm ?? caso.distanciaKmCentro
  );
  if (explicito != null && explicito >= 0) return explicito;

  const zona = zonaAtencionSura(caso);
  if (zona === 'Zona Cafetera') return 45;
  if (zona === 'Occidente') return 140;
  if (zona === 'Chocó') return 280;
  return 180;
}

export function resolverFranjaDistanciaSura(km) {
  const n = Number(km);
  const valor = Number.isFinite(n) && n >= 0 ? n : 180;
  return FRANJAS_DISTANCIA_SURA.find((f) => valor <= f.kmHasta) || FRANJAS_DISTANCIA_SURA.at(-1);
}

/** Variación ligera por reclamo para que no salgan montos idénticos en la misma franja. */
function jitterPorReclamo(caso = {}) {
  const clave = String(caso.siniestro || caso.nmroSinstro || caso.consecutivo || caso._id || '');
  let h = 0;
  for (let i = 0; i < clave.length; i += 1) h = (h * 31 + clave.charCodeAt(i)) % 1000;
  // −2.5% … +2.5%
  return (h / 1000 - 0.5) * 0.05;
}

function redondearMiles(valor) {
  return Math.round(Number(valor) / 1000) * 1000;
}

/**
 * Resuelve tope + honorarios sugeridos (por debajo del tope) según tipología y distancia.
 */
export function resolverTarifaHonorariosSura(caso = {}) {
  const tipo = resolverTipoHonorariosSura(caso);
  const maxHonorarios = TOPES_HONORARIOS_SURA[tipo] ?? TOPES_HONORARIOS_SURA.preliminar_final;
  const km = estimarDistanciaKmSura(caso);
  const franja = resolverFranjaDistanciaSura(km);
  const zona = zonaAtencionSura(caso);

  if (tipo === 'cancelado_sura' || maxHonorarios <= 0) {
    return {
      tipo,
      etiquetaTipo: etiquetaTipoHonorariosSura(tipo),
      tipoLiquidador: tipoLiquidadorDesdeHonorariosSura(tipo),
      maxHonorarios: 0,
      honorariosSugeridos: 0,
      maxHoras: 0,
      horasSugeridas: 0,
      valorHora: VALOR_HORA_SURA,
      distanciaKm: km,
      franjaId: franja.id,
      franjaLabel: franja.label,
      zona,
      factor: 0,
    };
  }

  const factor = Math.min(0.99, Math.max(0.7, franja.factor * (1 + jitterPorReclamo(caso))));
  const honorariosSugeridos = Math.min(maxHonorarios, redondearMiles(maxHonorarios * factor));
  const maxHoras = Math.round((maxHonorarios / VALOR_HORA_SURA) * 100) / 100;
  const horasSugeridas = Math.round((honorariosSugeridos / VALOR_HORA_SURA) * 100) / 100;

  return {
    tipo,
    etiquetaTipo: etiquetaTipoHonorariosSura(tipo),
    tipoLiquidador: tipoLiquidadorDesdeHonorariosSura(tipo),
    maxHonorarios,
    honorariosSugeridos,
    maxHoras,
    horasSugeridas,
    valorHora: VALOR_HORA_SURA,
    distanciaKm: km,
    franjaId: franja.id,
    franjaLabel: franja.label,
    zona,
    factor,
  };
}

/**
 * Escala horas de filas variables (no fijas) para acercarse al total de horas objetivo.
 */
export function escalarHorasPlantillaHaciaObjetivo(filas = [], horasObjetivo) {
  const objetivo = Number(horasObjetivo);
  if (!Number.isFinite(objetivo) || objetivo <= 0 || !Array.isArray(filas) || !filas.length) {
    return filas;
  }

  const totalFila = (f) =>
    Number(f.horas_viaje || 0) +
    Number(f.horas_campo || 0) +
    Number(f.horas_oficina || 0) +
    Number(f.horas_secretaria || 0);

  const fijas = filas.filter((f) => f.fijo === true || f.tipo_item === 'fijo');
  const variables = filas.filter((f) => !(f.fijo === true || f.tipo_item === 'fijo'));
  const horasFijas = fijas.reduce((acc, f) => acc + totalFila(f), 0);
  const horasVar = variables.reduce((acc, f) => acc + totalFila(f), 0);
  const restante = Math.max(0, objetivo - horasFijas);

  if (horasVar <= 0.001 || restante <= 0.001) return filas;

  const ratio = restante / horasVar;
  const escalar = (v) => Math.round(Number(v || 0) * ratio * 4) / 4; // cuartos de hora

  return filas.map((f) => {
    if (f.fijo === true || f.tipo_item === 'fijo') return f;
    return {
      ...f,
      horas_viaje: escalar(f.horas_viaje),
      horas_campo: escalar(f.horas_campo),
      horas_oficina: escalar(f.horas_oficina),
      horas_secretaria: escalar(f.horas_secretaria),
    };
  });
}

export function mensajeTarifaHonorariosSura(res) {
  const fmt = (n) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(n);
  return (
    `SURA · ${res.etiquetaTipo}: tope ${fmt(res.maxHonorarios)}. ` +
    `Sugerido ${fmt(res.honorariosSugeridos)} (${res.horasSugeridas} h) por distancia ` +
    `${Math.round(res.distanciaKm)} km · ${res.franjaLabel}` +
    (res.zona ? ` · ${res.zona}` : '') +
    `. Hora ${fmt(res.valorHora)}. Editable por Bernardo/Ligia dentro del tope.`
  );
}
