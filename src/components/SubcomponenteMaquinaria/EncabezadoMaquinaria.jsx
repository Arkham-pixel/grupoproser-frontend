import React from "react";
import proserLogo from "../../img/PROSER_FIRMA_BLANCA_V2 (3).gif"; // Ajusta la ruta si es necesario

export default function EncabezadoMaquinaria({
  nombreAsegurado,
  setNombreAsegurado,
  nombreMaquinaria,
  setNombreMaquinaria,
  fecha,
  setFecha,
  // Nuevas props para el llenado automático
  opcionesAsegurados = [],
  opcionesAseguradoras = [],
  opcionesCiudades = [],
  onAseguradoChange,
  onAseguradoraChange,
  onCiudadChange,
  aseguradora,
  setAseguradora,
  ciudadFecha,
  setCiudadFecha
}) {
  return (
    <div className="flex flex-row items-center border border-gray-400 bg-gray-900 p-4 mb-4">
      {/* Logo */}
      <div className="w-1/3 flex justify-center items-center">
        <img
          src={proserLogo}
          alt="Logo PROSER"
          className="h-20 object-contain"
        />
      </div>
      {/* Datos principales */}
      <div className="w-2/3 flex flex-col justify-center">
        <div className="bg-gray-800 px-4 py-2 rounded-t text-sm font-semibold flex flex-col gap-2">
          {/* Dropdown para Aseguradora */}
          <select
            value={aseguradora || ''}
            onChange={(e) => {
              const selectedValue = e.target.value;
              setAseguradora(selectedValue);
              if (onAseguradoraChange) {
                onAseguradoraChange(selectedValue);
              }
            }}
            className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white font-semibold"
          >
            <option value="">Seleccione aseguradora</option>
            {opcionesAseguradoras.map(option => (
              <option key={option.value} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Campo editable para Aseguradora (permite edición manual) */}
          <input
            type="text"
            value={aseguradora}
            onChange={e => setAseguradora(e.target.value)}
            className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white font-semibold"
            placeholder="Nombre de la aseguradora (editable)"
          />
          
          {/* Dropdown para Asegurado */}
          <select
            value={nombreAsegurado || ''}
            onChange={(e) => {
              const selectedValue = e.target.value;
              setNombreAsegurado(selectedValue);
              if (onAseguradoChange) {
                onAseguradoChange(selectedValue);
              }
            }}
            className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white font-semibold"
          >
            <option value="">Seleccione asegurado</option>
            {opcionesAsegurados.map(option => (
              <option key={option.value} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Campo editable para Asegurado (permite edición manual) */}
          <input
            type="text"
            value={nombreAsegurado}
            onChange={e => setNombreAsegurado(e.target.value)}
            className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white font-semibold"
            placeholder="Nombre del asegurado (editable)"
          />
          
          <input
            type="text"
            value={nombreMaquinaria}
            onChange={e => setNombreMaquinaria(e.target.value)}
            className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white font-semibold"
            placeholder="Nombre de la maquinaria"
          />
        </div>
        <div className="flex flex-row bg-gray-800 rounded-b text-xs font-medium mt-1">
          <div className="flex-1 px-4 py-2 border-r border-gray-700 text-center">
            INSP. RIESGOS
          </div>
          <div className="flex-1 px-4 py-2 border-r border-gray-700 text-center">
            RIESGOS
          </div>
          <div className="flex-1 px-4 py-2 text-center">
            <span className="font-bold">DATE:</span>{" "}
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="bg-gray-800 border-b border-gray-600 px-2 py-1 text-white text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}