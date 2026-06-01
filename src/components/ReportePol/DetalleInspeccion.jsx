import React from "react";

export default function DetalleInspeccion({
  lugarReconocimiento, setLugarReconocimiento,
  pesoTara, setPesoTara,
  pesoNeto, setPesoNeto,
  pesoBruto, setPesoBruto
}) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-red-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="bg-red-500 text-white p-2 rounded-lg mr-3">⚖️</span>
        DETALLE DE INSPECCIÓN
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Lugar de Reconocimiento / Place of Survey *
          </label>
          <input
            type="text"
            value={lugarReconocimiento}
            onChange={(e) => setLugarReconocimiento(e.target.value)}
            placeholder="Ej: SPB-PARE"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Peso Tara / Tare Weight (kg)
          </label>
          <input
            type="number"
            value={pesoTara}
            onChange={(e) => setPesoTara(e.target.value)}
            placeholder="Ej: 2361.55"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Peso Neto / Net Weight (kg) *
          </label>
          <input
            type="number"
            value={pesoNeto}
            onChange={(e) => setPesoNeto(e.target.value)}
            placeholder="Ej: 8301.49"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Peso Bruto / Gross Weight (kg) *
          </label>
          <input
            type="number"
            value={pesoBruto}
            onChange={(e) => setPesoBruto(e.target.value)}
            placeholder="Ej: 10663.04"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Información adicional */}
      <div className="mt-4 p-3 bg-red-50 rounded-md border border-red-200">
        <p className="text-sm text-red-800">
          <strong>💡 Nota:</strong> Los pesos deben ser ingresados en kilogramos (kg). El peso bruto es la suma del peso tara + peso neto.
        </p>
      </div>
    </div>
  );
} 