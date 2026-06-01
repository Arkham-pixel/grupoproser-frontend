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
    <div className="flex justify-center space-x-4 mt-8 mb-8">
      <button
        onClick={onGuardarEnHistorial}
        disabled={deshabilitado || guardando}
        className={`font-bold py-3 px-6 rounded-lg shadow-lg transition duration-300 flex items-center gap-2 ${
          deshabilitado || guardando
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
        title={deshabilitado ? 'Complete los campos requeridos para guardar' : 'Guardar progreso en el historial'}
      >
        {guardando ? '⏳ Guardando...' : '💾 Guardar en Historial'}
      </button>
      
      <button
        onClick={onExportar}
        disabled={deshabilitado || exportando}
        className={`font-bold py-3 px-6 rounded-lg shadow-lg transition duration-300 flex items-center gap-2 ${
          deshabilitado || exportando
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
        title={deshabilitado ? 'Complete los campos requeridos para exportar' : `Exportar ${tituloFormulario}`}
      >
        {exportando ? '⏳ Exportando...' : `📄 Exportar ${tituloFormulario}`}
      </button>
    </div>
  );
};

export default BotonesHistorial;
