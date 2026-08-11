/**
 * Detección y resolución de conflictos de versión / campos.
 */
import { offlineLog } from '../offline/offlineLog.js';

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Compara dos objetos planos (1 nivel + anidados simples) y detecta campos en conflicto.
 */
export function detectFieldConflicts(localData = {}, serverData = {}, path = '') {
  const conflicts = [];
  const merged = { ...serverData };

  const keys = new Set([...Object.keys(localData || {}), ...Object.keys(serverData || {})]);
  keys.forEach((key) => {
    const full = path ? `${path}.${key}` : key;
    const lv = localData?.[key];
    const sv = serverData?.[key];
    if (isPlainObject(lv) && isPlainObject(sv)) {
      const nested = detectFieldConflicts(lv, sv, full);
      conflicts.push(...nested.conflicts);
      merged[key] = nested.merged;
      return;
    }
    const lEmpty = lv === undefined || lv === null || lv === '';
    const sEmpty = sv === undefined || sv === null || sv === '';
    if (JSON.stringify(lv) === JSON.stringify(sv)) {
      merged[key] = sv;
      return;
    }
    if (!lEmpty && sEmpty) {
      merged[key] = lv;
      return;
    }
    if (lEmpty && !sEmpty) {
      merged[key] = sv;
      return;
    }
    // Ambos tienen valores distintos
    conflicts.push({ path: full, local: lv, server: sv });
    merged[key] = sv; // default keep server until user decides
  });

  return { conflicts, merged, autoMerged: conflicts.length === 0 };
}

export function detectConflict({ localVersion, serverVersion, localData, serverData }) {
  const versionConflict =
    localVersion != null &&
    serverVersion != null &&
    Number(localVersion) !== Number(serverVersion);
  const field = detectFieldConflicts(localData || {}, serverData || {});
  if (versionConflict || field.conflicts.length) {
    offlineLog('CONFLICT_DETECTED', {
      localVersion,
      serverVersion,
      fields: field.conflicts.map((c) => c.path),
    });
  }
  return {
    hasConflict: versionConflict || field.conflicts.length > 0,
    versionConflict,
    ...field,
  };
}

export function resolveConflict({ strategy, localData, serverData, fieldChoices = {} }) {
  if (strategy === 'local') return { ...localData };
  if (strategy === 'server') return { ...serverData };
  // combine: auto-merge + user fieldChoices
  const { merged, conflicts } = detectFieldConflicts(localData, serverData);
  const out = { ...merged };
  conflicts.forEach((c) => {
    const choice = fieldChoices[c.path];
    if (choice === 'local') {
      setByPath(out, c.path, c.local);
    } else if (choice === 'server') {
      setByPath(out, c.path, c.server);
    }
  });
  return out;
}

function setByPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!isPlainObject(cur[parts[i]])) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}
