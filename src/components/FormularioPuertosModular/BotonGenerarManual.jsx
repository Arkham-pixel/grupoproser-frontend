import React from 'react';
import { generarManualPuertos } from './generarManualPuertos';

export default function BotonGenerarManual() {
  // Verificar si el usuario es administrador
  const esAdmin = localStorage.getItem('rol') === 'admin';
  
  const handleGenerarManual = async () => {
    try {
      await generarManualPuertos();
      alert('✅ Manual generado exitosamente');
    } catch (error) {
      console.error('Error al generar manual:', error);
      alert('Error al generar el manual: ' + error.message);
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
      📘 Generar Manual de Uso
    </button>
  );
}


