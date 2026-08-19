import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CampoTomadorAlfa from './CampoTomadorAlfa.jsx';
import { formatearMonto, parsearNumero, ANIOS_SMMLV, SMMLV_POR_ANIO } from './liquidadorAlfaHelpers.js';
import {
  formatMilesInputNsr10,
  formatMilesNsr10,
} from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import {
  BASE_PRECIOS_PRESUPUESTO,
  CAPITULOS_BASE_PRECIOS,
  catalogoPresupuestoPorCapitulo,
} from '../SubcomponenteEvaluacionSismicaNSR10/basePreciosPresupuesto.js';
import { CAPITULOS_PRESUPUESTO_NSR10 } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import SelectBuscable from '../SelectBuscable.jsx';
import { valorSmdlvDesdeSmmlv } from '../SubcomponenteFormularioCatastrofico/catalogoPresupuestoCatastrofico.js';
import {
  alfaCatAccentOrange,
  alfaCatCell,
  alfaCatHeaderBlue,
  alfaCatInput,
  alfaCatLabelBlue,
  alfaCatShell,
  alfaCatTableHead,
  alfaCatTextarea,
} from './alfaCatFormUi.js';

function CeldaLabel({ children, className = '' }) {
  return <div className={`${alfaCatLabelBlue} ${className}`}>{children}</div>;
}

function CeldaInput({ children, className = '' }) {
  return <div className={`${alfaCatCell} ${className}`}>{children}</div>;
}

const selectClass = `${alfaCatInput} max-w-[280px] cursor-pointer`;

/** Pad de firma: dibuja en local y solo guarda al confirmar (evita colgar la UI). */
function PadFirmaCliente({ value = '', onChange, label = 'Firma del cliente' }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const ctxRef = useRef(null);
  const dirtyRef = useRef(false);
  const [tieneTrazo, setTieneTrazo] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState(value || '');

  const prepararCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const w = 480;
    const h = 140;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
    return ctx;
  }, []);

  useEffect(() => {
    prepararCanvas();
    if (!value) {
      setVistaPrevia('');
      setTieneTrazo(false);
      dirtyRef.current = false;
      return;
    }
    setVistaPrevia(value);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const ctx = prepararCanvas();
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      dirtyRef.current = false;
      setTieneTrazo(true);
    };
    img.src = value;
    // Solo al montar / si el padre trae firma ya guardada (no en cada trazo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    return {
      x: ((clientX - r.left) * canvas.width) / r.width,
      y: ((clientY - r.top) * canvas.height) / r.height,
    };
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    dirtyRef.current = true;
    last.current = getPos(e);
    if (!tieneTrazo) setTieneTrazo(true);
  };

  const onPointerMove = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = ctxRef.current || canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const onPointerUp = (e) => {
    if (!drawing.current) return;
    drawing.current = false;
    try {
      canvasRef.current?.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ok */
    }
  };

  const confirmar = () => {
    const canvas = canvasRef.current;
    if (!canvas || !tieneTrazo) return;
    // JPEG más liviano que PNG para no congelar React al guardar
    const data = canvas.toDataURL('image/jpeg', 0.72);
    dirtyRef.current = false;
    setVistaPrevia(data);
    onChange?.(data);
  };

  const limpiar = () => {
    prepararCanvas();
    dirtyRef.current = false;
    setTieneTrazo(false);
    setVistaPrevia('');
    onChange?.('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-body text-xs font-semibold uppercase text-gray-700 dark:text-gray-200">
          {label}
        </span>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="font-body text-xs font-semibold text-[#1F4E79] hover:underline dark:text-sky-300"
            onClick={limpiar}
          >
            Limpiar
          </button>
          <button
            type="button"
            className="rounded bg-[#1F4E79] px-3 py-1 font-body text-xs font-semibold text-white hover:bg-[#163a5c] disabled:opacity-40"
            onClick={confirmar}
            disabled={!tieneTrazo}
          >
            Guardar firma
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded border-2 border-dashed border-gray-300 bg-white touch-none dark:border-gray-600">
        <canvas
          ref={canvasRef}
          className="block h-[140px] w-full max-w-full cursor-crosshair touch-none"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <p className="font-body text-[11px] text-gray-500">
        Dibuje la firma y pulse «Guardar firma». Así no se congela la pantalla.
        {vistaPrevia ? ' · Firma guardada.' : ''}
      </p>
    </div>
  );
}

