import React from 'react';

const AgregarFilaValoracion = ({ onAgregar, disabled = false }) => {
  return (
    <div className="acciones-valoracion">
      <button
        className="btn-agregar"
        onClick={onAgregar}
        disabled={disabled}
        title="Agregar una nueva fila de valoración"
      >
        + Agregar fila de valoración
      </button>
    </div>
  );
};

export default AgregarFilaValoracion;
