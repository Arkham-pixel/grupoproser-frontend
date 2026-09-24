import React, { useMemo, useState } from 'react';
import { TIPOS_RIESGO_EXPRESS, esIdExpress } from './catalogoLiquidadorCatExpress.js';
import EditorDeducibleCatExpress from './EditorDeducibleCatExpress.jsx';
import SelectBuscable from '../SelectBuscable.jsx';
import {
  CAPITULOS_BASE_PRECIOS,
  catalogoPresupuestoPorCapitulo,
} from '../SubcomponenteEvaluacionSismicaNSR10/basePreciosPresupuesto.js';
import {
  agregarItemExpressDesdeBase,
  parseMontoNsr10,
  quitarItemExpress,
  totalFilaPresupuesto,
} from './liquidadorCatExpressHelpers.js';

const COP = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

function agruparPorCapitulo(filas = []) {
  const grupos = [];
  const visto = new Map();
  filas.forEach((fila) => {
    const cap = fila.capitulo || 'Otros';
    if (!visto.has(cap)) {
      visto.set(cap, grupos.length);
      grupos.push({ capitulo: cap, filas: [] });
    }
    grupos[visto.get(cap)].filas.push(fila);
  });
  return grupos;
}

function InputCantidad({ value, onChange, disabled }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={value === 0 || value ? String(value) : ''}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
      placeholder="0"
      className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right font-body text-sm dark:border-gray-700 dark:bg-gray-900"
    />
  );
}

function InputVu({ value, onChange, disabled }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={value === 0 || value ? String(value) : ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-32 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right font-body text-sm dark:border-gray-700 dark:bg-gray-900"
    />
  );
}

