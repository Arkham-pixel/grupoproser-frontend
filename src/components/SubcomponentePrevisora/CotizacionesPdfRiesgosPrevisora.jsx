import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTrash } from 'react-icons/fa';
import CotizacionPdfLiquidacion from '../liquidacion/CotizacionPdfLiquidacion.jsx';
import {
  crearRiesgoCotizacionPdfPrevisora,
  normalizarCotizacionesPdfRiesgosPrevisora,
  patchRiesgosCotizacionPdfPrevisora,
  resumenCotizacionesPdfRiesgosPrevisora,
} from '../liquidacion/cotizacionPdfLiquidacion.js';
import { formatearMonto } from './liquidadorPrevisoraHelpers.js';
import {
  expressBtnGhost,
  expressBtnSecondary,
} from '../SubcomponenteExpress/expressFenixUi.js';

/**
 * Varias cotizaciones PDF por riesgo: sumatoria en liquidador e informe Word.
 */
export default function CotizacionesPdfRiesgosPrevisora({
  liquidador = {},
  onChange,
  casoId = null,
  api = null,
  archivosCaso = [],
  onArchivosCreados,
  onArchivosEliminados,
  disabled = false,
  compactEmpty = false,
  i18nPrefix = 'previsora.settlement',
} = {}) {
  const { t } = useTranslation();
  const tq = (key, opts) => t(`${i18nPrefix}.${key}`, opts);

  const riesgos = useMemo(
    () => normalizarCotizacionesPdfRiesgosPrevisora(liquidador),
    [liquidador]
  );
  const resumen = useMemo(
    () => resumenCotizacionesPdfRiesgosPrevisora(liquidador),
    [liquidador]
  );

  const emitir = (riesgosNext) => {
    if (!onChange) return;
    onChange(patchRiesgosCotizacionPdfPrevisora(liquidador, riesgosNext));
  };

  const actualizarRiesgo = (id, patch) => {
    emitir(
      riesgos.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          ...patch,
          cotizacion:
            Object.prototype.hasOwnProperty.call(patch, 'cotizacion')
              ? patch.cotizacion
              : r.cotizacion,
        };
      })
    );
  };

  const agregarRiesgo = () => {
    const n = riesgos.length + 1;
    emitir([
      ...riesgos,
      crearRiesgoCotizacionPdfPrevisora({ etiqueta: `Riesgo ${n}` }, riesgos.length),
    ]);
  };

  const quitarRiesgo = (id) => {
    if (riesgos.length <= 1) {
      emitir([crearRiesgoCotizacionPdfPrevisora({ id: 'riesgo-1', etiqueta: 'Riesgo 1' }, 0)]);
      return;
    }
    const next = riesgos.filter((r) => r.id !== id);
    emitir(
      next.map((r, i) => ({
        ...r,
        etiqueta: /^Riesgo\s+\d+$/i.test(String(r.etiqueta || '').trim())
          ? `Riesgo ${i + 1}`
          : r.etiqueta,
      }))
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h4 className="font-body text-sm font-semibold text-gray-900 dark:text-gray-100">
            {tq('quoteRisksTitle', {
              defaultValue: 'Cotizaciones PDF por riesgo',
            })}
          </h4>
          <p className="mt-1 font-body text-xs text-gray-600 dark:text-gray-400">
            {tq('quoteRisksHint', {
              defaultValue:
                'Puede cargar una cotización por cada riesgo. Los montos marcados se suman en el liquidador y todas las páginas van al Word.',
            })}
          </p>
        </div>

        {resumen.nUsadas > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-slate-50 px-4 py-2 text-sm dark:border-gray-800 dark:bg-slate-900/40">
            <span className="text-gray-700 dark:text-gray-200">
              {tq('quoteRisksSum', {
                count: resumen.nUsadas,
                defaultValue: 'Suma de {{count}} riesgo(s)',
              })}
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-50">
              $ {formatearMonto(resumen.total)}
            </span>
          </div>
        ) : null}

        <div className="space-y-4 p-4">
          {riesgos.map((riesgo, idx) => (
            <div
              key={riesgo.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex flex-wrap items-end gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
                <label className="min-w-[10rem] flex-1">
                  <span className="mb-1 block text-xs font-medium text-gray-500">
                    {tq('quoteRiskLabel', { defaultValue: 'Nombre del riesgo' })}
                  </span>
                  <input
                    type="text"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900"
                    value={riesgo.etiqueta || ''}
                    disabled={disabled}
                    onChange={(e) =>
                      actualizarRiesgo(riesgo.id, { etiqueta: e.target.value })
                    }
                    placeholder={`Riesgo ${idx + 1}`}
                  />
                </label>
                {riesgos.length > 1 ? (
                  <button
                    type="button"
                    className={`${expressBtnGhost} inline-flex items-center gap-1.5`}
                    disabled={disabled}
                    onClick={() => quitarRiesgo(riesgo.id)}
                    title={tq('quoteRiskRemove', { defaultValue: 'Quitar este riesgo' })}
                  >
                    <FaTrash className="h-3 w-3" aria-hidden />
                    {tq('quoteRiskRemove', { defaultValue: 'Quitar riesgo' })}
                  </button>
                ) : null}
              </div>
              <div className="p-3">
                <CotizacionPdfLiquidacion
                  i18nPrefix={i18nPrefix}
                  value={riesgo.cotizacion}
                  onChange={(cotizacion) =>
                    actualizarRiesgo(riesgo.id, { cotizacion })
                  }
                  titulo={tq('quoteRiskTitle', {
                    name: riesgo.etiqueta || `Riesgo ${idx + 1}`,
                    defaultValue: `Cotización · ${riesgo.etiqueta || `Riesgo ${idx + 1}`}`,
                  })}
                  hint={tq('quoteHint')}
                  compactEmpty={compactEmpty && idx === 0 && riesgos.length === 1}
                  casoId={casoId}
                  api={api}
                  archivosCaso={archivosCaso}
                  onArchivosCreados={onArchivosCreados}
                  onArchivosEliminados={onArchivosEliminados}
                  disabled={disabled}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <button
            type="button"
            className={`${expressBtnSecondary} inline-flex items-center gap-2`}
            disabled={disabled}
            onClick={agregarRiesgo}
          >
            <FaPlus className="h-3.5 w-3.5" aria-hidden />
            {tq('quoteAddRisk', {
              defaultValue: 'Agregar el otro riesgo',
            })}
          </button>
        </div>
      </div>
    </div>
  );
}
