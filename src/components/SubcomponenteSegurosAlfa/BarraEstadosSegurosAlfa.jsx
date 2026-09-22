import React from 'react';
import {
  GRUPOS_BARRA_ESTADOS_ALFA,
  homologarEstadoGestionAlfa,
  homologarEstadoSiniestroAlfa,
  estadosSiniestroPermitidosParaGestionAlfa,
} from './segurosAlfaHelpers.js';
import { puedeTipificarProcesoDePagoAlfa } from '../../utils/permisosCasoPorRol.js';

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

function toneSiniestro(id) {
  if (id === 'OBJETADO' || id === 'DESISTIDO') return 'objecion';
  return 'cierre';
}

/**
 * Dos barras independientes con relación oficial:
 * cada gestión solo habilita los siniestros permitidos en su etapa.
 * PROCESO DE PAGO: Leyna / Silvia / Daniela / Oscar + fecha envío aseguradora.
 */
export default function BarraEstadosSegurosAlfa({
  valorGestion,
  valorSiniestro,
  onChangeGestion,
  onChangeSiniestro,
  disabled = false,
  caso = {},
  puedeProcesoDePago,
}) {
  const actualGestion = homologarEstadoGestionAlfa(valorGestion);
  const actualSiniestro = homologarEstadoSiniestroAlfa(valorSiniestro, caso);
  const siniestrosPermitidos = new Set(estadosSiniestroPermitidosParaGestionAlfa(actualGestion));
  const autorizadoProceso =
    typeof puedeProcesoDePago === 'boolean'
      ? puedeProcesoDePago
      : puedeTipificarProcesoDePagoAlfa();

  return (
    <div className="space-y-5">
      <p className="font-body text-xs text-gray-500 dark:text-gray-400">
        Cada estado de gestión solo admite los estados de siniestro de su etapa (flujo
        oficial Alfa). Desistido va con Inspeccionado; Objetado va con Liquidado.
        PROCESO DE PAGO solo lo pueden tipificar Leyna, Silvia, Daniela u Oscar.
      </p>
      {GRUPOS_BARRA_ESTADOS_ALFA.map((grupo) => {
        const esGestion = grupo.id === 'gestion';
        const actual = esGestion ? actualGestion : actualSiniestro;
        const onChange = esGestion ? onChangeGestion : onChangeSiniestro;
        return (
          <div key={grupo.id}>
            <p className="mb-1.5 font-heading text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {grupo.label}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {grupo.estados.map((estado) => {
                const id = typeof estado === 'string' ? estado : estado.id;
                const label = typeof estado === 'string' ? estado : estado.label;
                const activo = actual === id;
                const fueraDeEtapa = !esGestion && !siniestrosPermitidos.has(id);
                let bloqueoProceso = false;
                let titleProceso;
                if (!esGestion && id === 'PROCESO DE PAGO' && !activo) {
                  if (!autorizadoProceso) {
                    bloqueoProceso = true;
                    titleProceso =
                      'Solo Leyna, Silvia, Daniela u Oscar pueden tipificar PROCESO DE PAGO';
                  }
                }
                const chipDisabled = disabled || fueraDeEtapa || bloqueoProceso;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={chipDisabled}
                    aria-pressed={activo}
                    title={
                      titleProceso ||
                      (fueraDeEtapa
                        ? `No permitido con gestión «${actualGestion}»`
                        : id !== label
                          ? id
                          : undefined)
                    }
                    className={estiloChip(
                      activo,
                      chipDisabled,
                      esGestion ? grupo.tone : toneSiniestro(id)
                    )}
                    onClick={() => {
                      if (chipDisabled || activo) return;
                      onChange?.(id);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
