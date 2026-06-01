// src/components/SubcomponentesRiesgo/DatosPrecargados.jsx
import React , { useEffect } from 'react';

export default function DatosPrecargados({ formData, setFormData }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const DatosPrecargados = ({ datos, setFormData }) => {
  useEffect(() => {
    if (datos) {
      setFormData(prev => ({
        ...prev,
        aseguradora: datos.aseguradora || '',
        direccion: datos.direccion || '',
        ciudad: datos.ciudad || '',
        asegurado: datos.asegurado || '',
        fechaInspeccion: datos.fechaInspeccion || '',
        // Puedes agregar más campos aquí si decides incluirlos en el formulario
      }));
    }
  }, [datos, setFormData]);

  return null; // No renderiza nada visual, solo aplica los datos
};

  return (
    <div className="space-y-3 sm:space-y-4">
      <div>
        <label className="block text-xs sm:text-sm font-medium mb-1">Aseguradora:</label>
        <input
          type="text"
          name="aseguradora"
          value={formData.aseguradora}
          onChange={handleChange}
          className="border p-2 sm:p-3 rounded w-full text-xs sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-xs sm:text-sm font-medium mb-1">Dirección:</label>
        <input
          type="text"
          name="direccion"
          value={formData.direccion}
          onChange={handleChange}
          className="border p-2 sm:p-3 rounded w-full text-xs sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-xs sm:text-sm font-medium mb-1">Ciudad:</label>
        <input
          type="text"
          name="ciudad"
          value={formData.ciudad}
          onChange={handleChange}
          className="border p-2 sm:p-3 rounded w-full text-xs sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-xs sm:text-sm font-medium mb-1">Asegurado:</label>
        <input
          type="text"
          name="asegurado"
          value={formData.asegurado}
          onChange={handleChange}
          className="border p-2 sm:p-3 rounded w-full text-xs sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-xs sm:text-sm font-medium mb-1">Fecha Inspección:</label>
        <input
          type="date"
          name="fechaInspeccion"
          value={formData.fechaInspeccion}
          onChange={handleChange}
          className="border p-2 sm:p-3 rounded w-full text-xs sm:text-sm"
        />
      </div>
    </div>
  );
}
