/**
 * Helpers del boletín semanal Seguros Alfa (semana lun–dom, America/Bogota).
 */

const TZ = 'America/Bogota';

export const DIAS_ANS_INSPECCION = 15;
export const DIAS_ANS_LIQUIDACION = 45;

export function inicioSemanaBogota(ref = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(ref);
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const d = Number(parts.find((p) => p.type === 'day')?.value);
  const wd = parts.find((p) => p.type === 'weekday')?.value; // Mon, Tue…
  const map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const offset = map[wd] ?? 0;
  const lunes = new Date(Date.UTC(y, m - 1, d - offset, 12, 0, 0));
  return lunes;
}

export function sumarDiasUtc(date, dias) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
}

export function isoDateBogota(date) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function parseFechaCaso(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function enRangoInclusive(fecha, desde, hasta) {
  if (!fecha || !desde || !hasta) return false;
  const t = fecha.getTime();
  return t >= desde.getTime() && t <= hasta.getTime();
}

export function normEstado(estado) {
  return String(estado ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase();
}

export function esLiquidadoEstado(estado) {
  const e = normEstado(estado);
  return e === 'LIQUIDADO' || e === 'ENVIADO ASEGURADORA' || e === 'CERRADO';
}

export function esActivo(estado) {
  return normEstado(estado) !== 'CERRADO';
}

export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function diasEntre(a, b) {
  if (!a || !b) return null;
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86400000);
}

export function mediana(nums) {
  const arr = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!arr.length) return null;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function truncarTexto(valor, max = 42) {
  const texto = String(valor ?? '').trim();
  if (!texto) return '—';
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

/**
 * Agrupa cada comentario distinto de `observacionLlamada` (conteo de casos).
 * Semana: fechaLlamada en rango, o sin fecha de llamada → updatedAt en rango.
 */
export function agruparObservacionesLlamada(casos = [], { desde = null, hasta = null } = {}) {
  const map = new Map();

  for (const c of Array.isArray(casos) ? casos : []) {
    const comentario = String(c.observacionLlamada || '').trim();
    if (!comentario) continue;

    if (desde && hasta) {
      const fLlamada = parseFechaCaso(c.fechaLlamada);
      if (fLlamada) {
        if (!enRangoInclusive(fLlamada, desde, hasta)) continue;
      } else {
        const fUpd = parseFechaCaso(c.updatedAt);
        if (!enRangoInclusive(fUpd, desde, hasta)) continue;
      }
    }

    const key = comentario.toLocaleLowerCase('es');
    const prev = map.get(key);
    const ref = c.siniestro || c.consecutivo || c.identificacion || '—';
    if (prev) {
      prev.cantidad += 1;
      if (prev.siniestros.length < 8) prev.siniestros.push(ref);
    } else {
      map.set(key, {
        comentario,
        etiqueta: truncarTexto(comentario, 48),
        cantidad: 1,
        siniestros: [ref],
      });
    }
  }

  const items = [...map.values()].sort(
    (a, b) => b.cantidad - a.cantidad || a.comentario.localeCompare(b.comentario, 'es')
  );

  return {
    items,
    totalComentarios: items.length,
    totalCasos: items.reduce((acc, it) => acc + it.cantidad, 0),
  };
}

/**
 * Calcula KPIs del boletín para [desde, hasta] (inclusive, fechas Date).
 */
export function calcularBoletinSemanalAlfa(casos = [], alertasPayload = null, rango = {}) {
  const desde = rango.desde || inicioSemanaBogota();
  const hasta = rango.hasta || sumarDiasUtc(desde, 6);
  const lista = Array.isArray(casos) ? casos : [];

  const reportados = [];
  const inspeccionados = [];
  const liquidados = [];
  const novedades = [];

  let sumaReservaActivos = 0;
  let sumaReclamadoActivos = 0;
  let sumaLiquidadoSemana = 0;
  let sumaReclamadoSemana = 0;

  const porEstado = {};
  const diasInspeccion = [];
  const diasLiquidacion = [];
  let ansInspeccionOk = 0;
  let ansInspeccionTotal = 0;
  let ansLiquidacionOk = 0;
  let ansLiquidacionTotal = 0;

  for (const c of lista) {
    const est = String(c.estado || 'PENDIENTE');
    porEstado[est] = (porEstado[est] || 0) + 1;

    const created = parseFechaCaso(c.createdAt);
    const fInsp = parseFechaCaso(c.fechaInspeccion);
    const fLiq = parseFechaCaso(c.fechaLiquidado);
    const fSin = parseFechaCaso(c.fechaSiniestro);
    const fDoc = parseFechaCaso(c.fechaUltimoDocumento);
    const fUpd = parseFechaCaso(c.updatedAt);

    if (enRangoInclusive(created, desde, hasta)) {
      reportados.push(c);
      novedades.push({
        tipo: 'reportado',
        fecha: created,
        texto: `Caso reportado ${c.consecutivo || c.identificacion || ''} — ${c.asegurado || c.tomador || 'sin nombre'} (${c.ciudad || '—'})`,
      });
    }
    if (enRangoInclusive(fInsp, desde, hasta)) {
      inspeccionados.push(c);
      novedades.push({
        tipo: 'inspeccion',
        fecha: fInsp,
        texto: `Inspección ${c.consecutivo || c.identificacion || ''} — ${c.asegurado || c.tomador || 'sin nombre'}`,
      });
    }
    if (enRangoInclusive(fLiq, desde, hasta) || (esLiquidadoEstado(est) && enRangoInclusive(fUpd, desde, hasta) && !fLiq)) {
      liquidados.push(c);
      sumaLiquidadoSemana += num(c.valorLiquidado);
      sumaReclamadoSemana += num(c.valorReclamado);
      novedades.push({
        tipo: 'liquidado',
        fecha: fLiq || fUpd,
        texto: `Liquidado ${c.consecutivo || c.identificacion || ''} — ajustado ${num(c.valorLiquidado).toLocaleString('es-CO')}`,
      });
    }

    if (esActivo(est)) {
      sumaReservaActivos += num(c.reserva) || num(c.valorReservaPreventivaPromedio);
      sumaReclamadoActivos += num(c.valorReclamado);
    }

    if (fSin && fInsp) {
      const d = diasEntre(fSin, fInsp);
      if (d != null && d >= 0) {
        diasInspeccion.push(d);
        ansInspeccionTotal += 1;
        if (d <= DIAS_ANS_INSPECCION) ansInspeccionOk += 1;
      }
    }
    if (fSin && fLiq) {
      const d = diasEntre(fSin, fLiq);
      if (d != null && d >= 0) {
        diasLiquidacion.push(d);
        ansLiquidacionTotal += 1;
        if (d <= DIAS_ANS_LIQUIDACION) ansLiquidacionOk += 1;
      }
    }

    // Novedad: documento cargado en la semana
    if (enRangoInclusive(fDoc, desde, hasta) && !enRangoInclusive(created, desde, hasta)) {
      novedades.push({
        tipo: 'documento',
        fecha: fDoc,
        texto: `Documento actualizado ${c.consecutivo || c.identificacion || ''}`,
      });
    }
  }

  novedades.sort((a, b) => (b.fecha?.getTime() || 0) - (a.fecha?.getTime() || 0));

  const alertasNorm = normalizarAlertasPayload(alertasPayload);
  const resumenAlertas = alertasNorm.resumen;
  const casosAlerta = alertasNorm.casos;

  const alertasLista = casosAlerta
    .flatMap((caso) =>
      (caso.alertas || []).map((a) => ({
        ...a,
        consecutivo: caso.consecutivo || caso.numeroAjuste,
        asegurado: caso.asegurado || caso.tomador,
        estado: caso.estado,
        ajustador: caso.responsable || caso.ajustador,
      }))
    )
    .sort((a, b) => {
      const pa = a.prioridad === 'ALTA' ? 0 : 1;
      const pb = b.prioridad === 'ALTA' ? 0 : 1;
      return pa - pb || (b.transcurrido || 0) - (a.transcurrido || 0);
    });

  const pct = (ok, total) => (total > 0 ? Math.round((ok / total) * 1000) / 10 : null);

  return {
    rango: {
      desde: isoDateBogota(desde),
      hasta: isoDateBogota(hasta),
      etiqueta: `${isoDateBogota(desde)} → ${isoDateBogota(hasta)}`,
    },
    kpis: {
      casosReportados: reportados.length,
      casosInspeccionados: inspeccionados.length,
      casosLiquidados: liquidados.length,
      reservaEstimada: sumaReservaActivos,
      valorReclamadoActivos: sumaReclamadoActivos,
      valorReclamadoSemana: sumaReclamadoSemana,
      valorAjustadoSemana: sumaLiquidadoSemana,
      totalCasos: lista.length,
      casosActivos: lista.filter((c) => esActivo(c.estado)).length,
    },
    embudo: Object.entries(porEstado)
      .map(([estado, cantidad]) => ({ estado, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad),
    ans: {
      inspeccion: {
        ok: ansInspeccionOk,
        total: ansInspeccionTotal,
        pct: pct(ansInspeccionOk, ansInspeccionTotal),
        limiteDias: DIAS_ANS_INSPECCION,
        medianaDias: mediana(diasInspeccion),
      },
      liquidacion: {
        ok: ansLiquidacionOk,
        total: ansLiquidacionTotal,
        pct: pct(ansLiquidacionOk, ansLiquidacionTotal),
        limiteDias: DIAS_ANS_LIQUIDACION,
        medianaDias: mediana(diasLiquidacion),
      },
    },
    novedades: novedades.slice(0, 12),
    alertas: {
      total: resumenAlertas.totalAlertas ?? alertasLista.length,
      alta: resumenAlertas.prioridadAlta ?? alertasLista.filter((a) => a.prioridad === 'ALTA').length,
      media: resumenAlertas.prioridadMedia ?? alertasLista.filter((a) => a.prioridad === 'MEDIA').length,
      casosEvaluados: resumenAlertas.casosEvaluados ?? lista.length,
      items: alertasLista.slice(0, 10),
    },
    detalle: {
      reportados,
      inspeccionados,
      liquidados,
    },
    observacionesLlamada: agruparObservacionesLlamada(lista, { desde, hasta }),
  };
}

export function shiftSemana(desdeLunes, deltaSemanas) {
  return sumarDiasUtc(desdeLunes, deltaSemanas * 7);
}

/** Unifica respuesta flat (`casos`) o agrupada por ajustador (`ajustadores`). */
export function normalizarAlertasPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { resumen: {}, casos: [] };
  }

  if (Array.isArray(payload.casos) && payload.casos.length) {
    return {
      resumen: {
        totalAlertas: payload.resumen?.totalAlertas ?? payload.resumenGeneral?.totalAlertas ?? 0,
        prioridadAlta: payload.resumen?.prioridadAlta,
        prioridadMedia: payload.resumen?.prioridadMedia,
        casosEvaluados: payload.resumen?.casosEvaluados ?? payload.resumenGeneral?.totalCasosConAlertas,
      },
      casos: payload.casos,
    };
  }

  const casos = [];
  for (const aj of payload.ajustadores || payload.responsables || []) {
    for (const c of aj.casos || []) casos.push(c);
  }

  let alta = 0;
  let media = 0;
  let total = 0;
  for (const c of casos) {
    for (const a of c.alertas || []) {
      total += 1;
      if (String(a.prioridad || '').toUpperCase() === 'ALTA') alta += 1;
      else media += 1;
    }
  }

  return {
    resumen: {
      totalAlertas: payload.resumenGeneral?.totalAlertas ?? payload.resumen?.totalAlertas ?? total,
      prioridadAlta: alta,
      prioridadMedia: media,
      casosEvaluados: payload.resumenGeneral?.totalCasosConAlertas ?? casos.length,
    },
    casos,
  };
}
