import React, { useEffect, useMemo, useRef } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import {
  CAPITULOS_PRESUPUESTO_NSR10,
  ESTADOS_DANO_NSR10,
  HOJAS_VISIBLES_NSR10,
  PRIORIDADES_PRESUPUESTO_NSR10,
  UNIDADES_PRESUPUESTO_NSR10,
  aplicarEstadoAItem,
  calcularCriterioFinal,
  calcularTotalesPresupuesto,
  crearEvaluacionSismicaNSR10Inicial,
  crearFilaPresupuestoVacia,
  fusionarPortadaConFormData,
  normalizarItemsRespuesta,
  sugerirFilasPresupuestoDesdeEvaluacion,
  totalFilaPresupuesto,
} from './catalogoEvaluacionSismicaNSR10.js';
import { sincronizarPresupuestoNsr10AlInforme } from '../SubcomponenteFormularioCatastrofico/syncPresupuestoNsr10AlInforme.js';
import {
  calcularDiagramaLiquidacion,
  HOSPEDAJE_PORCENTAJE_DEFAULT,
} from '../SubcomponenteFormularioCatastrofico/catalogoPresupuestoCatastrofico.js';

function money(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * @param {{ formData: object, onInputChange: Function, modoLiquidador?: boolean }} props
 * modoLiquidador: solo hoja Presupuesto + diagrama de liquidación (informe único).
 */
export default function ChecklistEvaluacionSismicaNSR10({
  formData,
  onInputChange,
  modoLiquidador = false,
}) {
  const { theme } = useTheme();
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const softBg = theme === 'dark' ? '#141414' : '#F8FAFC';

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
  const presupuesto = evalData.presupuesto || { items: [] };
  const filasPresupuesto = Array.isArray(presupuesto.items) ? presupuesto.items : [];
  const totales = useMemo(
    () => calcularTotalesPresupuesto(presupuesto),
    [presupuesto]
  );
  const hojaRaw = evalData.hojaActiva || 'portada';
  const hoja = modoLiquidador
    ? 'presupuesto'
    : hojaRaw === 'listas'
      ? 'portada'
      : hojaRaw;
  const portadaSyncRef = useRef('');

  const liquidacion = formData.liquidacionCatastrofico || {
    valorAsegurado: '',
    hospedajePorcentaje: HOSPEDAJE_PORCENTAJE_DEFAULT,
    hospedajeManual: '',
    deducible: 'No aplica',
  };
  const diagrama = useMemo(
    () =>
      calcularDiagramaLiquidacion({
        valorAsegurado: liquidacion.valorAsegurado,
        totalDanios: totales.total,
        hospedajePorcentaje: liquidacion.hospedajePorcentaje,
        hospedajeManual: liquidacion.hospedajeManual,
        deducible: liquidacion.deducible,
      }),
    [liquidacion, totales.total]
  );

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

  const setPresupuesto = (nextPresupuesto) => {
    commit({ presupuesto: nextPresupuesto });
  };

  const actualizarFilaPresupuesto = (index, patch) => {
    const nextItems = filasPresupuesto.map((row, i) =>
      i === index ? { ...row, ...patch } : row
    );
    setPresupuesto({ ...presupuesto, items: nextItems });
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
      {!modoLiquidador ? (
        <>
          <div>
            <h2 className="text-base font-semibold" style={{ color: textPrimary }}>
              Plantilla evaluación sísmica NSR-10
            </h2>
            <p className="mt-1 text-sm" style={{ color: textSecondary }}>
              Portada, Evaluación, Dictamen y Presupuesto. El presupuesto es el liquidador del
              informe único.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 border-b pb-3" style={{ borderColor }}>
            {HOJAS_VISIBLES_NSR10.map((h) => (
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
        </>
      ) : (
        <div>
          <h2 className="text-base font-semibold" style={{ color: textPrimary }}>
            Liquidador · Presupuesto NSR-10
          </h2>
          <p className="mt-1 text-sm" style={{ color: textSecondary }}>
            Mismo presupuesto de la evaluación. Aquí cierras el conteo de plata del informe único
            (también se refleja en el Word).
          </p>
        </div>
      )}

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
                    <td className="px-2 py-2 min-w-[100px]">
                      <input
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                        value={item.fotoRef || ''}
                        onChange={(e) => actualizarItem(index, { fotoRef: e.target.value })}
                      />
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
                  ? 'Este es el liquidador del informe. Edita cantidades y unitarios; el total alimenta la liquidación y el Word.'
                  : 'Este es el liquidador del informe único. Código del hallazgo, actividad, unidad, cantidad y valor unitario; totales con AIU / imprevistos / impuestos.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
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

          <div className="overflow-x-auto rounded-lg border" style={{ borderColor }}>
            <table className="min-w-[1200px] w-full text-left text-xs">
              <thead style={{ backgroundColor: softBg }}>
                <tr style={{ color: textSecondary }}>
                  <th className="px-2 py-2">Capítulo</th>
                  <th className="px-2 py-2">Código eval.</th>
                  <th className="px-2 py-2">Componente</th>
                  <th className="px-2 py-2">Actividad / reparación</th>
                  <th className="px-2 py-2">Unidad</th>
                  <th className="px-2 py-2">Cantidad</th>
                  <th className="px-2 py-2">Vlr. unitario</th>
                  <th className="px-2 py-2">Vlr. total</th>
                  <th className="px-2 py-2">Prioridad</th>
                  <th className="px-2 py-2">¿Cubierto?</th>
                  <th className="px-2 py-2">Observación</th>
                  <th className="px-2 py-2">Fuente</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {filasPresupuesto.map((row, index) => (
                  <tr key={index} className="border-t align-top" style={{ borderColor }}>
                    <td className="px-1 py-1 min-w-[140px]">
                      <select
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                        value={row.capitulo || ''}
                        onChange={(e) =>
                          actualizarFilaPresupuesto(index, { capitulo: e.target.value })
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
                    <td className="px-1 py-1 min-w-[100px]">
                      <select
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                        value={row.codigoEvaluacion || ''}
                        onChange={(e) => {
                          const codigo = e.target.value;
                          const hit = items.find((it) => it.codigo === codigo);
                          actualizarFilaPresupuesto(index, {
                            codigoEvaluacion: codigo,
                            componente: hit?.componente || row.componente,
                            actividad: hit?.elemento || row.actividad,
                          });
                        }}
                      >
                        <option value="">—</option>
                        {items.map((it) => (
                          <option key={it.codigo} value={it.codigo}>
                            {it.codigo}
                          </option>
                        ))}
                      </select>
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
                          actualizarFilaPresupuesto(index, { actividad: e.target.value })
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
                    <td className="px-1 py-1 min-w-[100px]">
                      <input
                        type="number"
                        className={inputClass}
                        style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                        value={row.valorUnitario ?? ''}
                        onChange={(e) =>
                          actualizarFilaPresupuesto(index, { valorUnitario: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap" style={{ color: textPrimary }}>
                      {money(totalFilaPresupuesto(row))}
                    </td>
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
                ))}
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
              </label>
              <strong style={{ color: textPrimary }}>{money(totales.aiu)}</strong>
            </div>
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
                <label className="block text-sm" style={{ color: textSecondary }}>
                  Deducible
                  <input
                    className={`${inputClass} mt-1`}
                    style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                    value={liquidacion.deducible ?? ''}
                    onChange={(e) => actualizarLiquidacion({ deducible: e.target.value })}
                  />
                </label>
              </div>
              <div
                className="grid gap-2 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-3"
                style={{ borderColor, backgroundColor: softBg }}
              >
                <div>
                  <p className="text-xs uppercase" style={{ color: textSecondary }}>
                    Daños (NSR-10)
                  </p>
                  <p className="text-lg font-bold" style={{ color: textPrimary }}>
                    {money(diagrama.danios)}
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
    </div>
  );
}

export { crearEvaluacionSismicaNSR10Inicial };
