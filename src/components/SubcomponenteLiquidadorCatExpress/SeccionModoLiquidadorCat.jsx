import React, { useMemo } from 'react';
import LiquidadorCatExpress from './LiquidadorCatExpress.jsx';
import {
  aplicarFilasExpress,
  asegurarModoExpress,
  construirFilasExpress,
  esLiquidadorExpress,
  liquidacionExpressConDeducible,
  marcarModoRobusto,
  tipoExpressDeLiquidador,
} from './liquidadorCatExpressHelpers.js';
import { patchDeducibleExpress } from './reglasDeducibleCatExpress.js';
import { patchDeducibleDesdeTomadorAlfa } from '../SubcomponenteSegurosAlfa/tomadoresAlfaCatalogo.js';

const pill = (activo) =>
  `rounded-lg px-3 py-1.5 font-body text-sm font-semibold transition ${
    activo
      ? 'bg-fenix-primario text-white'
      : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
  }`;

/**
 * Toggle Robusto | Express sobre el liquidador NSR existente.
 * Express no reemplaza el robusto: solo cambia la UI y escribe los ítems fijos
 * en evaluacionSismicaNSR10.presupuesto (misma fuente de informes/Excel).
 */
export default function SeccionModoLiquidadorCat({
  liquidador,
  onLiquidadorChange,
  modulo = '',
  tomador: tomadorProp,
  onTomadorCasoChange,
  aiuPorcentaje = 0.25,
  disabled = false,
  ocultarToggle = false,
  onAfterChange,
  onGuardar,
  guardando = false,
  children,
}) {
  const express = esLiquidadorExpress(liquidador);
  const tipo = tipoExpressDeLiquidador(liquidador);
  const filas = useMemo(
    () => (express ? construirFilasExpress(liquidador, tipo) : []),
    [express, liquidador, tipo]
  );
  const liquidacion = useMemo(
    () =>
      express
        ? liquidacionExpressConDeducible(liquidador, { aiuPorcentaje, modulo })
        : null,
    [express, liquidador, aiuPorcentaje, modulo]
  );

  const emitir = (next, { sync = false } = {}) => {
    const resuelto =
      sync && typeof onAfterChange === 'function' ? onAfterChange(next) || next : next;
    onLiquidadorChange?.(resuelto);
  };

  const irExpress = () => {
    if (disabled || express) return;
    emitir(asegurarModoExpress(liquidador, { tipo, aiuPorcentaje, modulo }), { sync: true });
  };

  const irRobusto = () => {
    if (disabled || !express) return;
    emitir(marcarModoRobusto(liquidador));
  };

  const handleFilas = (nextFilas) => {
    emitir(aplicarFilasExpress(liquidador, nextFilas, { tipo, aiuPorcentaje }), { sync: true });
  };

  const handleTipo = (nextTipo) => {
    const nextFilas = construirFilasExpress(
      { ...liquidador, tipoInmuebleExpress: nextTipo },
      nextTipo
    );
    emitir(aplicarFilasExpress(liquidador, nextFilas, { tipo: nextTipo, aiuPorcentaje }), {
      sync: true,
    });
  };

  return (
    <div className="space-y-4">
      {!ocultarToggle && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={pill(!express)} onClick={irRobusto} disabled={disabled}>
            Liquidador robusto
          </button>
          <button type="button" className={pill(express)} onClick={irExpress} disabled={disabled}>
            Liquidador express
          </button>
        </div>
      )}
      {express ? (
        <div className="space-y-4">
        <LiquidadorCatExpress
          filas={filas}
          tipo={tipo}
          aiuPorcentaje={aiuPorcentaje}
          modulo={modulo}
          liquidacion={liquidacion}
          onFilasChange={handleFilas}
          onTipoChange={handleTipo}
          tomador={tomadorProp || liquidador?.encabezado?.tomador || ''}
          onDeducibleChange={(patch) =>
            emitir(patchDeducibleExpress(liquidador, patch, modulo), { sync: true })
          }
          onTomadorChange={(tomador) => {
            const poliza = liquidador?.encabezado?.poliza || '';
            const conTomador = {
              ...liquidador,
              encabezado: { ...(liquidador.encabezado || {}), tomador },
            };
            const cfgAlfa = patchDeducibleDesdeTomadorAlfa(
              tomador,
              { ...(conTomador.liquidacionCatastrofico?.deducibleConfigPresupuesto || {}), opcionDeducibleId: '' },
              poliza
            );
            onTomadorCasoChange?.(tomador);
            emitir(patchDeducibleExpress(conTomador, cfgAlfa, modulo), { sync: true });
          }}
          disabled={disabled}
        />
        {onGuardar ? (
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-lg bg-fenix-primario px-4 py-2 font-body text-sm font-semibold text-white disabled:opacity-60"
              disabled={disabled || guardando}
              onClick={onGuardar}
            >
              {guardando ? 'Guardando…' : 'Guardar liquidador express'}
            </button>
          </div>
        ) : null}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
