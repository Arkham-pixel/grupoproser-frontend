import React from "react";

export default function Recomendaciones({
  recomendaciones, setRecomendaciones
}) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-indigo-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="bg-indigo-500 text-white p-2 rounded-lg mr-3">💡</span>
        RECOMENDACIONES / RECOMMENDATIONS
      </h2>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Recomendaciones y Acciones Sugeridas
        </label>
        <textarea
          value={recomendaciones}
          onChange={(e) => setRecomendaciones(e.target.value)}
          placeholder="Escriba aquí las recomendaciones, acciones sugeridas, o medidas a tomar basadas en la inspección realizada..."
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-vertical"
        />
      </div>
      
      {/* Información adicional */}
      <div className="mt-4 p-3 bg-indigo-50 rounded-md border border-indigo-200">
        <p className="text-sm text-indigo-800">
          <strong>💡 Nota:</strong> Las recomendaciones ayudan a establecer las acciones necesarias para mejorar la seguridad y eficiencia del transporte.
        </p>
      </div>
    </div>
  );
} 