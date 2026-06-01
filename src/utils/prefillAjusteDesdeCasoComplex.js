/**
 * Construye un objeto plano compatible con FormularioAjuste (y acta integrada)
 * a partir de una fila del reporte Complex (caso).
 * Solo incluye claves con valor no vacío.
 */

const toTrim = (v) => String(v ?? '').trim();

const toIsoDateInput = (valor) => {
  if (valor === undefined || valor === null || valor === '') return '';
  try {
    const d = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

const metaDeFuentes = (fuentes = {}) =>
  typeof fuentes.metadata === 'object' && fuentes.metadata && !Array.isArray(fuentes.metadata)
    ? fuentes.metadata
    : {};

/** Fecha de asignación del caso (fchaAsgncion en Complex). */
export function resolverFechaAsignacionDesdeCaso(fuentes = {}) {
  const meta = metaDeFuentes(fuentes);
  return toIsoDateInput(
    fuentes.fechaAsignacion || fuentes.fchaAsgncion || meta.fechaAsignacion || fuentes.fechaReporte
  );
}

/** Alias histórico: fechaReporte en el formulario guarda la fecha de asignación. */
export function resolverFechaReporteDesdeAsignacion(fuentes = {}) {
  return resolverFechaAsignacionDesdeCaso(fuentes);
}

export function buildPrefillAjusteDesdeCasoComplex(caso) {
  if (!caso || typeof caso !== 'object') return {};

  const ciudadCompleta =
    toTrim(caso.descripcionCiudad) ||
    toTrim(caso.nombreCiudad) ||
    toTrim(caso.ciudadSiniestro);

  const asegurado =
    toTrim(caso.amprAfctdo) ||
    toTrim(caso.asgrBenfcro) ||
    toTrim(caso.nombreCliente);

  const numeroCaso = toTrim(caso.nmroAjste || caso.numero_ajuste);
  const intermediario = toTrim(caso.nombIntermediario);
  const tipoDoc = toTrim(caso.tipoDucumento);
  const numDoc = toTrim(caso.numDocumento);
  const codiAsgrdra = toTrim(caso.codiAsgrdra || caso.cod1Asgrdra);
  const nombreAseguradora = toTrim(caso.nombreAseguradora || caso.aseguradora);

  const metadataBase =
    typeof caso.metadata === 'object' && caso.metadata && !Array.isArray(caso.metadata)
      ? { ...caso.metadata }
      : {};

  const fechaAsignacionIso = toIsoDateInput(caso.fchaAsgncion || caso.fechaAsignacion);

  const metadata = {
    ...metadataBase,
    ...(codiAsgrdra ? { codiAsgrdra } : {}),
    ...(numeroCaso ? { numeroAjuste: numeroCaso } : {}),
    ...(intermediario ? { intermediario } : {}),
    ...(tipoDoc ? { tipoDocumento: tipoDoc } : {}),
    ...(numDoc ? { numeroDocumento: numDoc } : {}),
    ...(fechaAsignacionIso ? { fechaAsignacion: fechaAsignacionIso } : {})
  };

  const tipoEvento =
    toTrim(caso.causa_siniestro) || toTrim(caso.amprAfctdo) || toTrim(caso.tipoPoliza);

  const out = {
    numeroCaso: numeroCaso || undefined,
    numeroSiniestro: toTrim(caso.nmroSinstro),
    numeroPoliza: toTrim(caso.nmroPolza),
    codigoReporte: toTrim(caso.codWorkflow) || numeroCaso || undefined,
    asegurado: asegurado || undefined,
    tomador: toTrim(caso.tomador) || asegurado || undefined,
    beneficiario: toTrim(caso.asgrBenfcro) || asegurado || undefined,
    tipoEvento: tipoEvento || undefined,
    tipoSiniestro: tipoEvento || undefined,
    actividad: toTrim(caso.actividad) || undefined,
    funcionarioAsigna:
      toTrim(caso.funcAsgrdraNombre) || toTrim(caso.funcAsgrdra) || undefined,
    ciudad: ciudadCompleta || undefined,
    departamento: toTrim(caso.departamentoCiudad) || undefined,
    direccionRiesgo:
      toTrim(caso.direccionRiesgo) ||
      toTrim(caso.direccion_riesgo) ||
      toTrim(caso.direccion) ||
      undefined,
    coordenadasRiesgo: toTrim(caso.coordenadasRiesgo) || toTrim(caso.coordenadas) || undefined,
    fechaSiniestro: toIsoDateInput(caso.fchaSinstro || caso.fechaSiniestro),
    fechaOcurrencia: toIsoDateInput(caso.fchaSinstro || caso.fechaOcurrencia),
    fechaInspeccion: toIsoDateInput(
      caso.fchaInspccion ||
        caso.fechaInspeccion ||
        caso.fchaProgInspeccion ||
        caso.fcha_prog_inspeccion ||
        caso.fchaCoordInspeccion ||
        caso.fcha_coord_inspeccion
    ),
    fechaAsignacion: fechaAsignacionIso || undefined,
    fechaReporte: resolverFechaReporteDesdeAsignacion({
      ...caso,
      fechaAsignacion: fechaAsignacionIso,
      metadata
    }),
    descripcionSiniestro: toTrim(caso.descSinstro) || toTrim(caso.descripcionSiniestro) || undefined,
    descripcionRiesgo: toTrim(caso.descRiesgo) || toTrim(caso.descripcionRiesgo) || undefined,
    identificacionActa: numDoc || undefined,
    tipoRiesgoActa: toTrim(caso.tipoPoliza) || toTrim(caso.amprAfctdo) || undefined,
    codigoReporte: toTrim(caso.codWorkflow) || numeroCaso || undefined,
    ramo: toTrim(caso.tipoPoliza) || toTrim(caso.ramo),
    funcionarioAsigna: toTrim(caso.funcAsgrdraNombre) || toTrim(caso.funcAsgrdra) || undefined,
    nombIntermediario: intermediario || undefined
  };

  if (nombreAseguradora) {
    out.aseguradora = nombreAseguradora;
    out.empresa = nombreAseguradora;
  }

  if (Object.keys(metadata).length > 0) {
    out.metadata = metadata;
  }

  return Object.fromEntries(
    Object.entries(out).filter(([, v]) => {
      if (v === undefined || v === null) return false;
      if (typeof v === 'object' && !Array.isArray(v)) {
        return Object.keys(v).length > 0;
      }
      return String(v).trim() !== '';
    })
  );
}
