import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaPlus, FaTrash, FaCalculator, FaSync, FaMapMarkerAlt } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import {
  calcularValorFinalItem,
  calcularResumenPresupuesto,
  calcularDiagramaLiquidacion,
  fijarPreciosDesdeCatalogo,
  aplicarPreciosDesdeReferencia,
  claveUbicacionDesdeFormulario,
  AIU_PORCENTAJE_DEFAULT,
  HOSPEDAJE_PORCENTAJE_DEFAULT,
} from './catalogoPresupuestoCatastrofico.js';
import { buscarTarifarioUbicacionCatastrofico } from './tarifarioUbicacionCatastrofico.js';
import { obtenerTotalDaniosParaInforme } from './syncPresupuestoNsr10AlInforme.js';

const toNum = (v) => {
  if (v === '' || v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const fmt = (valor) =>
  new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(
    Number(valor) || 0
  );

const unitariosIguales = (a = [], b = []) => {
  if (a.length !== b.length) return false;
  return a.every((item, i) => {
    const o = b[i];
    return (
      String(item?.id ?? '') === String(o?.id ?? '') &&
      String(item?.valorUnitario ?? '') === String(o?.valorUnitario ?? '') &&
      String(item?.actividad ?? '') === String(o?.actividad ?? '') &&
      String(item?.unidad ?? '') === String(o?.unidad ?? '')
    );
  });
};

/**
 * @param {{ formData: object, onInputChange: Function, historialId?: string|null, herenciaAutomatica?: boolean }} props
 */
export default function PresupuestoDaniosCatastrofico({
  formData,
  onInputChange,
  historialId = null,
  herenciaAutomatica = true,
}) {
  const { theme } = useTheme();
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const headerBg = theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#DBEAFE';
  const totalBg = theme === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#D1FAE5';
  const bannerBg = theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF';

  const [origenTarifario, setOrigenTarifario] = useState(null);
  const [buscandoTarifario, setBuscandoTarifario] = useState(false);
  const ultimaClaveAplicadaRef = useRef('');

  const presupuesto = formData.presupuestoCatastrofico || {
    items: [],
    aiuPorcentaje: AIU_PORCENTAJE_DEFAULT,
    intro:
      'Con base en la inspección técnica realizada en el inmueble afectado, y en atención a las condiciones observadas durante la visita de campo, se elaboró el presente presupuesto de obra, el cual contempla las actividades necesarias para la atención, corrección y restitución de los daños identificados.',
  };

  const liquidacion = formData.liquidacionCatastrofico || {
    valorAsegurado: '',
    hospedajePorcentaje: HOSPEDAJE_PORCENTAJE_DEFAULT,
    hospedajeManual: '',
    deducible: 'No aplica',
  };

  const claveSitio = useMemo(
    () => claveUbicacionDesdeFormulario(formData),
    [formData.ciudad, formData.ubicacionRiesgo]
  );

  const actualizarPresupuesto = useCallback(
    (patch) => {
      onInputChange({
        target: {
          name: 'presupuestoCatastrofico',
          value: { ...presupuesto, ...patch },
        },
      });
    },
    [onInputChange, presupuesto]
  );

  const actualizarLiquidacion = (patch) => {
    onInputChange({
      target: {
        name: 'liquidacionCatastrofico',
        value: { ...liquidacion, ...patch },
      },
    });
  };

  const aplicarReferencia = useCallback(
    (ref, { forzar = false } = {}) => {
      const itemsActuales = presupuesto.items || [];
      if (!itemsActuales.length) return;

      if (ref?.items?.length) {
        const items = aplicarPreciosDesdeReferencia(itemsActuales, ref.items);
        const patch = { items };
        if (ref.aiuPorcentaje != null) patch.aiuPorcentaje = ref.aiuPorcentaje;
        if (forzar || !unitariosIguales(itemsActuales, items)) {
          actualizarPresupuesto(patch);
        }
        setOrigenTarifario({
          tipo: 'sitio',
          asegurado: ref.asegurado,
          numeroCaso: ref.numeroCaso,
          fuenteId: ref.fuenteId,
        });
        return;
      }

      const items = fijarPreciosDesdeCatalogo(itemsActuales);
      if (forzar || !unitariosIguales(itemsActuales, items)) {
        actualizarPresupuesto({ items });
      }
      setOrigenTarifario({ tipo: 'catalogo' });
    },
    [actualizarPresupuesto, presupuesto.items]
  );

  const resolverTarifarioSitio = useCallback(
    async ({ forzar = false } = {}) => {
      const itemsActuales = presupuesto.items || [];
      if (!itemsActuales.length) return;

      if (!claveSitio) {
        if (!forzar && ultimaClaveAplicadaRef.current === '__catalogo__') return;
        aplicarReferencia(null, { forzar });
        ultimaClaveAplicadaRef.current = '__catalogo__';
        return;
      }

      setBuscandoTarifario(true);
      try {
        const ref = await buscarTarifarioUbicacionCatastrofico({
          ciudad: formData.ciudad,
          ubicacionRiesgo: formData.ubicacionRiesgo,
          excluirHistorialId: historialId,
        });
        aplicarReferencia(ref, { forzar });
        ultimaClaveAplicadaRef.current = claveSitio;
      } finally {
        setBuscandoTarifario(false);
      }
    },
    [
      aplicarReferencia,
      claveSitio,
      formData.ciudad,
      formData.ubicacionRiesgo,
      historialId,
      presupuesto.items,
    ]
  );

  // Herencia automática: formularios nuevos / al cambiar ciudad+ubicación (debounce).
  useEffect(() => {
    if (!herenciaAutomatica) return;
    if (!(presupuesto.items || []).length) return;

    const timer = setTimeout(() => {
      if (claveSitio && ultimaClaveAplicadaRef.current === claveSitio) return;
      resolverTarifarioSitio({ forzar: false });
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [herenciaAutomatica, claveSitio, formData.ciudad, formData.ubicacionRiesgo]);

  const aplicarTarifarioCatalogo = () => {
    const items = fijarPreciosDesdeCatalogo(presupuesto.items || []);
    actualizarPresupuesto({ items });
    setOrigenTarifario({ tipo: 'catalogo' });
  };

  const reaplicarTarifarioSitio = () => {
    resolverTarifarioSitio({ forzar: true });
  };

  const actualizarItem = (index, campo, valor) => {
    const items = [...(presupuesto.items || [])];
    const actual = items[index] || {};
    items[index] = { ...actual, [campo]: valor };
    actualizarPresupuesto({ items });
  };

  const agregarItem = () => {
    const items = [
      ...(presupuesto.items || []),
      {
        id: `custom_${Date.now()}`,
        actividad: '',
        unidad: 'UN',
        valorUnitario: 0,
        cantidad: 0,
        observacion: '',
      },
    ];
    actualizarPresupuesto({ items });
  };

  const eliminarItem = (index) => {
    const items = (presupuesto.items || []).filter((_, i) => i !== index);
    actualizarPresupuesto({ items });
  };

  const esNsr10 = presupuesto.fuente === 'nsr10';
  const totalesNsr = presupuesto.totalesNsr10 || null;

  const resumen = useMemo(() => {
    if (esNsr10 && totalesNsr) {
      return {
        costoDirecto: Number(totalesNsr.subtotal) || 0,
        aiu: Number(totalesNsr.aiu) || 0,
        imprevistos: Number(totalesNsr.imprevistos) || 0,
        impuestos: Number(totalesNsr.impuestos) || 0,
        total: Number(totalesNsr.total) || 0,
      };
    }
    const base = calcularResumenPresupuesto(presupuesto.items, presupuesto.aiuPorcentaje);
    return { ...base, imprevistos: 0, impuestos: 0 };
  }, [esNsr10, totalesNsr, presupuesto.items, presupuesto.aiuPorcentaje]);

  const totalDaniosInforme = useMemo(
    () => obtenerTotalDaniosParaInforme(presupuesto),
    [presupuesto]
  );

  const diagrama = useMemo(
    () =>
      calcularDiagramaLiquidacion({
        valorAsegurado: toNum(liquidacion.valorAsegurado),
        totalDanios: totalDaniosInforme,
        hospedajePorcentaje: liquidacion.hospedajePorcentaje,
        hospedajeManual: liquidacion.hospedajeManual,
        deducible: liquidacion.deducible,
      }),
    [liquidacion, totalDaniosInforme]
  );

  useEffect(() => {
    const actual = String(formData.indemnizacionSugerida ?? '').trim();
    const siguiente = String(diagrama.totalIndemnizar || 0);
    if (actual !== siguiente) {
      onInputChange({ target: { name: 'indemnizacionSugerida', value: siguiente } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagrama.totalIndemnizar]);

  const inputClass =
    'w-full rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  const textoOrigen = (() => {
    if (buscandoTarifario) return 'Buscando tarifario del sitio…';
    if (!claveSitio) {
      return 'Indica ciudad y ubicación del riesgo para heredar precios del sitio (o se usa el catálogo base).';
    }
    if (origenTarifario?.tipo === 'sitio') {
      const etiqueta =
        origenTarifario.asegurado ||
        origenTarifario.numeroCaso ||
        origenTarifario.fuenteId ||
        'caso anterior';
      return `Precios del sitio (ciudad + ubicación) tomados de ${etiqueta}. Puedes modificarlos si el caso lo requiere.`;
    }
    if (origenTarifario?.tipo === 'catalogo') {
      return 'Primer caso del sitio: precios del catálogo base. Puedes modificarlos; al guardar quedarán como referencia del sitio.';
    }
    return 'Unitarios editables. Reaplica el tarifario del sitio o el catálogo base cuando lo necesites.';
  })();

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <FaCalculator className="text-blue-600" />
        <h2 className="text-lg font-semibold" style={{ color: textPrimary }}>
          Presupuesto de daños / Liquidador
        </h2>
      </div>

      {esNsr10 ? (
        <div
          className="rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor, backgroundColor: bannerBg, color: textSecondary }}
        >
          Este conteo de plata viene de la hoja <strong>Presupuesto</strong> de la evaluación
          NSR-10. Ajústalo allá (paso 1) si cambian cantidades o unitarios; aquí se refleja en el
          informe único y en el Word.
        </div>
      ) : (
        <div
          className="flex items-start gap-2 rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor, backgroundColor: bannerBg, color: textSecondary }}
        >
          <FaMapMarkerAlt className="mt-0.5 shrink-0 text-blue-600" />
          <span>{textoOrigen}</span>
        </div>
      )}

      <textarea
        className={inputClass}
        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
        rows={3}
        value={presupuesto.intro || ''}
        onChange={(e) => actualizarPresupuesto({ intro: e.target.value })}
        placeholder="Texto introductorio del presupuesto"
      />

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor }}>
        <table className="min-w-full text-sm">
          <thead style={{ backgroundColor: headerBg }}>
            <tr>
              <th className="px-2 py-2 text-left">Actividad</th>
              <th className="px-2 py-2 text-left">V. unitario</th>
              <th className="px-2 py-2 text-left">Cantidad</th>
              <th className="px-2 py-2 text-left">Valor final</th>
              <th className="px-2 py-2 text-left">Observación técnica</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {(presupuesto.items || []).map((item, index) => (
              <tr key={item.id || index} className="border-t" style={{ borderColor }}>
                <td className="px-2 py-2 align-top min-w-[220px]">
                  <input
                    className={inputClass}
                    style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                    value={item.actividad || ''}
                    onChange={(e) => actualizarItem(index, 'actividad', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top min-w-[120px]">
                  <input
                    type="number"
                    className={inputClass}
                    style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                    value={item.valorUnitario ?? 0}
                    onChange={(e) => actualizarItem(index, 'valorUnitario', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top min-w-[100px]">
                  <input
                    type="number"
                    step="0.01"
                    className={inputClass}
                    style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                    value={item.cantidad ?? 0}
                    onChange={(e) => actualizarItem(index, 'cantidad', e.target.value)}
                  />
                </td>
                <td
                  className="px-2 py-2 align-top font-semibold whitespace-nowrap"
                  style={{ color: textPrimary }}
                >
                  ${fmt(calcularValorFinalItem(item))}
                </td>
                <td className="px-2 py-2 align-top min-w-[240px]">
                  <textarea
                    className={inputClass}
                    style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                    rows={2}
                    value={item.observacion || ''}
                    onChange={(e) => actualizarItem(index, 'observacion', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => eliminarItem(index)}
                    title="Eliminar ítem"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={agregarItem}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <FaPlus /> Agregar actividad
        </button>
        <button
          type="button"
          onClick={reaplicarTarifarioSitio}
          disabled={buscandoTarifario || !claveSitio}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-800"
          style={{ borderColor, color: textPrimary }}
          title="Busca el primer catastrófico del mismo sitio y copia unitarios"
        >
          <FaMapMarkerAlt /> Reaplicar tarifario del sitio
        </button>
        <button
          type="button"
          onClick={aplicarTarifarioCatalogo}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
          style={{ borderColor, color: textPrimary }}
          title="Restablece valores unitarios del catálogo base"
        >
          <FaSync /> Reaplicar catálogo base
        </button>
        <label className="text-sm" style={{ color: textSecondary }}>
          AIU (%):
          <input
            type="number"
            step="0.01"
            min="0"
            className={`${inputClass} ml-2 w-24 inline-block`}
            style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
            value={Math.round((Number(presupuesto.aiuPorcentaje) || 0) * 10000) / 100}
            onChange={(e) =>
              actualizarPresupuesto({ aiuPorcentaje: (Number(e.target.value) || 0) / 100 })
            }
          />
        </label>
      </div>

      <div
        className={`grid gap-2 rounded-xl border p-4 ${esNsr10 ? 'sm:grid-cols-2 lg:grid-cols-5' : 'sm:grid-cols-3'}`}
        style={{ borderColor, backgroundColor: totalBg }}
      >
        <div>
          <div className="text-xs uppercase tracking-wide" style={{ color: textSecondary }}>
            {esNsr10 ? 'Subtotal' : 'Costo directo'}
          </div>
          <div className="text-lg font-bold" style={{ color: textPrimary }}>
            ${fmt(resumen.costoDirecto)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide" style={{ color: textSecondary }}>
            AIU
          </div>
          <div className="text-lg font-bold" style={{ color: textPrimary }}>
            ${fmt(resumen.aiu)}
          </div>
        </div>
        {esNsr10 ? (
          <>
            <div>
              <div className="text-xs uppercase tracking-wide" style={{ color: textSecondary }}>
                Imprevistos
              </div>
              <div className="text-lg font-bold" style={{ color: textPrimary }}>
                ${fmt(resumen.imprevistos)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide" style={{ color: textSecondary }}>
                Impuestos
              </div>
              <div className="text-lg font-bold" style={{ color: textPrimary }}>
                ${fmt(resumen.impuestos)}
              </div>
            </div>
          </>
        ) : null}
        <div>
          <div className="text-xs uppercase tracking-wide" style={{ color: textSecondary }}>
            Total estimado
          </div>
          <div className="text-lg font-bold" style={{ color: textPrimary }}>
            ${fmt(resumen.total)}
          </div>
        </div>
      </div>

      <h3 className="text-base font-semibold" style={{ color: textPrimary }}>
        Diagrama de liquidación
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm" style={{ color: textSecondary }}>
          Valor asegurado
          <input
            type="number"
            className={`${inputClass} mt-1`}
            style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
            value={liquidacion.valorAsegurado ?? ''}
            onChange={(e) => actualizarLiquidacion({ valorAsegurado: e.target.value })}
          />
        </label>
        <label className="text-sm" style={{ color: textSecondary }}>
          % gastos de hospedaje (sobre valor asegurado)
          <input
            type="number"
            step="0.01"
            className={`${inputClass} mt-1`}
            style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
            value={Math.round((Number(liquidacion.hospedajePorcentaje) || 0) * 10000) / 100}
            onChange={(e) =>
              actualizarLiquidacion({ hospedajePorcentaje: (Number(e.target.value) || 0) / 100 })
            }
          />
        </label>
        <label className="text-sm" style={{ color: textSecondary }}>
          Hospedaje manual (opcional, deja vacío para auto)
          <input
            type="number"
            className={`${inputClass} mt-1`}
            style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
            value={liquidacion.hospedajeManual ?? ''}
            onChange={(e) => actualizarLiquidacion({ hospedajeManual: e.target.value })}
          />
        </label>
        <label className="text-sm" style={{ color: textSecondary }}>
          Deducible
          <input
            className={`${inputClass} mt-1`}
            style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
            value={liquidacion.deducible ?? ''}
            onChange={(e) => actualizarLiquidacion({ deducible: e.target.value })}
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor }}>
        <table className="min-w-full text-sm">
          <thead style={{ backgroundColor: headerBg }}>
            <tr>
              <th className="px-3 py-2 text-left">Ítem</th>
              <th className="px-3 py-2 text-left">Valor</th>
            </tr>
          </thead>
          <tbody style={{ color: textPrimary }}>
            <tr className="border-t" style={{ borderColor }}>
              <td className="px-3 py-2 font-semibold">VALOR ASEGURADO</td>
              <td className="px-3 py-2">${fmt(diagrama.valorAsegurado)}</td>
            </tr>
            <tr className="border-t" style={{ borderColor }}>
              <td className="px-3 py-2 font-semibold">DAÑOS</td>
              <td className="px-3 py-2">${fmt(diagrama.danios)}</td>
            </tr>
            <tr className="border-t" style={{ borderColor }}>
              <td className="px-3 py-2 font-semibold">
                GASTOS DE HOSPEDAJE ({Math.round((Number(liquidacion.hospedajePorcentaje) || 0) * 100)}% DEL VALOR
                ASEGURADO)
              </td>
              <td className="px-3 py-2">${fmt(diagrama.gastosHospedaje)}</td>
            </tr>
            <tr className="border-t" style={{ borderColor }}>
              <td className="px-3 py-2 font-semibold">DEDUCIBLE</td>
              <td className="px-3 py-2">{diagrama.deducible}</td>
            </tr>
            <tr className="border-t font-bold" style={{ borderColor, backgroundColor: totalBg }}>
              <td className="px-3 py-2">TOTAL A INDEMNIZAR</td>
              <td className="px-3 py-2">${fmt(diagrama.totalIndemnizar)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
