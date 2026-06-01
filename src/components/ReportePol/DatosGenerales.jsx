import React, { useMemo } from "react";
import colombia from "../../data/colombia.json";

export default function DatosGenerales({
  ciudad, setCiudad,
  fecha, setFecha,
  hora, setHora,
  tipoInspeccion, setTipoInspeccion,
  fechaLlegada, setFechaLlegada,
  regional, setRegional
}) {
  // Extraer todas las ciudades únicas de colombia.json
  const ciudadesColombia = useMemo(() => {
    const set = new Set();
    colombia.forEach(dep => dep.ciudades.forEach(c => set.add(c)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, []);

  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-blue-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="bg-blue-500 text-white p-2 rounded-lg mr-3">📋</span>
        DATOS GENERALES
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Primera fila - 4 campos */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Ciudad / City *
          </label>
          <select
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Seleccionar ciudad...</option>
            {ciudadesColombia.map((ciudadItem) => (
              <option key={ciudadItem} value={ciudadItem}>
                {ciudadItem}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Fecha / Date *
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Hora / Hour *
          </label>
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Regional *
          </label>
          <input
            type="text"
            value={regional}
            onChange={(e) => setRegional(e.target.value)}
            placeholder="Ej: BUENAVENTURA"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Segunda fila - 2 campos */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Tipo Inspección / Type Survey *
          </label>
          <select
            value={tipoInspeccion}
            onChange={(e) => setTipoInspeccion(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Seleccionar tipo...</option>
            <option value="INSP. ANTINARCOTICOS">INSP. ANTINARCOTICOS</option>
            <option value="INSP. ADUANERA">INSP. ADUANERA</option>
            <option value="INSP. SANITARIA">INSP. SANITARIA</option>
            <option value="INSP. FITOSANITARIA">INSP. FITOSANITARIA</option>
            <option value="INSP. GENERAL">INSP. GENERAL</option>
            <option value="OTRO">OTRO</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Fecha de Llegada (Arrival Date) *
          </label>
          <input
            type="date"
            value={fechaLlegada}
            onChange={(e) => setFechaLlegada(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Información adicional */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>💡 Nota:</strong> Los campos marcados con * son obligatorios para generar el documento POL.
        </p>
      </div>
    </div>
  );
} 