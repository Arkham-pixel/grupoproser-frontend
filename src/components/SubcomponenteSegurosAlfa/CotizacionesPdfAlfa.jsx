import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CotizacionPdfLiquidacion from '../liquidacion/CotizacionPdfLiquidacion.jsx';
import CampoTomadorAlfa from './CampoTomadorAlfa.jsx';
import {
  etiquetaOpcionDeducibleAlfa,
  listarOpcionesDeduciblePorTomadorAlfa,
  obtenerOpcionDeducibleAlfaPorId,
  patchDeducibleDesdeOpcionAlfa,
} from './tomadoresAlfaCatalogo.js';
import {
  AIU_PORCENTAJE_DEFAULT_ALFA,
  ANIOS_SMMLV,
  SMMLV_POR_ANIO,
  defaultLiquidacionCotizacionPdfAlfa,
  formatearMonto,
  parsearNumero,
} from './liquidadorAlfaHelpers.js';
import {
  SLOTS_COTIZACION_PDF_ALFA,
  resumenCotizacionesPdfAlfa,
} from '../liquidacion/cotizacionPdfLiquidacion.js';
import {
  alfaCatCell,
  alfaCatHeaderBlue,
  alfaCatInput,
  alfaCatLabelBlue,
  alfaCatShell,
} from './alfaCatFormUi.js';
import { formatMilesInputNsr10, formatMilesNsr10 } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import { valorSmdlvDesdeSmmlv } from '../SubcomponenteFormularioCatastrofico/catalogoPresupuestoCatastrofico.js';

const pillClass = (activo) =>
  `rounded-lg px-4 py-2 font-body text-sm font-semibold transition ${
    activo
      ? 'bg-[#1F4E79] text-white'
      : 'border border-gray-200 bg-white text-gray-700 hover:border-[#1F4E79]/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
  }`;

const HINTS = {
  materiales:
    'PDF de materiales (ferretería, acabados, etc.). El monto entra a la cuenta final si deja marcada la casilla.',
  manoObra:
    'PDF de mano de obra / cuadrilla. Se suma a materiales si ambos están cargados.',
  completo:
    'PDF de cotización completa (materiales + mano de obra en un solo documento). Es el mismo flujo de Zurich/Allianz.',
};

function CeldaLabel({ children }) {
  return <div className={alfaCatLabelBlue}>{children}</div>;
}

function CeldaInput({ children }) {
  return <div className={alfaCatCell}>{children}</div>;
}

/**
 * Liquidación por cotizaciones PDF, independiente del formato NSR.
 * Trae su propio tomador, deducible de póliza, Valor SID y AIU.
 */
