import React from "react";
import Select from "react-select";

export default function CartaPresentacionMaquinaria({
  ciudadFecha,
  setCiudadFecha,
  fecha,
  setFecha,
  destinatario,
  setDestinatario,
  asegurado,
  setAsegurado,
  maquinaria,
  setMaquinaria,
  referencia,
  setReferencia,
  saludo,
  setSaludo,
  cuerpo,
  setCuerpo,
  foto,
  setFoto,
  // Nuevas props para datos maestros
  opcionesCiudades = [],
  opcionesAseguradoras = [],
  onCiudadChange,
  onAseguradoraChange
}) {
  const saludosPredeterminados = [
    "Estimados señores:",
    "Cordial saludo.",
    "Apreciados señores:",
  ];

  return (
    <div className="text-white text-sm">
      {/* Ciudad */}
      <div className="mb-2">
        <label className="block mb-1 font-semibold">Ciudad</label>
        <Select
          options={opcionesCiudades}
          value={opcionesCiudades.find(opt => opt.value === ciudadFecha) || null}
          onChange={(opt) => {
            if (opt) {
              setCiudadFecha(opt.label);
              if (onCiudadChange) {
                onCiudadChange(opt.value);
              }
            } else {
              setCiudadFecha("");
            }
          }}
          placeholder="Seleccione ciudad"
          isClearable
          className="text-sm"
          styles={{
            control: styles => ({
              ...styles,
              backgroundColor: "#1F2937", // bg-gray-800
              color: "white",
              borderColor: "#4B5563",
            }),
            singleValue: styles => ({ ...styles, color: "white" }),
            input: styles => ({ ...styles, color: "white" }),
            menu: styles => ({ ...styles, backgroundColor: "#1F2937", color: "white" }),
            option: (styles, state) => ({
              ...styles,
              backgroundColor: state.isFocused ? "#374151" : "#1F2937",
              color: "white",
            }),
          }}
        />
        {/* Campo editable para ciudad */}
        <input
          type="text"
          value={ciudadFecha}
          onChange={e => setCiudadFecha(e.target.value)}
          className="w-full mt-1 bg-gray-800 text-white border-b border-gray-600 px-2 py-1"
          placeholder="Ciudad (editable)"
        />
      </div>

      {/* Fecha */}
      <div className="mb-2">
        <label className="block mb-1 font-semibold">Fecha</label>
        <input
          type="date"
          className="w-full bg-gray-800 text-white border-b border-gray-600 px-2 py-1"
          value={fecha}
          onChange={e => setFecha(e.target.value)}
          placeholder="Fecha"
        />
      </div>

      {/* Aseguradora */}
      <div className="mb-2">
        <label className="block mb-1 font-semibold">Aseguradora</label>
        <Select
          options={opcionesAseguradoras}
          value={opcionesAseguradoras.find(opt => opt.value === destinatario) || null}
          onChange={(opt) => {
            if (opt) {
              setDestinatario(opt.label);
              if (onAseguradoraChange) {
                onAseguradoraChange(opt.value);
              }
            } else {
              setDestinatario("");
            }
          }}
          placeholder="Seleccione aseguradora"
          isClearable
          className="text-sm"
          styles={{
            control: styles => ({
              ...styles,
              backgroundColor: "#1F2937", // bg-gray-800
              color: "white",
              borderColor: "#4B5563",
            }),
            singleValue: styles => ({ ...styles, color: "white" }),
            input: styles => ({ ...styles, color: "white" }),
            menu: styles => ({ ...styles, backgroundColor: "#1F2937", color: "white" }),
            option: (styles, state) => ({
              ...styles,
              backgroundColor: state.isFocused ? "#374151" : "#1F2937",
              color: "white",
            }),
          }}
        />
        {/* Campo editable para aseguradora */}
        <input
          type="text"
          value={destinatario}
          onChange={e => setDestinatario(e.target.value)}
          className="w-full mt-1 bg-gray-800 text-white border-b border-gray-600 px-2 py-1"
          placeholder="Aseguradora (editable)"
        />
      </div>

      {/* Referencia */}
      <div className="mb-2">
        <label className="block mb-1 font-semibold">Referencia</label>
        <textarea
          className="w-full bg-gray-800 text-white border-b border-gray-600 px-2 py-1"
          value={referencia}
          onChange={e => setReferencia(e.target.value)}
          placeholder="Referencia"
          rows={2}
        />
      </div>

      {/* Asegurado */}
      <div className="mb-2">
        <label className="block mb-1 font-semibold">Asegurado</label>
        <input
          type="text"
          className="w-full bg-gray-800 text-white border-b border-gray-600 px-2 py-1"
          value={asegurado}
          onChange={e => setAsegurado(e.target.value)}
          placeholder="Nombre del asegurado"
        />
      </div>

      {/* Maquinaria */}
      <div className="mb-2">
        <label className="block mb-1 font-semibold">Maquinaria</label>
        <input
          type="text"
          className="w-full bg-gray-800 text-white border-b border-gray-600 px-2 py-1"
          value={maquinaria}
          onChange={e => setMaquinaria(e.target.value)}
          placeholder="Nombre de la maquinaria"
        />
      </div>

      {/* Saludo predeterminado */}
      <div className="mb-2">
        <label className="block mb-1 font-semibold">Saludo</label>
        <div className="flex gap-2">
          <select
            className="bg-gray-800 text-white border-b border-gray-600 px-2 py-1"
            value={saludo}
            onChange={e => setSaludo(e.target.value)}
          >
            <option value="">Seleccione un saludo</option>
            {saludosPredeterminados.map((s, i) => (
              <option key={i} value={s}>{s}</option>
            ))}
          </select>
          <input
            type="text"
            className="flex-1 bg-gray-800 text-white border-b border-gray-600 px-2 py-1"
            value={saludo}
            onChange={e => setSaludo(e.target.value)}
            placeholder="Otro saludo"
          />
        </div>
      </div>

      {/* Cuerpo */}
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Texto de presentación</label>
        <textarea
          className="w-full bg-gray-800 text-white border-b border-gray-600 px-2 py-1"
          value={cuerpo}
          onChange={e => setCuerpo(e.target.value)}
          placeholder="Texto de presentación"
          rows={3}
        />
      </div>
    </div>
  );
}
