import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import historialService from '../services/historialService';

export const useHistorialFormulario = (tipoFormulario) => {
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const { id } = useParams();

  const guardarEnHistorial = useCallback(async (datos, estado = 'en_proceso') => {
    try {
      setGuardando(true);
      
      // Agregar fechas automáticamente
      const datosConFechas = {
        ...datos,
        fechaCreacion: datos.fechaCreacion || new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      };

// Verificar si es una actualización o creación nueva
      const idParaActualizar = id;
if (idParaActualizar && idParaActualizar !== 'nuevo') {
        // Actualizar formulario existente
await historialService.actualizarFormulario(idParaActualizar, datosConFechas);
return {
          success: true,
          message: estado === 'completado' 
            ? '✅ Formulario completado y actualizado en el historial' 
            : '💾 Progreso actualizado en el historial exitosamente'
        };
      } else {
        // Crear nuevo formulario
const nuevoHistorial = {
          tipo: tipoFormulario,
          estado,
          ...datosConFechas
        };

        await historialService.guardarFormulario(nuevoHistorial);
return {
          success: true,
          message: estado === 'completado' 
            ? '✅ Formulario completado y guardado en el historial' 
            : '💾 Progreso guardado en el historial exitosamente'
        };
      }
    } catch (error) {
      console.error('Error guardando en historial:', error);
      return {
        success: false,
        message: '❌ Error al guardar en el historial: ' + error.message
      };
    } finally {
      setGuardando(false);
    }
  }, [tipoFormulario, id]);

  const exportarYGuardar = useCallback(async (datos, funcionExportar) => {
    try {
      setExportando(true);
      
      // Primero exportar
      await funcionExportar();
      
      // Luego guardar en historial como completado
      const resultado = await guardarEnHistorial(datos, 'completado');
      
      return resultado;
    } catch (error) {
      console.error('Error en exportación:', error);
      return {
        success: false,
        message: '❌ Error en la exportación: ' + error.message
      };
    } finally {
      setExportando(false);
    }
  }, [guardarEnHistorial]);

  return {
    guardando,
    exportando,
    guardarEnHistorial,
    exportarYGuardar
  };
};