export default function CotizacionesPdfAlfa({
  liquidador = {},
  totales = null,
  onEncabezadoChange,
  onDeducibleChange,
  onAiuChange,
  onChangeSlot,
  casoId = null,
  api = null,
  archivosCaso = [],
  onArchivosCreados,
  onArchivosEliminados,
  disabled = false,
} = {}) {
  const { t } = useTranslation();
  const [slotActivo, setSlotActivo] = useState('completo');
  const resumen = useMemo(() => resumenCotizacionesPdfAlfa(liquidador), [liquidador]);
  const enc = liquidador.liquidacionCotizacionPdf || defaultLiquidacionCotizacionPdfAlfa();
  const dedCfg = enc.deducibleConfig || {};
  const aiuPctNum = Number(enc.aiuPorcentaje ?? AIU_PORCENTAJE_DEFAULT_ALFA);
  const aiuPctUi = Number.isFinite(aiuPctNum)
    ? Math.round(aiuPctNum * 10000) / 100
    : 20;
  const anioSmmlv = Number(dedCfg.anioSMMLV) || ANIOS_SMMLV[0] || 2026;
  const valorSmmlv =
    Number(dedCfg.valorSMMLV) || SMMLV_POR_ANIO[anioSmmlv] || SMMLV_POR_ANIO[2026];
  const aiuMonto = parsearNumero(totales?.aiu);
  const deducible = parsearNumero(
    totales?.deducibleAlfa?.deducibleAplicado ?? totales?.deducibleAplicado
  );
  const indemnizacionPdf = Math.max(
    0,
    totales?.indemnizacionPrincipal != null && totales.indemnizacionPrincipal !== ''
      ? parsearNumero(totales.indemnizacionPrincipal)
      : Math.round((resumen.total + aiuMonto - deducible) * 100) / 100
  );
  const opcionesDed = listarOpcionesDeduciblePorTomadorAlfa(enc.tomador || '');

  return (
    <div className={`${alfaCatShell} mb-6`}>
      <div className={alfaCatHeaderBlue}>
        {t('segurosAlfa.settlement.quoteWindowsTitle', {
          defaultValue: 'Cotizaciones PDF',
        })}
      </div>
      <p className="border-b border-gray-200 px-3 py-2 font-body text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
        {t('segurosAlfa.settlement.quoteWindowsHint', {
          defaultValue:
            'Bloque independiente del formato de liquidación NSR. El cliente puede traer materiales, mano de obra y/o completo. Tomador, deducible, Valor SID y AIU de esta sección no modifican el liquidador de ítems.',
        })}
      </p>

      <div className="grid grid-cols-1 border-b border-gray-300 dark:border-gray-600 lg:grid-cols-3">
        <div className="grid grid-cols-[140px_1fr] border-b border-gray-200 lg:border-b-0 lg:border-r dark:border-gray-700">
          <CeldaLabel>Póliza</CeldaLabel>
          <CeldaInput>
            <input
              className={alfaCatInput}
              value={enc.poliza || ''}
              disabled={disabled}
              onChange={(e) => onEncabezadoChange?.('poliza', e.target.value)}
            />
          </CeldaInput>
        </div>
        <div className="grid grid-cols-[140px_1fr] border-b border-gray-200 lg:border-b-0 lg:border-r dark:border-gray-700">
          <CeldaLabel>Tomador</CeldaLabel>
          <CeldaInput>
            <CampoTomadorAlfa
              value={enc.tomador}
              onChange={(valor) => onEncabezadoChange?.('tomador', valor)}
              mostrarGestion={false}
              ocultarLabel
              className="space-y-0"
            />
          </CeldaInput>
        </div>
        <div className="grid grid-cols-[140px_1fr]">
          <CeldaLabel>Asegurado</CeldaLabel>
          <CeldaInput>
            <input
              className={alfaCatInput}
              value={enc.asegurado || ''}
              disabled={disabled}
              onChange={(e) => onEncabezadoChange?.('asegurado', e.target.value)}
            />
          </CeldaInput>
        </div>
      </div>

      {opcionesDed.length ? (
        <div className="grid grid-cols-1 border-b border-gray-300 dark:border-gray-600">
          <div className="grid grid-cols-[140px_1fr]">
            <CeldaLabel>Deducible póliza</CeldaLabel>
            <CeldaInput>
              <select
                className={`${alfaCatInput} cursor-pointer`}
                value={String(dedCfg.opcionDeducibleId || '')}
                disabled={disabled}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) {
                    onDeducibleChange?.({ opcionDeducibleId: '' });
                    return;
                  }
                  const op = obtenerOpcionDeducibleAlfaPorId(id);
                  if (!op) return;
                  onDeducibleChange?.(patchDeducibleDesdeOpcionAlfa(op, dedCfg));
                }}
              >
                <option value="">Seleccione deducible según póliza / cartera…</option>
                {opcionesDed.map((o) => (
                  <option key={o.id} value={o.id}>
                    {etiquetaOpcionDeducibleAlfa(o)}
                  </option>
                ))}
              </select>
            </CeldaInput>
          </div>
        </div>
      ) : null}

      <div className="border-b border-gray-300 dark:border-gray-600">
        <div className={`${alfaCatLabelBlue} border-b border-gray-200 dark:border-gray-700`}>
          Deducible / SMMLV / AIU
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="grid grid-cols-[1fr] border-b border-r border-gray-200 dark:border-gray-700">
            <div className="bg-gray-50 px-2 py-1 text-center font-body text-[11px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Año SMMLV
            </div>
            <CeldaInput>
              <select
                className={`${alfaCatInput} cursor-pointer`}
                value={anioSmmlv}
                disabled={disabled}
                onChange={(e) => {
                  const anioSel = Number(e.target.value);
                  const valor = SMMLV_POR_ANIO[anioSel];
                  onDeducibleChange?.({
                    anioSMMLV: anioSel,
                    valorSMMLV: valor,
                    valorSMDLV: valorSmdlvDesdeSmmlv(valor),
                  });
                }}
              >
                {ANIOS_SMMLV.map((a) => (
                  <option key={a} value={a}>
                    {a} — $ {formatearMonto(SMMLV_POR_ANIO[a])}
                  </option>
                ))}
              </select>
            </CeldaInput>
          </div>
          <div className="grid grid-cols-[1fr] border-b border-r border-gray-200 dark:border-gray-700">
            <div className="bg-gray-50 px-2 py-1 text-center font-body text-[11px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Valor SMMLV
            </div>
            <CeldaInput>
              <input className={alfaCatInput} readOnly value={formatearMonto(valorSmmlv)} />
            </CeldaInput>
          </div>
          {[
            {
              key: 'cantidadSMMLV',
              label: 'Cant. SMMLV',
              value: dedCfg.cantidadSMMLV ?? '',
              type: 'number',
            },
            {
              key: 'porcentaje',
              label: dedCfg.baseDeducible === 'perdida' ? '% s/ pérdida' : '% s/ valor aseg.',
              value: dedCfg.porcentaje ?? '',
              type: 'number',
            },
          ].map((f) => (
            <div
              key={f.key}
              className="grid grid-cols-[1fr] border-b border-r border-gray-200 dark:border-gray-700"
            >
              <div className="bg-gray-50 px-2 py-1 text-center font-body text-[11px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {f.label}
              </div>
              <CeldaInput>
                <input
                  type={f.type}
                  className={alfaCatInput}
                  disabled={disabled}
                  value={f.value}
                  onChange={(e) =>
                    onDeducibleChange?.(f.key, e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
              </CeldaInput>
            </div>
          ))}
          <div className="grid grid-cols-[1fr] border-b border-r border-gray-200 dark:border-gray-700">
            <div className="bg-gray-50 px-2 py-1 text-center font-body text-[11px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              AIU (%)
            </div>
            <CeldaInput>
              <input
                type="number"
                min="0"
                step="0.1"
                className={alfaCatInput}
                disabled={disabled}
                value={aiuPctUi}
                onChange={(e) => {
                  const pct = Number(e.target.value);
                  onAiuChange?.(
                    Number.isFinite(pct) ? Math.max(0, pct) / 100 : AIU_PORCENTAJE_DEFAULT_ALFA
                  );
                }}
              />
            </CeldaInput>
          </div>
          <div className="grid grid-cols-[1fr] border-b border-gray-200 dark:border-gray-700">
            <div className="bg-gray-50 px-2 py-1 text-center font-body text-[11px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              AIU ($)
            </div>
            <CeldaInput>
              <input className={alfaCatInput} readOnly value={formatearMonto(aiuMonto)} />
            </CeldaInput>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 border-b border-gray-300 dark:border-gray-600">
        <div className="grid grid-cols-[140px_1fr]">
          <CeldaLabel>Valor SID</CeldaLabel>
          <CeldaInput>
            <input
              className={alfaCatInput}
              inputMode="decimal"
              disabled={disabled}
              placeholder="Obligatorio para el deducible % asegurable"
              value={
                enc.valorAseguradoSid === '' || enc.valorAseguradoSid == null
                  ? ''
                  : formatMilesNsr10(enc.valorAseguradoSid)
              }
              onChange={(e) =>
                onEncabezadoChange?.('valorAseguradoSid', formatMilesInputNsr10(e.target.value))
              }
            />
          </CeldaInput>
        </div>
      </div>

      {totales?.deducibleRequiereValorAsegurado ? (
        <p className="border-b border-amber-200 bg-amber-50 px-3 py-2 font-body text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Según el tomador, el deducible usa el <strong>Valor SID</strong>. Llene «Valor SID» en
          esta sección (no el del formato NSR).
        </p>
      ) : totales?.deducibleAlfa?.baseDeducible === 'perdida' ? (
        <p className="border-b border-gray-200 bg-gray-50 px-3 py-2 font-body text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
          Deducible de esta liquidación:{' '}
          <strong>
            {totales.deducibleAlfa.porcentaje}% de la pérdida ($
            {formatearMonto(totales.deducibleAlfa.deducibleAplicado)})
          </strong>
          {totales.deducibleTexto ? ` · ${totales.deducibleTexto}` : ''}
        </p>
      ) : totales?.deducibleAlfa ? (
        <p className="border-b border-gray-200 bg-gray-50 px-3 py-2 font-body text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
          Deducible = mayor entre{' '}
          <strong>
            {totales.deducibleAlfa.porcentaje}% del Valor SID ($
            {formatearMonto(totales.deducibleAlfa.deduciblePorcentaje)})
          </strong>{' '}
          y{' '}
          <strong>
            {totales.deducibleAlfa.cantidadSMMLV} SMMLV ($
            {formatearMonto(totales.deducibleAlfa.deducibleSMMLV)})
          </strong>
          {totales.deducibleAlfa.usaMinimo ? ' → aplica el mínimo SMMLV.' : ' → aplica el %.'}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-gray-200 px-3 py-3 dark:border-gray-700">
        {SLOTS_COTIZACION_PDF_ALFA.map((slot) => {
          const fila = resumen.filas.find((f) => f.id === slot.id);
          const nPag = Array.isArray(fila?.cotizacion?.paginas)
            ? fila.cotizacion.paginas.length
            : 0;
          return (
            <button
              key={slot.id}
              type="button"
              className={pillClass(slotActivo === slot.id)}
              onClick={() => setSlotActivo(slot.id)}
            >
              {t(`segurosAlfa.settlement.quoteSlot.${slot.id}`, {
                defaultValue: slot.label,
              })}
              {fila?.usada ? (
                <span className="ml-2 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                  $ {formatearMonto(fila.monto)}
                </span>
              ) : nPag > 0 ? (
                <span className="ml-2 text-[10px] opacity-80">{nPag} pág.</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="p-4">
        {SLOTS_COTIZACION_PDF_ALFA.map((slot) =>
          slotActivo === slot.id ? (
            <CotizacionPdfLiquidacion
              key={slot.id}
              i18nPrefix="segurosAlfa.settlement"
              titulo={t(`segurosAlfa.settlement.quoteSlotTitle.${slot.id}`, {
                defaultValue: `Cotización · ${slot.label}`,
              })}
              hint={t(`segurosAlfa.settlement.quoteSlotHint.${slot.id}`, {
                defaultValue: HINTS[slot.id],
              })}
              descripcionUpload={`Cotización Alfa · ${slot.label} (PDF original)`}
              value={resumen.slots[slot.id]}
              onChange={(next) => onChangeSlot?.(slot.id, next)}
              casoId={casoId}
              api={api}
              archivosCaso={archivosCaso}
              onArchivosCreados={onArchivosCreados}
              onArchivosEliminados={onArchivosEliminados}
              disabled={disabled}
            />
          ) : null
        )}
      </div>

      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40">
        <div className="grid gap-1 text-sm">
          {resumen.filas.map((fila) => (
            <div
              key={fila.id}
              className="flex justify-between gap-4 text-gray-700 dark:text-gray-200"
            >
              <span>
                {fila.label}
                {!fila.usada && fila.tieneArchivo ? (
                  <span className="ml-2 text-xs text-gray-400">(no entra a la cuenta)</span>
                ) : null}
              </span>
              <span className="font-mono">
                {fila.usada ? `$ ${formatearMonto(fila.monto)}` : '—'}
              </span>
            </div>
          ))}
          <div className="mt-1 flex justify-between gap-4 border-t border-gray-200 pt-2 font-semibold text-[#1F4E79] dark:border-gray-700 dark:text-sky-300">
            <span>
              {t('segurosAlfa.settlement.quoteFinalAccount', {
                defaultValue: 'Cuenta final (suma de ventanas usadas)',
              })}
            </span>
            <span className="font-mono">$ {formatearMonto(resumen.total)}</span>
          </div>
          {resumen.nUsadas > 0 ? (
            <>
              <div className="flex justify-between gap-4 text-gray-700 dark:text-gray-200">
                <span>
                  {t('segurosAlfa.settlement.quoteAiu', {
                    defaultValue: 'AIU ({{pct}}%)',
                    pct: aiuPctUi,
                  })}
                </span>
                <span className="font-mono">$ {formatearMonto(aiuMonto)}</span>
              </div>
              <div className="flex justify-between gap-4 text-gray-700 dark:text-gray-200">
                <span>
                  {t('segurosAlfa.settlement.quoteDeductible', {
                    defaultValue: 'Deducible Alfa',
                  })}
                  {totales?.deducibleTexto ? (
                    <span className="ml-1 text-xs font-normal text-gray-500">
                      · {totales.deducibleTexto}
                    </span>
                  ) : null}
                </span>
                <span className="font-mono">$ {formatearMonto(deducible)}</span>
              </div>
              <div className="flex justify-between gap-4 font-semibold text-[#1F4E79] dark:text-sky-300">
                <span>
                  {t('segurosAlfa.settlement.quoteAfterDeductible', {
                    defaultValue: 'Amparo edificio (cuenta + AIU − deducible)',
                  })}
                </span>
                <span className="font-mono">$ {formatearMonto(indemnizacionPdf)}</span>
              </div>
            </>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {resumen.nUsadas === 0
            ? t('segurosAlfa.settlement.quoteNoneHint', {
                defaultValue:
                  'Sin PDF en esta cuenta. El formato de liquidación NSR de abajo sigue independiente, con sus propios ítems y deducible.',
              })
            : t('segurosAlfa.settlement.quoteUsedHint', {
                defaultValue:
                  'Fórmula de este bloque: cuenta final + AIU − deducible. No altera el formato NSR. Desmarque «incluir» si una ventana no debe sumar.',
              })}
        </p>
      </div>
    </div>
  );
}
