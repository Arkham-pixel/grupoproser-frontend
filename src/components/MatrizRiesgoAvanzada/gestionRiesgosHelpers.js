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
    seguimientos: [crearSeguimientoVacio(id + 1)],
  };
}

/** Convierte datos legacy (fechaImplementacion1/2) al formato con seguimientos. */
export function normalizarRecomendacion(rec, index = 0) {
  if (!rec || typeof rec !== 'object') {
    return crearRecomendacionVacia(Date.now() + index);
  }

  const baseId = rec.id ?? Date.now() + index;

  if (Array.isArray(rec.seguimientos)) {
    const seguimientos = rec.seguimientos.map((seg, segIndex) => ({
      id: seg?.id ?? `${baseId}-seg-${segIndex}`,
      fecha: seg?.fecha || '',
      comentarios: seg?.comentarios || '',
    }));

    return {
      id: baseId,
      recomendacion: rec.recomendacion || '',
      fechaRecomendacion: rec.fechaRecomendacion || rec.fechaInicial || '',
      seguimientos: seguimientos.length > 0 ? seguimientos : [crearSeguimientoVacio(baseId + 1)],
    };
  }

  const seguimientos = [];

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

  return {
    id: baseId,
    recomendacion: rec.recomendacion || '',
    fechaRecomendacion: rec.fechaRecomendacion || rec.fechaInicial || '',
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
