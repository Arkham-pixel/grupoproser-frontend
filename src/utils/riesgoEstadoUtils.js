/**
 * Utilidades para estados del módulo de riesgos (catálogo 1-4).
 * Códigos de siniestros/complex (p. ej. 13 = CASO NUEVO) no pertenecen a riesgos.
 */

/** Códigos legacy de siniestros → código válido de riesgos */
export const MAPEO_ESTADO_LEGACY_RIESGO = {
  13: 1, // CASO NUEVO → Asignado
};

export function codigoEstadoRiesgoResuelto(codigo) {
  if (codigo === null || codigo === undefined || codigo === '') return null;
  const n = Number(codigo);
  if (Number.isFinite(n) && MAPEO_ESTADO_LEGACY_RIESGO[n] !== undefined) {
    return MAPEO_ESTADO_LEGACY_RIESGO[n];
  }
  return n;
}

export function getEstadoRiesgoNombre(codigo, estados = []) {
  if (codigo === null || codigo === undefined || codigo === '') return '';

  const codigoResuelto = codigoEstadoRiesgoResuelto(codigo);
  const codigoBuscado = String(codigoResuelto ?? codigo);

  const estado = (estados || []).find((e) => {
    const codigoEstado = e?.codiEstdo ?? e?.codiEstado ?? e?.codigo;
    return codigoEstado !== undefined && codigoEstado !== null && String(codigoEstado) === codigoBuscado;
  });

  if (estado) {
    return estado.descEstdo || estado.descEstado || estado.descripcion || estado.nombre || codigoBuscado;
  }

  if (!estados?.length) return codigoBuscado;
  return 'Estado no válido';
}

export function opcionesEstadoRiesgoDesdeCatalogo(estados = [], casos = []) {
  const codigosEnCasos = new Set(
    (casos || [])
      .map((c) => codigoEstadoRiesgoResuelto(c.codiEstdo))
      .filter((v) => v !== null && v !== undefined && !Number.isNaN(v))
      .map(String)
  );

  return (estados || [])
    .filter((e) => {
      const cod = e?.codiEstdo ?? e?.codiEstado;
      return cod !== undefined && cod !== null && codigosEnCasos.has(String(cod));
    })
    .map((e) => ({
      value: e.codiEstdo ?? e.codiEstado,
      label: e.descEstdo || e.descEstado || String(e.codiEstdo ?? e.codiEstado),
    }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label), 'es'));
}
