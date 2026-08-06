/** Detecta inspección asegurado (RII-CP-004) en listado o documento API. */

export function esRegistroInspeccionAsegurado(registro = {}) {
  if (registro.tipoRegistro === 'inspeccion_asegurado') return true;
  const tipoInspeccion = String(registro.tipoInspeccion || '').toUpperCase();
  if (
    tipoInspeccion.includes('INSPECCIÓN ASEGURADO') ||
    tipoInspeccion.includes('INSPECCION ASEGURADO')
  ) {
    return true;
  }
  const informe = registro.informeInspeccionAsegurado;
  if (informe && typeof informe === 'object' && Object.keys(informe).length > 0) return true;
  return false;
}

export function esCasoInspeccionAsegurado(caso = {}) {
  return esRegistroInspeccionAsegurado({
    tipoRegistro: caso.tipoRegistro,
    tipoInspeccion: caso.laborRealizada,
    informeInspeccionAsegurado: caso.informeInspeccionAsegurado,
  });
}

/** Detecta inspección Motorysa en listado o documento API. */
export function esRegistroInspeccionMotorysa(registro = {}) {
  if (registro.tipoRegistro === 'inspeccion_motorysa') return true;
  const tipoInspeccion = String(registro.tipoInspeccion || '').toUpperCase();
  if (
    tipoInspeccion.includes('INSPECCIÓN MOTORYSA') ||
    tipoInspeccion.includes('INSPECCION MOTORYSA')
  ) {
    return true;
  }
  const informe = registro.informeInspeccionMotorysa;
  if (informe && typeof informe === 'object' && Object.keys(informe).length > 0) return true;
  return false;
}

export function esCasoInspeccionMotorysa(caso = {}) {
  return esRegistroInspeccionMotorysa({
    tipoRegistro: caso.tipoRegistro,
    tipoInspeccion: caso.laborRealizada,
    informeInspeccionMotorysa: caso.informeInspeccionMotorysa,
  });
}
