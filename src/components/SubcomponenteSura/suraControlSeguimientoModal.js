/**
 * Helpers UI modal Control y Seguimiento (sin dependencias de monitor).
 */

export const SURA_CS_MODAL_SEEN_KEY = 'sura.controlSeguimiento.modalSeen';

export function buildSuraCsModalKey({ itemId, eTag, previewImportId } = {}) {
  return `${itemId || ''}::${eTag || ''}::${previewImportId || ''}`;
}

export function isCompleteSuraCsModalKey(key) {
  if (!key || typeof key !== 'string') return false;
  const parts = key.split('::');
  return parts.length === 3 && parts.every((p) => String(p).trim() !== '');
}

export function buildSuraCsNoChangesKey({ itemId, eTag } = {}) {
  return `${itemId || ''}::${eTag || ''}::NO_CHANGES`;
}

export function shouldAutoOpenSuraCsModal({
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
  if (!isCompleteSuraCsModalKey(modalKey)) return false;
  if (wasSeen) return false;
  if (alreadyAutoOpenedForKey) return false;
  if (modalOpen) return false;
  return true;
}

/** Popup “sin actualizaciones”: una vez por itemId+eTag. */
export function shouldAutoOpenSuraCsNoChangesModal({
  uiStatus,
  noChangesKey,
  wasSeen,
  alreadyAutoOpenedForKey,
  anyModalOpen,
} = {}) {
  if (uiStatus !== 'up_to_date') return false;
  if (!isCompleteSuraCsModalKey(noChangesKey)) return false;
  if (wasSeen) return false;
  if (alreadyAutoOpenedForKey) return false;
  if (anyModalOpen) return false;
  return true;
}

export function readSuraCsModalSeenMap(storage) {
  try {
    const raw = storage?.getItem?.(SURA_CS_MODAL_SEEN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function wasSuraCsModalSeen(storage, key) {
  if (!isCompleteSuraCsModalKey(key)) return false;
  const map = readSuraCsModalSeenMap(storage);
  return Boolean(map[key]);
}

export function markSuraCsModalSeen(storage, key) {
  if (!isCompleteSuraCsModalKey(key) || !storage?.setItem) return;
  try {
    const map = readSuraCsModalSeenMap(storage);
    map[key] = Date.now();
    const entries = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40);
    storage.setItem(SURA_CS_MODAL_SEEN_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* ignore */
  }
}

export function successMessageAfterSuraSync(uiStatus) {
  if (uiStatus === 'up_to_date') {
    return '✓ ARNALD está actualizado con Seguros Sura';
  }
  return null;
}
