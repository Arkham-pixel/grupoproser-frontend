import React from "react";

export default function DescripcionBienAsegurado({
  descripcion, setDescripcion,
  marca, setMarca,
  modelo, setModelo,
  linea, setLinea,
  motorDiesel, setMotorDiesel,
  sistemaLocomocion, setSistemaLocomocion,
  color, setColor,
  estadoOperativo, setEstadoOperativo,
  cabina, setCabina,
  funcion, setFuncion,
  equipoContraincendio, setEquipoContraincendio,
  equipoRadio, setEquipoRadio,
  radiodeOperacion, setRadiodeOperacion
}) {
  return (
    <div className="mb-6">
      <h2 className="font-bold mb-2 text-base">2. DESCRIPCIÓN DEL BIEN ASEGURADO</h2>
      <table className="w-full text-xs border border-white mb-4">
        <tbody>
          <tr>
            <td className="border border-white px-2 py-1 font-bold align-top">DESCRIPCIÓN</td>
            <td className="border border-white px-2 py-1">
              <textarea
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                rows={3}
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
            <td className="border border-white px-2 py-1 font-bold">MODELO</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={modelo}
                onChange={e => setModelo(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">LÍNEA</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={linea}
                onChange={e => setLinea(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">MOTOR DIESEL</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={motorDiesel}
                onChange={e => setMotorDiesel(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">SISTEMA DE LOCOMOCIÓN</td>
            <td className="border border-white px-2 py-1">
              <textarea
                value={sistemaLocomocion}
                onChange={e => setSistemaLocomocion(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                rows={2}
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">COLOR</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">ESTADO OPERATIVO</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={estadoOperativo}
                onChange={e => setEstadoOperativo(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">CABINA</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={cabina}
                onChange={e => setCabina(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold align-top">FUNCIÓN</td>
            <td className="border border-white px-2 py-1">
              <textarea
                value={funcion}
                onChange={e => setFuncion(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                rows={2}
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">EQUIPO CONTRAINCENDIO</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={equipoContraincendio}
                onChange={e => setEquipoContraincendio(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
          <tr>
            <td className="border border-white px-2 py-1 font-bold">EQUIPO DE RADIO COMUNICACIÓN</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={equipoRadio}
                onChange={e => setEquipoRadio(e.target.value)}
                className="w-full bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
                placeholder="Escriba aquí"
              />
            </td>
          </tr>
              <tr>
            <td className="border border-white px-2 py-1 font-bold">RADIO DE OPERACION</td>
            <td className="border border-white px-2 py-1">
              <input
                type="text"
                value={radiodeOperacion}
                onChange={e => setRadiodeOperacion(e.target.value)}
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