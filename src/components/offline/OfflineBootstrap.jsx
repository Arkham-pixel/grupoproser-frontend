/**
 * Bootstrap Offline First: sync al reconectar + storage persistente.
 */
import { useEffect } from 'react';
import { startSyncOnReconnect } from '../../services/syncService.js';
import { initPwaStorage } from '../../services/pwaService.js';
import { OFFLINE_FIRST_ENABLED } from '../../config/autoSaveConfig.js';
import OfflineConflictHost from './OfflineConflictHost.jsx';

export default function OfflineBootstrap({ children }) {
  useEffect(() => {
    if (!OFFLINE_FIRST_ENABLED) return undefined;
    const stop = startSyncOnReconnect();
    initPwaStorage().catch(() => {});
    return () => {
      if (typeof stop === 'function') stop();
    };
  }, []);

  if (!OFFLINE_FIRST_ENABLED) return children;

  return (
    <>
      {children}
      <OfflineConflictHost />
    </>
  );
}
