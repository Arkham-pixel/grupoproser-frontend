import React from 'react';
import {
  GRUPOS_BARRA_ESTADOS_ALFA,
  homologarEstadoAlfa,
} from './segurosAlfaHelpers.js';

/**
 * Colores por grupo (mismo criterio del día de unificación de barra):
 * - Gestión: fenix primario
 * - Cierre: verde
 * - Objeción / desistimiento: ámbar
 */
const estiloChip = (activo, deshabilitado, tone = 'gestion') => {
  const base =
    'rounded-lg border px-2.5 py-1.5 text-left font-body text-[11px] font-semibold uppercase leading-tight tracking-wide transition sm:text-xs';

  const tones = {
    gestion: {
      activo: 'border-fenix-primario bg-fenix-primario text-white shadow-sm',
      inactivo:
        'border-gray-200 bg-white text-gray-700 hover:border-fenix-primario hover:text-fenix-primario dark:border-gray-700 dark:bg-[#1A1A1A] dark:text-gray-200 dark:hover:border-fenix-primario',
      disabledActivo: 'border-fenix-primario bg-fenix-primario text-white',
      disabledInactivo:
        'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
    },
    cierre: {
      activo: 'border-emerald-600 bg-emerald-600 text-white shadow-sm',
      inactivo:
        'border-emerald-200 bg-white text-emerald-800 hover:border-emerald-600 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-[#1A1A1A] dark:text-emerald-200 dark:hover:border-emerald-500',
      disabledActivo: 'border-emerald-600 bg-emerald-600 text-white',
      disabledInactivo:
        'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
    },
    objecion: {
      activo: 'border-amber-600 bg-amber-500 text-white shadow-sm',
      inactivo:
        'border-amber-200 bg-white text-amber-900 hover:border-amber-500 hover:bg-amber-50 dark:border-amber-900 dark:bg-[#1A1A1A] dark:text-amber-200 dark:hover:border-amber-500',
      disabledActivo: 'border-amber-600 bg-amber-500 text-white',
      disabledInactivo:
        'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
    },
  };

  const t = tones[tone] || tones.gestion;
  if (deshabilitado) {
    return `${base} cursor-not-allowed opacity-60 ${
      activo ? t.disabledActivo : t.disabledInactivo
    }`;
  }
  return `${base} ${activo ? t.activo : t.inactivo}`;
};

/**
 * Una sola barra de estados Alfa (etiquetas del boletín / correo).
 * El valor persistido sigue siendo el catálogo interno Arnald.
 */
export default function BarraEstadosSegurosAlfa({
  valor,
  onChange,
  disabled = false,
}) {
  const actual = homologarEstadoAlfa(valor);

  return (
    <div className="space-y-3">
      <p className="font-body text-xs text-gray-500 dark:text-gray-400">
        Estados con las etiquetas del boletín diario. ARNALD y SharePoint
        (ESTADO SINIESTRO) reciben el estado real, incluido Objetado y Desistido.
      </p>
      {GRUPOS_BARRA_ESTADOS_ALFA.map((grupo) => (
        <div key={grupo.id}>
          <p className="mb-1.5 font-heading text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {grupo.label}
          </p>
          {grupo.hint ? (
            <p className="mb-1.5 font-body text-[11px] text-gray-500 dark:text-gray-400">
              {grupo.hint}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-1.5">
            {grupo.estados.map((estado, idx) => {
              const id = typeof estado === 'string' ? estado : estado.id;
              const label = typeof estado === 'string' ? estado : estado.label;
              const activo = actual === id;
              return (
                <React.Fragment key={id}>
                  {idx > 0 && grupo.id !== 'cierre_sin_pago' ? (
                    <span
                      aria-hidden="true"
                      className="hidden text-gray-300 sm:inline dark:text-gray-600"
                    >
                      →
                    </span>
                  ) : null}
                  <button
                    type="button"
                    disabled={disabled}
                    aria-pressed={activo}
                    title={id !== label ? id : undefined}
                    className={estiloChip(activo, disabled, grupo.tone)}
                    onClick={() => {
                      if (disabled || activo) return;
                      onChange(id);
                    }}
                  >
                    {label}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
