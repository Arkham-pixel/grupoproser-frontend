import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaCamera, FaPlus, FaTrash } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import { getImageUrl } from '../../utils/imageUtils.js';
import SelectBuscable from '../SelectBuscable.jsx';
import {
  CAPITULOS_PRESUPUESTO_NSR10,
  ESTADOS_CONTENIDO_NSR10,
  ESTADOS_DANO_NSR10,
  HOJAS_LIQUIDADOR_NSR10,
  HOJAS_VISIBLES_NSR10,
  OCULTAR_EVALUACION_Y_DICTAMEN_NSR10,
  PRIORIDADES_PRESUPUESTO_NSR10,
  TIPOS_INMUEBLE_CONTENIDOS_NSR10,
  UNIDADES_CONTENIDOS_NSR10,
  UNIDADES_PRESUPUESTO_NSR10,
  aplicarCatalogoAFilaContenido,
  aplicarCatalogoAFilaPresupuesto,
  aplicarDeducibleCoberturaFila,
  aplicarRecargosPresupuestoNsr10,
  argsDeduciblesPorArticuloDiagrama,
  ARTICULOS_ASEGURADOS_POLIZA,
  calcularTotalesContenidos,
  calcularResumenTotalesNsr10,
  catalogoContenidosPorTipo,
  COBERTURAS_ARTICULO_ASEGURADO,
  etiquetaCoberturaArticulo,
  filaContenidoListaParaDeducible,
  filaPresupuestoListaParaDeducible,
  MODO_DEDUCIBLE_NSR10,
  prepararFilaDeducibleContenido,
  prepararFilaDeduciblePresupuesto,
  formatMilesInputNsr10,
  formatMilesNsr10,
  hojaActivaVisibleNSR10,
  aplicarEstadoAItem,
  calcularCriterioFinal,
  calcularTotalesPresupuesto,
  crearEvaluacionSismicaNSR10Inicial,
  crearFilaContenidoVacia,
  crearFilaPresupuestoVacia,
  fusionarPortadaConFormData,
  normalizarItemsRespuesta,
  parseMontoNsr10,
  resolverModoDeducibleNsr,
  sugerirFilasPresupuestoDesdeEvaluacion,
  totalFilaContenido,
  totalFilaPresupuesto,
} from './catalogoEvaluacionSismicaNSR10.js';
import {
  BASE_PRECIOS_PRESUPUESTO,
  catalogoPresupuestoPorCapitulo,
} from './basePreciosPresupuesto.js';
import { sincronizarPresupuestoNsr10AlInforme } from '../SubcomponenteFormularioCatastrofico/syncPresupuestoNsr10AlInforme.js';
import {
  ANIOS_SMMLV,
  DEFAULT_DEDUCIBLE_CATASTROFICO,
  SMMLV_POR_ANIO,
  calcularDiagramaLiquidacion,
  HOSPEDAJE_PORCENTAJE_DEFAULT,
  normalizarDeducibleCatastrofico,
  valorSmdlvDesdeSmmlv,
} from '../SubcomponenteFormularioCatastrofico/catalogoPresupuestoCatastrofico.js';
import OtrosAmparosLiquidacion from '../liquidacion/OtrosAmparosLiquidacion.jsx';
import { defaultOtrosAmparos } from '../liquidacion/otrosAmparosLiquidacion.js';

