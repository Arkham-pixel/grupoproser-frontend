/**
 * Prefill del informe catastrófico (Complex) desde un caso BBVA CAT.
 */
export function buildPrefillCatastroficoDesdeBbvaCat(caso = {}) {
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
    aseguradora: 'BBVA Seguros',
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
      origen: 'bbva-cat',
      bbvaCatCasoId: caso._id || undefined,
      severidadCat: caso.severidadCat ?? undefined,
      accesoPredio: caso.accesoPredio || undefined,
      evidenciaCat: caso.evidenciaCat || undefined,
      disclaimerCat:
        'Documento operativo BBVA CAT. No confirma cobertura ni liquidación. No actuar como vocero de BBVA.',
    },
    origen: 'bbva-cat',
    bbvaCatCasoId: caso._id || undefined,
  };
}

/**
 * State de navegación hacia /catastrofico desde el módulo BBVA CAT.
 */
export function buildCatastroficoNavStateDesdeBbvaCat(caso, returnPath = '/bbva-cat/reporte') {
  return {
    bbvaCatCasoId: caso?._id || '',
    numeroSiniestro: caso?.siniestro || '',
    numeroCaso: caso?.consecutivo || '',
    nmroSinstro: caso?.siniestro || '',
    nmroAjste: caso?.consecutivo || '',
    origen: 'bbva-cat',
    returnPath,
    prefillDesdeCaso: buildPrefillCatastroficoDesdeBbvaCat(caso || {}),
  };
}
