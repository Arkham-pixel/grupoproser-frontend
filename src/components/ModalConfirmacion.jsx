import React from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const ModalConfirmacion = ({ 
  isOpen, 
  onClose, 
  titulo = "Confirmación", 
  mensaje = "", 
  tipo = "success", // success, warning, error, info
  botonTexto = "Aceptar",
  mostrarCancelar = false,
  onConfirmar = null
}) => {
  if (!isOpen) return null;

  const getIcono = () => {
    switch (tipo) {
      case 'success':
        return <FaCheckCircle className="text-green-500 text-4xl" />;
      case 'warning':
        return <FaExclamationTriangle className="text-yellow-500 text-4xl" />;
      case 'error':
        return <FaExclamationTriangle className="text-red-500 text-4xl" />;
      case 'info':
        return <FaInfoCircle className="text-blue-500 text-4xl" />;
      default:
        return <FaCheckCircle className="text-green-500 text-4xl" />;
    }
  };

  const getColorBorde = () => {
    switch (tipo) {
      case 'success':
        return 'border-green-200';
      case 'warning':
        return 'border-yellow-200';
      case 'error':
        return 'border-red-200';
      case 'info':
        return 'border-blue-200';
      default:
        return 'border-green-200';
    }
  };

  const getColorFondo = () => {
    switch (tipo) {
      case 'success':
        return 'bg-green-50';
      case 'warning':
        return 'bg-yellow-50';
      case 'error':
        return 'bg-red-50';
      case 'info':
        return 'bg-blue-50';
      default:
        return 'bg-green-50';
    }
  };

  const getColorBoton = () => {
    switch (tipo) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'error':
        return 'bg-red-600 hover:bg-red-700';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700';
      default:
        return 'bg-green-600 hover:bg-green-700';
    }
  };

  const handleConfirmar = () => {
    if (onConfirmar) {
      onConfirmar();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className={`relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 ${getColorBorde()} border-2`}>
        {/* Header */}
        <div className={`px-6 py-4 rounded-t-lg ${getColorFondo()}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getIcono()}
              <h3 className="text-lg font-semibold text-gray-900">
                {titulo}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-gray-700 text-sm leading-relaxed">
            {mensaje}
          </p>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
          {mostrarCancelar && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleConfirmar}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${getColorBoton()}`}
          >
            {botonTexto}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmacion;
