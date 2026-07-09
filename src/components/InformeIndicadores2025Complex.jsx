import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaDownload, FaFileExcel } from 'react-icons/fa';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getSiniestrosEnriquecidos } from '../services/siniestrosApi';
import { obtenerCasosComplex } from '../services/complexService';
import { obtenerResponsables } from '../services/riesgoService';
import Loader from './Loader';
import { useTheme } from '../context/ThemeContext';
import { useProtocoloSiniestros } from '../hooks/useProtocoloSiniestros.js';
import { PROTOCOLO_FECHA_ACTIVACION } from '../config/protocoloSiniestrosDefaults.js';
import {
  construirInformeIndicadoresComplex,
  exportarInformeIndicadoresExcel,
} from '../utils/exportarInformeIndicadoresComplex.js';
import {
  colorBarraCumplimiento,
  formatearPorcentajeCumplimiento,
} from '../utils/complexProtocoloCumplimientoUtils.js';
import {
  complexCard,
  complexSectionTitle,
  complexBtnSecondary,
} from './SubcomponenteCompex/complexFenixUi.js';
import {
  Campo,
  ComplexChartCard,
  ComplexChartPlot,
  ComplexFilterSection,
  ComplexMetricCard,
  InputFenix,
} from './SubcomponenteCompex/ComplexUiBlocks.jsx';

const COLORES_VOLUMEN = ['#C8102E', '#F59E0B', '#2563EB', '#16A34A', '#7C3AED'];