function money(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const hasDecimals = Math.abs(n % 1) > 1e-9;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function displayMiles(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (typeof valor === 'string' && /[.,]/.test(valor)) {
    return valor;
  }
  return formatMilesNsr10(valor);
}

/** Vacío se muestra vacío (el cálculo usa 0). Solo el fallback aplica si nunca se digitó. */
function valorInputDeducible(valor, fallback) {
  if (valor === '') return '';
  if (valor === null || valor === undefined) return fallback;
  return valor;
}

/** Panel deducible estilo Express (MAX % vs SMMLV/SMDLV). */
function PanelDeducibleCatastrofico({
  deducibleCfg,
  diagrama,
  onChangeConfig,
  inputClass,
  inputBg,
  borderColor,
  textPrimary,
  textSecondary,
  softBg,
}) {
  const tipo = deducibleCfg.tipoMinimo || 'SMMLV';
  return (
    <div className="space-y-3 rounded-lg border p-4" style={{ borderColor, backgroundColor: softBg }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold" style={{ color: textPrimary }}>
            Deducible (estilo Express)
          </h4>
          <p className="text-xs" style={{ color: textSecondary }}>
            Adaptable a cada caso: elija si aplica el mayor entre % y mínimo SMMLV/SMDLV, solo
            porcentaje, solo mínimo, un valor fijo en pesos, o no aplica.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['max_pct_minimo', 'Mayor % o mínimo'],
          ['solo_porcentaje', 'Solo %'],
          ['solo_minimo', 'Solo mínimo'],
          ['valor_fijo', 'Valor fijo'],
          ['no_aplica', 'No aplica'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              (deducibleCfg.modo || 'max_pct_minimo') === id ? 'border-blue-500 text-blue-600' : ''
            }`}
            style={
              (deducibleCfg.modo || 'max_pct_minimo') === id
                ? undefined
                : { borderColor, color: textSecondary }
            }
            onClick={() => onChangeConfig({ modo: id })}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="block text-sm" style={{ color: textSecondary }}>
        Texto póliza (opcional)
        <input
          className={`${inputClass} mt-1`}
          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
          value={deducibleCfg.texto || ''}
          placeholder="Ej. 10% mínimo 4 SMMLV"
          onChange={(e) => onChangeConfig({ texto: e.target.value })}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
            tipo === 'SMMLV' ? 'border-blue-500 text-blue-600' : ''
          }`}
          style={
            tipo === 'SMMLV'
              ? undefined
              : { borderColor, color: textSecondary }
          }
          onClick={() => onChangeConfig({ tipoMinimo: 'SMMLV' })}
        >
          Mínimo SMMLV
        </button>
        <button
          type="button"
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
            tipo === 'SMDLV' ? 'border-blue-500 text-blue-600' : ''
          }`}
          style={
            tipo === 'SMDLV'
              ? undefined
              : { borderColor, color: textSecondary }
          }
          onClick={() => onChangeConfig({ tipoMinimo: 'SMDLV' })}
        >
          Mínimo SMDLV
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm" style={{ color: textSecondary }}>
          % deducible
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            className={`${inputClass} mt-1`}
            style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
            value={valorInputDeducible(deducibleCfg.porcentaje, 10)}
            onChange={(e) =>
              onChangeConfig({
                porcentaje: e.target.value === '' ? '' : Number(e.target.value),
              })
            }
          />
        </label>
        <label className="block text-sm" style={{ color: textSecondary }}>
          Valor fijo (COP)
          <input
            type="text"
            inputMode="numeric"
            className={`${inputClass} mt-1`}
            style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
            value={displayMiles(deducibleCfg.valorFijo)}
            onChange={(e) => {
              const digits = String(e.target.value).replace(/\D/g, '');
              onChangeConfig({
                modo: 'valor_fijo',
                valorFijo: digits === '' ? '' : Number(digits),
              });
            }}
          />
        </label>
        <label className="block text-sm" style={{ color: textSecondary }}>
          Año SMMLV
          <select
            className={`${inputClass} mt-1`}
            style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
            value={deducibleCfg.anioSMMLV}
            onChange={(e) => {
              const anio = Number(e.target.value);
              const valorSMMLV = SMMLV_POR_ANIO[anio];
              onChangeConfig({
                anioSMMLV: anio,
                valorSMMLV,
                valorSMDLV: valorSmdlvDesdeSmmlv(valorSMMLV),
              });
            }}
          >
            {ANIOS_SMMLV.map((anio) => (
              <option key={anio} value={anio}>
                {anio} — $ {formatMilesNsr10(SMMLV_POR_ANIO[anio])}
              </option>
            ))}
          </select>
        </label>
        {tipo === 'SMMLV' ? (
          <>
            <label className="block text-sm" style={{ color: textSecondary }}>
              Cantidad SMMLV
              <input
                type="number"
                min="0"
                step="1"
                className={`${inputClass} mt-1`}
                style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                value={valorInputDeducible(deducibleCfg.cantidadSMMLV, 4)}
                onChange={(e) =>
                  onChangeConfig({
                    cantidadSMMLV: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="block text-sm" style={{ color: textSecondary }}>
              Valor SMMLV
              <input
                type="text"
                inputMode="decimal"
                className={`${inputClass} mt-1`}
                style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                value={displayMiles(deducibleCfg.valorSMMLV)}
                onChange={(e) => {
                  const fmt = formatMilesInputNsr10(e.target.value);
                  const n = parseMontoNsr10(fmt);
                  onChangeConfig({
                    valorSMMLV: fmt,
                    valorSMDLV: n == null ? deducibleCfg.valorSMDLV : valorSmdlvDesdeSmmlv(n),
                  });
                }}
              />
            </label>
          </>
        ) : (
          <>
            <label className="block text-sm" style={{ color: textSecondary }}>
              Cantidad SMDLV
              <input
                type="number"
                min="0"
                step="1"
                className={`${inputClass} mt-1`}
                style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                value={valorInputDeducible(deducibleCfg.cantidadSMDLV, 10)}
                onChange={(e) =>
                  onChangeConfig({
                    cantidadSMDLV: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="block text-sm" style={{ color: textSecondary }}>
              Valor SMDLV
              <input
                type="text"
                inputMode="decimal"
                className={`${inputClass} mt-1`}
                style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                value={displayMiles(deducibleCfg.valorSMDLV)}
                onChange={(e) =>
                  onChangeConfig({ valorSMDLV: formatMilesInputNsr10(e.target.value) })
                }
              />
            </label>
          </>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
        <div className="flex justify-between gap-2 border-b pb-1" style={{ borderColor }}>
          <span style={{ color: textSecondary }}>Deducible {diagrama.deduciblePorcentajeCfg ?? 10}%</span>
          <strong style={{ color: textPrimary }}>{money(diagrama.deduciblePorcentaje)}</strong>
        </div>
        <div className="flex justify-between gap-2 border-b pb-1" style={{ borderColor }}>
          <span style={{ color: textSecondary }}>
            {tipo === 'SMDLV'
              ? `Deducible ${diagrama.deducibleCantidadSMDLV ?? ''} SMDLV`
              : `Deducible ${diagrama.deducibleCantidadSMMLV ?? ''} SMMLV`}
          </span>
          <strong style={{ color: textPrimary }}>
            {money(tipo === 'SMDLV' ? diagrama.deducibleSMDLV : diagrama.deducibleSMMLV)}
          </strong>
        </div>
        <div className="flex justify-between gap-2 border-b pb-1" style={{ borderColor }}>
          <span style={{ color: textSecondary }}>
            Aplicado ({diagrama.deducibleUsaMinimo ? diagrama.deducibleTipoMinimo : '%'})
          </span>
          <strong style={{ color: textPrimary }}>{money(diagrama.deducibleAplicado || 0)}</strong>
        </div>
      </div>
    </div>
  );
}

function PreguntaModoDeducibleNsr({
  modo,
  onElegir,
  borderColor,
  textPrimary,
  textSecondary,
  softBg,
}) {
  const opciones = [
    {
      id: MODO_DEDUCIBLE_NSR10.GENERAL,
      titulo: 'Deducible general (SMMLV)',
      texto:
        'Un solo deducible sobre el total, con el mayor entre porcentaje y salarios mínimos. Úselo cuando la póliza no discrimina por artículo.',
    },
    {
      id: MODO_DEDUCIBLE_NSR10.POR_ARTICULO,
      titulo: 'Deducible por artículo / ítem',
      texto:
        'Cada fila de contenidos y de presupuesto lleva su cobertura. Terremoto = mayor entre 3% del valor asegurable (o del total del ítem) y 3 SMMLV.',
    },
  ];
  return (
    <div className="space-y-2 rounded-lg border p-4" style={{ borderColor, backgroundColor: softBg }}>
      <h4 className="text-sm font-semibold" style={{ color: textPrimary }}>
        ¿Cómo se aplica el deducible en este caso?
      </h4>
      <p className="text-xs" style={{ color: textSecondary }}>
        No todos los casos son iguales. Elija antes de liquidar: la opción queda guardada en el
        caso.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {opciones.map((op) => {
          const activo = modo === op.id;
          return (
            <button
              key={op.id}
              type="button"
              className={`rounded-lg border px-3 py-3 text-left ${
                activo ? 'border-blue-500 ring-1 ring-blue-500' : ''
              }`}
              style={{
                borderColor: activo ? undefined : borderColor,
                backgroundColor: activo ? undefined : softBg,
                color: textPrimary,
              }}
              onClick={() => onElegir(op.id)}
            >
              <span className="block text-sm font-semibold">{op.titulo}</span>
              <span className="mt-1 block text-[11px]" style={{ color: textSecondary }}>
                {op.texto}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * @param {{ formData: object, onInputChange: Function, modoLiquidador?: boolean, habilitarUploadFotos?: boolean, onUploadFotoFila?: Function, onRemoveFotoFila?: Function, recargosPresupuesto?: { aiuFijo?: number, ocultarImprevistos?: boolean, ocultarImpuestos?: boolean }|null }} props
 * modoLiquidador: hojas Presupuesto + Contenidos + diagrama de liquidación (informe único).
 * habilitarUploadFotos: celda Foto/Ref. permite adjuntar imagen (p. ej. Seguros Alfa).
 * recargosPresupuesto: p. ej. CAT NSR-10 o BBVA — AIU fijo y sin imprevistos/impuestos.
 */
export default function ChecklistEvaluacionSismicaNSR10({
  formData,
  onInputChange,
  modoLiquidador = false,
  habilitarUploadFotos = false,
  onUploadFotoFila = null,
  onRemoveFotoFila = null,
  recargosPresupuesto = null,
}) {
  const { theme } = useTheme();
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const softBg = theme === 'dark' ? '#141414' : '#F8FAFC';
  const [subiendoFotoIdx, setSubiendoFotoIdx] = useState(null);
  const [errorFoto, setErrorFoto] = useState('');

  const inputClass =
    'w-full rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide';

  const evalData = {
    ...crearEvaluacionSismicaNSR10Inicial(formData || {}),
    ...(formData?.evaluacionSismicaNSR10 || {}),
  };
  const portada = fusionarPortadaConFormData(evalData.portada, formData || {});
  const items = useMemo(
    () => normalizarItemsRespuesta(evalData.items),
    [evalData.items]
  );
  const criterio = useMemo(() => calcularCriterioFinal(items), [items]);
  const presupuesto = aplicarRecargosPresupuestoNsr10(
    evalData.presupuesto || { items: [] },
    recargosPresupuesto
  );
  const filasPresupuesto = Array.isArray(presupuesto.items) ? presupuesto.items : [];
  const totales = useMemo(
    () => calcularTotalesPresupuesto(presupuesto),
    [presupuesto]
  );
  const contenidos = evalData.contenidos || { items: [], tipoInmueble: '' };
  const filasContenidos = Array.isArray(contenidos.items) ? contenidos.items : [];
  const totalesContenidos = useMemo(
    () => calcularTotalesContenidos(contenidos),
    [contenidos]
  );
  const resumenTotales = useMemo(
    () =>
      calcularResumenTotalesNsr10({
        presupuesto,
        contenidos,
      }),
    [presupuesto, contenidos]
  );
  const tipoInmuebleContenidos = String(
    contenidos.tipoInmueble || portada.tipologiaPrincipal || ''
  ).trim();
  const catalogoFiltrado = useMemo(
    () => catalogoContenidosPorTipo(tipoInmuebleContenidos),
    [tipoInmuebleContenidos]
  );
  const hojaRaw = evalData.hojaActiva || 'portada';
  const hoja = modoLiquidador
    ? HOJAS_LIQUIDADOR_NSR10.some((h) => h.id === hojaRaw)
      ? hojaRaw
      : 'presupuesto'
    : hojaActivaVisibleNSR10(hojaRaw);
  const hojasMenu = modoLiquidador ? HOJAS_LIQUIDADOR_NSR10 : HOJAS_VISIBLES_NSR10;
  const portadaSyncRef = useRef('');

  const liquidacion = formData.liquidacionCatastrofico || {
    valorAsegurado: '',
    hospedajePorcentaje: HOSPEDAJE_PORCENTAJE_DEFAULT,
    hospedajeManual: '',
    deducible: '',
    deducibleConfig: { ...DEFAULT_DEDUCIBLE_CATASTROFICO },
    deducibleConfigPresupuesto: { ...DEFAULT_DEDUCIBLE_CATASTROFICO },
  };
  const deducibleCfgInput =
    liquidacion.deducibleConfigContenidos || liquidacion.deducibleConfig || {};
  const deducibleCfgPresupuestoInput = liquidacion.deducibleConfigPresupuesto || {};
  const deducibleCfg = useMemo(
    () =>
      normalizarDeducibleCatastrofico({
        deducible: liquidacion.deducible,
        deducibleConfig: liquidacion.deducibleConfigContenidos || liquidacion.deducibleConfig,
      }),
    [liquidacion]
  );
  const deducibleCfgPresupuesto = useMemo(
    () =>
      normalizarDeducibleCatastrofico({
        deducibleConfig: liquidacion.deducibleConfigPresupuesto,
      }),
    [liquidacion]
  );
  const diagrama = useMemo(
    () =>
      calcularDiagramaLiquidacion({
        valorAsegurado: liquidacion.valorAsegurado,
        totalDanios: resumenTotales.sumaCompleta,
        totalPresupuesto: resumenTotales.totalPresupuesto,
        totalContenidos: resumenTotales.totalContenidos,
        hospedajePorcentaje: liquidacion.hospedajePorcentaje,
        hospedajeManual: liquidacion.hospedajeManual,
        deducible: liquidacion.deducible,
        deducibleConfig: liquidacion.deducibleConfig || deducibleCfg,
        deducibleConfigContenidos: liquidacion.deducibleConfigContenidos || deducibleCfg,
        deducibleConfigPresupuesto:
          liquidacion.deducibleConfigPresupuesto || deducibleCfgPresupuesto,
        otrosAmparos: formData.otrosAmparos,
        ...argsDeduciblesPorArticuloDiagrama(liquidacion, resumenTotales),
      }),
    [
      liquidacion,
      resumenTotales,
      deducibleCfg,
      deducibleCfgPresupuesto,
      formData.otrosAmparos,
    ]
  );
  const modoDeducibleNsr = resolverModoDeducibleNsr(liquidacion, resumenTotales);
  const usaPorArticulo = modoDeducibleNsr === MODO_DEDUCIBLE_NSR10.POR_ARTICULO;

  useEffect(() => {
    if (!modoLiquidador) return;
    const actual = String(formData.indemnizacionSugerida ?? '').trim();
    const siguiente = String(diagrama.totalIndemnizar || 0);
    if (actual !== siguiente) {
      onInputChange({ indemnizacionSugerida: siguiente });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoLiquidador, diagrama.totalIndemnizar]);

  const actualizarLiquidacion = (patch) => {
    onInputChange({
      liquidacionCatastrofico: { ...liquidacion, ...patch },
    });
  };

  const actualizarDeducibleConfig = (patch) => {
    const base =
      deducibleCfgInput && typeof deducibleCfgInput === 'object' && Object.keys(deducibleCfgInput).length
        ? deducibleCfgInput
        : deducibleCfg;
    const nextModo = patch.modo != null ? patch.modo : base.modo;
    const nextCfg = {
      ...base,
      ...patch,
      aplica: nextModo === 'no_aplica' ? false : patch.aplica !== false,
    };
    actualizarLiquidacion({
      deducibleConfig: nextCfg,
      deducibleConfigContenidos: nextCfg,
      deducible: nextCfg.texto || '',
    });
  };

  const actualizarDeduciblePresupuesto = (patch) => {
    const base =
      deducibleCfgPresupuestoInput &&
      typeof deducibleCfgPresupuestoInput === 'object' &&
      Object.keys(deducibleCfgPresupuestoInput).length
        ? deducibleCfgPresupuestoInput
        : deducibleCfgPresupuesto;
    const nextModo = patch.modo != null ? patch.modo : base.modo;
    const nextCfg = {
      ...base,
      ...patch,
      aplica: nextModo === 'no_aplica' ? false : patch.aplica !== false,
    };
    actualizarLiquidacion({
      deducibleConfigPresupuesto: nextCfg,
    });
  };

  const recargosPersistRef = useRef('');
  useEffect(() => {
    if (!recargosPresupuesto) return;
    const actual = evalData.presupuesto || {};
    const next = aplicarRecargosPresupuestoNsr10(actual, recargosPresupuesto);
    const firma = `${next.aiuPorcentaje}|${next.imprevistosPorcentaje}|${next.impuestosPorcentaje}`;
    if (recargosPersistRef.current === firma) return;
    const igual =
      Number(actual.aiuPorcentaje) === Number(next.aiuPorcentaje) &&
      Number(actual.imprevistosPorcentaje ?? 0) === Number(next.imprevistosPorcentaje) &&
      Number(actual.impuestosPorcentaje ?? 0) === Number(next.impuestosPorcentaje);
    recargosPersistRef.current = firma;
    if (igual) return;
    commit({ presupuesto: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recargosPresupuesto]);

  const elegirModoDeducible = (modo) => {
    const nextContenidos =
      modo === MODO_DEDUCIBLE_NSR10.POR_ARTICULO
        ? {
            ...contenidos,
            items: filasContenidos.map((row) =>
              prepararFilaDeducibleContenido(
                row,
                smmlvFilaContenido,
                contenidos.coberturaAfectar
              )
            ),
          }
        : contenidos;
    const nextPresupuesto =
      modo === MODO_DEDUCIBLE_NSR10.POR_ARTICULO
        ? aplicarRecargosPresupuestoNsr10(
            {
              ...presupuesto,
              items: filasPresupuesto.map((row) =>
                prepararFilaDeduciblePresupuesto(
                  row,
                  smmlvFilaContenido,
                  presupuesto.coberturaAfectar
                )
              ),
            },
            recargosPresupuesto
          )
        : presupuesto;
    onInputChange({
      liquidacionCatastrofico: { ...liquidacion, modoDeducibleNsr: modo },
      evaluacionSismicaNSR10: {
        ...evalData,
        contenidos: nextContenidos,
        presupuesto: nextPresupuesto,
      },
    });
  };

  // Persiste portada auto-llenada desde el caso (solo campos vacíos)
  useEffect(() => {
    const firma = JSON.stringify(portada);
    if (firma === portadaSyncRef.current) return;
    const actual = evalData.portada || {};
    const faltaAlgo = Object.keys(portada).some((key) => {
      const a = String(actual[key] ?? '').trim();
      const b = String(portada[key] ?? '').trim();
      return !a && b;
    });
    if (!faltaAlgo) {
      portadaSyncRef.current = firma;
      return;
    }
    portadaSyncRef.current = firma;
    onInputChange({
      evaluacionSismicaNSR10: {
        ...evalData,
        hojaActiva: hoja,
        portada,
        items,
        presupuesto,
        contenidos,
        criterioFinal: criterio,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData?.asegurado,
    formData?.numeroPoliza,
    formData?.vigenciaPoliza,
    formData?.ciudad,
    formData?.direccionRiesgo,
    formData?.fechaInspeccion,
    formData?.actaAjustadorNombre,
    formData?.funcionarioAsigna,
    formData?.fechaOcurrencia,
    formData?.fechaSiniestro,
    formData?.nivelesInmueble,
    formData?.ubicacionRiesgo,
    formData?.tipoInmueble,
    formData?.tipoRiesgoActa,
    formData?.tipoEvento,
  ]);

  const commit = (patch) => {
    const nextEval = {
      ...evalData,
      portada,
      items,
      presupuesto,
      contenidos,
      criterioFinal: criterio,
      ...patch,
    };
    const payload = {
      evaluacionSismicaNSR10: nextEval,
    };
    // El conteo de plata de la hoja Presupuesto alimenta el informe único
    const sync = sincronizarPresupuestoNsr10AlInforme({
      ...formData,
      evaluacionSismicaNSR10: nextEval,
    });
    if (sync) {
      payload.presupuestoCatastrofico = sync.presupuestoCatastrofico;
      payload.indemnizacionSugerida = sync.indemnizacionSugerida;
    }
    onInputChange(payload);
  };

  const setHoja = (id) => commit({ hojaActiva: id });

  const setPortadaField = (name, value) => {
    commit({ portada: { ...portada, [name]: value } });
  };

  const onCambioEstado = (index, estadoLabel) => {
    const next = items.map((it, i) =>
      i === index ? aplicarEstadoAItem(it, estadoLabel) : it
    );
    commit({ items: next, criterioFinal: calcularCriterioFinal(next) });
  };

  const actualizarItem = (index, fieldPatch) => {
    const next = items.map((it, i) => (i === index ? { ...it, ...fieldPatch } : it));
    commit({ items: next, criterioFinal: calcularCriterioFinal(next) });
  };

  const onSeleccionarFotoFila = async (index, file) => {
    if (!file || typeof onUploadFotoFila !== 'function') return;
    setErrorFoto('');
    setSubiendoFotoIdx(index);
    try {
      await onUploadFotoFila(index, file, items[index]);
    } catch (err) {
      setErrorFoto(err?.message || 'No se pudo subir la foto');
    } finally {
      setSubiendoFotoIdx(null);
    }
  };

  const onQuitarFotoFila = async (index) => {
    if (typeof onRemoveFotoFila === 'function') {
      setErrorFoto('');
      try {
        await onRemoveFotoFila(index, items[index]);
      } catch (err) {
        setErrorFoto(err?.message || 'No se pudo quitar la foto');
      }
      return;
    }
    actualizarItem(index, {
      fotoRef: '',
      fotoArchivoId: '',
      fotoRuta: '',
      fotoPreview: '',
    });
  };

  const setPresupuesto = (nextPresupuesto) => {
    commit({ presupuesto: aplicarRecargosPresupuestoNsr10(nextPresupuesto, recargosPresupuesto) });
  };

  const actualizarFilaPresupuesto = (index, patch) => {
    const nextItems = filasPresupuesto.map((row, i) => {
      if (i !== index) return row;
      const mezclado = { ...row, ...patch };
      if (!usaPorArticulo) return mezclado;
      const tocaDeducible =
        Object.prototype.hasOwnProperty.call(patch, 'coberturaAfectar') ||
        Object.prototype.hasOwnProperty.call(patch, 'tipoCobertura') ||
        Object.prototype.hasOwnProperty.call(patch, 'valorAsegurable') ||
        Object.prototype.hasOwnProperty.call(patch, 'porcentajeDeducible') ||
        Object.prototype.hasOwnProperty.call(patch, 'valorMinimo') ||
        Object.prototype.hasOwnProperty.call(patch, 'cantidadMinimoSMMLV') ||
        Object.prototype.hasOwnProperty.call(patch, 'capitulo') ||
        Object.prototype.hasOwnProperty.call(patch, 'catalogoId') ||
        Object.prototype.hasOwnProperty.call(patch, 'actividad') ||
        Object.prototype.hasOwnProperty.call(patch, 'componente') ||
        Object.prototype.hasOwnProperty.call(patch, 'cantidad') ||
        Object.prototype.hasOwnProperty.call(patch, 'valorUnitario');
      if (!tocaDeducible) return mezclado;
      return prepararFilaDeduciblePresupuesto(
        mezclado,
        smmlvFilaContenido,
        presupuesto.coberturaAfectar
      );
    });
    setPresupuesto({ ...presupuesto, items: nextItems });
  };

  const aplicarBasePreciosEnFila = (index, catalogoId) => {
    if (catalogoId === '__custom__') {
      actualizarFilaPresupuesto(index, {
        catalogoId: '',
        actividad: filasPresupuesto[index]?.actividad || '',
      });
      return;
    }
    const hit =
      BASE_PRECIOS_PRESUPUESTO.find((c) => c.id === catalogoId) || null;
    actualizarFilaPresupuesto(
      index,
      aplicarCatalogoAFilaPresupuesto(filasPresupuesto[index] || {}, hit)
    );
  };

  const setContenidos = (nextContenidos) => {
    commit({ contenidos: nextContenidos });
  };

  const smmlvFilaContenido = {
    anioSMMLV: deducibleCfg.anioSMMLV,
    valorSMMLV: parseMontoNsr10(deducibleCfg.valorSMMLV) || deducibleCfg.valorSMMLV,
  };

  const actualizarFilaContenido = (index, patch) => {
    const nextItems = filasContenidos.map((row, i) => {
      if (i !== index) return row;
      const mezclado = { ...row, ...patch };
      if (!usaPorArticulo) return mezclado;
      const tocaDeducible =
        Object.prototype.hasOwnProperty.call(patch, 'coberturaAfectar') ||
        Object.prototype.hasOwnProperty.call(patch, 'tipoCobertura') ||
        Object.prototype.hasOwnProperty.call(patch, 'valorAsegurable') ||
        Object.prototype.hasOwnProperty.call(patch, 'porcentajeDeducible') ||
        Object.prototype.hasOwnProperty.call(patch, 'valorMinimo') ||
        Object.prototype.hasOwnProperty.call(patch, 'cantidadMinimoSMMLV') ||
        Object.prototype.hasOwnProperty.call(patch, 'articulo') ||
        Object.prototype.hasOwnProperty.call(patch, 'catalogoId');
      if (!tocaDeducible) return mezclado;
      return prepararFilaDeducibleContenido(
        mezclado,
        smmlvFilaContenido,
        contenidos.coberturaAfectar
      );
    });
    setContenidos({ ...contenidos, items: nextItems });
  };

  const setTipoInmuebleContenidos = (tipo) => {
    const nextItems = filasContenidos.map((row) => ({
      ...row,
      tipoInmueble: tipo,
    }));
    setContenidos({ ...contenidos, tipoInmueble: tipo, items: nextItems });
  };

  const aplicarCatalogoEnFila = (index, catalogoId) => {
    if (catalogoId === '__custom__') {
      actualizarFilaContenido(index, {
        catalogoId: '',
        articulo: filasContenidos[index]?.articulo || '',
      });
      return;
    }
    const hit = catalogoFiltrado.find((c) => c.id === catalogoId);
    const base = {
      ...filasContenidos[index],
      tipoInmueble: tipoInmuebleContenidos,
    };
    actualizarFilaContenido(
      index,
      aplicarCatalogoAFilaContenido(base, hit || null)
    );
  };

  const portadaFields = [
    { name: 'asegurado', label: 'Asegurado' },
    { name: 'poliza', label: 'Póliza' },
    { name: 'municipio', label: 'Municipio' },
    { name: 'direccion', label: 'Dirección' },
    { name: 'fechaInspeccion', label: 'Fecha de inspección', type: 'date' },
    { name: 'inspector', label: 'Inspector' },
    { name: 'tipologiaPrincipal', label: 'Tipología principal' },
    { name: 'entorno', label: 'Entorno' },
    { name: 'numeroPisos', label: 'Número de pisos' },
    { name: 'uso', label: 'Uso' },
    { name: 'fechaSismo', label: 'Fecha del sismo', type: 'date' },
    { name: 'versionInforme', label: 'Versión del informe' },
  ];

  return (
    <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold" style={{ color: textPrimary }}>
          {modoLiquidador
            ? 'Liquidador · Presupuesto y Contenidos NSR-10'
            : 'Plantilla evaluación sísmica NSR-10'}
            </h2>
            <p className="mt-1 text-sm" style={{ color: textSecondary }}>
          {modoLiquidador
            ? 'Presupuesto (edificio), Contenidos y Totales. La suma completa alimenta el diagrama de liquidación del informe único.'
            : OCULTAR_EVALUACION_Y_DICTAMEN_NSR10
              ? 'Portada, Presupuesto, Contenidos y Totales. El presupuesto + contenidos alimentan el liquidador del informe único.'
              : 'Portada, Evaluación, Dictamen, Presupuesto, Contenidos y Totales. El presupuesto + contenidos alimentan el liquidador del informe único.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 border-b pb-3" style={{ borderColor }}>
        {hojasMenu.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setHoja(h.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  hoja === h.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>

      {!modoLiquidador && hoja === 'portada' && (
        <section className="space-y-4">
          <div className="rounded-lg border p-4" style={{ borderColor, backgroundColor: softBg }}>
            <p className="text-sm font-semibold" style={{ color: textPrimary }}>
              FECHA DE INSPECCIÓN:{' '}
              {portada.fechaInspeccion || 'PENDIENTE'}
            </p>
            <p className="mt-1 text-sm" style={{ color: textSecondary }}>
              VERSIÓN DEL INFORME: {portada.versionInforme || 'EVALUACIÓN PRELIMINAR'}
            </p>
          </div>
          <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>
            Información detallada de la inspección
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {portadaFields.map((f) => (
              <label key={f.name} className="block">
                <span className={labelClass} style={{ color: textSecondary }}>
                  {f.label}
                </span>
                <input
                  type={f.type || 'text'}
                  className={inputClass}
                  style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                  value={portada[f.name] || ''}
                  onChange={(e) => setPortadaField(f.name, e.target.value)}
                />
              </label>
            ))}
          </div>
        </section>
      )}

      {!modoLiquidador && hoja === 'evaluacion' && (
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>
              Evaluación rápida post-sismo – criterio operativo con enfoque NSR-10
            </h3>
            <p className="mt-1 text-xs" style={{ color: textSecondary }}>
              Inmueble: {portada.asegurado || '—'} · {portada.municipio || '—'} ·{' '}
              {portada.direccion || '—'} · Insp. {portada.fechaInspeccion || '—'} ·{' '}
              {portada.inspector || '—'}
            </p>
            {habilitarUploadFotos && (
              <p className="mt-1 text-xs" style={{ color: textSecondary }}>
                En Foto / Ref. puedes subir la evidencia; se incluye automáticamente en el informe único.
              </p>
            )}
            {errorFoto && (
              <p className="mt-1 text-xs font-medium" style={{ color: '#B91C1C' }}>
                {errorFoto}
              </p>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border" style={{ borderColor }}>
            <table className="min-w-[1100px] w-full text-left text-xs">
              <thead style={{ backgroundColor: softBg }}>
                <tr style={{ color: textSecondary }}>
                  <th className="px-2 py-2">Componente</th>
                  <th className="px-2 py-2">Código</th>
                  <th className="px-2 py-2">Elemento / condición</th>
                  <th className="px-2 py-2">Criterio visual</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2">Puntaje</th>
                  <th className="px-2 py-2">¿Intervención?</th>
                  <th className="px-2 py-2">Observación / Evidencia</th>
                  <th className="px-2 py-2">Foto / Ref.</th>
                  <th className="px-2 py-2">Acción sugerida</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.codigo} className="border-t align-top" style={{ borderColor }}>
                    <td className="px-2 py-2 font-semibold" style={{ color: textPrimary }}>
                      {item.componente}
                    </td>
                    <td className="px-2 py-2" style={{ color: textPrimary }}>
                      {item.codigo}
                    </td>
                    <td className="px-2 py-2" style={{ color: textPrimary }}>
                      {item.elemento}
                    </td>
                    <td className="px-2 py-2" style={{ color: textSecondary }}>
                      {item.criterio}
                    </td>
                    <td className="px-2 py-2 min-w-[160px]">
                      <select
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                        value={item.estado || ''}
                        onChange={(e) => onCambioEstado(index, e.target.value)}
                      >
                        <option value="">—</option>
                        {ESTADOS_DANO_NSR10.map((est) => (
                          <option key={est.label} value={est.label}>
                            {est.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2 text-center" style={{ color: textPrimary }}>
                      {item.puntaje == null ? '' : item.puntaje}
                    </td>
                    <td className="px-2 py-2" style={{ color: textPrimary }}>
                      {item.requiereIntervencion || ''}
                    </td>
                    <td className="px-2 py-2 min-w-[140px]">
                      <input
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                        value={item.observacion || ''}
                        onChange={(e) =>
                          actualizarItem(index, { observacion: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-2 min-w-[140px]">
                      {habilitarUploadFotos ? (
                        <div className="flex flex-col gap-1">
                          {(item.fotoPreview || item.fotoRuta) && (
                            <img
                              src={
                                item.fotoPreview ||
                                getImageUrl({ ruta: item.fotoRuta }) ||
                                getImageUrl(item.fotoRuta)
                              }
                              alt={item.fotoRef || item.codigo || 'Foto'}
                              className="h-14 w-20 rounded object-cover"
                              style={{ border: `1px solid ${borderColor}` }}
                            />
                          )}
                          <div className="flex flex-wrap items-center gap-1">
                            <label
                              className="inline-flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-[10px] font-medium"
                              style={{
                                backgroundColor: softBg,
                                border: `1px solid ${borderColor}`,
                                color: textPrimary,
                                opacity: subiendoFotoIdx === index ? 0.6 : 1,
                              }}
                            >
                              <FaCamera className="shrink-0" />
                              {subiendoFotoIdx === index ? 'Subiendo…' : item.fotoRuta || item.fotoPreview ? 'Cambiar' : 'Subir'}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={subiendoFotoIdx === index}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  e.target.value = '';
                                  if (file) onSeleccionarFotoFila(index, file);
                                }}
                              />
                            </label>
                            {(item.fotoRuta || item.fotoPreview || item.fotoArchivoId) && (
                              <button
                                type="button"
                                className="inline-flex items-center rounded px-1.5 py-1 text-[10px]"
                                style={{ color: '#B91C1C' }}
                                title="Quitar foto"
                                onClick={() => onQuitarFotoFila(index)}
                              >
                                <FaTrash />
                              </button>
                            )}
                          </div>
                      <input
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                            placeholder="Ref. / nombre"
                        value={item.fotoRef || ''}
                        onChange={(e) => actualizarItem(index, { fotoRef: e.target.value })}
                      />
                        </div>
                      ) : (
                        <input
                          className={inputClass}
                          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                          value={item.fotoRef || ''}
                          onChange={(e) => actualizarItem(index, { fotoRef: e.target.value })}
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 min-w-[120px]">
                      <input
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                        value={item.accionSugerida || ''}
                        onChange={(e) =>
                          actualizarItem(index, { accionSugerida: e.target.value })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border p-4" style={{ borderColor }}>
            <h4 className="mb-3 text-sm font-semibold" style={{ color: textPrimary }}>
              Criterio final automático
            </h4>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2 text-sm" style={{ color: textPrimary }}>
                {[
                  ['Puntaje máximo observado', criterio.puntajeMaximo ?? ''],
                  ['Categoría asignada', criterio.categoria],
                  ['Habitabilidad', criterio.habitabilidad],
                  ['Urgencia', criterio.urgencia],
                  ['Requiere evacuación', criterio.evacuacion],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b py-1" style={{ borderColor }}>
                    <span style={{ color: textSecondary }}>{k}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase" style={{ color: textSecondary }}>
                  Concepto técnico preliminar
                </p>
                <p className="text-sm" style={{ color: textPrimary }}>
                  {criterio.concepto}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs" style={{ color: textSecondary }}>
              Los ítems con intervención pueden trasladarse al módulo PRESUPUESTO para cuantificar
              reparación, demolición, reposición, apuntalamiento y medidas temporales.
            </p>
          </div>
        </section>
      )}

      {!modoLiquidador && hoja === 'dictamen' && (
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>
              Módulo de descripción y dictamen
            </h3>
            <p className="text-xs" style={{ color: textSecondary }}>
              Generación automática a partir de la hoja Evaluación — criterio preliminar sujeto a
              validación profesional.
            </p>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase" style={{ color: textSecondary }}>
              Resumen de clasificación
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Categoría', criterio.categoria],
                ['Habitabilidad', criterio.habitabilidad],
                ['Urgencia', criterio.urgencia],
                ['Evacuación', criterio.evacuacion],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border p-3" style={{ borderColor }}>
                  <p className="text-xs uppercase" style={{ color: textSecondary }}>
                    {k}
                  </p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: textPrimary }}>
                    {v}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {[
            ['Descripción del riesgo', criterio.riesgo],
            ['Descripción de los daños', criterio.descripcionDanios],
            ['Dictamen preliminar', criterio.dictamen],
          ].map(([title, body]) => (
            <div key={title} className="rounded-lg border p-4" style={{ borderColor }}>
              <h4 className="mb-2 text-xs font-semibold uppercase" style={{ color: textSecondary }}>
                {title}
              </h4>
              <p className="text-sm whitespace-pre-wrap" style={{ color: textPrimary }}>
                {body || '—'}
              </p>
            </div>
          ))}
        </section>
      )}

      {hoja === 'presupuesto' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>
                {modoLiquidador
                  ? 'Presupuesto de intervención / reparación post-sismo'
                  : 'Presupuesto de intervención / reparación post-sismo'}
              </h3>
              <p className="text-xs" style={{ color: textSecondary }}>
                {modoLiquidador
                  ? 'Elija del catálogo de base de precios (951 ítems, de mayor a menor). Puede buscar por nombre. Edite cantidades; el total alimenta la liquidación y el Word.'
                  : recargosPresupuesto?.ocultarImprevistos
                    ? 'Elija del catálogo de base de precios o escriba libre. Código del hallazgo, actividad, unidad, cantidad y valor unitario; total con AIU fijo.'
                    : 'Elija del catálogo de base de precios o escriba libre. Código del hallazgo, actividad, unidad, cantidad y valor unitario; totales con AIU / imprevistos / impuestos.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!OCULTAR_EVALUACION_Y_DICTAMEN_NSR10 ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                style={{ borderColor, color: textPrimary }}
                onClick={() =>
                  setPresupuesto({
                    ...presupuesto,
                    items: sugerirFilasPresupuestoDesdeEvaluacion(items, filasPresupuesto),
                  })
                }
              >
                Traer ítems con intervención
              </button>
              ) : null}
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
                onClick={() =>
                  setPresupuesto({
                    ...presupuesto,
                    items: [...filasPresupuesto, crearFilaPresupuestoVacia()],
                  })
                }
              >
                <FaPlus /> Agregar fila
              </button>
            </div>
          </div>

          <PreguntaModoDeducibleNsr
            modo={modoDeducibleNsr}
            onElegir={elegirModoDeducible}
            borderColor={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            softBg={softBg}
          />

          {usaPorArticulo ? (
            <label className="block max-w-sm">
              <span className={labelClass} style={{ color: textSecondary }}>
                Cobertura a afectar (predeterminada)
              </span>
              <select
                className={inputClass}
                style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                value={presupuesto.coberturaAfectar || ''}
                onChange={(e) => {
                  const coberturaAfectar = e.target.value;
                  const nextItems = filasPresupuesto.map((row) => {
                    if (!filaPresupuestoListaParaDeducible(row)) return row;
                    if (String(row.coberturaAfectar || row.tipoCobertura || '').trim()) {
                      return row;
                    }
                    return prepararFilaDeduciblePresupuesto(
                      { ...row, coberturaAfectar },
                      smmlvFilaContenido,
                      coberturaAfectar
                    );
                  });
                  setPresupuesto({ ...presupuesto, coberturaAfectar, items: nextItems });
                }}
              >
                <option value="">— Sin predeterminar —</option>
                {COBERTURAS_ARTICULO_ASEGURADO.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px]" style={{ color: textSecondary }}>
                Se aplica al diligenciar cada ítem con valor. Terremoto = mayor entre 3% y 3
                SMMLV. Las filas vacías no heredan cifras.
              </p>
            </label>
          ) : null}

          <div className="overflow-x-auto rounded-lg border" style={{ borderColor }}>
            <table className={`${usaPorArticulo ? 'min-w-[1880px]' : 'min-w-[1280px]'} w-full text-left text-xs`}>
              <thead style={{ backgroundColor: softBg }}>
                <tr style={{ color: textSecondary }}>
                  <th className="px-2 py-2">Capítulo</th>
                  <th className="px-2 py-2">Base precios</th>
                  <th className="px-2 py-2">Componente</th>
                  <th className="px-2 py-2">Actividad / reparación</th>
                  <th className="px-2 py-2">Unidad</th>
                  <th className="px-2 py-2">Cantidad</th>
                  <th className="px-2 py-2">Vlr. unitario</th>
                  <th className="px-2 py-2">Vlr. total</th>
                  {usaPorArticulo ? (
                    <>
                      <th className="px-2 py-2">Cobertura a afectar</th>
                      <th className="px-2 py-2">Tipo cobertura</th>
                      <th className="px-2 py-2">Vlr. asegurable</th>
                      <th className="px-2 py-2">% deducible</th>
                      <th className="px-2 py-2">Mínimo</th>
                      <th className="px-2 py-2">Deducible</th>
                    </>
                  ) : null}
                  <th className="px-2 py-2">Prioridad</th>
                  <th className="px-2 py-2">¿Cubierto?</th>
                  <th className="px-2 py-2">Observación</th>
                  <th className="px-2 py-2">Fuente</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {filasPresupuesto.map((row, index) => {
                  const catalogoCap = catalogoPresupuestoPorCapitulo(row.capitulo || '');
                  const esCustom =
                    !row.catalogoId ||
                    !BASE_PRECIOS_PRESUPUESTO.some((c) => c.id === row.catalogoId);
                  return (
                  <tr key={index} className="border-t align-top" style={{ borderColor }}>
                    <td className="px-1 py-1 min-w-[140px]">
                      <select
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                        value={row.capitulo || ''}
                        onChange={(e) =>
                          actualizarFilaPresupuesto(index, {
                            capitulo: e.target.value,
                            catalogoId: '',
                          })
                        }
                      >
                        <option value="">—</option>
                        {CAPITULOS_PRESUPUESTO_NSR10.map((c) => (
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
                          label: `${c.actividad} (${money(c.valorUnitario)}/${c.unidad})`,
                        }))}
                        value={esCustom ? '__custom__' : row.catalogoId}
                        onChange={(val) => aplicarBasePreciosEnFila(index, val)}
                        placeholder="— Elegir de la base —"
                        searchPlaceholder="Buscar actividad o valor…"
                        emptyOption
                        emptyLabel="— Elegir de la base —"
                        extraOptions={[{ value: '__custom__', label: 'Otro / escribir libre' }]}
                        buttonClassName={inputClass}
                      />
                    </td>
                    <td className="px-1 py-1 min-w-[120px]">
                      <input
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                        value={row.componente || ''}
                        onChange={(e) =>
                          actualizarFilaPresupuesto(index, { componente: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-1 py-1 min-w-[160px]">
                      <input
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                        value={row.actividad || ''}
                        onChange={(e) =>
                          actualizarFilaPresupuesto(index, {
                            actividad: e.target.value,
                            catalogoId: '',
                          })
                        }
                      />
                    </td>
                    <td className="px-1 py-1 min-w-[80px]">
                      <select
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                        value={row.unidad || 'und'}
                        onChange={(e) =>
                          actualizarFilaPresupuesto(index, { unidad: e.target.value })
                        }
                      >
                        {UNIDADES_PRESUPUESTO_NSR10.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1 min-w-[80px]">
                      <input
                        type="number"
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                        value={row.cantidad ?? ''}
                        onChange={(e) =>
                          actualizarFilaPresupuesto(index, { cantidad: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-1 py-1 min-w-[110px]">
                      <input
                        type="text"
                        inputMode="decimal"
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                        value={displayMiles(row.valorUnitario)}
                        placeholder="0"
                        onChange={(e) =>
                          actualizarFilaPresupuesto(index, {
                            valorUnitario: formatMilesInputNsr10(e.target.value),
                          })
                        }
                        onBlur={() => {
                          const n = parseMontoNsr10(row.valorUnitario);
                          actualizarFilaPresupuesto(index, {
                            valorUnitario: n == null ? '' : formatMilesNsr10(n),
                          });
                        }}
                      />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap" style={{ color: textPrimary }}>
                      {money(totalFilaPresupuesto(row))}
                    </td>
                    {usaPorArticulo
                      ? (() => {
                          const listaParaDeducible = filaPresupuestoListaParaDeducible(row);
                          const coberturaFila = listaParaDeducible
                            ? row.coberturaAfectar || ''
                            : '';
                          const esTerremoto = String(coberturaFila)
                            .toLowerCase()
                            .includes('terremoto');
                          return (
                            <>
                              <td className="px-1 py-1 min-w-[140px]">
                                <select
                                  className={inputClass}
                                  style={{
                                    backgroundColor: inputBg,
                                    borderColor,
                                    color: textPrimary,
                                  }}
                                  value={coberturaFila}
                                  disabled={!listaParaDeducible}
                                  onChange={(e) =>
                                    actualizarFilaPresupuesto(index, {
                                      coberturaAfectar: e.target.value,
                                    })
                                  }
                                >
                                  <option value="">—</option>
                                  {COBERTURAS_ARTICULO_ASEGURADO.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td
                                className="px-1 py-1 min-w-[110px] whitespace-nowrap"
                                style={{ color: textPrimary }}
                              >
                                {listaParaDeducible
                                  ? etiquetaCoberturaArticulo(
                                      row.tipoCobertura || row.coberturaAfectar
                                    ) || '—'
                                  : '—'}
                              </td>
                              <td className="px-1 py-1 min-w-[120px]">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className={inputClass}
                                  style={{
                                    backgroundColor: inputBg,
                                    borderColor,
                                    color: textPrimary,
                                  }}
                                  value={displayMiles(row.valorAsegurable)}
                                  placeholder="usa vlr. total"
                                  disabled={!listaParaDeducible}
                                  onChange={(e) =>
                                    actualizarFilaPresupuesto(index, {
                                      valorAsegurable: formatMilesInputNsr10(e.target.value),
                                    })
                                  }
                                  onBlur={() => {
                                    const n = parseMontoNsr10(row.valorAsegurable);
                                    actualizarFilaPresupuesto(index, {
                                      valorAsegurable: n == null ? '' : formatMilesNsr10(n),
                                    });
                                  }}
                                />
                              </td>
                              <td className="px-1 py-1 min-w-[70px]">
                                <input
                                  type="number"
                                  className={`${inputClass} text-right`}
                                  style={{
                                    backgroundColor: inputBg,
                                    borderColor,
                                    color: textPrimary,
                                  }}
                                  value={
                                    listaParaDeducible ? row.porcentajeDeducible ?? '' : ''
                                  }
                                  readOnly={esTerremoto || !listaParaDeducible}
                                  disabled={!listaParaDeducible}
                                  onChange={(e) =>
                                    actualizarFilaPresupuesto(index, {
                                      porcentajeDeducible:
                                        e.target.value === '' ? '' : Number(e.target.value),
                                    })
                                  }
                                />
                              </td>
                              <td
                                className="px-1 py-1 min-w-[110px] whitespace-nowrap"
                                style={{ color: textPrimary }}
                              >
                                {!listaParaDeducible ||
                                row.valorMinimo === '' ||
                                row.valorMinimo == null
                                  ? '—'
                                  : money(row.valorMinimo)}
                              </td>
                              <td
                                className="px-1 py-1 min-w-[110px] whitespace-nowrap"
                                style={{ color: textPrimary }}
                              >
                                {!listaParaDeducible ||
                                row.deducibleCalculado === '' ||
                                row.deducibleCalculado == null
                                  ? '—'
                                  : money(row.deducibleCalculado)}
                              </td>
                            </>
                          );
                        })()
                      : null}
                    <td className="px-1 py-1 min-w-[90px]">
                      <select
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                        value={row.prioridad || 'Medio'}
                        onChange={(e) =>
                          actualizarFilaPresupuesto(index, { prioridad: e.target.value })
                        }
                      >
                        {PRIORIDADES_PRESUPUESTO_NSR10.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1 min-w-[90px]">
                      <input
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                        value={row.cubierto || ''}
                        onChange={(e) =>
                          actualizarFilaPresupuesto(index, { cubierto: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-1 py-1 min-w-[120px]">
                      <input
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                        value={row.observacion || ''}
                        onChange={(e) =>
                          actualizarFilaPresupuesto(index, { observacion: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-1 py-1 min-w-[100px]">
                      <input
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                        value={row.fuente || ''}
                        onChange={(e) =>
                          actualizarFilaPresupuesto(index, { fuente: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-1 py-1">
                      <button
                        type="button"
                        className="text-red-600"
                        onClick={() =>
                          setPresupuesto({
                            ...presupuesto,
                            items: filasPresupuesto.filter((_, i) => i !== index),
                          })
                        }
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="ml-auto max-w-md space-y-2 rounded-lg border p-4 text-sm" style={{ borderColor }}>
            <div className="flex items-center justify-between gap-3">
              <span style={{ color: textSecondary }}>Subtotal</span>
              <strong style={{ color: textPrimary }}>{money(totales.subtotal)}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2" style={{ color: textSecondary }}>
                AIU
                {recargosPresupuesto?.aiuFijo != null ? (
                  <span className="rounded border px-2 py-1 text-xs font-semibold" style={{ borderColor, color: textPrimary }}>
                    {Math.round(Number(recargosPresupuesto.aiuFijo) * 100)}%
                  </span>
                ) : (
                <input
                  type="number"
                  step="0.01"
                  className="w-20 rounded border px-2 py-1 text-xs"
                  style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                  value={presupuesto.aiuPorcentaje ?? 0.05}
                  onChange={(e) =>
                    setPresupuesto({
                      ...presupuesto,
                      aiuPorcentaje: Number(e.target.value),
                    })
                  }
                />
                )}
              </label>
              <strong style={{ color: textPrimary }}>{money(totales.aiu)}</strong>
            </div>
            {!recargosPresupuesto?.ocultarImprevistos && (
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2" style={{ color: textSecondary }}>
                Imprevistos
                <input
                  type="number"
                  step="0.01"
                  className="w-20 rounded border px-2 py-1 text-xs"
                  style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                  value={presupuesto.imprevistosPorcentaje ?? 0.1}
                  onChange={(e) =>
                    setPresupuesto({
                      ...presupuesto,
                      imprevistosPorcentaje: Number(e.target.value),
                    })
                  }
                />
              </label>
              <strong style={{ color: textPrimary }}>{money(totales.imprevistos)}</strong>
            </div>
            )}
            {!recargosPresupuesto?.ocultarImpuestos && (
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2" style={{ color: textSecondary }}>
                Impuestos
                <input
                  type="number"
                  step="0.01"
                  className="w-20 rounded border px-2 py-1 text-xs"
                  style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                  value={presupuesto.impuestosPorcentaje ?? 0}
                  onChange={(e) =>
                    setPresupuesto({
                      ...presupuesto,
                      impuestosPorcentaje: Number(e.target.value),
                    })
                  }
                />
              </label>
              <strong style={{ color: textPrimary }}>{money(totales.impuestos)}</strong>
            </div>
            )}
            <div
              className="flex items-center justify-between gap-3 border-t pt-2"
              style={{ borderColor }}
            >
              <span className="font-semibold" style={{ color: textPrimary }}>
                Total estimado
              </span>
              <strong style={{ color: textPrimary }}>{money(totales.total)}</strong>
            </div>
          </div>

          <div
            className="ml-auto w-full max-w-lg space-y-3 rounded-lg border p-4 text-sm"
            style={{ borderColor, backgroundColor: softBg }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-semibold" style={{ color: textPrimary }}>
                Liquidación presupuesto
              </h4>
            </div>
            {usaPorArticulo ? (
              <>
              <div className="overflow-hidden rounded border" style={{ borderColor }}>
                <table className="w-full text-sm">
                  <tbody style={{ color: textPrimary }}>
                    <tr className="border-b" style={{ borderColor }}>
                      <td className="px-3 py-2">TOTAL PRESUPUESTO</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {money(totales.total)}
                      </td>
                    </tr>
                    <tr className="border-b" style={{ borderColor }}>
                      <td className="px-3 py-2 font-semibold">
                        DEDUCIBLE POR ÍTEM (cobertura)
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {money(diagrama.deduciblePresupuesto?.aplicado || 0)}
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: softBg }}>
                      <td className="px-3 py-2.5 font-bold text-emerald-600">
                        PRESUPUESTO NETO
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-600">
                        {money(diagrama.deduciblePresupuesto?.neto ?? totales.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs" style={{ color: textSecondary }}>
                El deducible del presupuesto es la suma de cada ítem según su cobertura. Terremoto
                = mayor entre 3% y 3 SMMLV.
              </p>
              </>
            ) : (
              <>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-xs" style={{ color: textSecondary }}>
                % deducible
                <input
                  type="text"
                  inputMode="decimal"
                  className={`${inputClass} mt-1`}
                  style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                  value={valorInputDeducible(deducibleCfgPresupuestoInput.porcentaje, 10)}
                  onChange={(e) =>
                    actualizarDeduciblePresupuesto({
                      porcentaje: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="block text-xs" style={{ color: textSecondary }}>
                Cant. SMMLV
                <input
                  type="text"
                  inputMode="decimal"
                  className={`${inputClass} mt-1`}
                  style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                  value={valorInputDeducible(deducibleCfgPresupuestoInput.cantidadSMMLV, 4)}
                  onChange={(e) =>
                    actualizarDeduciblePresupuesto({
                      cantidadSMMLV: e.target.value === '' ? '' : Number(e.target.value),
                      tipoMinimo: 'SMMLV',
                    })
                  }
                />
              </label>
            </div>
            <div className="overflow-hidden rounded border" style={{ borderColor }}>
              <table className="w-full text-sm">
                <tbody style={{ color: textPrimary }}>
                  <tr className="border-b" style={{ borderColor }}>
                    <td className="px-3 py-2">TOTAL PRESUPUESTO</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {money(totales.total)}
                    </td>
                  </tr>
                  <tr className="border-b" style={{ borderColor }}>
                    <td className="px-3 py-2" style={{ color: textSecondary }}>
                      DEDUCIBLE {diagrama.deduciblePresupuesto?.porcentaje ?? deducibleCfgPresupuesto.porcentaje ?? 10}%
                    </td>
                    <td className="px-3 py-2 text-right">
                      {money(diagrama.deduciblePresupuesto?.deduciblePorcentaje || 0)}
                    </td>
                  </tr>
                  <tr className="border-b" style={{ borderColor }}>
                    <td className="px-3 py-2" style={{ color: textSecondary }}>
                      DEDUCIBLE {diagrama.deduciblePresupuesto?.cantidadSMMLV ?? deducibleCfgPresupuesto.cantidadSMMLV ?? 4} SMMLV
                    </td>
                    <td className="px-3 py-2 text-right">
                      {money(diagrama.deduciblePresupuesto?.deducibleSMMLV || 0)}
                    </td>
                  </tr>
                  <tr className="border-b" style={{ borderColor }}>
                    <td className="px-3 py-2 font-semibold">
                      DEDUCIBLE APLICADO (
                      {diagrama.deduciblePresupuesto?.usaMinimo ? 'SMMLV' : '%'}
                      )
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {money(diagrama.deduciblePresupuesto?.aplicado || 0)}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: softBg }}>
                    <td className="px-3 py-2.5 font-bold text-emerald-600">
                      PRESUPUESTO NETO
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-emerald-600">
                      {money(
                        diagrama.deduciblePresupuesto?.neto ??
                          Math.max(
                            0,
                            (Number(totales.total) || 0) -
                              (diagrama.deduciblePresupuesto?.aplicado || 0)
                          )
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs" style={{ color: textSecondary }}>
              El deducible del inmueble es obligatorio: se resta siempre el mayor entre el % y el
              mínimo SMMLV. Es independiente del deducible de contenidos.
            </p>
              </>
            )}
          </div>

          {modoLiquidador ? (
            <div className="space-y-4 border-t pt-4" style={{ borderColor }}>
              <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>
                Diagrama de liquidación
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm" style={{ color: textSecondary }}>
                  Valor asegurado
                  <input
                    type="number"
                    className={`${inputClass} mt-1`}
                    style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                    value={liquidacion.valorAsegurado ?? ''}
                    onChange={(e) =>
                      actualizarLiquidacion({ valorAsegurado: e.target.value })
                    }
                  />
                </label>
                <label className="block text-sm" style={{ color: textSecondary }}>
                  % gastos de hospedaje
                  <input
                    type="number"
                    step="0.01"
                    className={`${inputClass} mt-1`}
                    style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                    value={
                      Math.round(
                        (Number(liquidacion.hospedajePorcentaje) ||
                          HOSPEDAJE_PORCENTAJE_DEFAULT) * 10000
                      ) / 100
                    }
                    onChange={(e) =>
                      actualizarLiquidacion({
                        hospedajePorcentaje: (Number(e.target.value) || 0) / 100,
                      })
                    }
                  />
                </label>
                <label className="block text-sm" style={{ color: textSecondary }}>
                  Hospedaje manual (opcional)
                  <input
                    type="number"
                    className={`${inputClass} mt-1`}
                    style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                    value={liquidacion.hospedajeManual ?? ''}
                    onChange={(e) =>
                      actualizarLiquidacion({ hospedajeManual: e.target.value })
                    }
                  />
                </label>
              </div>

              {!usaPorArticulo ? (
              <PanelDeducibleCatastrofico
                deducibleCfg={deducibleCfgInput}
                diagrama={diagrama}
                onChangeConfig={actualizarDeducibleConfig}
                inputClass={inputClass}
                inputBg={inputBg}
                borderColor={borderColor}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                softBg={softBg}
              />
              ) : (
                <p className="text-xs rounded-lg border p-3" style={{ borderColor, color: textSecondary }}>
                  El deducible de contenidos y presupuesto sale de cada fila (cobertura). No se
                  aplica el deducible general de salarios mínimos.
                </p>
              )}

              <OtrosAmparosLiquidacion
                otrosAmparos={formData.otrosAmparos}
                onChange={(filas) =>
                  onInputChange({
                    otrosAmparos:
                      Array.isArray(filas) && filas.length ? filas : defaultOtrosAmparos(),
                  })
                }
              />

              <div
                className="grid gap-2 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-3"
                style={{ borderColor, backgroundColor: softBg }}
              >
                <div>
                  <p className="text-xs uppercase" style={{ color: textSecondary }}>
                    Total presupuesto
                  </p>
                  <p className="text-lg font-bold" style={{ color: textPrimary }}>
                    {money(resumenTotales.totalPresupuesto)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase" style={{ color: textSecondary }}>
                    Total contenidos
                  </p>
                  <p className="text-lg font-bold" style={{ color: textPrimary }}>
                    {money(resumenTotales.totalContenidos)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase" style={{ color: textSecondary }}>
                    Suma completa
                  </p>
                  <p className="text-lg font-bold" style={{ color: textPrimary }}>
                    {money(resumenTotales.sumaCompleta)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase" style={{ color: textSecondary }}>
                    Hospedaje
                  </p>
                  <p className="text-lg font-bold" style={{ color: textPrimary }}>
                    {money(diagrama.gastosHospedaje)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase" style={{ color: textSecondary }}>
                    Deducible aplicado
                  </p>
                  <p className="text-lg font-bold" style={{ color: textPrimary }}>
                    {money(diagrama.deducibleAplicado || 0)}
                  </p>
                  <p className="text-xs" style={{ color: textSecondary }}>
                    {diagrama.deducible || 'No aplica'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase" style={{ color: textSecondary }}>
                    Otros amparos (sin deducible)
                  </p>
                  <p className="text-lg font-bold" style={{ color: textPrimary }}>
                    {money(diagrama.totalOtrosAmparos || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase" style={{ color: textSecondary }}>
                    Total a indemnizar
                  </p>
                  <p className="text-lg font-bold" style={{ color: textPrimary }}>
                    {money(diagrama.totalIndemnizar)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      )}

      {hoja === 'contenidos' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>
                Contenidos del inmueble
              </h3>
              <p className="text-xs" style={{ color: textSecondary }}>
                Elija el tipo (casa, apartamento, industria…) y seleccione ítems del catálogo.
                Si no aparece lo que necesita, use «Otro / escribir libre» y agregue filas.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
              onClick={() =>
                setContenidos({
                  ...contenidos,
                  items: [
                    ...filasContenidos,
                    crearFilaContenidoVacia({
                      tipoInmueble: tipoInmuebleContenidos,
                    }),
                  ],
                })
              }
            >
              <FaPlus /> Agregar fila
            </button>
          </div>

          <PreguntaModoDeducibleNsr
            modo={modoDeducibleNsr}
            onElegir={elegirModoDeducible}
            borderColor={borderColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            softBg={softBg}
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className={labelClass} style={{ color: textSecondary }}>
                Tipo de inmueble / riesgo
              </span>
              <select
                className={inputClass}
                style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                value={tipoInmuebleContenidos}
                onChange={(e) => setTipoInmuebleContenidos(e.target.value)}
              >
                <option value="">— Seleccione —</option>
                {TIPOS_INMUEBLE_CONTENIDOS_NSR10.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            {usaPorArticulo ? (
            <label className="block">
              <span className={labelClass} style={{ color: textSecondary }}>
                Cobertura a afectar (predeterminada)
              </span>
              <select
                className={inputClass}
                style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                value={contenidos.coberturaAfectar || ''}
                onChange={(e) => {
                  const coberturaAfectar = e.target.value;
                  const nextItems = filasContenidos.map((row) => {
                    if (!filaContenidoListaParaDeducible(row)) return row;
                    if (String(row.coberturaAfectar || row.tipoCobertura || '').trim()) {
                      return row;
                    }
                    return aplicarDeducibleCoberturaFila(
                      { ...row, coberturaAfectar },
                      smmlvFilaContenido
                    );
                  });
                  setContenidos({ ...contenidos, coberturaAfectar, items: nextItems });
                }}
              >
                <option value="">— Sin predeterminar —</option>
                {COBERTURAS_ARTICULO_ASEGURADO.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px]" style={{ color: textSecondary }}>
                Se aplica al diligenciar cada artículo con valor asegurable. Terremoto =
                mayor entre 3% del valor asegurable y 3 SMMLV. Las filas vacías no heredan
                cifras.
              </p>
            </label>
            ) : null}
          </div>

          <div className="overflow-x-auto rounded-lg border" style={{ borderColor }}>
            <table className={`${usaPorArticulo ? 'min-w-[1880px]' : 'min-w-[1280px]'} w-full text-left text-xs`}>
              <thead style={{ backgroundColor: softBg }}>
                <tr style={{ color: textSecondary }}>
                  <th className="px-2 py-2">Catálogo</th>
                  <th className="px-2 py-2">Artículo asegurado</th>
                  <th className="px-2 py-2">Artículo / descripción</th>
                  {usaPorArticulo ? (
                    <>
                  <th className="px-2 py-2">Cobertura a afectar</th>
                  <th className="px-2 py-2">Tipo cobertura</th>
                  <th className="px-2 py-2">Vlr. asegurable</th>
                  <th className="px-2 py-2">% deducible</th>
                  <th className="px-2 py-2">Mínimo</th>
                  <th className="px-2 py-2">Deducible</th>
                    </>
                  ) : null}
                  <th className="px-2 py-2">Marca / ref.</th>
                  <th className="px-2 py-2">Und</th>
                  <th className="px-2 py-2">Cant.</th>
                  <th className="px-2 py-2">Vlr. unitario</th>
                  <th className="px-2 py-2">Vlr. total</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2">Observación</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {filasContenidos.map((row, index) => {
                  const esCustom =
                    !row.catalogoId ||
                    !catalogoFiltrado.some((c) => c.id === row.catalogoId);
                  const listaParaDeducible = filaContenidoListaParaDeducible(row);
                  const coberturaFila = listaParaDeducible
                    ? row.coberturaAfectar || ''
                    : '';
                  const esTerremoto = String(coberturaFila)
                    .toLowerCase()
                    .includes('terremoto');
                  return (
                    <tr key={index} className="border-t align-top" style={{ borderColor }}>
                      <td className="px-1 py-1 min-w-[180px]">
                        <select
                          className={inputClass}
                          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                          value={esCustom ? '__custom__' : row.catalogoId}
                          onChange={(e) => aplicarCatalogoEnFila(index, e.target.value)}
                        >
                          <option value="">— Elegir del catálogo —</option>
                          {catalogoFiltrado.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.categoria}: {c.articulo}
                            </option>
                          ))}
                          <option value="__custom__">Otro / escribir libre</option>
                        </select>
                      </td>
                      <td className="px-1 py-1 min-w-[170px]">
                        <select
                          className={inputClass}
                          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                          value={
                            ARTICULOS_ASEGURADOS_POLIZA.find(
                              (a) => a.id === row.catalogoId || a.articulo === row.articulo
                            )?.id || ''
                          }
                          onChange={(e) => {
                            const id = e.target.value;
                            if (!id) {
                              actualizarFilaContenido(index, {
                                catalogoId: row.catalogoId?.startsWith?.('poliza_')
                                  ? ''
                                  : row.catalogoId,
                              });
                              return;
                            }
                            aplicarCatalogoEnFila(index, id);
                          }}
                        >
                          <option value="">—</option>
                          {ARTICULOS_ASEGURADOS_POLIZA.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.articulo}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-1 min-w-[160px]">
                  <input
                          className={inputClass}
                          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                          value={row.articulo || ''}
                          placeholder="Descripción del bien"
                          onChange={(e) =>
                            actualizarFilaContenido(index, {
                              articulo: e.target.value,
                              catalogoId: '',
                            })
                          }
                        />
                      </td>
                      {usaPorArticulo ? (
                        <>
                      <td className="px-1 py-1 min-w-[140px]">
                        <select
                          className={inputClass}
                          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                          value={coberturaFila}
                          disabled={!listaParaDeducible}
                          onChange={(e) =>
                            actualizarFilaContenido(index, {
                              coberturaAfectar: e.target.value,
                            })
                          }
                        >
                          <option value="">—</option>
                          {COBERTURAS_ARTICULO_ASEGURADO.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-1 min-w-[110px] whitespace-nowrap" style={{ color: textPrimary }}>
                        {listaParaDeducible
                          ? etiquetaCoberturaArticulo(
                              row.tipoCobertura || row.coberturaAfectar
                            ) || '—'
                          : '—'}
                      </td>
                      <td className="px-1 py-1 min-w-[120px]">
                        <input
                          type="text"
                          inputMode="decimal"
                          className={inputClass}
                          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                          value={displayMiles(row.valorAsegurable)}
                          placeholder="0"
                          onChange={(e) =>
                            actualizarFilaContenido(index, {
                              valorAsegurable: formatMilesInputNsr10(e.target.value),
                            })
                          }
                          onBlur={() => {
                            const n = parseMontoNsr10(row.valorAsegurable);
                            actualizarFilaContenido(index, {
                              valorAsegurable: n == null ? '' : formatMilesNsr10(n),
                            });
                          }}
                        />
                      </td>
                      <td className="px-1 py-1 min-w-[70px]">
                        <input
                          type="number"
                          className={`${inputClass} text-right`}
                          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                          value={listaParaDeducible ? row.porcentajeDeducible ?? '' : ''}
                          readOnly={esTerremoto || !listaParaDeducible}
                          disabled={!listaParaDeducible}
                          onChange={(e) =>
                            actualizarFilaContenido(index, {
                              porcentajeDeducible:
                                e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="px-1 py-1 min-w-[110px] whitespace-nowrap" style={{ color: textPrimary }}>
                        {!listaParaDeducible ||
                        row.valorMinimo === '' ||
                        row.valorMinimo == null
                          ? '—'
                          : money(row.valorMinimo)}
                      </td>
                      <td className="px-1 py-1 min-w-[110px] whitespace-nowrap" style={{ color: textPrimary }}>
                        {!listaParaDeducible ||
                        row.deducibleCalculado === '' ||
                        row.deducibleCalculado == null
                          ? '—'
                          : money(row.deducibleCalculado)}
                      </td>
                        </>
                      ) : null}
                      <td className="px-1 py-1 min-w-[100px]">
                        <input
                          className={inputClass}
                          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                          value={row.marca || ''}
                          onChange={(e) =>
                            actualizarFilaContenido(index, { marca: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-1 py-1 min-w-[80px]">
                        <select
                          className={inputClass}
                          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                          value={row.unidad || 'und'}
                          onChange={(e) =>
                            actualizarFilaContenido(index, { unidad: e.target.value })
                          }
                        >
                          {UNIDADES_CONTENIDOS_NSR10.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-1 min-w-[80px]">
                        <input
                          type="number"
                          className={inputClass}
                          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                          value={row.cantidad ?? ''}
                          onChange={(e) =>
                            actualizarFilaContenido(index, { cantidad: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-1 py-1 min-w-[110px]">
                        <input
                          type="text"
                          inputMode="decimal"
                          className={inputClass}
                          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                          value={displayMiles(row.valorUnitario)}
                          placeholder="0"
                          onChange={(e) =>
                            actualizarFilaContenido(index, {
                              valorUnitario: formatMilesInputNsr10(e.target.value),
                            })
                          }
                          onBlur={() => {
                            const n = parseMontoNsr10(row.valorUnitario);
                            actualizarFilaContenido(index, {
                              valorUnitario: n == null ? '' : formatMilesNsr10(n),
                            });
                          }}
                        />
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap" style={{ color: textPrimary }}>
                        {money(totalFilaContenido(row))}
                      </td>
                      <td className="px-1 py-1 min-w-[100px]">
                        <select
                          className={inputClass}
                          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                          value={row.estado || 'Dañado'}
                          onChange={(e) =>
                            actualizarFilaContenido(index, { estado: e.target.value })
                          }
                        >
                          {ESTADOS_CONTENIDO_NSR10.map((est) => (
                            <option key={est} value={est}>
                              {est}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-1 min-w-[120px]">
                        <input
                          className={inputClass}
                          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                          value={row.observacion || ''}
                          onChange={(e) =>
                            actualizarFilaContenido(index, { observacion: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-1 py-1">
                        <button
                          type="button"
                          className="text-red-600"
                          onClick={() =>
                            setContenidos({
                              ...contenidos,
                              items: filasContenidos.filter((_, i) => i !== index),
                            })
                          }
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            className="ml-auto w-full max-w-lg space-y-3 rounded-lg border p-4 text-sm"
            style={{ borderColor, backgroundColor: softBg }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-semibold" style={{ color: textPrimary }}>
                Liquidación contenidos
              </h4>
            </div>

            {usaPorArticulo ? (
              <>
                <div className="overflow-hidden rounded border" style={{ borderColor }}>
                  <table className="w-full text-sm">
                    <tbody style={{ color: textPrimary }}>
                      <tr className="border-b" style={{ borderColor }}>
                        <td className="px-3 py-2">TOTAL CONTENIDOS</td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {money(totalesContenidos.total)}
                        </td>
                      </tr>
                      <tr className="border-b" style={{ borderColor }}>
                        <td className="px-3 py-2 font-semibold">
                          DEDUCIBLE POR ARTÍCULO (cobertura)
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {money(
                            diagrama.deducibleContenidos?.aplicado ||
                              diagrama.deducibleAplicado ||
                              0
                          )}
                        </td>
                      </tr>
                      <tr style={{ backgroundColor: softBg }}>
                        <td className="px-3 py-2.5 font-bold text-emerald-600">
                          CONTENIDOS NETO
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-emerald-600">
                          {money(
                            diagrama.deducibleContenidos?.neto ??
                              Math.max(
                                0,
                                (Number(totalesContenidos.total) || 0) -
                                  (diagrama.deducibleAplicado || 0)
                              )
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs" style={{ color: textSecondary }}>
                  El deducible de contenidos es la suma de cada artículo (según cobertura).
                  Terremoto = mayor entre 3% del valor asegurable y 3 SMMLV.
                </p>
              </>
            ) : (
              <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded border px-2 py-1 text-xs font-semibold ${
                  (deducibleCfg.tipoMinimo || 'SMMLV') === 'SMMLV'
                    ? 'border-blue-500 text-blue-600'
                    : ''
                }`}
                style={
                  (deducibleCfg.tipoMinimo || 'SMMLV') === 'SMMLV'
                    ? undefined
                    : { borderColor, color: textSecondary }
                }
                onClick={() => actualizarDeducibleConfig({ tipoMinimo: 'SMMLV' })}
              >
                SMMLV
              </button>
              <button
                type="button"
                className={`rounded border px-2 py-1 text-xs font-semibold ${
                  deducibleCfg.tipoMinimo === 'SMDLV' ? 'border-blue-500 text-blue-600' : ''
                }`}
                style={
                  deducibleCfg.tipoMinimo === 'SMDLV'
                    ? undefined
                    : { borderColor, color: textSecondary }
                }
                onClick={() => actualizarDeducibleConfig({ tipoMinimo: 'SMDLV' })}
              >
                SMDLV
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-xs" style={{ color: textSecondary }}>
                % deducible
                <input
                  type="text"
                  inputMode="decimal"
                    className={`${inputClass} mt-1`}
                    style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                  value={valorInputDeducible(deducibleCfgInput.porcentaje, 10)}
                  onChange={(e) =>
                    actualizarDeducibleConfig({
                      porcentaje: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                  />
                </label>
              <label className="block text-xs" style={{ color: textSecondary }}>
                Año SMMLV
                <select
                  className={`${inputClass} mt-1`}
                  style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                  value={deducibleCfg.anioSMMLV}
                  onChange={(e) => {
                    const anio = Number(e.target.value);
                    const valorSMMLV = SMMLV_POR_ANIO[anio];
                    actualizarDeducibleConfig({
                      anioSMMLV: anio,
                      valorSMMLV,
                      valorSMDLV: valorSmdlvDesdeSmmlv(valorSMMLV),
                    });
                  }}
                >
                  {ANIOS_SMMLV.map((anio) => (
                    <option key={anio} value={anio}>
                      {anio}
                    </option>
                  ))}
                </select>
              </label>
              {(deducibleCfg.tipoMinimo || 'SMMLV') === 'SMMLV' ? (
                <>
                  <label className="block text-xs" style={{ color: textSecondary }}>
                    Cant. SMMLV
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`${inputClass} mt-1`}
                      style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                      value={valorInputDeducible(deducibleCfgInput.cantidadSMMLV, 4)}
                      onChange={(e) =>
                        actualizarDeducibleConfig({
                          cantidadSMMLV: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="block text-xs" style={{ color: textSecondary }}>
                    Valor SMMLV
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`${inputClass} mt-1`}
                      style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                      value={displayMiles(deducibleCfgInput.valorSMMLV)}
                      onChange={(e) => {
                        const fmt = formatMilesInputNsr10(e.target.value);
                        const n = parseMontoNsr10(fmt);
                        actualizarDeducibleConfig({
                          valorSMMLV: fmt,
                          valorSMDLV:
                            n == null ? deducibleCfg.valorSMDLV : valorSmdlvDesdeSmmlv(n),
                        });
                      }}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="block text-xs" style={{ color: textSecondary }}>
                    Cant. SMDLV
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`${inputClass} mt-1`}
                      style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                      value={valorInputDeducible(deducibleCfgInput.cantidadSMDLV, 10)}
                      onChange={(e) =>
                        actualizarDeducibleConfig({
                          cantidadSMDLV: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="block text-xs" style={{ color: textSecondary }}>
                    Valor SMDLV
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`${inputClass} mt-1`}
                      style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                      value={displayMiles(deducibleCfgInput.valorSMDLV)}
                      onChange={(e) =>
                        actualizarDeducibleConfig({
                          valorSMDLV: formatMilesInputNsr10(e.target.value),
                        })
                      }
                    />
                  </label>
                </>
              )}
              </div>

            <div className="overflow-hidden rounded border" style={{ borderColor }}>
              <table className="w-full text-sm">
                <tbody style={{ color: textPrimary }}>
                  <tr className="border-b" style={{ borderColor }}>
                    <td className="px-3 py-2">TOTAL CONTENIDOS</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {money(totalesContenidos.total)}
                    </td>
                  </tr>
                  <tr className="border-b" style={{ borderColor }}>
                    <td className="px-3 py-2" style={{ color: textSecondary }}>
                      DEDUCIBLE {diagrama.deduciblePorcentajeCfg ?? deducibleCfg.porcentaje ?? 10}%
                    </td>
                    <td className="px-3 py-2 text-right">
                      {money(diagrama.deduciblePorcentaje || 0)}
                    </td>
                  </tr>
                  <tr className="border-b" style={{ borderColor }}>
                    <td className="px-3 py-2" style={{ color: textSecondary }}>
                      {(deducibleCfg.tipoMinimo || 'SMMLV') === 'SMDLV'
                        ? `DEDUCIBLE ${diagrama.deducibleCantidadSMDLV ?? deducibleCfg.cantidadSMDLV ?? ''} SMDLV`
                        : `DEDUCIBLE ${diagrama.deducibleCantidadSMMLV ?? deducibleCfg.cantidadSMMLV ?? ''} SMMLV`}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {money(
                        (deducibleCfg.tipoMinimo || 'SMMLV') === 'SMDLV'
                          ? diagrama.deducibleSMDLV || 0
                          : diagrama.deducibleSMMLV || 0
                      )}
                    </td>
                  </tr>
                  <tr className="border-b" style={{ borderColor }}>
                    <td className="px-3 py-2 font-semibold">
                      DEDUCIBLE APLICADO (
                      {diagrama.deducibleUsaMinimo
                        ? diagrama.deducibleTipoMinimo
                        : '%'}
                      )
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {money(diagrama.deducibleAplicado || 0)}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: softBg }}>
                    <td className="px-3 py-2.5 font-bold text-emerald-600">
                      CONTENIDOS NETO
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-emerald-600">
                      {money(
                        Math.max(
                          0,
                          (Number(totalesContenidos.total) || 0) -
                            (diagrama.deducibleAplicado || 0)
                        )
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs" style={{ color: textSecondary }}>
              El deducible se calcula sobre el total de contenidos (MAX % vs mínimo). La suma
              con presupuesto e hospedaje está en Totales.
            </p>
              </>
            )}
          </div>
        </section>
      )}

      {hoja === 'totales' && (
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>
              Totales del liquidador
            </h3>
            <p className="text-xs" style={{ color: textSecondary }}>
              Resumen de presupuesto (inmueble), contenidos (bienes muebles) y suma completa
              para el informe único.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div
              className="rounded-xl border p-5"
                style={{ borderColor, backgroundColor: softBg }}
              >
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: textSecondary }}>
                Total presupuesto
              </p>
              <p className="mt-2 text-2xl font-bold" style={{ color: textPrimary }}>
                {money(resumenTotales.totalPresupuesto)}
              </p>
              <p className="mt-1 text-xs" style={{ color: textSecondary }}>
                {recargosPresupuesto?.ocultarImprevistos || recargosPresupuesto?.ocultarImpuestos
                  ? `Reparación / intervención NSR-10 (con AIU ${
                      recargosPresupuesto?.aiuFijo != null
                        ? `${Math.round(Number(recargosPresupuesto.aiuFijo) * 100)}%`
                        : ''
                    })`.trim()
                  : 'Reparación / intervención NSR-10 (con AIU, imprevistos e impuestos)'}
              </p>
            </div>
            <div
              className="rounded-xl border p-5"
              style={{ borderColor, backgroundColor: softBg }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: textSecondary }}>
                Total contenidos
              </p>
              <p className="mt-2 text-2xl font-bold" style={{ color: textPrimary }}>
                {money(resumenTotales.totalContenidos)}
              </p>
              <p className="mt-1 text-xs" style={{ color: textSecondary }}>
                Bienes muebles del inmueble
              </p>
            </div>
            <div
              className="rounded-xl border-2 border-blue-500 p-5"
              style={{ backgroundColor: softBg }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Suma completa
              </p>
              <p className="mt-2 text-2xl font-bold text-blue-600">
                {money(resumenTotales.sumaCompleta)}
              </p>
              <p className="mt-1 text-xs" style={{ color: textSecondary }}>
                Presupuesto + contenidos
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border" style={{ borderColor }}>
            <table className="min-w-full text-left text-sm">
              <thead style={{ backgroundColor: softBg }}>
                <tr style={{ color: textSecondary }}>
                  <th className="px-4 py-3">Concepto</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody style={{ color: textPrimary }}>
                <tr className="border-t" style={{ borderColor }}>
                  <td className="px-4 py-2">Subtotal presupuesto (costo directo)</td>
                  <td className="px-4 py-2 text-right">{money(totales.subtotal)}</td>
                </tr>
                <tr className="border-t" style={{ borderColor }}>
                  <td className="px-4 py-2">
                    {recargosPresupuesto?.ocultarImprevistos || recargosPresupuesto?.ocultarImpuestos
                      ? recargosPresupuesto?.aiuFijo != null
                        ? `AIU (${Math.round(Number(recargosPresupuesto.aiuFijo) * 100)}%)`
                        : 'AIU'
                      : 'AIU / imprevistos / impuestos'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {money(
                      recargosPresupuesto?.ocultarImprevistos || recargosPresupuesto?.ocultarImpuestos
                        ? totales.aiu || 0
                        : (totales.aiu || 0) + (totales.imprevistos || 0) + (totales.impuestos || 0)
                    )}
                  </td>
                </tr>
                <tr className="border-t" style={{ borderColor }}>
                  <td className="px-4 py-2 font-semibold">Total presupuesto</td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {money(resumenTotales.totalPresupuesto)}
                  </td>
                </tr>
                <tr className="border-t" style={{ borderColor }}>
                  <td className="px-4 py-2" style={{ color: textSecondary }}>
                    (−) Deducible presupuesto
                    {diagrama.deduciblePresupuesto?.texto
                      ? ` (${diagrama.deduciblePresupuesto.texto})`
                      : usaPorArticulo
                        ? ' (por ítem)'
                        : ''}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {money(diagrama.deduciblePresupuesto?.aplicado || 0)}
                  </td>
                </tr>
                <tr className="border-t" style={{ borderColor }}>
                  <td className="px-4 py-2">Presupuesto neto</td>
                  <td className="px-4 py-2 text-right">
                    {money(diagrama.deduciblePresupuesto?.neto ?? resumenTotales.totalPresupuesto)}
                  </td>
                </tr>
                <tr className="border-t" style={{ borderColor }}>
                  <td className="px-4 py-2 font-semibold">Total contenidos</td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {money(resumenTotales.totalContenidos)}
                  </td>
                </tr>
                <tr className="border-t" style={{ borderColor }}>
                  <td className="px-4 py-2" style={{ color: textSecondary }}>
                    (−) Deducible contenidos
                    {diagrama.deducibleContenidos?.texto
                      ? ` (${diagrama.deducibleContenidos.texto})`
                      : ''}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {money(diagrama.deducibleContenidos?.aplicado || diagrama.deducibleAplicado || 0)}
                  </td>
                </tr>
                <tr className="border-t" style={{ borderColor }}>
                  <td className="px-4 py-2">Contenidos neto</td>
                  <td className="px-4 py-2 text-right">
                    {money(
                      diagrama.deducibleContenidos?.neto ??
                        Math.max(
                          0,
                          (resumenTotales.totalContenidos || 0) - (diagrama.deducibleAplicado || 0)
                        )
                    )}
                  </td>
                </tr>
                <tr className="border-t bg-blue-50/50 dark:bg-blue-950/20" style={{ borderColor }}>
                  <td className="px-4 py-3 font-bold text-blue-700 dark:text-blue-300">
                    SUMA COMPLETA (bruta)
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700 dark:text-blue-300">
                    {money(resumenTotales.sumaCompleta)}
                  </td>
                </tr>
                <tr className="border-t" style={{ borderColor }}>
                  <td className="px-4 py-2">(+) Hospedaje</td>
                  <td className="px-4 py-2 text-right">{money(diagrama.gastosHospedaje || 0)}</td>
                </tr>
                <tr className="border-t" style={{ borderColor }}>
                  <td className="px-4 py-2 font-semibold">(−) Suma deducibles</td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {money(diagrama.sumaDeducibles || 0)}
                  </td>
                </tr>
                <tr className="border-t" style={{ borderColor }}>
                  <td className="px-4 py-2">Suma neta (presupuesto + contenidos)</td>
                  <td className="px-4 py-2 text-right">
                    {money(diagrama.sumaNeta ?? resumenTotales.sumaCompleta)}
                  </td>
                </tr>
                <tr className="border-t" style={{ borderColor }}>
                  <td className="px-4 py-3 font-bold text-emerald-700 dark:text-emerald-300">
                    TOTAL A INDEMNIZAR
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700 dark:text-emerald-300">
                    {money(diagrama.totalIndemnizar)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 rounded-lg border p-4" style={{ borderColor, backgroundColor: softBg }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold" style={{ color: textPrimary }}>
                  Deducible presupuesto
                </h4>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-xs" style={{ color: textSecondary }}>
                  %
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className={`${inputClass} mt-1`}
                    style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                    value={valorInputDeducible(deducibleCfgPresupuestoInput.porcentaje, 10)}
                    onChange={(e) =>
                      actualizarDeduciblePresupuesto({
                        porcentaje: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="block text-xs" style={{ color: textSecondary }}>
                  Cant. SMMLV
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={`${inputClass} mt-1`}
                    style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                    value={valorInputDeducible(deducibleCfgPresupuestoInput.cantidadSMMLV, 4)}
                    onChange={(e) =>
                      actualizarDeduciblePresupuesto({
                        cantidadSMMLV: e.target.value === '' ? '' : Number(e.target.value),
                        tipoMinimo: 'SMMLV',
                      })
                    }
                  />
                </label>
              </div>
              <p className="text-xs" style={{ color: textSecondary }}>
                Aplicado: {money(diagrama.deduciblePresupuesto?.aplicado || 0)}
              </p>
            </div>
            <div className="space-y-2 rounded-lg border p-4" style={{ borderColor, backgroundColor: softBg }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold" style={{ color: textPrimary }}>
                  Deducible contenidos
                </h4>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-xs" style={{ color: textSecondary }}>
                  %
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`${inputClass} mt-1`}
                    style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                    value={valorInputDeducible(deducibleCfgInput.porcentaje, 10)}
                    onChange={(e) =>
                      actualizarDeducibleConfig({
                        porcentaje: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="block text-xs" style={{ color: textSecondary }}>
                  Cant. SMMLV
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`${inputClass} mt-1`}
                    style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                    value={valorInputDeducible(deducibleCfgInput.cantidadSMMLV, 4)}
                    onChange={(e) =>
                      actualizarDeducibleConfig({
                        cantidadSMMLV: e.target.value === '' ? '' : Number(e.target.value),
                        tipoMinimo: 'SMMLV',
                      })
                    }
                  />
                </label>
              </div>
              <p className="text-xs" style={{ color: textSecondary }}>
                Aplicado: {money(diagrama.deducibleContenidos?.aplicado || 0)} · Detalle completo en
                pestaña Contenidos
              </p>
            </div>
          </div>

          {modoLiquidador ? (
            <div className="space-y-3 rounded-lg border p-4" style={{ borderColor }}>
              <h4 className="text-sm font-semibold" style={{ color: textPrimary }}>
                Liquidación del informe único
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs uppercase" style={{ color: textSecondary }}>
                    Suma neta
                  </p>
                  <p className="text-lg font-bold" style={{ color: textPrimary }}>
                    {money(diagrama.sumaNeta)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase" style={{ color: textSecondary }}>
                    Hospedaje
                  </p>
                  <p className="text-lg font-bold" style={{ color: textPrimary }}>
                    {money(diagrama.gastosHospedaje)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase" style={{ color: textSecondary }}>
                    Suma deducibles
                  </p>
                  <p className="text-lg font-bold" style={{ color: textPrimary }}>
                    {money(diagrama.sumaDeducibles || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase" style={{ color: textSecondary }}>
                    Otros amparos (sin deducible)
                  </p>
                  <p className="text-lg font-bold" style={{ color: textPrimary }}>
                    {money(diagrama.totalOtrosAmparos || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase" style={{ color: textSecondary }}>
                    Total a indemnizar
                  </p>
                  <p className="text-lg font-bold text-emerald-600">
                    {money(diagrama.totalIndemnizar)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}

export { crearEvaluacionSismicaNSR10Inicial };
