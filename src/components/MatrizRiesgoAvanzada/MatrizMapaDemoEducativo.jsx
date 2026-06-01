import React from 'react';
import { matrizCard, matrizCardTitle } from './matrizFenixUi';

/** Matriz 5×5 de ejemplo solo para la pestaña Información (didáctica). */
const FILAS = [
  ['yellow-risk', 'orange-risk', 'red-risk', 'red-risk', 'red-risk'],
  ['yellow-risk', 'yellow-risk', 'orange-risk', 'red-risk', 'red-risk'],
  ['green-risk', 'yellow-risk', 'orange-risk', 'orange-risk', 'red-risk'],
  ['green-risk', 'yellow-risk', 'yellow-risk', 'yellow-risk', 'orange-risk'],
  ['green-risk', 'green-risk', 'green-risk', 'yellow-risk', 'yellow-risk'],
];

const LEYENDA = [
  { clase: 'green-risk', label: 'Bajo' },
  { clase: 'yellow-risk', label: 'Medio-bajo' },
  { clase: 'orange-risk', label: 'Medio-alto' },
  { clase: 'red-risk', label: 'Alto' },
];

export default function MatrizMapaDemoEducativo() {
  return (
    <div className={`${matrizCard} matriz-mapa-demo`}>
      <h3 className={matrizCardTitle}>Ejemplo de matriz (probabilidad × impacto)</h3>
      <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-300">
        En la sección <strong>Mapa de calor</strong> verás tus riesgos reales con los mismos colores
        según probabilidad e impacto.
      </p>

      <div className="mx-auto max-w-[520px]">
        <div className="mb-2 flex items-end gap-2">
          <span className="w-8 shrink-0 font-heading text-xs font-bold uppercase tracking-wide text-gray-500">
            Prob.
          </span>
          <div className="flex-1 text-center font-heading text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200">
            Impacto
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-[#141414]">
          {FILAS.map((fila, i) => (
            <div key={i} className="mb-1 flex items-stretch gap-1 last:mb-0">
              <span className="flex w-8 shrink-0 items-center justify-center font-body text-sm font-semibold text-gray-600">
                {5 - i}
              </span>
              {fila.map((celda, j) => (
                <div key={j} className={`matrix-cell ${celda} min-h-[52px] flex-1 rounded-md`} />
              ))}
            </div>
          ))}
          <div className="mt-2 flex justify-around pl-8 font-body text-sm font-semibold text-gray-700 dark:text-gray-200">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className="w-8 text-center">
                {n}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {LEYENDA.map((item) => (
            <span key={item.clase} className="flex items-center gap-2 font-body text-xs text-gray-600">
              <span className={`matrix-cell ${item.clase} h-4 w-4 rounded`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
