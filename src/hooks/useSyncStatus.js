import { useEffect, useState, useCallback } from 'react';
import { subscribeAutosaveStatus, getAutosaveStatus } from '../services/autosaveOfflineService.js';
import { getSyncStatus } from '../services/syncService.js';
import { checkConnectivity } from '../services/connectivityService.js';
import { OFFLINE_FIRST_ENABLED } from '../config/autoSaveConfig.js';

export default function useSyncStatus() {
  const [status, setStatus] = useState(() => getAutosaveStatus());
  const [summary, setSummary] = useState({
    totalPending: 0,
    pendingPhotos: 0,
    pendingAttachments: 0,
    pendingChanges: 0,
    errorChanges: 0,
  });
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const refresh = useCallback(async () => {
    if (!OFFLINE_FIRST_ENABLED) return;
    const s = await getSyncStatus();
    setSummary(s);
    const online = await checkConnectivity(); // usa cache TTL interno
    setIsOnline(online);
  }, []);

  useEffect(() => {
    if (!OFFLINE_FIRST_ENABLED) return undefined;
    const unsub = subscribeAutosaveStatus(setStatus);
    refresh();
    const t = setInterval(refresh, 15000);
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      unsub();
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refresh]);

  return {
    status,
    summary,
    isOnline,
    refresh,
    pendingCount: summary.totalPending || status.pendingCount || 0,
  };
}
