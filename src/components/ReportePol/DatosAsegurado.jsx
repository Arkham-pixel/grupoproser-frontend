import React, { useMemo, useState, useEffect } from "react";
import { aseguradorasConFuncionarios } from "../../data/aseguradorasFuncionarios";
import { generarSucursalesParaAseguradora, buscarSucursales } from "../../data/sucursales";

export default function DatosAsegurado({
  aseguradora, setAseguradora,
  sucursal, setSucursal,
  asegurado, setAsegurado,
  numPiezas, setNumPiezas,
  tipoEmpaque, setTipoEmpaque,
  claseMercancia, setClaseMercancia,
  pedidoNo, setPedidoNo,
  fechaConstruccion, setFechaConstruccion
}) {
  // Extraer la lista de aseguradoras
  const aseguradoras = useMemo(() => Object.keys(aseguradorasConFuncionarios).sort((a, b) => a.localeCompare(b, 'es')), []);
  
  // Estado para las sucursales filtradas
  const [sucursalesFiltradas, setSucursalesFiltradas] = useState([]);
  const [sucursalBuscada, setSucursalBuscada] = useState("");
  
  // Generar lista de sucursales para la aseguradora seleccionada
  useEffect(() => {
    if (aseguradora) {
      const sucursales = generarSucursalesParaAseguradora(aseguradora);
      setSucursalesFiltradas(sucursales);
    } else {
      setSucursalesFiltradas([]);
    }
  }, [aseguradora]);

  // Filtrar sucursales basado en la búsqueda
  const sucursalesMostradas = useMemo(() => {
    return buscarSucursales(sucursalesFiltradas, sucursalBuscada);
  }, [sucursalesFiltradas, sucursalBuscada]);

  // Limpiar sucursal cuando cambie la aseguradora
  useEffect(() => {
    setSucursal("");
    setSucursalBuscada("");
  }, [aseguradora, setSucursal]);

  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-green-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="bg-green-500 text-white p-2 rounded-lg mr-3">🏢</span>
        DATOS DEL ASEGURADO
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Primera fila */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Aseguradora / Insurer *
          </label>
          <select
            value={aseguradora}
            onChange={(e) => setAseguradora(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Seleccionar aseguradora...</option>
            {aseguradoras
              .sort((a, b) => a.localeCompare(b))
              .map((aseg) => (
                <option key={aseg} value={aseg}>
                  {aseg}
                </option>
              ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Sucursal / Branch *
          </label>
          <div className="space-y-2">
            {aseguradora ? (
              <>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={sucursalBuscada}
                    onChange={(e) => setSucursalBuscada(e.target.value)}
                    placeholder="Buscar sucursal..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => setSucursalBuscada("")}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-md transition-colors duration-200"
                    title="Limpiar búsqueda"
                  >
                    ✕
                  </button>
                </div>
                <select
                  value={sucursal}
                  onChange={(e) => setSucursal(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Seleccionar sucursal...</option>
                  {sucursalesMostradas.map((suc) => (
                    <option key={suc} value={suc}>
                      {suc}
                    </option>
                  ))}
                </select>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{sucursalesMostradas.length} sucursales disponibles</span>
                  {sucursalBuscada && (
                    <span>Filtradas por: "{sucursalBuscada}"</span>
                  )}
                </div>
                
                {/* Campo para sucursal personalizada */}
                <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-200">
                  <p className="text-xs text-blue-800 mb-2">
                    <strong>💡 Opción personalizada:</strong> Si no encuentras la sucursal, puedes escribirla manualmente:
                  </p>
                  <input
                    type="text"
                    value={sucursal && sucursal.startsWith(aseguradora) ? sucursal.replace(`${aseguradora} `, '') : ""}
                    onChange={(e) => {
                      const valor = e.target.value;
                      if (valor) {
                        setSucursal(`${aseguradora} ${valor}`);
                      } else {
                        setSucursal("");
                      }
                    }}
                    placeholder={`Escribir sucursal personalizada...`}
                    className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            ) : (
              <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500">
                Primero selecciona una aseguradora
              </div>
            )}
          </div>
        </div>
        
        {/* Segunda fila */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Asegurado / Insured *
          </label>
          <input
            type="text"
            value={asegurado}
            onChange={(e) => setAsegurado(e.target.value)}
            placeholder="Ej: CONSUMER ELECTRONICS GROUP S.A.S"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            N. de Piezas / No. of Packages *
          </label>
          <input
            type="number"
            value={numPiezas}
            onChange={(e) => setNumPiezas(e.target.value)}
            placeholder="Ej: 1"
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        
        {/* Tercera fila */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Tipo de Empaque / Type of Package *
          </label>
          <select
            value={tipoEmpaque}
            onChange={(e) => setTipoEmpaque(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Seleccionar tipo...</option>
            <option value="CONTENEDOR DE 40 PIES">CONTENEDOR DE 40 PIES</option>
            <option value="CONTENEDOR DE 20 PIES">CONTENEDOR DE 20 PIES</option>
            <option value="CONTENEDOR DE 45 PIES">CONTENEDOR DE 45 PIES</option>
            <option value="CARGA SUELTA">CARGA SUELTA</option>
            <option value="PALETIZADO">PALETIZADO</option>
            <option value="OTRO">OTRO</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Clase de Mercancía / Type of commodities *
          </label>
          <input
            type="text"
            value={claseMercancia}
            onChange={(e) => setClaseMercancia(e.target.value)}
            placeholder="Ej: TELEVISORES"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        
        {/* Cuarta fila */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Pedido No. / Order No. *
          </label>
          <input
            type="text"
            value={pedidoNo}
            onChange={(e) => setPedidoNo(e.target.value)}
            placeholder="Ej: EXPO-274-25"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Fecha de Construcción / Construction Date *
          </label>
          <input
            type="datetime-local"
            value={fechaConstruccion}
            onChange={(e) => setFechaConstruccion(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Información adicional */}
      <div className="mt-4 p-3 bg-green-50 rounded-md border border-green-200">
        <p className="text-sm text-green-800">
          <strong>💡 Nota:</strong> Los campos marcados con * son obligatorios para generar el documento POL. 
          La sucursal se filtra automáticamente según la aseguradora seleccionada.
        </p>
      </div>
    </div>
  );
} 