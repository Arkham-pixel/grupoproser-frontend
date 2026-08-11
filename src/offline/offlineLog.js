/**
 * Logs de desarrollo para Offline First (no visibles al usuario final).
 */
const ENABLED =
  typeof import.meta !== 'undefined' &&
  (import.meta.env?.DEV || import.meta.env?.MODE === 'development');

const EVENTS = new Set([
  'LOCAL_SAVE',
  'QUEUE_CREATED',
  'SYNC_STARTED',
  'SYNC_SUCCESS',
  'SYNC_FAILED',
  'CONFLICT_DETECTED',
  'PHOTO_QUEUED',
  'ATTACHMENT_QUEUED',
  'CONNECTIVITY_OK',
  'CONNECTIVITY_FAIL',
  'STORAGE_WARNING',
  'SESSION_RECOVERY',
]);

export function offlineLog(event, detail = {}) {
  if (!ENABLED) return;
  if (!EVENTS.has(event)) return;
  // eslint-disable-next-line no-console
  console.debug(`[offline:${event}]`, detail);
}

export default offlineLog;
