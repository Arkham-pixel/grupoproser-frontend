import React, { useMemo } from 'react';
import LetrerosBbvaCat from './LetrerosBbvaCat.jsx';
import {
  formatMilesInputNsr10,
  formatMilesNsr10,
  CAPITULOS_PRESUPUESTO_NSR10,
} from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import {
  BASE_PRECIOS_PRESUPUESTO,
  CAPITULOS_BASE_PRECIOS,
  catalogoPresupuestoPorCapitulo,
  buscarItemBasePrecios,
} from '../SubcomponenteEvaluacionSismicaNSR10/basePreciosPresupuesto.js';
import SelectBuscable from '../SelectBuscable.jsx';
import { formatearMonto, parsearNumero } from './liquidadorBbvaCatHelpers.js';
import {
  LOGO_BBVA_URL,
  RAMOS_BBVA_CAT,
  VALOR_GLOBAL,
  calcularFilaDetalleBbvaCat,
  calcularTotalesFormatoExcelBbvaCat,
  etiquetaAiuBbvaCat,
  esValorGlobal,
  parsearPorcentajeDeducibleBbva,
} from './formatoLiquidacionBbvaCat.js';
import { inferirTipoLiquidadorBbvaCat, TIPOS_LIQUIDADOR_BBVA_CAT } from './deduciblesBbvaCat.js';
import { bbvaCatInput, bbvaCatShell } from './bbvaCatFormUi.js';

const labelExcel =
  'flex min-h-[32px] items-center bg-[#E7EEF5] px-2 py-1 font-body text-[11px] font-semibold uppercase leading-tight text-gray-800 dark:bg-[#1E3A5F] dark:text-gray-100';
const cellExcel =
  'min-h-[32px] border border-gray-300 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-900';
const cellGray =
  'min-h-[32px] border border-gray-300 bg-[#F3F3F3] px-1.5 py-1 text-right font-body text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';
const thExcel =
  'border border-gray-300 bg-[#BDD7EE] px-1.5 py-2 text-center font-body text-[10px] font-semibold uppercase leading-tight text-gray-900 dark:bg-[#1E3A5F] dark:text-gray-100';
const tdExcel = 'border border-gray-300 px-1 py-0.5 dark:border-gray-600';

function Fila({ label, children, className = '' }) {
  return (
    <div className={`grid grid-cols-[158px_1fr] ${className}`}>
      <div className={`${labelExcel} border border-gray-300 dark:border-gray-600`}>{label}</div>
      <div className={cellExcel}>{children}</div>
    </div>
  );
}

function moneyCell(valor) {
  if (valor === '' || valor == null) return '';
  if (esValorGlobal(valor)) return VALOR_GLOBAL;
  return `$ ${formatMilesNsr10(valor)}`;
}

function fechaHoyLarga() {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  } catch {
    return '';
  }
}

/**
 * Réplica visual de LIQUIDACIÓN DE INDEMNIZACION (Excel BBVA deudores / leasing).
 */
