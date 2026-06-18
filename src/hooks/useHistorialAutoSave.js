import { useCallback } from 'react';
import historialService from '../services/historialService';
import { useFormAutoSave } from './useFormAutoSave';

/**
 * Autoguardado para formularios del historial.
 * Servidor: solo actualizarFormulario (misma copia). Nunca guardarFormulario.
 */
export function useHistorialAutoSave({
  formKeyBase,
  formularioId,
  formData,
  buildHistorialPayload,
  enabled = true,
  excludeFields = [],
  serverReady = true,
  canSaveServer = null,
  localInterval = 30000,
  serverInterval = 60000,
  onRestore,
}) {
  const onServerUpdate = useCallback(
    async (_formData, { recordId }) => {
      const id = recordId || formularioId;
      if (!id || id === 'nuevo') return;

      const payload = buildHistorialPayload(_formData);
      await historialService.actualizarFormulario(id, {
        ...payload,
        fechaModificacion: new Date().toISOString(),
      });
    },
    [formularioId, buildHistorialPayload]
  );

  return useFormAutoSave({
    formKeyBase,
    recordId: formularioId,
    formData,
    enabled,
    excludeFields,
    onRestore,
    onServerUpdate,
    serverReady,
    canSaveServer,
    localInterval,
    serverInterval,
  });
}
