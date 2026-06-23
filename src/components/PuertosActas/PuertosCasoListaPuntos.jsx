import React from 'react';
import { FaPlus, FaTrash, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { inputCls } from './PuertosCasoDatosGenerales';
import { nuevoPuntoInforme } from './puertosCasoExportacionState';
import { puertosBtnLink, puertosBtnSm, puertosInnerPanel } from './puertosFenixUi';

export default function PuertosCasoListaPuntos({
  titulo,
  puntos = [],
  onChange,
  placeholder = 'Escriba un punto…',
}) {
  const setPuntos = (updater) => onChange(updater);

  const actualizar = (id, texto) => {
    setPuntos((prev) => prev.map((p) => (p.id === id ? { ...p, texto } : p)));
  };

  const eliminar = (id) => {
    setPuntos((prev) => prev.filter((p) => p.id !== id));
  };

  const mover = (id, delta) => {
    setPuntos((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0) return prev;
      const next = idx + delta;
      if (next < 0 || next >= prev.length) return prev;
      const copia = [...prev];
      [copia[idx], copia[next]] = [copia[next], copia[idx]];
      return copia;
    });
  };

  return (
    <div className={`${puertosInnerPanel} space-y-3`}>
      {titulo && (
        <div className="flex items-center justify-between gap-2">
          <span className="font-body text-sm font-semibold text-gray-800 dark:text-gray-200">{titulo}</span>
          <button type="button" onClick={() => setPuntos((prev) => [...(prev || []), nuevoPuntoInforme()])} className={puertosBtnSm}>
            <FaPlus /> Punto
          </button>
        </div>
      )}
      {puntos.length === 0 && (
        <p className="font-body text-xs italic text-gray-500">Sin puntos. Use «Punto» para numerar el informe.</p>
      )}
      <ol className="list-none space-y-2">
        {puntos.map((punto, idx) => (
          <li key={punto.id} className="flex items-start gap-2">
            <span className="mt-2 w-5 shrink-0 font-body text-xs font-bold text-fenix-primario">{idx + 1}.</span>
            <input
              type="text"
              className={`${inputCls} flex-1`}
              value={punto.texto || ''}
              onChange={(e) => actualizar(punto.id, e.target.value)}
              placeholder={placeholder}
            />
            <div className="flex shrink-0 flex-col gap-0.5">
              <button type="button" onClick={() => mover(punto.id, -1)} className="p-1 text-gray-500 hover:text-fenix-primario" title="Subir">
                <FaArrowUp className="text-xs" />
              </button>
              <button type="button" onClick={() => mover(punto.id, 1)} className="p-1 text-gray-500 hover:text-fenix-primario" title="Bajar">
                <FaArrowDown className="text-xs" />
              </button>
              <button type="button" onClick={() => eliminar(punto.id)} className="p-1 text-fenix-primario" title="Eliminar">
                <FaTrash className="text-xs" />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