/**
 * Formulario en pantalla que replica la hoja LIQUIDADOR (FORMATO LIQUIDACIÓN) del Excel CAT Alfa.
 * Ítems con la misma base de precios del liquidador NSR-10.
 */
export default function FormatoLiquidacionAlfa({
  caso = {},
  encabezado = {},
  liquidacionCatastrofico = {},
  itemsDetalle = [],
  totales = {},
  observaciones = '',
  liquidadoPor = '',
  datosBancarios = {},
  aceptacionIndemnizacion = '',
  firmaCliente = '',
  nombreFirmante = '',
  aiuPorcentaje = 0.05,
  onEncabezadoChange,
  onCasoCampoChange,
  onDeducibleChange,
  onAiuChange,
  onItemChange,
  onCatalogoItem,
  onAddItem,
  onRemoveItem,
  onObservacionesChange,
  onLiquidadoPorChange,
  onDatosBancariosChange,
  onAceptacionChange,
  onFirmaClienteChange,
  onNombreFirmanteChange,
}) {
  const dedCfg =
    liquidacionCatastrofico.deducibleConfigPresupuesto ||
    liquidacionCatastrofico.deducibleConfig ||
    {};
  const fechaSin = encabezado.fechaSiniestro || caso.fechaSiniestro || '';
  const anio = fechaSin ? String(fechaSin).slice(0, 4) : '';
  const anioSmmlv =
    Number(dedCfg.anioSMMLV) ||
    Number(anio) ||
    ANIOS_SMMLV[0] ||
    2026;
  const valorSmmlv =
    Number(dedCfg.valorSMMLV) || SMMLV_POR_ANIO[anioSmmlv] || SMMLV_POR_ANIO[2026];
  const aiuPctNum = Number(aiuPorcentaje);
  const aiuPctUi = Number.isFinite(aiuPctNum)
    ? Math.round(aiuPctNum * 10000) / 100
    : 5;

  const capitulos = useMemo(() => {
    const fromNsr = Array.isArray(CAPITULOS_PRESUPUESTO_NSR10) ? CAPITULOS_PRESUPUESTO_NSR10 : [];
    const fromBase = Array.isArray(CAPITULOS_BASE_PRECIOS) ? CAPITULOS_BASE_PRECIOS : [];
    return [...new Set([...fromNsr, ...fromBase])].filter(Boolean);
  }, []);

  const subtotal = useMemo(() => {
    return (itemsDetalle || []).reduce((acc, it) => acc + parsearNumero(it.valorPerdida), 0);
  }, [itemsDetalle]);

  const deducible = parsearNumero(totales.deducibleAplicado);
  const totalIndemnizar =
    totales.totalIndemnizar != null
      ? parsearNumero(totales.totalIndemnizar)
      : Math.max(0, subtotal - deducible);

  return (
    <div className={alfaCatShell}>
      <div className={alfaCatHeaderBlue}>Formato liquidación</div>

      <div className="grid grid-cols-1 border-b border-gray-300 dark:border-gray-600 lg:grid-cols-3">
        <div className="grid grid-cols-[140px_1fr] border-b border-gray-200 lg:border-b-0 lg:border-r dark:border-gray-700">
          <CeldaLabel>Póliza número</CeldaLabel>
          <CeldaInput>
            <input
              className={alfaCatInput}
              value={encabezado.poliza || ''}
              onChange={(e) => onEncabezadoChange?.('poliza', e.target.value)}
            />
          </CeldaInput>
        </div>
        <div className="grid grid-cols-[140px_1fr] border-b border-gray-200 lg:border-b-0 lg:border-r dark:border-gray-700">
          <CeldaLabel>Siniestro número</CeldaLabel>
          <CeldaInput>
            <input
              className={alfaCatInput}
              value={encabezado.siniestro || ''}
              onChange={(e) => onEncabezadoChange?.('siniestro', e.target.value)}
            />
          </CeldaInput>
        </div>
        <div className="grid grid-cols-[140px_1fr]">
          <CeldaLabel>Tomador / Asegurado</CeldaLabel>
          <CeldaInput>
            <CampoTomadorAlfa
              value={encabezado.tomador}
              onChange={(valor) => onEncabezadoChange?.('tomador', valor)}
              mostrarGestion={false}
              ocultarLabel
              className="space-y-0"
            />
            <input
              className={`${alfaCatInput} mt-1 border-t border-gray-100 pt-1 dark:border-gray-800`}
              value={encabezado.asegurado || ''}
              onChange={(e) => onEncabezadoChange?.('asegurado', e.target.value)}
              placeholder="Asegurado"
            />
          </CeldaInput>
        </div>
      </div>

      <div className="grid grid-cols-1 border-b border-gray-300 dark:border-gray-600 lg:grid-cols-2">
        <div className="grid grid-cols-[140px_1fr] border-b border-gray-200 lg:border-b-0 lg:border-r dark:border-gray-700">
          <CeldaLabel>Vigencia desde</CeldaLabel>
          <CeldaInput>
            <input
              type="date"
              className={alfaCatInput}
              value={String(caso.fechaInicioPoliza || '').slice(0, 10)}
              onChange={(e) => onCasoCampoChange?.('fechaInicioPoliza', e.target.value)}
            />
          </CeldaInput>
        </div>
        <div className="grid grid-cols-[140px_1fr]">
          <CeldaLabel>Vigencia hasta</CeldaLabel>
          <CeldaInput>
            <input
              type="date"
              className={alfaCatInput}
              value={String(caso.fechaFinPoliza || '').slice(0, 10)}
              onChange={(e) => onCasoCampoChange?.('fechaFinPoliza', e.target.value)}
            />
          </CeldaInput>
        </div>
      </div>

      <div className="grid grid-cols-1 border-b border-gray-300 dark:border-gray-600 lg:grid-cols-3">
        <div className="grid grid-cols-[140px_1fr] border-b border-gray-200 lg:border-b-0 lg:border-r dark:border-gray-700">
          <CeldaLabel>Ramo afectado</CeldaLabel>
          <CeldaInput>
            <input
              className={alfaCatInput}
              value={encabezado.cobertura || ''}
              onChange={(e) => onEncabezadoChange?.('cobertura', e.target.value)}
            />
          </CeldaInput>
        </div>
        <div className="grid grid-cols-[140px_1fr] border-b border-gray-200 lg:border-b-0 lg:border-r dark:border-gray-700">
          <CeldaLabel>Fecha siniestro</CeldaLabel>
          <CeldaInput>
            <input
              type="date"
              className={alfaCatInput}
              value={String(fechaSin || '').slice(0, 10)}
              onChange={(e) => onEncabezadoChange?.('fechaSiniestro', e.target.value)}
            />
          </CeldaInput>
        </div>
        <div className="grid grid-cols-[140px_1fr]">
          <CeldaLabel>Año del siniestro</CeldaLabel>
          <CeldaInput>
            <input className={alfaCatInput} readOnly value={anio} />
          </CeldaInput>
        </div>
      </div>

      <div className="grid grid-cols-1 border-b border-gray-300 dark:border-gray-600 lg:grid-cols-2">
        <div className="grid grid-cols-[140px_1fr] border-b border-gray-200 lg:border-b-0 lg:border-r dark:border-gray-700">
          <CeldaLabel>Sustracción / Evento</CeldaLabel>
          <CeldaInput>
            <input
              className={alfaCatInput}
              value={encabezado.evento || ''}
              onChange={(e) => onEncabezadoChange?.('evento', e.target.value)}
            />
          </CeldaInput>
        </div>
        <div className="grid grid-cols-[140px_1fr]">
          <CeldaLabel>Causa</CeldaLabel>
          <CeldaInput>
            <input
              className={alfaCatInput}
              value={encabezado.causa || encabezado.cobertura || ''}
              onChange={(e) => onEncabezadoChange?.('causa', e.target.value)}
            />
          </CeldaInput>
        </div>
      </div>

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
              <input
                className={alfaCatInput}
                readOnly
                value={formatearMonto(valorSmmlv)}
              />
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
              label: '% Deducible',
              value: dedCfg.porcentaje ?? '',
              type: 'number',
            },
            { key: 'dolares', label: 'Dólares', value: dedCfg.dolares ?? 0, type: 'number' },
            {
              key: 'pesosOtro',
              label: 'Pesos / Otro',
              value: deducible || dedCfg.pesosOtro || 0,
              type: 'number',
              readOnly: true,
            },
          ].map((f) => (
            <div
              key={f.key}
              className="grid grid-cols-[1fr] border-b border-r border-gray-200 last:border-r-0 dark:border-gray-700"
            >
              <div className="bg-gray-50 px-2 py-1 text-center font-body text-[11px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {f.label}
              </div>
              <CeldaInput>
                <input
                  type={f.type}
                  className={alfaCatInput}
                  readOnly={f.readOnly}
                  value={f.value}
                  onChange={(e) =>
                    !f.readOnly &&
                    onDeducibleChange?.(f.key, e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
              </CeldaInput>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 border-t border-gray-200 sm:grid-cols-2 dark:border-gray-700">
          <div className="grid grid-cols-[180px_1fr] border-b border-gray-200 sm:border-b-0 sm:border-r dark:border-gray-700">
            <CeldaLabel>AIU (%)</CeldaLabel>
            <CeldaInput>
              <input
                type="number"
                min="0"
                step="0.1"
                className={alfaCatInput}
                value={aiuPctUi}
                onChange={(e) => {
                  const pct = Number(e.target.value);
                  onAiuChange?.(
                    Number.isFinite(pct) ? Math.max(0, pct) / 100 : 0.05
                  );
                }}
                title="Porcentaje de AIU sobre el subtotal de ítems"
              />
            </CeldaInput>
          </div>
          <div className="grid grid-cols-[180px_1fr]">
            <CeldaLabel>AIU ($)</CeldaLabel>
            <CeldaInput>
              <input
                className={alfaCatInput}
                readOnly
                value={formatearMonto(totales.aiu ?? subtotal * (aiuPctUi / 100))}
              />
            </CeldaInput>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 border-b border-gray-300 dark:border-gray-600 lg:grid-cols-2">
        <div className="grid grid-cols-[180px_1fr] border-b border-gray-200 lg:border-b-0 lg:border-r dark:border-gray-700">
          <CeldaLabel>Valor límite asegurado</CeldaLabel>
          <CeldaInput>
            <input
              className={alfaCatInput}
              value={
                encabezado.valorAseguradoInmueble ?? liquidacionCatastrofico.valorAsegurado ?? ''
              }
              onChange={(e) => onEncabezadoChange?.('valorAseguradoInmueble', e.target.value)}
            />
          </CeldaInput>
        </div>
        <div className="grid grid-cols-[140px_1fr]">
          <CeldaLabel>Dirección</CeldaLabel>
          <CeldaInput>
            <input
              className={alfaCatInput}
              value={encabezado.direccion || ''}
              onChange={(e) => onEncabezadoChange?.('direccion', e.target.value)}
            />
          </CeldaInput>
        </div>
      </div>

      <div className="border-b border-gray-300 dark:border-gray-600">
        <div className={`${alfaCatHeaderBlue} !py-2 text-sm`}>Detalle de la liquidación</div>
        <p className="border-b border-gray-200 px-3 py-2 font-body text-xs text-gray-500 dark:border-gray-700">
          Elija capítulo y un ítem de la base de precios NSR-10 (misma del liquidador). Cantidad ×
          valor unitario calcula la pérdida.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-[1400px] w-full border-collapse text-sm">
            <thead>
              <tr>
                {[
                  'Ítem',
                  'Capítulo',
                  'Base precios',
                  'Descripción del bien',
                  'Und',
                  'Cant.',
                  'Vlr. unitario',
                  'Valor de la pérdida',
                  'Demérito',
                  'Valor real',
                  '',
                ].map((h) => (
                  <th key={h || 'x'} className={alfaCatTableHead}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(itemsDetalle || []).map((it, idx) => {
                const catalogoCap = catalogoPresupuestoPorCapitulo(it.capitulo || '');
                const esCustom =
                  !it.catalogoId ||
                  !BASE_PRECIOS_PRESUPUESTO.some((c) => c.id === it.catalogoId);
                return (
                  <tr key={it.id || idx} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-2 py-1 text-center">{idx + 1}</td>
                    <td className="px-1 py-1">
                      <select
                        className={selectClass}
                        value={it.capitulo || ''}
                        onChange={(e) =>
                          onItemChange?.(idx, {
                            capitulo: e.target.value,
                            catalogoId: '',
                          })
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
                    <td className="px-1 py-1 min-w-[260px]">
                      <SelectBuscable
                        options={catalogoCap.map((c) => ({
                          value: c.id,
                          label: `${c.actividad} ($ ${formatearMonto(c.valorUnitario)}/${c.unidad})`,
                        }))}
                        value={esCustom ? '__custom__' : it.catalogoId || ''}
                        onChange={(val) => onCatalogoItem?.(idx, val)}
                        placeholder="— Elegir de la base —"
                        searchPlaceholder="Buscar actividad o valor…"
                        emptyOption
                        emptyLabel="— Elegir de la base —"
                        extraOptions={[{ value: '__custom__', label: 'Otro / escribir libre' }]}
                        buttonClassName={selectClass}
                      />
                    </td>
                    <td className="px-1 py-1 min-w-[180px]">
                      <input
                        className={alfaCatInput}
                        value={it.descripcion || ''}
                        onChange={(e) => onItemChange?.(idx, { descripcion: e.target.value })}
                      />
                    </td>
                    <td className="px-1 py-1 w-16">
                      <input
                        className={alfaCatInput}
                        value={it.unidad || ''}
                        onChange={(e) => onItemChange?.(idx, { unidad: e.target.value })}
                      />
                    </td>
                    <td className="px-1 py-1 w-20">
                      <input
                        className={alfaCatInput}
                        value={it.cantidad ?? ''}
                        onChange={(e) => onItemChange?.(idx, { cantidad: e.target.value })}
                      />
                    </td>
                    <td className="px-1 py-1 w-28">
                      <input
                        className={`${alfaCatInput} text-right`}
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
                    <td className="px-1 py-1 w-32">
                      <input
                        className={`${alfaCatInput} text-right`}
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
                    <td className="px-1 py-1 w-20">
                      <input
                        className={alfaCatInput}
                        value={it.demerito ?? 0}
                        onChange={(e) => onItemChange?.(idx, { demerito: e.target.value })}
                      />
                    </td>
                    <td className="px-1 py-1 w-32">
                      <input
                        className={`${alfaCatInput} text-right`}
                        value={
                          it.valorReal === '' || it.valorReal == null
                            ? it.valorPerdida === '' || it.valorPerdida == null
                              ? ''
                              : formatMilesNsr10(it.valorPerdida)
                            : formatMilesNsr10(it.valorReal)
                        }
                        onChange={(e) =>
                          onItemChange?.(idx, {
                            valorReal: formatMilesInputNsr10(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td className="px-1 py-1 text-center">
                      <button
                        type="button"
                        className="font-body text-xs text-red-600 hover:underline"
                        onClick={() => onRemoveItem?.(idx)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!(itemsDetalle || []).length && (
                <tr>
                  <td colSpan={11} className="px-3 py-6 text-center text-gray-500">
                    Sin ítems. Pulse «Agregar ítem» y elija de la base de precios NSR-10.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-3 py-2 dark:border-gray-700">
          <button
            type="button"
            className="font-body text-sm font-semibold text-[#1F4E79] hover:underline dark:text-sky-300"
            onClick={() => onAddItem?.()}
          >
            + Agregar ítem
          </button>
          <div className="grid min-w-[260px] gap-1 text-sm">
            <div className="flex justify-between gap-4 px-2 py-1">
              <span>Sub total ítems</span>
              <span>$ {formatearMonto(subtotal)}</span>
            </div>
            <div className="flex justify-between gap-4 px-2 py-1">
              <span>AIU ({aiuPctUi}%)</span>
              <span>$ {formatearMonto(totales.aiu ?? subtotal * (aiuPctUi / 100))}</span>
            </div>
            <div className="flex justify-between gap-4 px-2 py-1">
              <span>Deducible aplicable</span>
              <span>$ {formatearMonto(deducible)}</span>
            </div>
            <div className={`flex justify-between gap-4 ${alfaCatAccentOrange}`}>
              <span>Total a indemnizar</span>
              <span>$ {formatearMonto(totalIndemnizar)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 border-b border-gray-300 dark:border-gray-600 md:grid-cols-[180px_1fr]">
        <CeldaLabel>Liquidado por / Analistas</CeldaLabel>
        <CeldaInput>
          <input
            className={alfaCatInput}
            value={liquidadoPor || ''}
            onChange={(e) => onLiquidadoPorChange?.(e.target.value)}
          />
        </CeldaInput>
      </div>

      <div className="border-b border-gray-300 dark:border-gray-600">
        <div className={`${alfaCatHeaderBlue} !py-2 text-sm`}>Datos bancarios para pago</div>
        <p className="border-b border-gray-200 px-3 py-2 font-body text-xs text-gray-500 dark:border-gray-700">
          Salen en el Excel CAT (pie del liquidador) y en el finiquito Word.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="border-b border-r border-gray-200 dark:border-gray-700">
            <div className="bg-gray-50 px-2 py-1 text-center font-body text-[11px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              No. cuenta
            </div>
            <CeldaInput>
              <input
                className={alfaCatInput}
                value={datosBancarios.numeroCuenta || ''}
                onChange={(e) => onDatosBancariosChange?.('numeroCuenta', e.target.value)}
                placeholder="Número de cuenta"
              />
            </CeldaInput>
          </div>
          <div className="border-b border-r border-gray-200 dark:border-gray-700">
            <div className="bg-gray-50 px-2 py-1 text-center font-body text-[11px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Banco
            </div>
            <CeldaInput>
              <input
                className={alfaCatInput}
                value={datosBancarios.banco || ''}
                onChange={(e) => onDatosBancariosChange?.('banco', e.target.value)}
                placeholder="Nombre del banco"
              />
            </CeldaInput>
          </div>
          <div className="border-b border-r border-gray-200 dark:border-gray-700 sm:border-r-0 lg:border-r">
            <div className="bg-gray-50 px-2 py-1 text-center font-body text-[11px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Tipo de cuenta
            </div>
            <CeldaInput>
              <select
                className={`${alfaCatInput} cursor-pointer`}
                value={datosBancarios.tipoCuenta || ''}
                onChange={(e) => onDatosBancariosChange?.('tipoCuenta', e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                <option value="AHORROS">AHORROS</option>
                <option value="CORRIENTE">CORRIENTE</option>
              </select>
            </CeldaInput>
          </div>
          <div className="border-b border-r border-gray-200 dark:border-gray-700">
            <div className="bg-gray-50 px-2 py-1 text-center font-body text-[11px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Sucursal
            </div>
            <CeldaInput>
              <input
                className={alfaCatInput}
                value={datosBancarios.sucursal || ''}
                onChange={(e) => onDatosBancariosChange?.('sucursal', e.target.value)}
                placeholder="Sucursal"
              />
            </CeldaInput>
          </div>
          <div className="border-b border-gray-200 dark:border-gray-700 sm:col-span-1 lg:col-span-2">
            <div className="bg-gray-50 px-2 py-1 text-center font-body text-[11px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Ciudad de firma
            </div>
            <CeldaInput>
              <input
                className={alfaCatInput}
                value={datosBancarios.ciudadFirma || ''}
                onChange={(e) => onDatosBancariosChange?.('ciudadFirma', e.target.value)}
                placeholder="Ciudad donde se firma"
              />
            </CeldaInput>
          </div>
        </div>
        <div className={`${alfaCatAccentOrange} space-y-3 px-3 py-3 font-body text-xs leading-relaxed text-gray-800 dark:text-gray-100`}>
          <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">
            Decisión del asegurado / tomador
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-gray-300 bg-white/80 px-4 py-2 font-semibold dark:border-gray-600 dark:bg-gray-900/40">
              <input
                type="radio"
                name="aceptacionIndemnizacion"
                className="h-4 w-4 accent-[#1F4E79]"
                checked={aceptacionIndemnizacion === 'ACEPTO'}
                onChange={() => onAceptacionChange?.('ACEPTO')}
              />
              ACEPTO INDEMNIZACIÓN
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-gray-300 bg-white/80 px-4 py-2 font-semibold dark:border-gray-600 dark:bg-gray-900/40">
              <input
                type="radio"
                name="aceptacionIndemnizacion"
                className="h-4 w-4 accent-[#1F4E79]"
                checked={aceptacionIndemnizacion === 'NO_ACEPTO'}
                onChange={() => onAceptacionChange?.('NO_ACEPTO')}
              />
              NO ACEPTO INDEMNIZACIÓN
            </label>
          </div>
          {!aceptacionIndemnizacion ? (
            <p className="text-center text-[11px] text-amber-800 dark:text-amber-200">
              Seleccione si acepta o no la indemnización.
            </p>
          ) : null}

          <p>
            En aceptación de lo anterior, firmamos el presente documento en la ciudad de{' '}
            <span className="font-semibold underline">
              {datosBancarios.ciudadFirma || '________________'}
            </span>
            . Por último autorizamos consignar / transferir a nuestra cuenta{' '}
            <span className="font-semibold">
              {datosBancarios.tipoCuenta || 'AHORROS / CORRIENTE'}
            </span>{' '}
            No.{' '}
            <span className="font-semibold underline">
              {datosBancarios.numeroCuenta || '________________'}
            </span>{' '}
            del Banco{' '}
            <span className="font-semibold underline">
              {datosBancarios.banco || '________________'}
            </span>{' '}
            Sucursal{' '}
            <span className="font-semibold underline">
              {datosBancarios.sucursal || '________________'}
            </span>
            .
          </p>

          <div className="space-y-2 rounded border border-orange-200/80 bg-white/70 p-2 dark:border-orange-900/40 dark:bg-gray-900/30">
            <label className="block">
              <span className="mb-1 block font-body text-[11px] font-semibold uppercase text-gray-600 dark:text-gray-300">
                Nombre de quien firma
              </span>
              <input
                className={alfaCatInput}
                value={nombreFirmante || ''}
                onChange={(e) => onNombreFirmanteChange?.(e.target.value)}
                placeholder="Nombre completo del asegurado / tomador"
              />
            </label>
            <PadFirmaCliente
              value={firmaCliente || ''}
              onChange={onFirmaClienteChange}
              label="Firma del cliente"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr]">
        <CeldaLabel className="md:items-start md:pt-3">Observación</CeldaLabel>
        <CeldaInput className="min-h-[90px]">
          <textarea
            className={alfaCatTextarea}
            rows={4}
            value={observaciones || ''}
            onChange={(e) => onObservacionesChange?.(e.target.value)}
          />
        </CeldaInput>
      </div>
    </div>
  );
}
