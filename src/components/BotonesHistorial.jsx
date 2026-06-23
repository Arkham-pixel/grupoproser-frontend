import React from 'react';

const BotonesHistorial = ({ 
  onGuardarEnHistorial, 
  onExportar, 
  tipoFormulario, 
  tituloFormulario,
  deshabilitado = false,
  guardando = false,
  exportando = false
}) => {
  return (
    <div className="mb-8 mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:space-x-4">
      <button
        onClick={onGuardarEnHistorial}
        disabled={deshabilitado || guardando}
        className={`btn-fenix-primary flex items-center justify-center gap-2 py-3 px-6 font-bold shadow-lg transition duration-300 ${
          deshabilitado || guardando ? 'cursor-not-allowed opacity-50' : ''
        }`}
        title={deshabilitado ? 'Complete los campos requeridos para guardar' : 'Guardar progreso en el historial'}
      >
        {guardando ? '⏳ Guardando...' : '💾 Guardar en Historial'}
      </button>
      
      <button
        onClick={onExportar}
        disabled={deshabilitado || exportando}
        className={`btn-fenix-secondary flex items-center justify-center gap-2 py-3 px-6 font-bold shadow-lg transition duration-300 ${
          deshabilitado || exportando ? 'cursor-not-allowed opacity-50' : ''
        }`}
        title={deshabilitado ? 'Complete los campos requeridos para exportar' : `Exportar ${tituloFormulario}`}
      >
        {exportando ? '⏳ Exportando...' : `📄 Exportar ${tituloFormulario}`}
      </button>
    </div>
  );
};

export default BotonesHistorial;
