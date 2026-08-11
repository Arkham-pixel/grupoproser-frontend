/**
 * Prefetch de caso/formulario/catálogos para trabajo offline.
 */
import { saveCaseLocally, saveFormLocally, setMetadata } from './offlineDatabase.js';
import historialService from './historialService.js';
import { offlineLog } from '../offline/offlineLog.js';

export async function prepareCaseOffline({
  caseId,
  caseNumber,
  formType,
  historialId,
  catalogos = {},
  caseMeta = {},
} = {}) {
  const caseRecord = await saveCaseLocally({
    id: String(caseId || caseNumber || `case_${Date.now()}`),
    caseNumber: caseNumber || String(caseId || ''),
    status: 'offline_ready',
    ...caseMeta,
    version: 1,
  });

  let form = null;
  if (historialId) {
    try {
      const doc = await historialService.obtenerFormulario(historialId);
      const datos = doc?.datos || doc;
      form = await saveFormLocally({
        id: `hist_${historialId}`,
        caseId: caseRecord.id,
        formType: formType || doc?.tipo || 'unknown',
        data: datos,
        historialId: String(historialId),
        syncStatus: 'synced',
        version: Number(doc?.dataVersion) || 1,
      });
    } catch (e) {
      offlineLog('SYNC_FAILED', { prepare: true, error: e?.message });
    }
  }

  await setMetadata(`catalogos:${caseRecord.id}`, catalogos);
  await setMetadata(`offlineReady:${caseRecord.id}`, {
    at: new Date().toISOString(),
    formType,
    historialId: historialId || null,
  });

  return {
    caseRecord,
    form,
    message: 'Caso disponible sin conexión',
  };
}
