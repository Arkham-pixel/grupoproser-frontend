/**
 * Helpers UI modal Control y Seguimiento (sin dependencias de monitor).
 */

export const ALFA_CS_MODAL_SEEN_KEY = 'alfa.controlSeguimiento.modalSeen';

export function buildAlfaCsModalKey({ itemId, eTag, previewImportId } = {}) {
  return `${itemId || ''}::${eTag || ''}::${previewImportId || ''}`;
}

export function isCompleteAlfaCsModalKey(key) {
  if (!key || typeof key !== 'string') return false;
  const parts = key.split('::');
  return parts.length === 3 && parts.every((p) => String(p).trim() !== '');
}

export function buildAlfaCsNoChangesKey({ itemId, eTag } = {}) {
  return `${itemId || ''}::${eTag || ''}::NO_CHANGES`;
}

export function shouldAutoOpenAlfaCsModal({
  uiStatus,
  modalKey,
  wasSeen,
  alreadyAutoOpenedForKey,
  modalOpen,
} = {}) {
  if (uiStatus === 'up_to_date' || uiStatus === 'error' || uiStatus === 'idle') {
    return false;
  }
  if (uiStatus !== 'updates_available' && uiStatus !== 'requires_review') {
    return false;
  }
  if (!isCompleteAlfaCsModalKey(modalKey)) return false;
  if (wasSeen) return false;
  if (alreadyAutoOpenedForKey) return false;
  if (modalOpen) return false;
  return true;
}

/** Popup “sin actualizaciones”: una vez por itemId+eTag. */
export function shouldAutoOpenAlfaCsNoChangesModal({
  uiStatus,
  noChangesKey,
  wasSeen,
  alreadyAutoOpenedForKey,
  anyModalOpen,
} = {}) {
  if (uiStatus !== 'up_to_date') return false;
  if (!isCompleteAlfaCsModalKey(noChangesKey)) return false;
  if (wasSeen) return false;
  if (alreadyAutoOpenedForKey) return false;
  if (anyModalOpen) return false;
  return true;
}

export function readAlfaCsModalSeenMap(storage) {
  try {
    const raw = storage?.getItem?.(ALFA_CS_MODAL_SEEN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function wasAlfaCsModalSeen(storage, key) {
  if (!isCompleteAlfaCsModalKey(key)) return false;
  const map = readAlfaCsModalSeenMap(storage);
  return Boolean(map[key]);
}

export function markAlfaCsModalSeen(storage, key) {
  if (!isCompleteAlfaCsModalKey(key) || !storage?.setItem) return;
  try {
    const map = readAlfaCsModalSeenMap(storage);
    map[key] = Date.now();
    const entries = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40);
    storage.setItem(ALFA_CS_MODAL_SEEN_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* ignore */
  }
}

export function successMessageAfterAlfaSync(uiStatus) {
  if (uiStatus === 'up_to_date') {
    return '✓ ARNALD está actualizado con Seguros Alfa';
  }
  return null;
}
