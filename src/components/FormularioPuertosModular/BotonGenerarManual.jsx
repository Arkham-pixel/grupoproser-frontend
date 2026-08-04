import React from 'react';
import { useTranslation } from 'react-i18next';
import { generarManualPuertos } from './generarManualPuertos';

export default function BotonGenerarManual() {
  const { t } = useTranslation();
  // Verificar si el usuario es administrador
  const esAdmin = localStorage.getItem('rol') === 'admin';
  
  const handleGenerarManual = async () => {
    try {
      await generarManualPuertos();
      alert(t('ports.ui.formulario.botonManual.alerts.exito'));
    } catch (error) {
      console.error('Error al generar manual:', error);
      alert(t('ports.ui.formulario.botonManual.alerts.error', { error: error.message }));
    }
  };

  // Solo mostrar el botón si es administrador
  if (!esAdmin) {
    return null;
  }

  return (
    <button
      onClick={handleGenerarManual}
      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
    >
      {t('ports.ui.formulario.botonManual.boton')}
    </button>
  );
}
