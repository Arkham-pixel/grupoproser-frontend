import React from 'react';
import {
  ANIOS_SMMLV,
  parsearNumero,
} from '../SubcomponenteExpress/liquidadorExpressHelpers.js';
import CampoTomadorAlfa from '../SubcomponenteSegurosAlfa/CampoTomadorAlfa.jsx';
import {
  etiquetaOpcionDeducibleAlfa,
  listarOpcionesDeduciblePorTomadorAlfa,
  obtenerOpcionDeducibleAlfaPorId,
  patchDeducibleDesdeOpcionAlfa,
} from '../SubcomponenteSegurosAlfa/tomadoresAlfaCatalogo.js';
import { reglaDeducibleModulo } from './reglasDeducibleCatExpress.js';

const COP = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const inputCls =
  'w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-body text-sm dark:border-gray-700 dark:bg-gray-900';

const pill = (activo) =>
  `rounded-lg px-2.5 py-1 font-body text-xs font-semibold ${
    activo
      ? 'bg-fenix-primario text-white'
      : 'border border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
  }`;

export default function EditorDeducibleCatExpress({
  modulo = '',
  cfg = {},
  valorAsegurado = 0,
  desglose = {},
  calc = {},
  tomador = '',
  onChange,
  onTomadorChange,
  disabled = false,
}) {
  const regla = reglaDeducibleModulo(modulo);
  const esAlfa = String(modulo).toLowerCase() === 'alfa';
  const modo = cfg.modo || 'max_pct_minimo';
  const tipoMinimo = cfg.tipoMinimo === 'SMDLV' ? 'SMDLV' : 'SMMLV';
  const basePct =
    String(cfg.basePctDeducible || cfg.baseDeducible || '').trim() === 'perdida'
      ? 'perdida'
      : 'valor_asegurable';
  const opcionesAlfa = esAlfa ? listarOpcionesDeduciblePorTomadorAlfa(tomador) : [];
  const montoMostrado =
    modo === 'valor_fijo'
      ? cfg.valorFijo ?? desglose.aplicado ?? ''
      : desglose.aplicado ?? calc.deducibleAplicado ?? 0;
  const emitir = (patch) => {
    if (!disabled) onChange?.(patch);
  };

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div>
        <p className="font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
          Deducible {regla?.label || 'CAT'}
        </p>
        <p className="mt-0.5 font-body text-xs text-gray-500">
          {regla?.hint || 'Se aplica el mayor entre el % y el mínimo SMMLV, con tope en la pérdida.'}
        </p>
      </div>

      {esAlfa && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 font-body text-xs font-semibold text-gray-600 dark:text-gray-300">
              Tomador
            </p>
            <CampoTomadorAlfa
              value={tomador}
              onChange={(valor) => onTomadorChange?.(valor)}
              mostrarGestion={false}
              ocultarLabel
              className="space-y-0"
            />
          </div>
          {opcionesAlfa.length > 0 && (
            <label className="block font-body text-xs font-semibold text-gray-600 dark:text-gray-300">
              Deducible póliza / cartera
              <select
                className={`${inputCls} mt-1`}
                disabled={disabled}
                value={cfg.opcionDeducibleId || ''}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) {
                    emitir({ opcionDeducibleId: '' });
                    return;
                  }
                  const op = obtenerOpcionDeducibleAlfaPorId(id);
                  if (!op) return;
                  emitir({
                    ...patchDeducibleDesdeOpcionAlfa(op, cfg),
                    modo: 'max_pct_minimo',
                  });
                }}
              >
                <option value="">Seleccione deducible según póliza…</option>
                {opcionesAlfa.map((o) => (
                  <option key={o.id} value={o.id}>
                    {etiquetaOpcionDeducibleAlfa(o)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'max_pct_minimo', label: 'Mayor % / SMMLV' },
          { id: 'solo_porcentaje', label: 'Solo %' },
          { id: 'solo_minimo', label: 'Solo mínimo' },
          { id: 'valor_fijo', label: 'Monto fijo' },
          { id: 'no_aplica', label: 'No aplica' },
        ].map((op) => (
          <button
            key={op.id}
            type="button"
            disabled={disabled}
            className={pill(modo === op.id)}
            onClick={() => emitir({ modo: op.id })}
          >
            {op.label}
          </button>
        ))}
      </div>

      {modo !== 'no_aplica' && modo !== 'valor_fijo' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="block font-body text-xs font-semibold text-gray-600 dark:text-gray-300">
            %
            <input
              className={`${inputCls} mt-1 text-right`}
              inputMode="decimal"
              disabled={disabled || modo === 'solo_minimo'}
              value={cfg.porcentaje ?? ''}
              onChange={(e) => emitir({ porcentaje: e.target.value, modo })}
            />
          </label>
          <label className="block font-body text-xs font-semibold text-gray-600 dark:text-gray-300">
            {tipoMinimo}
            <input
              className={`${inputCls} mt-1 text-right`}
              inputMode="decimal"
              disabled={disabled || modo === 'solo_porcentaje'}
              value={tipoMinimo === 'SMDLV' ? cfg.cantidadSMDLV ?? '' : cfg.cantidadSMMLV ?? ''}
              onChange={(e) =>
                emitir(
                  tipoMinimo === 'SMDLV'
                    ? { cantidadSMDLV: e.target.value, modo }
                    : { cantidadSMMLV: e.target.value, modo }
                )
              }
            />
          </label>
          <label className="block font-body text-xs font-semibold text-gray-600 dark:text-gray-300">
            Año SMMLV
            <select
              className={`${inputCls} mt-1`}
              disabled={disabled}
              value={cfg.anioSMMLV || ''}
              onChange={(e) => emitir({ anioSMMLV: Number(e.target.value) })}
            >
              {ANIOS_SMMLV.map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </select>
          </label>
          <label className="block font-body text-xs font-semibold text-gray-600 dark:text-gray-300">
            Mínimo
            <div className="mt-1 flex gap-1">
              <button
                type="button"
                className={pill(tipoMinimo === 'SMMLV')}
                disabled={disabled}
                onClick={() => emitir({ tipoMinimo: 'SMMLV' })}
              >
                SMMLV
              </button>
              <button
                type="button"
                className={pill(tipoMinimo === 'SMDLV')}
                disabled={disabled}
                onClick={() => emitir({ tipoMinimo: 'SMDLV' })}
              >
                SMDLV
              </button>
            </div>
          </label>
        </div>
      )}

      {modo !== 'no_aplica' && modo !== 'valor_fijo' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={pill(basePct === 'valor_asegurable')}
            disabled={disabled}
            onClick={() => emitir({ basePctDeducible: 'valor_asegurable' })}
          >
            % sobre valor asegurable
          </button>
          <button
            type="button"
            className={pill(basePct === 'perdida')}
            disabled={disabled}
            onClick={() => emitir({ basePctDeducible: 'perdida' })}
          >
            % sobre la pérdida
          </button>
        </div>
      )}

      {modo !== 'no_aplica' && (
        <label className="block max-w-xs font-body text-xs font-semibold text-gray-600 dark:text-gray-300">
          Monto deducible (COP)
          <input
            className={`${inputCls} mt-1 text-right`}
            inputMode="decimal"
            disabled={disabled}
            value={
              modo === 'valor_fijo'
                ? cfg.valorFijo === 0 || cfg.valorFijo
                  ? String(cfg.valorFijo)
                  : ''
                : montoMostrado
            }
            onChange={(e) => {
              const crudo = e.target.value.replace(/[^\d.,]/g, '');
              emitir({
                modo: 'valor_fijo',
                valorFijo: crudo,
                texto: 'Valor fijo',
              });
            }}
          />
          <span className="mt-1 block font-normal text-gray-500">
            Puede escribir el valor. Si lo edita, se usa como monto fijo.
            {modo !== 'valor_fijo' && montoMostrado
              ? ` Calculado ahora: ${COP(montoMostrado)}.`
              : ''}
          </span>
        </label>
      )}

      <p className="font-body text-xs text-gray-500">
        {regla?.usaSid ? 'Valor SID' : 'Valor asegurable'}: {COP(valorAsegurado)}
        {valorAsegurado <= 0
          ? ' · Falta diligenciarlo en el encabezado; el % se compara contra la pérdida.'
          : ''}
      </p>

      <div className="grid grid-cols-2 gap-2 font-body text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-gray-500">Monto %</p>
          <p className="font-medium">{COP(desglose.montoPctOVa || calc.deduciblePorcentaje || 0)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Mínimo {tipoMinimo}</p>
          <p className="font-medium">{COP(desglose.montoSmmlv || 0)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Se aplica</p>
          <p className="font-medium">{desglose.tipoGanadorLabel || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Deducible</p>
          <p className="font-semibold text-gray-900 dark:text-gray-50">
            {COP(parsearNumero(desglose.aplicado) || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
