import React from "react";

export default function TablaInspeccionMaquinaria({
  aseguradora, setAseguradora,
  equipo, setEquipo,
  marca, setMarca,
  referencia, setReferencia,
  tomador, setTomador,
  lugar, setLugar,
  ubicacion, setUbicacion,
  departamento, setDepartamento,
  inspector, setInspector,
  fechaInspeccion, setFechaInspeccion,
  atendido, setAtendido
}) {
  return (
    <div className="mb-6">
      <h2 className="font-bold mb-2 text-base">1. INFORME DE INSPECCIÓN MAQUINARIA</h2>
      <table className="w-full text-xs border border-white mb-4">
        <tbody>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">ASEGURADORA</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={aseguradora}
                onChange={e => setAseguradora(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">EQUIPO INSPECCIONADO</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={equipo}
                onChange={e => setEquipo(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">MARCA</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={marca}
                onChange={e => setMarca(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">REFERENCIA</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">TOMADOR</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={tomador}
                onChange={e => setTomador(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">LUGAR INSPECCION</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={lugar}
                onChange={e => setLugar(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">UBICACION</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={ubicacion}
                onChange={e => setUbicacion(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">DEPARTAMENTO</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={departamento}
                onChange={e => setDepartamento(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">INSPECTOR</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={inspector}
                onChange={e => setInspector(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">FECHA DE INSPECCIÓN</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={fechaInspeccion}
                onChange={e => setFechaInspeccion(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">ATENDIDO</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={atendido}
                onChange={e => setAtendido(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}