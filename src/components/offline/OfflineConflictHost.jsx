/**
 * Escucha conflictos 409 de syncService y muestra ConflictDialog.
 */
import React, { useEffect, useState } from 'react';
import ConflictDialog from './ConflictDialog.jsx';
import { resolveConflict } from '../../services/conflictService.js';
import { offlineDb } from '../../offline/db.js';
import { syncPendingChanges } from '../../services/syncService.js';

export default function OfflineConflictHost() {
  const [conflict, setConflict] = useState(null);

  useEffect(() => {
    const onConflict = (ev) => {
      setConflict(ev.detail || null);
    };
    window.addEventListener('offline-conflict', onConflict);
    return () => window.removeEventListener('offline-conflict', onConflict);
  }, []);

  if (!conflict) return null;

  const { queueId, localData, serverData, localFormId, serverVersion } = conflict;

  const applyAndResume = async (merged, strategy) => {
    if (localFormId) {
      await offlineDb.forms.update(localFormId, {
        data: merged,
        dataVersion: Number(serverVersion) || 1,
        syncStatus: 'pending',
        updatedAt: new Date().toISOString(),
      });
    }
    if (queueId) {
      const item = await offlineDb.sync_queue.get(queueId);
      if (item) {
        await offlineDb.sync_queue.update(queueId, {
          status: 'pending',
          conflict: false,
          lastError: null,
          payload: {
            ...item.payload,
            data: merged,
            expectedVersion: Number(serverVersion) || 1,
            conflictResolved: strategy,
          },
        });
      }
    }
    setConflict(null);
    syncPendingChanges({ force: true }).catch(() => {});
  };

  return (
    <ConflictDialog
      mode="conflict"
      title="Conflicto de versión"
      message="Otro usuario (o esta sesión) guardó una versión distinta en el servidor."
      localUpdatedAt={conflict.localUpdatedAt}
      serverUpdatedAt={conflict.serverUpdatedAt}
      onKeepLocal={() =>
        applyAndResume(resolveConflict({ strategy: 'local', localData, serverData }), 'local')
      }
      onUseServer={() =>
        applyAndResume(resolveConflict({ strategy: 'server', localData, serverData }), 'server')
      }
      onCompare={() => {
        const merged = resolveConflict({ strategy: 'combine', localData, serverData });
        applyAndResume(merged, 'combine');
      }}
      onClose={() => setConflict(null)}
    />
  );
}
