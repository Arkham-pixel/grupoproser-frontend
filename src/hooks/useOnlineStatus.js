import { useEffect, useState } from 'react';
import { checkConnectivity, subscribeConnectivity } from '../services/connectivityService.js';
import { OFFLINE_FIRST_ENABLED } from '../config/autoSaveConfig.js';

export default function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (!OFFLINE_FIRST_ENABLED) {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    let cancelled = false;
    checkConnectivity().then((ok) => {
      if (!cancelled) setIsOnline(ok);
    });

    const unsub = subscribeConnectivity((ok) => {
      if (!cancelled) setIsOnline(ok);
    });

    const interval = setInterval(() => {
      checkConnectivity().then((ok) => {
        if (!cancelled) setIsOnline(ok);
      });
    }, 30000);

    return () => {
      cancelled = true;
      unsub();
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}
