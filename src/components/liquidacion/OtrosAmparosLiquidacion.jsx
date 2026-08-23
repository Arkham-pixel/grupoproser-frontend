import React from 'react';
import {
  formatMilesInputNsr10,
  formatMilesNsr10,
} from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import {
  TIPOS_OTROS_AMPAROS,
  defaultOtrosAmparos,
  nombreTipoOtroAmparo,
  nuevoOtroAmparo,
  recalcularValorOtroAmparo,
  sumarOtrosAmparos,
} from './otrosAmparosLiquidacion.js';

/**
 * Editor de arriendo / retiro de escombros (sin deducible).
 * Usado en liquidadores CAT NSR (Sura, Allianz, Zurich, Previsora, BBVA) y Complex.
 */
export default function OtrosAmparosLiquidacion({
  otrosAmparos = [],
  onChange,
  className = '',
} = {}) {
  const filas = Array.isArray(otrosAmparos) && otrosAmparos.length
    ? otrosAmparos
    : defaultOtrosAmparos();
  const total = sumarOtrosAmparos(filas);

  const patchFila = (index, patch = {}) => {
    const base = filas.map((it) => ({ ...it }));
    if (!base[index]) return;
    let next = { ...base[index], ...patch };
    if (Object.prototype.hasOwnProperty.call(patch, 'tipo')) {
      const cat = TIPOS_OTROS_AMPAROS.find((t) => t.id === patch.tipo);
      next.unidad = cat?.unidadDefault || next.unidad || 'glb';
      if (patch.tipo !== 'otro') next.nombre = cat?.nombre || next.nombre;
    }
    const tocaronCantVu =
      Object.prototype.hasOwnProperty.call(patch, 'cantidad') ||
      Object.prototype.hasOwnProperty.call(patch, 'valorUnitario');
    if (tocaronCantVu) next = recalcularValorOtroAmparo(next);
    base[index] = next;
    onChange?.(base);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Otros amparos (sin deducible)
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Arriendo, retiro de escombros y similares se liquidan por aparte: no se les aplica
          deducible ni AIU.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-gray-50 text-left text-[11px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <tr>
              <th className="px-2 py-2">Aplica</th>
              <th className="px-2 py-2">Amparo</th>
              <th className="px-2 py-2">Observación</th>
              <th className="px-2 py-2">Und</th>
              <th className="px-2 py-2">Cant.</th>
              <th className="px-2 py-2">Vlr. unitario</th>
              <th className="px-2 py-2">Valor</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {filas.map((it, idx) => (
              <tr key={it.id || idx} className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-blue-700"
                    checked={it.aplica !== false}
                    onChange={(e) => patchFila(idx, { aplica: e.target.checked })}
                  />
                </td>
                <td className="px-1 py-1 min-w-[180px]">
                  <select
                    className="w-full rounded border border-gray-200 bg-transparent px-1 py-1 text-sm dark:border-gray-600"
                    value={it.tipo || 'otro'}
                    onChange={(e) => patchFila(idx, { tipo: e.target.value })}
                  >
                    {TIPOS_OTROS_AMPAROS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                  {it.tipo === 'otro' ? (
                    <input
                      className="mt-1 w-full border-0 bg-transparent px-1 text-sm outline-none"
                      value={it.nombre || ''}
                      onChange={(e) => patchFila(idx, { nombre: e.target.value })}
                      placeholder="Nombre del amparo"
                    />
                  ) : (
                    <p className="mt-0.5 px-1 text-[11px] text-gray-500">
                      {nombreTipoOtroAmparo(it.tipo, it.nombre)}
                    </p>
                  )}
                </td>
                <td className="px-1 py-1 min-w-[140px]">
                  <input
                    className="w-full border-0 bg-transparent px-1 py-1 text-sm outline-none"
                    value={it.observacion || ''}
                    onChange={(e) => patchFila(idx, { observacion: e.target.value })}
                    placeholder={
                      it.tipo === 'arriendo' ? 'Ej. 3 meses inhabitabilidad' : 'Soporte / nota'
                    }
                  />
                </td>
                <td className="px-1 py-1 w-14">
                  <input
                    className="w-full border-0 bg-transparent px-1 py-1 text-sm outline-none"
                    value={it.unidad || ''}
                    onChange={(e) => patchFila(idx, { unidad: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1 w-16">
                  <input
                    className="w-full border-0 bg-transparent px-1 py-1 text-sm outline-none"
                    value={it.cantidad ?? ''}
                    onChange={(e) => patchFila(idx, { cantidad: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1 w-28">
                  <input
                    className="w-full border-0 bg-transparent px-1 py-1 text-right text-sm outline-none"
                    value={
                      it.valorUnitario === '' || it.valorUnitario == null
                        ? ''
                        : formatMilesNsr10(it.valorUnitario)
                    }
                    onChange={(e) =>
                      patchFila(idx, {
                        valorUnitario: formatMilesInputNsr10(e.target.value),
                      })
                    }
                  />
                </td>
                <td className="px-1 py-1 w-28">
                  <input
                    className="w-full border-0 bg-transparent px-1 py-1 text-right text-sm outline-none"
                    value={
                      it.valor === '' || it.valor == null ? '' : formatMilesNsr10(it.valor)
                    }
                    onChange={(e) =>
                      patchFila(idx, { valor: formatMilesInputNsr10(e.target.value) })
                    }
                  />
                </td>
                <td className="px-1 py-1 text-center">
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => onChange?.(filas.filter((_, i) => i !== idx))}
                  >
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="text-sm font-semibold text-blue-700 hover:underline dark:text-sky-300"
          onClick={() => onChange?.([...filas, nuevoOtroAmparo()])}
        >
          + Agregar amparo
        </button>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Subtotal otros amparos: $ {formatMilesNsr10(total || 0)}
        </p>
      </div>
    </div>
  );
}
