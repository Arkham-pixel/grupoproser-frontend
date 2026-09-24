import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import FormularioCasoComplex from '../SubcomponenteCompex/FormularioCasoComplex';
import { actualizarCasoSura, crearCasoSura } from '../../services/segurosSuraService.js';
import { esSesionGestionarCasoSura } from '../../utils/permisosCasoPorRol.js';
import { controlHorasTieneDatos } from '../SubcomponenteCompex/controlHoras/controlHorasUtils';

const STORAGE_KEY = 'formularioSura';

const prepararPayloadSura = (payload = {}, base = {}) => {
  const resultado = { ...payload };
  if (!controlHorasTieneDatos(resultado.control_horas) && controlHorasTieneDatos(base.control_horas)) {
    resultado.control_horas = base.control_horas;
  } else if (!controlHorasTieneDatos(resultado.control_horas)) {
    delete resultado.control_horas;
  }
  if (Array.isArray(resultado.historialDocs) && resultado.historialDocs.length === 0) {
    delete resultado.historialDocs;
  }
  delete resultado.nombreResponsable;
  delete resultado.funcAsgrdraNombre;
  delete resultado.funcionarioAseguradora;
  return resultado;
};

export default function FormularioCasoSura({
  initialData = null,
  embed = false,
  onClose,
  onSaved,
  onSave,
  onCancel,
  onAutoSave,
  ...rest
}) {
  const navigate = useNavigate();
  const permitido = esSesionGestionarCasoSura();

  if (!permitido) {
    if (embed) {
      return (
        <p className="p-4 font-body text-sm text-amber-700 dark:text-amber-400">
          No tiene permiso para Gestionar / Agregar caso SURA.
        </p>
      );
    }
    return <Navigate to="/sura/reporte" replace />;
  }

  const handleSave = async (payload) => {
    if (onSave) {
      await onSave(payload);
      return;
    }
    try {
      if (initialData?._id) {
        const guardado = await actualizarCasoSura(
          initialData._id,
          prepararPayloadSura(payload, initialData)
        );
        localStorage.removeItem(STORAGE_KEY);
        window.alert(
          `Caso SURA ${guardado.consecutivo || guardado.nmroAjste || ''} actualizado.`
        );
        if (onSaved) await onSaved(guardado);
        else if (onClose) onClose();
        else if (!embed) navigate('/sura/reporte', { replace: true });
        return;
      }

      const creado = await crearCasoSura(prepararPayloadSura(payload));
      localStorage.removeItem(STORAGE_KEY);
      window.alert(`Caso SURA ${creado.consecutivo || creado.nmroAjste || ''} creado.`);
      if (onSaved) await onSaved(creado);
      else if (!embed) navigate('/sura/reporte', { replace: true });
    } catch (error) {
      console.error('Error al guardar caso SURA:', error);
      window.alert(error.message || 'No fue posible guardar el caso SURA.');
    }
  };

  const handleAutoSave = async (payload, opts = {}) => {
    if (onAutoSave) return onAutoSave(payload, opts);
    const casoId = initialData?._id || payload?._id;
    if (!casoId) return false;
    try {
      return await actualizarCasoSura(
        casoId,
        prepararPayloadSura(payload, opts.datosBase || initialData || {})
      );
    } catch (error) {
      console.error('Error en autoguardado SURA:', error);
      return false;
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else if (onClose) onClose();
    else if (!embed) navigate('/sura/reporte', { replace: true });
  };

  return (
    <FormularioCasoComplex
      variant="sura"
      initialData={initialData}
      onSave={handleSave}
      onAutoSave={initialData?._id ? handleAutoSave : undefined}
      onCancel={handleCancel}
      autoGuardadoActivo={Boolean(initialData?._id)}
      {...rest}
    />
  );
}

export function FormularioCasoSuraPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [casoDesdeUrl, setCasoDesdeUrl] = React.useState(null);
  const [cargandoCasoUrl, setCargandoCasoUrl] = React.useState(false);
  const [errorCasoUrl, setErrorCasoUrl] = React.useState('');

  const searchParams = React.useMemo(
    () => new URLSearchParams(location.search || ''),
    [location.search]
  );
  const casoIdQuery = searchParams.get('casoId') || searchParams.get('id') || '';
  const tabQuery = searchParams.get('tab') || location.state?.tab || '';

  const initialDataFromState =
    location.state?.initialData && location.state.initialData._id
      ? location.state.initialData
      : null;

  const initialData = casoDesdeUrl || initialDataFromState;

  React.useEffect(() => {
    if (location.pathname !== '/sura/carga') return;
    const datosGuardados = localStorage.getItem(STORAGE_KEY);
    if (datosGuardados) {
      try {
        const datosParseados = JSON.parse(datosGuardados);
        if (datosParseados?.nmroAjste || datosParseados?._id) {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    if (location.state && !initialDataFromState && !casoIdQuery) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate, initialDataFromState, casoIdQuery]);

  React.useEffect(() => {
    let cancelado = false;
    if (!casoIdQuery) {
      setCasoDesdeUrl(null);
      setErrorCasoUrl('');
      return undefined;
    }
    if (initialDataFromState && String(initialDataFromState._id) === String(casoIdQuery)) {
      setCasoDesdeUrl(initialDataFromState);
      return undefined;
    }
    setCargandoCasoUrl(true);
    setErrorCasoUrl('');
    (async () => {
      try {
        const { getCasoSuraById } = await import('../../services/segurosSuraService.js');
        const caso = await getCasoSuraById(casoIdQuery);
        if (!cancelado) setCasoDesdeUrl(caso);
      } catch (error) {
        if (!cancelado) {
          setCasoDesdeUrl(null);
          setErrorCasoUrl(error.message || 'No se pudo cargar el caso SURA.');
        }
      } finally {
        if (!cancelado) setCargandoCasoUrl(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [casoIdQuery, initialDataFromState]);

  if (casoIdQuery && cargandoCasoUrl && !initialData) {
    return (
      <p className="p-6 font-body text-sm text-gray-600 dark:text-gray-300">
        Cargando caso…
      </p>
    );
  }

  if (casoIdQuery && errorCasoUrl && !initialData) {
    return (
      <div className="space-y-3 p-6">
        <p className="font-body text-sm text-red-700 dark:text-red-300">{errorCasoUrl}</p>
        <button
          type="button"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          onClick={() => navigate('/sura/bandeja-facturacion')}
        >
          Volver a bandeja
        </button>
      </div>
    );
  }

  const volverTrasGuardar =
    location.state?.returnPath ||
    (casoIdQuery ? '/sura/bandeja-facturacion' : '/sura/reporte');

  return (
    <FormularioCasoSura
      initialData={initialData}
      initialTab={tabQuery || undefined}
      onCancel={() => navigate(volverTrasGuardar)}
      onSaved={async () => {
        navigate(volverTrasGuardar, { replace: true });
      }}
    />
  );
}
