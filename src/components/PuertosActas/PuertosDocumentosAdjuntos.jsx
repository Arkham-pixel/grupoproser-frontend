import React, { useState } from 'react';
import { FaPlus, FaTrash, FaFileAlt } from 'react-icons/fa';

const FORMATOS = 'doc, xls, csv, txt, ppt, pdf, zip, jpeg, jpg, gif, png';

const filaVacia = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  nombreLocal: '',
  nombreDocumento: '',
  archivo: null,
});

export default function PuertosDocumentosAdjuntos() {
  const [tipos, setTipos] = useState({
    facturaComercial: false,
    listaEmpaque: false,
    docTransporte: false,
  });
  const [filas, setFilas] = useState([filaVacia()]);

  const toggleTipo = (key) => {
    setTipos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const agregarFila = () => setFilas((prev) => [...prev, filaVacia()]);

  const eliminarFila = (id) => {
    setFilas((prev) => (prev.length <= 1 ? prev : prev.filter((f) => f.id !== id)));
  };

  const actualizarFila = (id, campo, valor) => {
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));
  };

  const inputCls =
    'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm';

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <header className="px-5 py-3 bg-slate-100 dark:bg-slate-700/80 border-b border-slate-200 dark:border-slate-600">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Documentos adjuntos</h3>
      </header>

      <div className="p-5 space-y-5">
        <div className="flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={tipos.facturaComercial}
              onChange={() => toggleTipo('facturaComercial')}
              className="rounded border-slate-300"
            />
            Factura Comercial
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={tipos.listaEmpaque}
              onChange={() => toggleTipo('listaEmpaque')}
              className="rounded border-slate-300"
            />
            Lista de Empaque
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={tipos.docTransporte}
              onChange={() => toggleTipo('docTransporte')}
              className="rounded border-slate-300"
            />
            Doc. de Transporte
          </label>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 text-left font-semibold w-10" />
                <th className="px-3 py-2 text-left font-semibold">Documento</th>
                <th className="px-3 py-2 text-left font-semibold">Nombre local del archivo</th>
                <th className="px-3 py-2 text-left font-semibold">Nombre de documento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filas.map((fila) => (
                <tr key={fila.id}>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => eliminarFila(fila.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                      title="Eliminar fila"
                    >
                      <FaTrash />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FaFileAlt className="text-slate-400 shrink-0" />
                      <div>
                        <input type="file" className="text-xs max-w-[200px]" />
                        <p className="text-xs text-slate-400 mt-1">{FORMATOS}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className={inputCls}
                      value={fila.nombreLocal}
                      onChange={(e) => actualizarFila(fila.id, 'nombreLocal', e.target.value)}
                      placeholder="Archivo local"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className={inputCls}
                      value={fila.nombreDocumento}
                      onChange={(e) => actualizarFila(fila.id, 'nombreDocumento', e.target.value)}
                      placeholder="Nombre de documento"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={agregarFila}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <FaPlus /> nuevo documento
        </button>
      </div>
    </section>
  );
}
