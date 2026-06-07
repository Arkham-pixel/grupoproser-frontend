import useOnlineStatus from '../hooks/useOnlineStatus';
import PaginaError from './PaginaError';

/**
 * Muestra la pantalla de error cuando no hay conexión a internet.
 */
export default function DetectorConexion({ children }) {
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return <PaginaError tipoForzado="sin-conexion" />;
  }

  return children;
}
