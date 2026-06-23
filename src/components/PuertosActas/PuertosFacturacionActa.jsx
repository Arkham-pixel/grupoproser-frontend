import React, { useState, useMemo } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';

const OTROS_GASTOS_OPCIONES = [
  'Seleccionar',
  'HONORARIOS',
  'VIÁTICOS',
  'TRANSPORTE',
  'ALMACENAMIENTO',
  'OTROS',
];

const filaVacia = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  otrosGastos: '',
  detalle: '',
  cantidad: '',
  valorUnitario: '',
});

export default function PuertosFacturacionActa() {
  const [valorSugerido, setValorSugerido] = useState('0.00');
  const [filas, setFilas] = useState([filaVacia()]);

  const total = useMemo(() => {
    return filas.reduce((sum, f) => {
      const c = parseFloat(f.cantidad) || 0;
      const v = parseFloat(f.valorUnitario) || 0;
      return sum + c * v;
    }, 0);
  }, [filas]);

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
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Facturación</h3>
      </header>

      <div className="p-5 space-y-5">
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Valor sugerido a facturar
          </label>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputCls}
              value={valorSugerido}
              onChange={(e) => setValorSugerido(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 text-left font-semibold w-12">No.</th>
                <th className="px-3 py-2 w-10" />
                <th className="px-3 py-2 text-left font-semibold">Otros gastos</th>
                <th className="px-3 py-2 text-left font-semibold">Detalle</th>
                <th className="px-3 py-2 text-left font-semibold w-28">Cantidad</th>
                <th className="px-3 py-2 text-left font-semibold w-32">Valor unitario</th>
                <th className="px-3 py-2 text-left font-semibold w-28">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filas.map((fila, index) => {
                const subtotal =
                  (parseFloat(fila.cantidad) || 0) * (parseFloat(fila.valorUnitario) || 0);
                return (
                  <tr key={fila.id}>
                    <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => eliminarFila(fila.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                      >
                        <FaTrash />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className={inputCls}
                        value={fila.otrosGastos}
                        onChange={(e) => actualizarFila(fila.id, 'otrosGastos', e.target.value)}
                      >
                        {OTROS_GASTOS_OPCIONES.map((op) => (
                          <option key={op} value={op === 'Seleccionar' ? '' : op}>
                            {op}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={inputCls}
                        value={fila.detalle}
                        onChange={(e) => actualizarFila(fila.id, 'detalle', e.target.value)}
                        placeholder="Detalle"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        className={inputCls}
                        value={fila.cantidad}
                        onChange={(e) => actualizarFila(fila.id, 'cantidad', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={inputCls}
                        value={fila.valorUnitario}
                        onChange={(e) => actualizarFila(fila.id, 'valorUnitario', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200 font-medium">
                      ${subtotal.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={agregarFila}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <FaPlus /> nueva fila
          </button>
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
            <span>Total:</span>
            <span className="text-slate-500">$</span>
            <span className="rounded-lg bg-slate-100 dark:bg-slate-700 px-4 py-2 min-w-[120px] text-right">
              {total.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
