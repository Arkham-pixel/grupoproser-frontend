import React from 'react';
import {
  GRUPOS_BARRA_ESTADOS_ALFA,
  homologarEstadoAlfa,
} from './segurosAlfaHelpers.js';

const estiloChip = (activo, deshabilitado) => {
  const base =
    'rounded-lg border px-2.5 py-1.5 text-left font-body text-[11px] font-semibold uppercase leading-tight tracking-wide transition sm:text-xs';
  if (deshabilitado) {
    return `${base} cursor-not-allowed opacity-60 ${
      activo
        ? 'border-fenix-primario bg-fenix-primario text-white'
        : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'
    }`;
  }
  if (activo) {
    return `${base} border-fenix-primario bg-fenix-primario text-white shadow-sm`;
  }
  return `${base} border-gray-200 bg-white text-gray-700 hover:border-fenix-primario hover:text-fenix-primario dark:border-gray-700 dark:bg-[#1A1A1A] dark:text-gray-200 dark:hover:border-fenix-primario`;
};

/**
 * Una sola barra de estados Alfa (gestión del correo + cierre de liquidación).
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
        Un solo estado por caso: gestión operativa y cierre de liquidación.
        OBJETADO y DESISTIDO se guardan en ARNALD; en SharePoint quedan como CERRADO.
        La observación de gestión se completa sola.
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
              const activo = actual === estado;
              return (
                <React.Fragment key={estado}>
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
                    className={estiloChip(activo, disabled)}
                    onClick={() => {
                      if (disabled || activo) return;
                      onChange(estado);
                    }}
                  >
                    {estado}
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