export default function LiquidadorCatExpress({
  filas = [],
  tipo = 'casa',
  aiuPorcentaje = 0.25,
  modulo = '',
  liquidacion = null,
  tomador = '',
  onFilasChange,
  onTipoChange,
  onDeducibleChange,
  onTomadorChange,
  disabled = false,
}) {
  const grupos = useMemo(() => agruparPorCapitulo(filas), [filas]);
  const tot = liquidacion || {};
  const aiuPct = Math.round(Number(aiuPorcentaje || 0) * 1000) / 10;
  const [capituloAdd, setCapituloAdd] = useState('');
  const [itemAdd, setItemAdd] = useState('');

  const idsEnTabla = useMemo(
    () => new Set((filas || []).map((it) => String(it.catalogoId || '')).filter(Boolean)),
    [filas]
  );
  const opcionesBase = useMemo(() => {
    return catalogoPresupuestoPorCapitulo(capituloAdd)
      .filter((c) => !idsEnTabla.has(c.id))
      .map((c) => ({
        value: c.id,
        label: `${c.actividad} · ${COP(c.valorUnitario)} / ${c.unidad}`,
      }));
  }, [capituloAdd, idsEnTabla]);

  const patchFila = (catalogoId, campo, valor) => {
    onFilasChange?.(
      filas.map((it) => (it.catalogoId === catalogoId ? { ...it, [campo]: valor } : it))
    );
  };

  const agregarDeLaBase = (catalogoId) => {
    const id = String(catalogoId || itemAdd || '');
    if (!id || disabled) return;
    onFilasChange?.(agregarItemExpressDesdeBase(filas, id));
    setItemAdd('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
            Liquidador express
          </p>
          <p className="mt-0.5 max-w-2xl font-body text-xs text-gray-500">
            Ítems fijos de la base de precios (los más usados en casos menores a $50 M).
            Llene cantidad; el VU viene de la base. Use «Agregar ítem» para elegir
            cualquier actividad del catálogo con su precio.
          </p>
        </div>
        <label className="block font-body text-xs font-semibold text-gray-600 dark:text-gray-300">
          Tipo de riesgo
          <select
            className="mt-1 block min-w-[180px] rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
            value={tipo}
            disabled={disabled}
            onChange={(e) => onTipoChange?.(e.target.value)}
          >
            {TIPOS_RIESGO_EXPRESS.map((op) => (
              <option key={op.id} value={op.id}>
                {op.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-fenix-primario/40 bg-fenix-primario/5 px-3 py-3 dark:border-fenix-primario/30 dark:bg-fenix-primario/10">
        <label className="block min-w-[160px] flex-1 font-body text-xs font-semibold text-gray-600 dark:text-gray-300">
          Capítulo
          <select
            className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
            value={capituloAdd}
            disabled={disabled}
            onChange={(e) => {
              setCapituloAdd(e.target.value);
              setItemAdd('');
            }}
          >
            <option value="">Todos los capítulos</option>
            {CAPITULOS_BASE_PRECIOS.map((cap) => (
              <option key={cap} value={cap}>
                {cap}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-[240px] flex-[2] font-body text-xs font-semibold text-gray-600 dark:text-gray-300">
          Ítem de la base
          <div className="mt-1">
            <SelectBuscable
              options={opcionesBase}
              value={itemAdd}
              disabled={disabled}
              onChange={(val) => {
                setItemAdd(val);
                if (val) agregarDeLaBase(val);
              }}
              placeholder="Buscar actividad (sale con precio)…"
              searchPlaceholder="Escriba demolición, estuco, cerámica…"
              emptyOption
              emptyLabel="— Elegir de la base —"
              buttonClassName="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left font-body text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
        </label>
        <button
          type="button"
          disabled={disabled || !itemAdd}
          onClick={() => agregarDeLaBase(itemAdd)}
          className="rounded-lg bg-fenix-primario px-4 py-2 font-body text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Agregar ítem
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full font-body text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/60 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2 font-semibold">Ítem</th>
              <th className="px-3 py-2 font-semibold">Und</th>
              <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
              <th className="px-3 py-2 text-right font-semibold">VU base</th>
              <th className="px-3 py-2 text-right font-semibold">Total</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => (
              <React.Fragment key={g.capitulo}>
                <tr className="bg-fenix-primario/5 dark:bg-fenix-primario/10">
                  <td colSpan={6} className="px-3 py-1.5 text-xs font-semibold text-fenix-primario">
                    {g.capitulo}
                  </td>
                </tr>
                {g.filas.map((fila) => {
                  const total = totalFilaPresupuesto(fila);
                  const tieneCant = (parseMontoNsr10(fila.cantidad) || 0) > 0;
                  const extra = !esIdExpress(fila.catalogoId);
                  return (
                    <tr
                      key={fila.catalogoId}
                      className={`border-t border-gray-100 dark:border-gray-800 ${
                        tieneCant ? 'bg-white dark:bg-gray-950' : ''
                      }`}
                    >
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-100">
                        {fila.actividad}
                        {extra ? (
                          <span className="ml-2 rounded bg-fenix-primario/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-fenix-primario">
                            Extra
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{fila.unidad}</td>
                      <td className="px-3 py-2 text-right">
                        <InputCantidad
                          value={fila.cantidad}
                          disabled={disabled}
                          onChange={(v) => patchFila(fila.catalogoId, 'cantidad', v)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <InputVu
                          value={fila.valorUnitario}
                          disabled={disabled}
                          onChange={(v) =>
                            patchFila(fila.catalogoId, 'valorUnitario', v)
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-800 dark:text-gray-100">
                        {total == null ? '—' : COP(total)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {extra ? (
                          <button
                            type="button"
                            disabled={disabled}
                            title="Quitar ítem extra"
                            onClick={() =>
                              onFilasChange?.(quitarItemExpress(filas, fila.catalogoId))
                            }
                            className="rounded px-2 py-1 font-body text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-950/40"
                          >
                            Quitar
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <EditorDeducibleCatExpress
        modulo={modulo}
        cfg={tot.cfg || {}}
        valorAsegurado={tot.valorAsegurado || 0}
        desglose={tot.desgloseDeducible || {}}
        calc={tot.calc || {}}
        tomador={tomador}
        onChange={onDeducibleChange}
        onTomadorChange={onTomadorChange}
        disabled={disabled}
      />

      <div className="ml-auto max-w-sm space-y-1 rounded-lg border border-gray-200 px-4 py-3 font-body text-sm dark:border-gray-700">
        <div className="flex justify-between text-gray-600 dark:text-gray-300">
          <span>Costo directo</span>
          <span>{COP(tot.subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-300">
          <span>AIU ({aiuPct}%)</span>
          <span>{COP(tot.aiu)}</span>
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-300">
          <span>Total presupuesto</span>
          <span>{COP(tot.total)}</span>
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-300">
          <span>Deducible</span>
          <span>− {COP(tot.deducibleAplicado)}</span>
        </div>
        <div className="flex justify-between font-semibold text-gray-900 dark:text-gray-50">
          <span>A indemnizar</span>
          <span>{COP(tot.totalIndemnizar)}</span>
        </div>
      </div>
    </div>
  );
}
