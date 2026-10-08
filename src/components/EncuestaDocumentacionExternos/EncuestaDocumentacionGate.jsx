import { useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { obtenerEstadoEncuestaDocumentacion } from '../../services/encuestaDocumentacionExternosService';
import { RUTA_ENCUESTA_DOCUMENTACION } from '../../config/encuestaDocumentacionExternos';

/**
 * Bloquea la plataforma si el backend marca la encuesta documental como obligatoria
 * (contractor_* y usuarios ex-catastróficos / vinculados al catálogo CAT).
 */
export default function EncuestaDocumentacionGate({ children }) {
  const location = useLocation();
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(true);

  const enRutaEncuesta = location.pathname.startsWith(RUTA_ENCUESTA_DOCUMENTACION);
  const tipoUsuario = localStorage.getItem('tipoUsuario');
  const token = localStorage.getItem('token');

  const consultar = useCallback(async () => {
    if (!token || tipoUsuario !== 'secur') {
      setEstado({ obligatoria: false });
      setCargando(false);
      return;
    }
    try {
      const res = await obtenerEstadoEncuestaDocumentacion();
      setEstado(res);
    } catch {
      // No bloquear la plataforma si el endpoint falla (red / deploy parcial)
      setEstado({ obligatoria: false });
    } finally {
      setCargando(false);
    }
  }, [token, tipoUsuario]);

  useEffect(() => {
    setCargando(true);
    consultar();
    const onDone = () => consultar();
    window.addEventListener('encuesta-documentacion-completada', onDone);
    return () => window.removeEventListener('encuesta-documentacion-completada', onDone);
  }, [consultar, location.pathname]);

  if (!token || tipoUsuario !== 'secur') return children;

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
        Verificando documentación…
      </div>
    );
  }

  if (estado?.obligatoria && !enRutaEncuesta) {
    return <Navigate to={RUTA_ENCUESTA_DOCUMENTACION} replace />;
  }

  return children;
}
