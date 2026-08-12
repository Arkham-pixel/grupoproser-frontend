export const ESTADOS_RECOMENDACION = [
  {
    id: 'abierta',
    label: 'No iniciada',
    labelKey: 'riskMatrix.recStatus.open',
    avance: 0,
    color: '#dc3545',
    descripcion: 'Pendiente de iniciar',
  },
  {
    id: 'en_proceso',
    label: 'En proceso',
    labelKey: 'riskMatrix.recStatus.inProgress',
    avance: 25,
    color: '#fd7e14',
    descripcion: 'Trabajo iniciado',
  },
  {
    id: 'avanzada',
    label: 'Avanzada',
    labelKey: 'riskMatrix.recStatus.advanced',
    avance: 75,
    color: '#eab308',
    descripcion: 'Implementación avanzada',
  },
  {
    id: 'cerrada',
    label: 'Completada',
    labelKey: 'riskMatrix.recStatus.closed',
    avance: 100,
    color: '#28a745',
    descripcion: 'Cerrada / implementada',
  },
];

const ESTADOS_POR_ID = Object.fromEntries(ESTADOS_RECOMENDACION.map((e) => [e.id, e]));

export function obtenerMetaEstadoRecomendacion(estadoId) {
  return ESTADOS_POR_ID[estadoId] || ESTADOS_POR_ID.abierta;
}

export function avancePorEstadoRecomendacion(estadoId) {
  return obtenerMetaEstadoRecomendacion(estadoId).avance;
}

export function etiquetaEstadoRecomendacion(estadoId) {
  return obtenerMetaEstadoRecomendacion(estadoId).label;
}

/** Convierte YYYY-MM-DD (o ISO) a dd/mm/aaaa para reporte. */
export function formatearFechaCorta(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return texto;
}

export function seguimientosConContenido(rec = {}) {
  const lista = Array.isArray(rec.seguimientos) ? rec.seguimientos : [];
  const conDatos = lista.filter(
    (seg) => String(seg?.fecha || '').trim() || String(seg?.comentarios || '').trim()
  );
  if (conDatos.length > 0) return conDatos;

  const legacy = [];
  if (rec.fechaImplementacion1 || rec.comentariosImplementacion1) {
    legacy.push({
      id: 'legacy-1',
      fecha: rec.fechaImplementacion1 || '',
      comentarios: rec.comentariosImplementacion1 || '',
    });
  }
  if (rec.fechaImplementacion2 || rec.comentariosImplementacion2) {
    legacy.push({
      id: 'legacy-2',
      fecha: rec.fechaImplementacion2 || '',
      comentarios: rec.comentariosImplementacion2 || '',
    });
  }
  return legacy;
}

export function recomendacionTieneContenido(rec = {}) {
  const texto = String(rec.recomendacion || rec.descripcion || rec.texto || '').trim();
  const fecha = String(rec.fechaRecomendacion || rec.fechaInicial || '').trim();
  return Boolean(texto || fecha || seguimientosConContenido(rec).length);
}

/** Infiere estado a partir de seguimientos (datos legacy sin campo estado). */
export function inferirEstadoDesdeSeguimientos(rec = {}) {
  const seguimientos = (rec.seguimientos || []).filter(
    (s) => String(s.comentarios || '').trim() || String(s.fecha || '').trim()
  );
  if (!seguimientos.length) return 'abierta';

  const ultimo = seguimientos[seguimientos.length - 1];
  const texto = String(ultimo.comentarios || '').toLowerCase();
  if (
    texto.includes('cerrad') ||
    texto.includes('complet') ||
    texto.includes('finaliz') ||
    texto.includes('implementad')
  ) {
    return 'cerrada';
  }
  if (texto.includes('avanzad') || texto.includes('parcial') || seguimientos.length >= 3) {
    return 'avanzada';
  }
  if (seguimientos.length >= 2) return 'avanzada';
  return 'en_proceso';
}

export function resolverEstadoRecomendacion(rec = {}) {
  const declarado = String(rec.estado || '').trim();
  if (ESTADOS_POR_ID[declarado]) return declarado;
  return inferirEstadoDesdeSeguimientos(rec);
}

export function resolverAvanceRecomendacion(rec = {}) {
  const estado = resolverEstadoRecomendacion(rec);
  const avanceDeclarado = Number(rec.avance);
  if (Number.isFinite(avanceDeclarado) && avanceDeclarado >= 0 && avanceDeclarado <= 100) {
    // Si el avance no cuadra con el estado, priorizar el del estado (fuente de verdad UI).
    const esperado = avancePorEstadoRecomendacion(estado);
    if (rec.estado && ESTADOS_POR_ID[rec.estado]) return esperado;
    return Math.round(avanceDeclarado);
  }
  return avancePorEstadoRecomendacion(estado);
}

export function crearSeguimientoVacio(id = Date.now()) {
  return {
    id,
    fecha: '',
    comentarios: '',
  };
}

export function crearRecomendacionVacia(id = Date.now()) {
  return {
    id,
    recomendacion: '',
    fechaRecomendacion: '',
    estado: 'abierta',
    avance: 0,
    seguimientos: [crearSeguimientoVacio(id + 1)],
  };
}

/** Convierte datos legacy (fechaImplementacion1/2) al formato con seguimientos + estado. */
export function normalizarRecomendacion(rec, index = 0) {
  if (!rec || typeof rec !== 'object') {
    return crearRecomendacionVacia(Date.now() + index);
  }

  const baseId = rec.id ?? Date.now() + index;
  let seguimientos;

  if (Array.isArray(rec.seguimientos)) {
    seguimientos = rec.seguimientos.map((seg, segIndex) => ({
      id: seg?.id ?? `${baseId}-seg-${segIndex}`,
      fecha: seg?.fecha || '',
      comentarios: seg?.comentarios || '',
    }));
    if (seguimientos.length === 0) {
      seguimientos = [crearSeguimientoVacio(baseId + 1)];
    }
  } else {
    seguimientos = [];
    if (rec.fechaImplementacion1 || rec.comentariosImplementacion1) {
      seguimientos.push({
        id: `${baseId}-seg-1`,
        fecha: rec.fechaImplementacion1 || '',
        comentarios: rec.comentariosImplementacion1 || '',
      });
    }
    if (rec.fechaImplementacion2 || rec.comentariosImplementacion2) {
      seguimientos.push({
        id: `${baseId}-seg-2`,
        fecha: rec.fechaImplementacion2 || '',
        comentarios: rec.comentariosImplementacion2 || '',
      });
    }
    if (seguimientos.length === 0) {
      seguimientos.push(crearSeguimientoVacio(baseId + 1));
    }
  }

  const base = {
    id: baseId,
    recomendacion: rec.recomendacion || '',
    fechaRecomendacion: rec.fechaRecomendacion || rec.fechaInicial || '',
    seguimientos,
    estado: rec.estado,
    avance: rec.avance,
  };
  const estado = resolverEstadoRecomendacion(base);
  const avance = avancePorEstadoRecomendacion(estado);

  return {
    id: baseId,
    recomendacion: base.recomendacion,
    fechaRecomendacion: base.fechaRecomendacion,
    estado,
    avance,
    seguimientos,
  };
}

export function normalizarGestionRiesgos(datos) {
  const lista = Array.isArray(datos?.recomendaciones) ? datos.recomendaciones : [];
  return {
    ...(datos || {}),
    recomendaciones:
      lista.length > 0
        ? lista.map((rec, index) => normalizarRecomendacion(rec, index))
        : [crearRecomendacionVacia()],
  };
}
