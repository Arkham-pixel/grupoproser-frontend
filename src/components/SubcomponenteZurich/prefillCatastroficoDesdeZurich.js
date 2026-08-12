/**
 * Prefill del informe catastrófico (Complex) desde un caso Zurich.
 */
export function buildPrefillCatastroficoDesdeZurich(caso = {}) {
  const vigencia =
    caso.fechaInicioPoliza || caso.fechaFinPoliza
      ? [caso.fechaInicioPoliza, caso.fechaFinPoliza]
          .filter(Boolean)
          .map((f) => {
            try {
              return new Date(f).toISOString().slice(0, 10);
            } catch {
              return '';
            }
          })
          .filter(Boolean)
          .join(' / ')
      : '';

  const fechaIso = (v) => {
    if (!v) return undefined;
    try {
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
      return new Date(v).toISOString().slice(0, 10);
    } catch {
      return undefined;
    }
  };

  return {
    aseguradora: 'Zurich Colombia Seguros S.A.',
    asegurado: caso.asegurado || undefined,
    tomador: caso.tomador || caso.asegurado || undefined,
    identificacionActa: caso.identificacion || undefined,
    direccionRiesgo: caso.direccionPredio || undefined,
    ciudad: caso.ciudad || undefined,
    departamento: caso.departamento || undefined,
    numeroSiniestro: caso.siniestro || undefined,
    numeroCaso: caso.consecutivo || undefined,
    fechaSiniestro: fechaIso(caso.fechaSiniestro),
    fechaOcurrencia: fechaIso(caso.fechaSiniestro),
    fechaInspeccion: fechaIso(caso.fechaInspeccion),
    vigenciaPoliza: vigencia || undefined,
    tipoSiniestro: caso.cobertura || undefined,
    tipoEvento: caso.cobertura || 'Catastrófico',
    indemnizacionSugerida:
      caso.valorLiquidado != null ? String(caso.valorLiquidado) : undefined,
    observacionesInforme: caso.observacionesCat || undefined,
    descripcionDanios: caso.observacionesCat || undefined,
    severidadCat: caso.severidadCat ?? undefined,
    accesoPredio: caso.accesoPredio || undefined,
    evidenciaCat: caso.evidenciaCat || undefined,
    metadata: {
      origen: 'zurich',
      zurichCasoId: caso._id || undefined,
      severidadCat: caso.severidadCat ?? undefined,
      accesoPredio: caso.accesoPredio || undefined,
      evidenciaCat: caso.evidenciaCat || undefined,
      disclaimerCat:
        'Documento operativo Zurich CAT. No confirma cobertura ni liquidación. No actuar como vocero de Zurich.',
    },
    origen: 'zurich',
    zurichCasoId: caso._id || undefined,
  };
}

/**
 * State de navegación hacia /catastrofico desde el módulo Zurich.
 */
export function buildCatastroficoNavStateDesdeZurich(caso, returnPath = '/zurich/reporte') {
  return {
    zurichCasoId: caso?._id || '',
    numeroSiniestro: caso?.siniestro || '',
    numeroCaso: caso?.consecutivo || '',
    nmroSinstro: caso?.siniestro || '',
    nmroAjste: caso?.consecutivo || '',
    origen: 'zurich',
    returnPath,
    prefillDesdeCaso: buildPrefillCatastroficoDesdeZurich(caso || {}),
  };
}
