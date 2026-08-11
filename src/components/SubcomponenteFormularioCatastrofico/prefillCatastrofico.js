import { buildPrefillAjusteDesdeCasoComplex } from '../../utils/prefillAjusteDesdeCasoComplex.js';

/** Prefill catastrófico desde un caso Complex (misma base que Ajuste). */
export function buildPrefillCatastroficoDesdeCasoComplex(caso) {
  return buildPrefillAjusteDesdeCasoComplex(caso);
}
