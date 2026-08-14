import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FormularioCasoComplex from '../SubcomponenteCompex/FormularioCasoComplex';
import { actualizarCasoSura, crearCasoSura } from '../../services/segurosSuraService.js';
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

  const initialData =
    location.state?.initialData && location.state.initialData._id
      ? location.state.initialData
      : null;

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
    if (location.state && !initialData) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate, initialData]);

  return <FormularioCasoSura initialData={initialData} />;
}
