import React, { useState, useRef, useEffect } from "react";
import proserLogo from "../../img/Logo.png"; // Usa PNG

export default function FirmaMaquinaria({ fecha }) {
  const [inspectores, setInspectores] = useState([
    "ARNALDO TAPIA GUTIERREZ",
    "JUAN PÉREZ",
  ]);
  const [cargos, setCargos] = useState([
    "Gerente/Ing. Riesgos.",
    "Inspector de Maquinaria",
  ]);
  const [nuevoInspector, setNuevoInspector] = useState("");
  const [nuevoCargo, setNuevoCargo] = useState("");
  const [inspectorSeleccionado, setInspectorSeleccionado] = useState(inspectores[0]);
  const [cargoSeleccionado, setCargoSeleccionado] = useState(cargos[0]);
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Ajustar tamaño del canvas en dispositivos retina solo una vez
  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 300 * dpr;
    canvas.height = 100 * dpr;
    canvas.style.width = "300px";
    canvas.style.height = "100px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#fff";
  }, []);

  // Obtener posición relativa
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY,
      };
    }
  };

  // Dibujo de firma
  const startDrawing = (e) => {
    setDrawing(true);
    const pos = getPos(e);
    lastPos.current = pos;
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!drawing) return;
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDrawing = () => {
    setDrawing(false);
  };

  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Agregar inspector
  const agregarInspector = () => {
    if (nuevoInspector && !inspectores.includes(nuevoInspector)) {
      setInspectores([...inspectores, nuevoInspector]);
      setInspectorSeleccionado(nuevoInspector);
      setNuevoInspector("");
    }
  };

  // Eliminar inspector
  const eliminarInspector = (nombre) => {
    const nuevos = inspectores.filter((i) => i !== nombre);
    setInspectores(nuevos);
    if (inspectorSeleccionado === nombre && nuevos.length > 0) {
      setInspectorSeleccionado(nuevos[0]);
    }
  };

  // Agregar cargo
  const agregarCargo = () => {
    if (nuevoCargo && !cargos.includes(nuevoCargo)) {
      setCargos([...cargos, nuevoCargo]);
      setCargoSeleccionado(nuevoCargo);
      setNuevoCargo("");
    }
  };

  // Eliminar cargo
  const eliminarCargo = (nombre) => {
    const nuevos = cargos.filter((c) => c !== nombre);
    setCargos(nuevos);
    if (cargoSeleccionado === nombre && nuevos.length > 0) {
      setCargoSeleccionado(nuevos[0]);
    }
  };

  return (
    <div className="mt-10 text-xs text-white">
      <div className="mb-2">
        En espera de haber realizado satisfactoriamente la asignación de la
        Inspección y análisis del riesgo y agradeciendo la confianza depositada
        en nuestros servicios profesionales, suscribimos
      </div>
      <div className="mb-2">Atentamente,</div>
      <img src={proserLogo} alt="Firma PROSER" className="h-14 mb-2" />

      {/* Inspector */}
      <div className="mb-2 flex items-center gap-2">
        <select
          value={inspectorSeleccionado}
          onChange={(e) => setInspectorSeleccionado(e.target.value)}
          className="bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
        >
          {inspectores.map((inspector, idx) => (
            <option key={idx} value={inspector}>
              {inspector}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={nuevoInspector}
          onChange={(e) => setNuevoInspector(e.target.value)}
          placeholder="Nuevo inspector"
          className="bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
        />
        <button
          onClick={agregarInspector}
          className="bg-green-700 px-2 py-1 rounded text-xs"
        >
          Agregar
        </button>
        {inspectores.length > 1 && (
          <button
            onClick={() => eliminarInspector(inspectorSeleccionado)}
            className="bg-red-700 px-2 py-1 rounded text-xs"
          >
            Eliminar
          </button>
        )}
      </div>

      {/* Cargo */}
      <div className="mb-2 flex items-center gap-2">
        <select
          value={cargoSeleccionado}
          onChange={(e) => setCargoSeleccionado(e.target.value)}
          className="bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
        >
          {cargos.map((cargo, idx) => (
            <option key={idx} value={cargo}>
              {cargo}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={nuevoCargo}
          onChange={(e) => setNuevoCargo(e.target.value)}
          placeholder="Nuevo cargo"
          className="bg-gray-800 border-b border-gray-600 px-2 py-1 text-white"
        />
        <button
          onClick={agregarCargo}
          className="bg-green-700 px-2 py-1 rounded text-xs"
        >
          Agregar
        </button>
        {cargos.length > 1 && (
          <button
            onClick={() => eliminarCargo(cargoSeleccionado)}
            className="bg-red-700 px-2 py-1 rounded text-xs"
          >
            Eliminar
          </button>
        )}
      </div>

      {/* Área de firma */}
      <div className="mb-2">
        <div className="mb-1">Área de firma (dibuje con el mouse o el dedo):</div>
        <canvas
          ref={canvasRef}
          width={300}
          height={100}
          style={{ background: "#222", border: "1px solid #fff", borderRadius: 4, touchAction: "none" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <button
          onClick={limpiarFirma}
          className="bg-red-700 px-2 py-1 rounded text-xs mt-2"
        >
          Limpiar firma
        </button>
      </div>
      <div className="font-bold">{inspectorSeleccionado}</div>
      <div className="font-bold">{cargoSeleccionado}</div>
      <div className="mt-2">Fecha: {fecha}</div>
    </div>
  );
}