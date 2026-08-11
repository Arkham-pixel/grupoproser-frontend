/**
 * Interruptor Offline First / autoguardado.
 * El autosave legacy (localStorage) permanece desactivado.
 */
export const AUTO_SAVE_ENABLED = false;

/** Persistencia en historial (servidor) — independiente del autoguardado en localStorage */
export const HISTORIAL_AUTO_SAVE_ENABLED = true;

/** Activa capa Offline First (IndexedDB + cola + indicadores). */
export const OFFLINE_FIRST_ENABLED = true;

export const AUTOSAVE_DEBOUNCE_MS = 700;

/** Días de retención de copias locales ya sincronizadas */
export const OFFLINE_RETENTION_DAYS = 15;

/** Límite de adjunto offline (bytes) — 25 MB */
export const OFFLINE_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

/** Lado mayor máx. al comprimir fotos offline */
export const OFFLINE_PHOTO_MAX_EDGE = 1800;

export const isAutoSaveGloballyEnabled = () => AUTO_SAVE_ENABLED;
export const isOfflineFirstEnabled = () => OFFLINE_FIRST_ENABLED;