export default function FormatoLiquidacionBbvaCat({
  caso = {},
  encabezado = {},
  liquidador = {},
  itemsDetalle = [],
  soloLectura = false,
  onEncabezadoChange,
  onTipoLiquidadorChange,
  onDeducibleFormatoChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onLiquidadoPorChange,
  onAreaLiquidadorChange,
  onObservacionesChange,
  onAceptacionChange,
  onDatosFiniquitoChange,
  onFirmaClienteChange,
  onNombreFirmanteChange,
  onAiuChange,
}) {
  const tipo = inferirTipoLiquidadorBbvaCat({
    tipoLiquidador: liquidador.tipoLiquidador,
    encabezado,
    caso,
  });
  const excel = useMemo(
    () =>
      calcularTotalesFormatoExcelBbvaCat(
        { ...liquidador, encabezado, detalleLiquidacionCat: itemsDetalle },
        caso
      ),
    [liquidador, encabezado, itemsDetalle, caso]
  );
  const ctx = excel.ctx;
  const tipos = excel.tiposDeducible;
  const ded = excel.deducibleFormato;
  const ramo = encabezado.ramoAfectado || 'TERREMOTO';
  const pctUi =
    ded.porcentaje == null || ded.porcentaje === ''
      ? ''
      : String(Math.round(parsearPorcentajeDeducibleBbva(ded.porcentaje) * 10000) / 100).replace(
          /\.0+$/,
          ''
        );

  const patchEnc = (campo, valor) => {
    if (soloLectura) return;
    onEncabezadoChange?.(campo, valor);
  };

  const valorGlobalUi =
    encabezado.valorGlobal === '' || encabezado.valorGlobal == null
      ? encabezado.valorAseguradoInmueble === '' || encabezado.valorAseguradoInmueble == null
        ? ''
        : formatMilesNsr10(encabezado.valorAseguradoInmueble)
      : formatMilesNsr10(encabezado.valorGlobal);

  const capitulos = useMemo(() => {
    const fromBase = Array.isArray(CAPITULOS_BASE_PRECIOS) ? CAPITULOS_BASE_PRECIOS : [];
    const fromNsr = Array.isArray(CAPITULOS_PRESUPUESTO_NSR10) ? CAPITULOS_PRESUPUESTO_NSR10 : [];
    return [...new Set([...fromBase, ...fromNsr])];
  }, []);

  const elegirCatalogo = (idx, it, val) => {
    if (soloLectura) return;
    if (val === '__custom__') {
      onItemChange?.(idx, { catalogoId: '' });
      return;
    }
    const hit = buscarItemBasePrecios(val);
    if (!hit) return;
    onItemChange?.(idx, {
      catalogoId: hit.id,
      capitulo: hit.capitulo || it.capitulo || '',
      descripcion: hit.actividad || '',
      unidad: hit.unidad || 'und',
      valorUnitario: hit.valorUnitario,
      cantidad: it.cantidad === '' || it.cantidad == null ? 1 : it.cantidad,
    });
  };

  return (
    <div className={`${bbvaCatShell} bg-white`}>
      <div className="grid grid-cols-1 items-center gap-3 border-b border-gray-200 px-4 py-3 sm:grid-cols-[160px_1fr_220px] dark:border-gray-700">
        <img src={LOGO_BBVA_URL} alt="BBVA Seguros" className="h-11 w-auto object-contain" />
        <div className="border border-gray-400 bg-[#E7EEF5] px-4 py-2 text-center dark:bg-[#1E3A5F]">
          <div className="font-body text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white">
            Liquidación de indemnizacion
          </div>
          <div className="mt-0.5 font-body text-[11px] capitalize text-gray-600 dark:text-gray-300">
            {fechaHoyLarga()}
          </div>
        </div>
        <select
          className={`${bbvaCatInput} cursor-pointer rounded border border-gray-300 px-2 dark:border-gray-600`}
          value={tipo}
          disabled={soloLectura}
          onChange={(e) => onTipoLiquidadorChange?.(e.target.value)}
          title="Tipo de liquidador"
        >
          {TIPOS_LIQUIDADOR_BBVA_CAT.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.35fr)]">
        <div>
          <Fila label="Póliza número">
            <input
              className={bbvaCatInput}
              disabled={soloLectura}
              value={encabezado.poliza || ''}
              onChange={(e) => patchEnc('poliza', e.target.value)}
            />
          </Fila>
          <Fila label="Vigencia desde">
            <input
              type="date"
              className={bbvaCatInput}
              disabled={soloLectura}
              value={String(encabezado.vigenciaDesde || '').slice(0, 10)}
              onChange={(e) => patchEnc('vigenciaDesde', e.target.value)}
            />
          </Fila>
          <Fila label="Vigencia hasta">
            <input
              type="date"
              className={bbvaCatInput}
              disabled={soloLectura}
              value={String(encabezado.vigenciaHasta || '').slice(0, 10)}
              onChange={(e) => patchEnc('vigenciaHasta', e.target.value)}
            />
          </Fila>
          <Fila label="Fecha siniestro">
            <input
              type="date"
              className={bbvaCatInput}
              disabled={soloLectura}
              value={String(encabezado.fechaSiniestro || '').slice(0, 10)}
              onChange={(e) => patchEnc('fechaSiniestro', e.target.value)}
            />
          </Fila>
          <Fila label="Días transcur. cobertura">
            <span className="px-1 font-body text-sm">{ctx.diasTranscurridos || '—'}</span>
          </Fila>
        </div>

        <div>
          <Fila label="Siniestro número">
            <input
              className={bbvaCatInput}
              disabled={soloLectura}
              value={encabezado.siniestro || ''}
              onChange={(e) => patchEnc('siniestro', e.target.value)}
            />
          </Fila>
          <Fila label="Ramo afectado">
            <select
              className={`${bbvaCatInput} cursor-pointer`}
              disabled={soloLectura}
              value={ramo}
              onChange={(e) => patchEnc('ramoAfectado', e.target.value)}
            >
              {RAMOS_BBVA_CAT.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Fila>
          <Fila label="Evento reclamado">
            <input
              className={bbvaCatInput}
              disabled={soloLectura}
              value={encabezado.evento || encabezado.causa || ''}
              onChange={(e) => {
                patchEnc('evento', e.target.value);
                patchEnc('causa', e.target.value);
              }}
            />
          </Fila>
          <Fila label="Asegurado">
            <input
              className={bbvaCatInput}
              disabled={soloLectura}
              value={encabezado.asegurado || ''}
              onChange={(e) => patchEnc('asegurado', e.target.value)}
            />
          </Fila>
          <Fila label="Tomador">
            <input
              className={bbvaCatInput}
              disabled={soloLectura}
              value={encabezado.tomador || ''}
              onChange={(e) => patchEnc('tomador', e.target.value)}
            />
          </Fila>
        </div>

        <div className="border-l border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 px-2 py-1 font-body text-[10px] text-gray-600 dark:border-gray-700 dark:text-gray-300">
            {tipo === 'leasing' &&
            ramo &&
            !/TERREMOTO|TEMBLOR|ERUPCION|VOLCAN|MAREMOTO|TSUNAMI|CATASTROF/i.test(String(ramo))
              ? 'Leasing: 1,5 SMMLV o 15% de la pérdida — se aplica el mayor.'
              : tipo === 'leasing'
                ? 'Leasing CAT: 3 SMMLV o 2% del valor asegurable — se aplica el mayor.'
                : 'Deudores: 3 SMMLV o 2% del valor global — se aplica el mayor.'}
          </div>
          <div className="grid grid-cols-[90px_repeat(4,minmax(0,1fr))]">
            <div className={`${labelExcel} border border-gray-300 dark:border-gray-600`}>
              Deducible
            </div>
            {['SMMLV', 'Porcentaje', 'Dólares', 'Pesos / otro'].map((h) => (
              <div
                key={h}
                className={`${labelExcel} justify-center border border-gray-300 text-center dark:border-gray-600 ${
                  (h === 'SMMLV' && tipos.tipoAplicado === 'smmlv') ||
                  (h === 'Porcentaje' && tipos.tipoAplicado === 'porcentaje')
                    ? '!bg-[#F9E4B7] dark:!bg-[#8B6B2E]'
                    : ''
                }`}
              >
                {h}
              </div>
            ))}
            <div className={`${labelExcel} border border-gray-300 dark:border-gray-600`}>
              Tipos
            </div>
            <div className={cellExcel}>
              <input
                className={`${bbvaCatInput} text-center`}
                disabled={soloLectura}
                value={ded.smmlv ?? ''}
                onChange={(e) => onDeducibleFormatoChange?.({ smmlv: e.target.value })}
              />
            </div>
            <div className={cellExcel}>
              <input
                className={`${bbvaCatInput} text-center`}
                disabled={soloLectura}
                value={pctUi}
                onChange={(e) => {
                  const n = parsearNumero(String(e.target.value).replace('%', ''));
                  onDeducibleFormatoChange?.({ porcentaje: n ? n / 100 : 0 });
                }}
              />
            </div>
            <div className={cellExcel}>
              <input
                className={`${bbvaCatInput} text-center`}
                disabled={soloLectura}
                value={ded.dolares ?? 0}
                onChange={(e) => onDeducibleFormatoChange?.({ dolares: e.target.value })}
              />
            </div>
            <div className={cellExcel}>
              <input
                className={`${bbvaCatInput} text-right`}
                disabled={soloLectura}
                value={ded.pesos === '' || ded.pesos == null ? '' : formatMilesNsr10(ded.pesos)}
                onChange={(e) =>
                  onDeducibleFormatoChange?.({ pesos: formatMilesInputNsr10(e.target.value) })
                }
              />
            </div>
            <div className={`${labelExcel} border border-gray-300 dark:border-gray-600`}>
              Calculado
            </div>
            <div
              className={`${cellGray} font-semibold ${
                tipos.tipoAplicado === 'smmlv' ? '!bg-[#F9E4B7] dark:!bg-[#8B6B2E]' : ''
              }`}
            >
              $ {formatearMonto(tipos.montoSmmlv)}
            </div>
            <div
              className={`${cellGray} font-semibold ${
                tipos.tipoAplicado === 'porcentaje' ? '!bg-[#F9E4B7] dark:!bg-[#8B6B2E]' : ''
              }`}
            >
              $ {formatearMonto(tipos.montoPct)}
            </div>
            <div className={cellGray}>
              {tipos.montoUsd ? `$ ${formatearMonto(tipos.montoUsd)}` : ''}
            </div>
            <div className={cellGray}>$ {formatearMonto(tipos.montoPesos)}</div>
          </div>
          <Fila label="TRM día del siniestro">
            <input
              className={`${bbvaCatInput} text-right`}
              disabled={soloLectura}
              value={
                encabezado.trm === '' || encabezado.trm == null
                  ? ''
                  : formatMilesNsr10(encabezado.trm)
              }
              onChange={(e) => patchEnc('trm', formatMilesInputNsr10(e.target.value))}
            />
          </Fila>
        </div>
      </div>

      <div className="grid grid-cols-[158px_220px_1fr] border-y border-gray-300 dark:border-gray-600">
        <div className={`${labelExcel} border-r border-gray-300 dark:border-gray-600`}>
          Valor global
        </div>
        <div className={`${cellExcel} border-r border-gray-300`}>
          <input
            className={`${bbvaCatInput} text-right font-semibold`}
            disabled={soloLectura}
            value={valorGlobalUi}
            onChange={(e) => {
              const v = formatMilesInputNsr10(e.target.value);
              patchEnc('valorGlobal', v);
              patchEnc('valorAseguradoInmueble', v);
            }}
          />
        </div>
        <div className={`${cellGray} text-left font-body text-xs`}>
          {excel.valorGlobal
            ? `2% valor global: $ ${formatearMonto(tipos.montoPct)} · se aplica el mayor: $ ${formatearMonto(
                tipos.aplicable
              )} (${tipos.tipoAplicadoLabel})`
            : 'Indique el valor global para calcular el 2%.'}
        </div>
      </div>

      <div className="bg-[#BDD7EE] px-3 py-1.5 text-center font-body text-[11px] font-bold uppercase tracking-wide text-gray-900 dark:bg-[#1E3A5F] dark:text-white">
        Detalle de la liquidación
      </div>
      <p className="border-b border-gray-200 px-3 py-2 font-body text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400">
        Base de precios Valle del Cauca ({BASE_PRECIOS_PRESUPUESTO.length} ítems parametrizados).
        Elija capítulo e ítem; cantidad × valor unitario calcula el valor de la pérdida.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-[1900px] w-full border-collapse">
          <thead>
            <tr>
              {[
                'Ítem Nro.',
                'Capítulo',
                'Base precios',
                'Descripción del bien',
                'Und',
                'Cant.',
                'Vlr. unitario',
                'Valor asegurado',
                'Porcentaje de índice variable',
                'Valor asegurado fecha s/tro',
                'Valor asegurable',
                'Porcentaje de responsabilidad de la CIA',
                'Valor de la pérdida',
                'Demérito',
                'Valor real del bien',
                'Pérdida base',
                'Pérdida indemnizable',
                '',
              ].map((h) => (
                <th key={h || 'x'} className={thExcel}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(itemsDetalle || []).map((it, idx) => {
              const calc = calcularFilaDetalleBbvaCat(it, ctx);
              const catalogoCap = catalogoPresupuestoPorCapitulo(it.capitulo || '');
              const esCustom =
                !it.catalogoId ||
                !BASE_PRECIOS_PRESUPUESTO.some((c) => c.id === it.catalogoId);
              return (
                <tr key={it.id || idx}>
                  <td className={`${tdExcel} text-center font-body text-sm`}>{idx + 1}</td>
                  <td className={`${tdExcel} min-w-[140px]`}>
                    <select
                      className={`${bbvaCatInput} cursor-pointer`}
                      disabled={soloLectura}
                      value={it.capitulo || ''}
                      onChange={(e) =>
                        onItemChange?.(idx, { capitulo: e.target.value, catalogoId: '' })
                      }
                    >
                      <option value="">—</option>
                      {capitulos.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`${tdExcel} min-w-[260px]`}>
                    {soloLectura ? (
                      <span className="font-body text-xs">{it.descripcion || '—'}</span>
                    ) : (
                      <SelectBuscable
                        options={catalogoCap.map((c) => ({
                          value: c.id,
                          label: `${c.actividad} ($ ${formatearMonto(c.valorUnitario)}/${c.unidad})`,
                        }))}
                        value={esCustom ? '__custom__' : it.catalogoId || ''}
                        onChange={(val) => elegirCatalogo(idx, it, val)}
                        placeholder="— Elegir de la base —"
                        searchPlaceholder="Buscar actividad o valor…"
                        emptyOption
                        emptyLabel="— Elegir de la base —"
                        extraOptions={[{ value: '__custom__', label: 'Otro / escribir libre' }]}
                        buttonClassName={bbvaCatInput}
                      />
                    )}
                  </td>
                  <td className={`${tdExcel} min-w-[180px]`}>
                    <input
                      className={bbvaCatInput}
                      disabled={soloLectura}
                      value={it.descripcion || ''}
                      onChange={(e) => onItemChange?.(idx, { descripcion: e.target.value })}
                    />
                  </td>
                  <td className={`${tdExcel} w-16`}>
                    <input
                      className={bbvaCatInput}
                      disabled={soloLectura}
                      value={it.unidad || ''}
                      onChange={(e) => onItemChange?.(idx, { unidad: e.target.value })}
                    />
                  </td>
                  <td className={`${tdExcel} w-16`}>
                    <input
                      className={`${bbvaCatInput} text-center`}
                      disabled={soloLectura}
                      value={it.cantidad ?? ''}
                      onChange={(e) => onItemChange?.(idx, { cantidad: e.target.value })}
                    />
                  </td>
                  <td className={`${tdExcel} w-28`}>
                    <input
                      className={`${bbvaCatInput} text-right`}
                      disabled={soloLectura}
                      value={
                        it.valorUnitario === '' || it.valorUnitario == null
                          ? ''
                          : formatMilesNsr10(it.valorUnitario)
                      }
                      onChange={(e) =>
                        onItemChange?.(idx, {
                          valorUnitario: formatMilesInputNsr10(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td className={`${tdExcel} w-32`}>
                    <input
                      className={`${bbvaCatInput} text-center`}
                      disabled={soloLectura}
                      value={it.valorAsegurado ?? VALOR_GLOBAL}
                      onChange={(e) => onItemChange?.(idx, { valorAsegurado: e.target.value })}
                    />
                  </td>
                  <td className={`${tdExcel} w-20`}>
                    <input
                      className={`${bbvaCatInput} text-center`}
                      disabled={soloLectura}
                      value={it.indiceVariable ?? 0}
                      onChange={(e) => onItemChange?.(idx, { indiceVariable: e.target.value })}
                    />
                  </td>
                  <td className={`${tdExcel} ${cellGray} w-32`}>{moneyCell(calc.valorAseguradoFecha)}</td>
                  <td className={`${tdExcel} w-32`}>
                    <input
                      className={`${bbvaCatInput} text-right`}
                      disabled={soloLectura}
                      value={
                        it.valorAsegurable === '' || it.valorAsegurable == null
                          ? ''
                          : formatMilesNsr10(it.valorAsegurable)
                      }
                      onChange={(e) =>
                        onItemChange?.(idx, {
                          valorAsegurable: formatMilesInputNsr10(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td className={`${tdExcel} ${cellGray} w-24`}>
                    {`${Math.round((calc.pctResponsabilidad || 0) * 10000) / 100} %`}
                  </td>
                  <td className={`${tdExcel} w-32`}>
                    <input
                      className={`${bbvaCatInput} text-right`}
                      disabled={soloLectura}
                      value={
                        it.valorPerdida === '' || it.valorPerdida == null
                          ? ''
                          : formatMilesNsr10(it.valorPerdida)
                      }
                      onChange={(e) =>
                        onItemChange?.(idx, {
                          valorPerdida: formatMilesInputNsr10(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td className={`${tdExcel} w-20`}>
                    <input
                      className={`${bbvaCatInput} text-center`}
                      disabled={soloLectura}
                      value={it.demerito ?? 0}
                      onChange={(e) => onItemChange?.(idx, { demerito: e.target.value })}
                    />
                  </td>
                  <td className={`${tdExcel} ${cellGray} w-32`}>
                    $ {formatearMonto(calc.valorReal)}
                  </td>
                  <td className={`${tdExcel} w-32 text-right font-body text-xs`}>
                    $ {formatearMonto(calc.perdidaBase)}
                  </td>
                  <td className={`${tdExcel} w-36 text-right font-body text-sm font-semibold`}>
                    $ {formatearMonto(calc.perdidaIndemnizable)}
                  </td>
                  <td className={`${tdExcel} text-center`}>
                    {soloLectura ? null : (
                      <button
                        type="button"
                        className="font-body text-xs text-red-600 hover:underline"
                        onClick={() => onRemoveItem?.(idx)}
                      >
                        Quitar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!(itemsDetalle || []).length && (
              <tr>
                <td colSpan={18} className="px-3 py-6 text-center font-body text-sm text-gray-500">
                  Sin ítems. Pulse «Agregar ítem» y elija de la base de precios Valle del Cauca.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-gray-200 px-3 py-3 lg:grid-cols-[1fr_320px] dark:border-gray-700">
        <div className="space-y-2">
          {soloLectura ? null : (
            <button
              type="button"
              className="font-body text-sm font-semibold text-[#004481] hover:underline dark:text-sky-300"
              onClick={() => onAddItem?.()}
            >
              + Agregar ítem
            </button>
          )}
          <div className="max-w-md">
            <div className={`${labelExcel} border border-gray-300 dark:border-gray-600`}>
              Liquidado por:
            </div>
            <div className={cellExcel}>
              <input
                className={bbvaCatInput}
                disabled={soloLectura}
                value={liquidador.liquidadoPor || encabezado.ajustador || ''}
                onChange={(e) => onLiquidadoPorChange?.(e.target.value)}
              />
            </div>
            <div className={cellExcel}>
              <input
                className={bbvaCatInput}
                disabled={soloLectura}
                value={liquidador.areaLiquidador || 'Indemnizaciones Seguros Generales'}
                onChange={(e) => onAreaLiquidadorChange?.(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-[1fr_180px] border border-gray-300 dark:border-gray-600">
            <div className={`${labelExcel} justify-end border-b border-gray-300 pr-3`}>
              Sub total
            </div>
            <div className={`${cellExcel} border-b border-gray-300 text-right font-semibold`}>
              $ {formatearMonto(excel.subTotal)}
            </div>
            {soloLectura || !onAiuChange ? (
              <>
                <div className={`${labelExcel} justify-end border-b border-gray-300 pr-3`}>
                  {etiquetaAiuBbvaCat(excel.aiuPct)}
                </div>
                <div className={`${cellExcel} border-b border-gray-300 text-right font-semibold`}>
                  $ {formatearMonto(excel.aiu)}
                </div>
              </>
            ) : (
              <>
                <div className={`${labelExcel} justify-end border-b border-gray-300 pr-3`}>
                  AIU (%)
                </div>
                <div className={`${cellExcel} border-b border-gray-300`}>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className={`${bbvaCatInput} text-right`}
                    title="Porcentaje opcional sobre el subtotal. 0 = no aplica."
                    value={
                      excel.aiuPct == null
                        ? ''
                        : String(Math.round(Number(excel.aiuPct) * 10000) / 100)
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        onAiuChange(0);
                        return;
                      }
                      const pct = Number(raw);
                      onAiuChange(Number.isFinite(pct) ? Math.max(0, pct) / 100 : 0);
                    }}
                  />
                </div>
                <div className={`${labelExcel} justify-end border-b border-gray-300 pr-3`}>
                  AIU ($)
                </div>
                <div className={`${cellExcel} border-b border-gray-300 text-right font-semibold`}>
                  $ {formatearMonto(excel.aiu)}
                </div>
              </>
            )}
            <div className={`${labelExcel} justify-end border-b border-gray-300 pr-3`}>
              Total
            </div>
            <div className={`${cellExcel} border-b border-gray-300 text-right font-semibold`}>
              $ {formatearMonto(excel.totalConAiu)}
            </div>
            <div className={`${labelExcel} justify-end border-b border-gray-300 pr-3`}>
              Deducible (el mayor)
            </div>
            <div className={`${cellExcel} border-b border-gray-300 text-right font-semibold`}>
              $ {formatearMonto(excel.deduciblePoliza ?? excel.tiposDeducible?.aplicable)}
            </div>
            <div className={`${labelExcel} justify-end pr-3`}>Valor a indemnizar</div>
            <div className={`${cellExcel} text-right font-bold`}>
              $ {formatearMonto(excel.valorAIndemnizar)}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 px-3 py-3 dark:border-gray-700">
        <LetrerosBbvaCat
          tipoLiquidador={tipo}
          aceptacionIndemnizacion={liquidador.aceptacionIndemnizacion || ''}
          datosFiniquito={liquidador.datosFiniquito || {}}
          observacionesFiniquito={liquidador.observacionesFiniquito || ''}
          firmaCliente={liquidador.firmaCliente || ''}
          nombreFirmante={liquidador.nombreFirmante || encabezado.asegurado || ''}
          onAceptacionChange={soloLectura ? undefined : onAceptacionChange}
          onDatosFiniquitoChange={soloLectura ? undefined : onDatosFiniquitoChange}
          onObservacionesChange={soloLectura ? undefined : onObservacionesChange}
          onFirmaClienteChange={soloLectura ? undefined : onFirmaClienteChange}
          onNombreFirmanteChange={soloLectura ? undefined : onNombreFirmanteChange}
        />
      </div>
    </div>
  );
}
