import useOnlineStatus from '../hooks/useOnlineStatus';

/**
 * Permite seguir trabajando sin conexión. Muestra aviso no bloqueante;
 * el autoguardado local conserva los datos y sincroniza al reconectar.
 */
export default function DetectorConexion({ children }) {
  const isOnline = useOnlineStatus();

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
