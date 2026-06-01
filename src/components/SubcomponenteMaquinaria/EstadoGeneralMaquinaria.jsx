import React from "react";

export default function EstadoGeneralMaquinaria({
  electrico, setElectrico,
  mecanico, setMecanico,
  hidraulico, setHidraulico,
  pintura, setPintura,
  chasis, setChasis,
  locomocion, setLocomocion,
  mantenimiento, setMantenimiento,
  funcionamiento, setFuncionamiento
}) {
  return (
    <div className="mb-6">
      <h2 className="font-bold mb-2 text-base">2.1. ESTADO GENERAL</h2>
      <table className="w-full text-xs border border-white mb-4">
        <tbody>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">ELÉCTRICO E INSTRUMENTOS</td>
            <td className="border border-white px-2 py-1">
              <textarea
                value={electrico}
                onChange={e => setElectrico(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                rows={2}
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">SISTEMA MECÁNICO</td>
            <td className="border border-white px-2 py-1">
              <textarea
                value={mecanico}
                onChange={e => setMecanico(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                rows={2}
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">SISTEMA HIDRÁULICO</td>
            <td className="border border-white px-2 py-1">
              <textarea
                value={hidraulico}
                onChange={e => setHidraulico(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                rows={2}
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">PINTURA</td>
            <td className="border border-white px-2 py-1">
              <textarea
                value={pintura}
                onChange={e => setPintura(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                rows={2}
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">CHASIS</td>
            <td className="border border-white px-2 py-1">
              <textarea
                value={chasis}
                onChange={e => setChasis(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                rows={2}
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">SISTEMA DE LOCOMOCIÓN</td>
            <td className="border border-white px-2 py-1">
              <textarea
                value={locomocion}
                onChange={e => setLocomocion(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                rows={2}
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">MANTENIMIENTO</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={mantenimiento}
                onChange={e => setMantenimiento(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">FUNCIONAMIENTO</td>
            <td className="border border-white px-2 py-1">
              <textarea
                value={funcionamiento}
                onChange={e => setFuncionamiento(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                rows={2}
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}