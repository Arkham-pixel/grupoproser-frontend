import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { obtenerEstadoEncuestaDocumentacion } from '../../services/encuestaDocumentacionExternosService';
import {
  RUTA_ENCUESTA_DOCUMENTACION,
  KEY_ENCUESTA_POSPUESTA,
} from '../../config/encuestaDocumentacionExternos';

/**
 * Si aplica y está vigente, redirige a la encuesta salvo que el usuario
 * eligió «hacerlo más tarde» en esta sesión.
 *
 * Solo bloquea con pantalla de carga en la 1ª consulta; al navegar
 * entre rutas no vuelve a tapar toda la app.
 */
export default function EncuestaDocumentacionGate({ children }) {
  const location = useLocation();
  const [estado, setEstado] = useState(null);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const enVueloRef = useRef(false);

  const enRutaEncuesta = location.pathname.startsWith(RUTA_ENCUESTA_DOCUMENTACION);
  const tipoUsuario = localStorage.getItem('tipoUsuario');
  const token = localStorage.getItem('token');
  const pospuesta =
    typeof sessionStorage !== 'undefined' &&
    sessionStorage.getItem(KEY_ENCUESTA_POSPUESTA) === '1';

  const consultar = useCallback(async () => {
    if (!token || tipoUsuario !== 'secur') {
      setEstado({ obligatoria: false });
      setCargandoInicial(false);
      return;
    }
    if (enVueloRef.current) return;
    enVueloRef.current = true;
    try {
      const res = await obtenerEstadoEncuestaDocumentacion();
      setEstado(res);
    } catch {
      setEstado({ obligatoria: false });
    } finally {
      enVueloRef.current = false;
      setCargandoInicial(false);
    }
  }, [token, tipoUsuario]);

  // Una sola consulta al montar / cambiar sesión — NO en cada navegación.
  useEffect(() => {
    consultar();
  }, [consultar]);

  useEffect(() => {
    const onDone = () => {
      try {
        sessionStorage.removeItem(KEY_ENCUESTA_POSPUESTA);
      } catch {
        /* ignore */
      }
      consultar();
    };
    const onPosponer = () => consultar();
    window.addEventListener('encuesta-documentacion-completada', onDone);
    window.addEventListener('encuesta-documentacion-pospuesta', onPosponer);
    return () => {
      window.removeEventListener('encuesta-documentacion-completada', onDone);
      window.removeEventListener('encuesta-documentacion-pospuesta', onPosponer);
    };
  }, [consultar]);

  if (!token || tipoUsuario !== 'secur') return children;

  // Solo la primera verificación bloquea; luego la app navega normal.
  if (cargandoInicial && estado == null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
        Verificando documentación…
      </div>
    );
  }

  if (estado?.obligatoria && !enRutaEncuesta && !pospuesta) {
    return <Navigate to={RUTA_ENCUESTA_DOCUMENTACION} replace />;
  }

  return children;
}
