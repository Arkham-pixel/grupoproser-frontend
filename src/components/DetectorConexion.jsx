import useOnlineStatus from '../hooks/useOnlineStatus';
import { OFFLINE_FIRST_ENABLED } from '../config/autoSaveConfig.js';

/**
 * Permite seguir trabajando sin conexión.
 * Con Offline First activo, el banner lo gestiona OfflineBanner (evitar duplicar UX).
 */
export default function DetectorConexion({ children }) {
  const isOnline = useOnlineStatus();

  if (OFFLINE_FIRST_ENABLED) {
    return (
      <div style={{ paddingTop: isOnline ? 0 : '44px' }}>{children}</div>
    );
  }

  return (
    <>
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10000,
            padding: '10px 16px',
            backgroundColor: '#744210',
            color: '#FFFAF0',
            fontSize: '14px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            lineHeight: 1.4,
          }}
        >
          Sin conexión a internet. Puedes seguir editando: tus cambios se guardan en este
          dispositivo y se sincronizarán con el servidor cuando vuelva la red.
        </div>
      )}
      <div style={{ paddingTop: isOnline ? 0 : '44px' }}>{children}</div>
    </>
  );
}