const InformeIndicadores2025Complex = ({ embedded = false }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { protocolo } = useProtocoloSiniestros();
  const [siniestros, setSiniestros] = useState([]);
  const [complex, setComplex] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState('');

  const [fechaDesdeHistorico, setFechaDesdeHistorico] = useState('2025-01-01');
  const [fechaHastaHistorico, setFechaHastaHistorico] = useState('');
  const [fechaDesdeProtocolo, setFechaDesdeProtocolo] = useState(PROTOCOLO_FECHA_ACTIVACION);
  const [fechaHastaProtocolo, setFechaHastaProtocolo] = useState('');

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const [siniestrosData, complexData, responsablesData] = await Promise.allSettled([
          getSiniestrosEnriquecidos(),
          obtenerCasosComplex(),
          obtenerResponsables(),
        ]);

        setSiniestros(
          siniestrosData.status === 'fulfilled' && Array.isArray(siniestrosData.value)
            ? siniestrosData.value
            : []
        );
        setComplex(
          complexData.status === 'fulfilled' && Array.isArray(complexData.value)
            ? complexData.value
            : []
        );
        const resp =
          responsablesData.status === 'fulfilled'
            ? responsablesData.value?.success && responsablesData.value?.data
              ? responsablesData.value.data
              : Array.isArray(responsablesData.value)
                ? responsablesData.value
                : []
            : [];
        setResponsables(resp);
      } catch (e) {
        console.error(e);
        setSiniestros([]);
        setComplex([]);
        setResponsables([]);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const getNombreResponsable = useCallback(
    (caso) => {
      if (
        caso.nombreResponsable &&
        caso.nombreResponsable !== 'Sin asignar' &&
        caso.nombreResponsable.toLowerCase() !== 'sin asignar'
      ) {
        return caso.nombreResponsable;
      }
      const codigo = caso.codiRespnsble ?? caso.codi_responble ?? caso.responsable;
      if (!codigo || codigo === 'Sin asignar') return 'Sin asignar';
      const responsable = responsables.find(
        (r) =>
          String(r.codiRespnsble) === String(codigo) ||
          String(r.codigo) === String(codigo) ||
          r.nmbrRespnsble === String(codigo) ||
          r.nombre === String(codigo)
      );
      return responsable?.nmbrRespnsble || responsable?.nombre || String(codigo);
    },
    [responsables]
  );

  const informe = useMemo(() => {
    if (loading) return null;
    return construirInformeIndicadoresComplex({
      siniestros,
      complex,
      responsables,
      protocolo,
      fechaDesdeHistorico,
      fechaHastaHistorico,
      fechaDesdeProtocolo,
      fechaHastaProtocolo,
      obtenerNombreResponsable: getNombreResponsable,
    });
  }, [
    loading,
    siniestros,
    complex,
    responsables,
    protocolo,
    fechaDesdeHistorico,
    fechaHastaHistorico,
    fechaDesdeProtocolo,
    fechaHastaProtocolo,
    getNombreResponsable,
  ]);

  const handleExportar = () => {
    setErrorExport('');
    setExportando(true);
    try {
      exportarInformeIndicadoresExcel(informe);
    } catch (e) {
      setErrorExport(e.message || 'No se pudo generar el informe.');
    } finally {
      setExportando(false);
    }
  };

  if (loading) {
    return embedded ? <Loader /> : (
      <div className="p-8">
        <Loader />
      </div>
    );
  }

  const hist = informe?.historicoResumen?.[0] || {};
  const prot = informe?.protocoloResumen?.[0] || {};
  const graf = informe?.graficos || {};

  const tooltipStyle = {
    backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF',
    border: `1px solid ${isDark ? '#2D2D2D' : '#E6E6E6'}`,
    color: isDark ? '#F5F5F5' : '#1E1E1E',
    borderRadius: '8px',
  };
  const tickColor = isDark ? '#B0B0B0' : '#6B6B6B';
  const gridStroke = isDark ? '#2D2D2D' : '#E5E7EB';

  return (
    <div className={embedded ? '' : 'p-4'}>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className={complexSectionTitle}>Informe de indicadores 2025</h2>
          <p className="font-body text-sm text-gray-600 dark:text-gray-400">
            Genera un archivo Excel con indicadores históricos y del nuevo protocolo para entregar a
            gerencia o archivo del área.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportar}
          disabled={exportando || !informe}
          className={`${complexBtnSecondary} inline-flex items-center gap-2 shrink-0`}
        >
          <FaFileExcel />
          {exportando ? 'Generando…' : 'Descargar informe Excel'}
        </button>
      </div>

      {errorExport && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {errorExport}
        </p>
      )}

      <ComplexFilterSection title="Periodos del informe">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
              Indicadores históricos
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Desde">
                <InputFenix
                  type="date"
                  value={fechaDesdeHistorico}
                  onChange={(e) => setFechaDesdeHistorico(e.target.value)}
                />
              </Campo>
              <Campo label="Hasta">
                <InputFenix
                  type="date"
                  value={fechaHastaHistorico}
                  onChange={(e) => setFechaHastaHistorico(e.target.value)}
                />
              </Campo>
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
              Nuevo protocolo (desde {PROTOCOLO_FECHA_ACTIVACION})
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Desde">
                <InputFenix
                  type="date"
                  value={fechaDesdeProtocolo}
                  onChange={(e) => setFechaDesdeProtocolo(e.target.value)}
                />
              </Campo>
              <Campo label="Hasta">
                <InputFenix
                  type="date"
                  value={fechaHastaProtocolo}
                  onChange={(e) => setFechaHastaProtocolo(e.target.value)}
                />
              </Campo>
            </div>
          </div>
        </div>
      </ComplexFilterSection>

      <section className="mt-6" aria-label="Vista previa del informe">
        <h3 className="mb-4 font-heading text-base font-bold text-gray-900 dark:text-white">
          Vista previa
        </h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className={complexCard}>
            <p className="text-xs font-semibold uppercase tracking-wide text-fenix-primario">
              Histórico
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {informe?.meta?.periodoHistorico} · {informe?.meta?.totalCasosHistorico} caso(s)
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ComplexMetricCard
                label="Total casos"
                value={String(hist['Total casos'] ?? 0)}
              />
              <ComplexMetricCard
                label="En espera documentos"
                value={String(hist['En espera de documentos'] ?? 0)}
              />
              <ComplexMetricCard
                label="Asignación → Contacto"
                value={hist['Prom. Asignación → Primer contacto'] || '—'}
              />
              <ComplexMetricCard
                label="Contacto → Inspección"
                value={hist['Prom. Primer contacto → Inspección'] || '—'}
              />
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Hoja Excel: resumen + desglose por {informe?.historicoPorResponsable?.length ?? 0}{' '}
              responsable(s).
            </p>
          </div>

          <div className={complexCard}>
            <p className="text-xs font-semibold uppercase tracking-wide text-fenix-primario">
              Nuevo protocolo
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {informe?.meta?.periodoProtocolo} · {informe?.meta?.totalCasosProtocolo} caso(s)
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ComplexMetricCard
                label="Cumplimiento general"
                value={prot['Cumplimiento general'] || '—'}
              />
              <ComplexMetricCard label="Cerrados" value={String(prot['Cerrados en periodo'] ?? 0)} />
              <ComplexMetricCard
                label="Asignación → Contacto"
                value={prot['Prom. Asignación → Primer contacto'] || '—'}
              />
              <ComplexMetricCard
                label="% contacto en plazo"
                value={prot['% cumpl. Asignación → Primer contacto'] || '—'}
              />
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Hoja Excel: resumen + {informe?.protocoloPorAjustador?.length ?? 0} ajustador(es) con
              tiempos y % cumplimiento.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8" aria-label="Gráficas del informe">
        <h3 className="mb-4 font-heading text-base font-bold text-gray-900 dark:text-white">
          Gráficas del informe
        </h3>

        <div className="grid gap-6 xl:grid-cols-2">
          {graf.volumenCasos?.length > 0 && (
            <ComplexChartCard title="Volumen de casos" subtitle="Comparativo histórico vs nuevo protocolo">
              <ComplexChartPlot height={280}>
                <BarChart data={graf.volumenCasos} margin={{ top: 8, right: 16, left: 8, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="etiqueta"
                    tick={{ fill: tickColor, fontSize: 10 }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={64}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: tickColor, fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Casos']} />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {graf.volumenCasos.map((_, i) => (
                      <Cell key={i} fill={COLORES_VOLUMEN[i % COLORES_VOLUMEN.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}

          {graf.protocoloCumplimiento?.length > 0 && (
            <ComplexChartCard
              title="Cumplimiento por etapa (protocolo)"
              subtitle={`General: ${formatearPorcentajeCumplimiento(graf.cumplimientoGeneral)}`}
            >
              <ComplexChartPlot height={Math.max(280, graf.protocoloCumplimiento.length * 40)}>
                <BarChart
                  data={graf.protocoloCumplimiento}
                  layout="vertical"
                  margin={{ top: 8, right: 40, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: tickColor, fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="nombreCorto"
                    width={56}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [formatearPorcentajeCumplimiento(value), 'Cumplimiento']}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? `${item.nombre} · ${item.cumplidos}/${item.evaluables} en plazo` : '';
                    }}
                  />
                  <Bar dataKey="porcentaje" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {graf.protocoloCumplimiento.map((item) => (
                      <Cell key={item.orden} fill={colorBarraCumplimiento(item.porcentaje)} />
                    ))}
                  </Bar>
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}

          {graf.historicoTiempos?.length > 0 && (
            <ComplexChartCard title="Tiempos promedio — histórico" subtitle="Días u horas aproximadas por etapa">
              <ComplexChartPlot height={Math.max(260, graf.historicoTiempos.length * 44)}>
                <BarChart
                  data={graf.historicoTiempos}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={{ fill: tickColor, fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="nombreCorto"
                    width={148}
                    tick={{ fill: tickColor, fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(_, __, props) => [props.payload.etiqueta, 'Promedio']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.nombre || ''}
                  />
                  <Bar dataKey="valor" fill="#C8102E" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}

          {graf.protocoloTiempos?.length > 0 && (
            <ComplexChartCard title="Tiempos promedio — protocolo" subtitle="Por paso de la secuencia oficial">
              <ComplexChartPlot height={Math.max(260, graf.protocoloTiempos.length * 40)}>
                <BarChart
                  data={graf.protocoloTiempos}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={{ fill: tickColor, fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="nombreCorto"
                    width={56}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(_, __, props) => [props.payload.etiqueta, 'Promedio']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.nombre || ''}
                  />
                  <Bar dataKey="valor" fill="#2563EB" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}

          {graf.historicoEsperaDocs?.length > 0 && (
            <ComplexChartCard title="Espera de documentos por responsable" subtitle="Histórico — top 10">
              <ComplexChartPlot height={Math.max(280, graf.historicoEsperaDocs.length * 36)}>
                <BarChart
                  data={graf.historicoEsperaDocs}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={120}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [v, 'Casos']}
                    labelFormatter={(_, p) => p?.[0]?.payload?.nombreCompleto || ''}
                  />
                  <Bar dataKey="cantidad" fill="#F59E0B" radius={[0, 4, 4, 0]} maxBarSize={24} />
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}

          {graf.protocoloCasosPorAjustador?.length > 0 && (
            <ComplexChartCard title="Casos por ajustador" subtitle="Nuevo protocolo — top 10">
              <ComplexChartPlot height={Math.max(280, graf.protocoloCasosPorAjustador.length * 36)}>
                <BarChart
                  data={graf.protocoloCasosPorAjustador}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={120}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(_, p) => p?.[0]?.payload?.nombreCompleto || ''}
                  />
                  <Legend />
                  <Bar dataKey="casos" name="Casos" fill="#2563EB" radius={[0, 4, 4, 0]} maxBarSize={18} />
                  <Bar dataKey="cerrados" name="Cerrados" fill="#16A34A" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}

          {graf.protocoloCumplimientoAjustador?.length > 0 && (
            <ComplexChartCard
              title="% cumplimiento por ajustador"
              subtitle="Nuevo protocolo — menor a mayor"
            >
              <ComplexChartPlot height={Math.max(280, graf.protocoloCumplimientoAjustador.length * 36)}>
                <BarChart
                  data={graf.protocoloCumplimientoAjustador}
                  layout="vertical"
                  margin={{ top: 8, right: 40, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: tickColor, fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={120}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [formatearPorcentajeCumplimiento(v), 'Cumplimiento']}
                    labelFormatter={(_, p) => p?.[0]?.payload?.nombreCompleto || ''}
                  />
                  <Bar dataKey="porcentaje" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {graf.protocoloCumplimientoAjustador.map((item, index) => (
                      <Cell key={item.nombreCompleto} fill={colorBarraCumplimiento(item.porcentaje)} />
                    ))}
                  </Bar>
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}
        </div>
      </section>

      <div className={`${complexCard} mt-6 flex items-start gap-3`}>
        <FaDownload className="mt-1 shrink-0 text-fenix-primario" />
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">Contenido del archivo Excel</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400">
            <li>Portada — periodos, fechas y notas metodológicas</li>
            <li>Histórico resumen y por ajustador</li>
            <li>Protocolo resumen y por ajustador (tiempos y % cumplimiento)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InformeIndicadores2025Complex;
