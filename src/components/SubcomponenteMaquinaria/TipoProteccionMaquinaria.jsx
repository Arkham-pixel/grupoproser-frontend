import React from "react";

export default function TipoProteccionMaquinaria({ tipoProteccion, setTipoProteccion }) {
  return (
    <div className="mb-6">
      <h2 className="font-bold mb-2 text-base">3. TIPO DE PROTECCIÓN</h2>
      <textarea
        className="w-full text-xs border border-white p-3 bg-gray-900 text-white"
        value={tipoProteccion}
        onChange={e => setTipoProteccion(e.target.value)}
        rows={4}
        placeholder="Escriba aquí el tipo de protección y contexto"
      />
    </div>
  );
}