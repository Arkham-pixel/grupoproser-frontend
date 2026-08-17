import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FaChartLine } from 'react-icons/fa';
import Loader from '../Loader.jsx';
import { useTheme } from '../../context/ThemeContext';
import { filtrarCasosPorAsignacionUsuario } from '../../utils/permisosCasoPorRol.js';
import {
  expressBadge,
  expressBtnSecondary,
  expressChartCard,
  expressPageSubtitle,
  expressPageTitle,
  expressPageWrap,
  expressScope,
  getFenixChartColor,
  getFenixLineChartColors,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  Campo,
  ExpressChartPlot,
  ExpressFilterSection,
  ExpressMetricCard,
  InputFenix,
  SelectFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { BASE_URL } from '../../config/apiConfig.js';
import {
  construirDashboardCatastrofico,
  construirMapaNombresPersona,
  etiquetaAjustadorCaso,
  etiquetaInspectorCaso,
  ESTADOS_EMBUDO_CATASTROFICO,
} from './dashboardCatastroficoStats.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F]';

function listaDesdeApi(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

const truncar = (valor, max = 28) => {
  const texto = String(valor ?? '').trim();
  if (!texto) return 'Sin dato';
  return texto.length > max ? `${texto.slice(0, max - 3)}…` : texto;
};

const formatCompactCop = (value) => {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)} mil M`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)} M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)} mil`;
  return `$${Math.round(n)}`;
};

function fmtPct(v) {
  return v == null ? '—' : `${v}%`;
}

function fmtDias(v) {
  return v == null ? '—' : `${Math.round(v * 10) / 10} d`;
}

/**
 * Dashboard operativo compartido Alfa / Sura / Zurich.
 */
export default function DashboardCatastrofico({
  badge,
  fetchCasos,
  formatCurrency,
  fechaEnRango,
  coincideFiltroTexto,
  buildOpcionesFiltro,
  estados = ESTADOS_EMBUDO_CATASTROFICO,
  i18nNs,
  boletinPath,
  extras = {},
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const td = (key, opts) => t(`catastroficoDashboard.${key}`, opts);

  const [casos, setCasos] = useState([]);
  const [mapaNombres, setMapaNombres] = useState(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroAjustador, setFiltroAjustador] = useState('');
  const [filtroInspector, setFiltroInspector] = useState('');
  const [filtroTomador, setFiltroTomador] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [data, resResp, resAj, resIns] = await Promise.all([
          fetchCasos(),
          fetch(`${BASE_URL}/api/responsables`).catch(() => null),
          fetch(`${BASE_URL}/api/ajustadores-catastrofico`).catch(() => null),
          fetch(`${BASE_URL}/api/inspectores-catastrofico`).catch(() => null),
        ]);
        if (cancelado) return;
        setCasos(filtrarCasosPorAsignacionUsuario(data));
        const jsonResp = resResp?.ok ? await resResp.json().catch(() => []) : [];
        const jsonAj = resAj?.ok ? await resAj.json().catch(() => []) : [];
        const jsonIns = resIns?.ok ? await resIns.json().catch(() => []) : [];
        setMapaNombres(
          construirMapaNombresPersona([
            ...listaDesdeApi(jsonResp),
            ...listaDesdeApi(jsonAj),
            ...listaDesdeApi(jsonIns),
          ])
        );
      } catch (err) {
        console.error('Error cargando dashboard catastrófico:', err);
        if (!cancelado) {
          setError(err.message || td('loadError'));
          setCasos([]);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [fetchCasos, t]);

  const filtrosAplicados = Boolean(
    filtroCiudad || filtroEstado || filtroAjustador || filtroInspector || filtroTomador || fechaDesde || fechaHasta
  );

  const limpiarFiltros = () => {
    setFiltroCiudad('');
    setFiltroEstado('');
    setFiltroAjustador('');
    setFiltroInspector('');
    setFiltroTomador('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const casosFiltrados = useMemo(
    () =>
      casos.filter((item) => {
        if (filtroCiudad && !coincideFiltroTexto(item.ciudad, filtroCiudad)) return false;
        if (filtroEstado && !coincideFiltroTexto(item.estado, filtroEstado)) return false;
        if (
          filtroAjustador &&
          !coincideFiltroTexto(etiquetaAjustadorCaso(item, mapaNombres), filtroAjustador)
        ) {
          return false;
        }
        if (
          filtroInspector &&
          !coincideFiltroTexto(etiquetaInspectorCaso(item, mapaNombres), filtroInspector)
        ) {
          return false;
        }
        if (filtroTomador && !coincideFiltroTexto(item.tomador, filtroTomador)) return false;
        if (fechaDesde || fechaHasta) {
          return fechaEnRango(item.fechaSiniestro || item.createdAt, fechaDesde, fechaHasta);
        }
        return true;
      }),
    [
      casos,
      filtroCiudad,
      filtroEstado,
      filtroAjustador,
      filtroInspector,
      filtroTomador,
      fechaDesde,
      fechaHasta,
      coincideFiltroTexto,
      fechaEnRango,
      mapaNombres,
    ]
  );

  const stats = useMemo(
    () => construirDashboardCatastrofico(casosFiltrados, { estadosOrden: estados, mapaNombres }),
    [casosFiltrados, estados, mapaNombres]
  );

  const ciudades = useMemo(() => buildOpcionesFiltro(casos, 'ciudad'), [casos, buildOpcionesFiltro]);
  const ajustadores = useMemo(() => {
    const virtual = casos.map((c) => ({ ajustador: etiquetaAjustadorCaso(c, mapaNombres) }));
    return buildOpcionesFiltro(virtual, 'ajustador');
  }, [casos, buildOpcionesFiltro, mapaNombres]);
  const inspectores = useMemo(() => {
    const virtual = casos.map((c) => ({ inspector: etiquetaInspectorCaso(c, mapaNombres) }));
    return buildOpcionesFiltro(virtual, 'inspector');
  }, [casos, buildOpcionesFiltro, mapaNombres]);
  const tomadores = useMemo(() => buildOpcionesFiltro(casos, 'tomador'), [casos, buildOpcionesFiltro]);

  const tooltipStyle = {
    backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF',
    border: `1px solid ${isDark ? '#2D2D2D' : '#E6E6E6'}`,
    color: isDark ? '#F5F5F5' : '#1E1E1E',
    borderRadius: '8px',
  };
  const tickColor = isDark ? '#B0B0B0' : '#6B6B6B';
  const gridStroke = isDark ? '#2D2D2D' : '#E5E7EB';
  const lineColors = getFenixLineChartColors(isDark);
  const pieStroke = isDark ? '#1A1A1A' : '#FFFFFF';

  if (loading) {
    return (
      <div className={`${root} flex min-h-[40vh] items-center justify-center p-4`}>
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${root} ${expressScope} p-4 sm:p-6`}>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }

  const { kpis, ans } = stats;

  return (
    <div className={`${root} ${expressScope} p-4 sm:p-6`}>
      <div className={`${expressPageWrap} min-w-0`}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className={expressBadge}>{badge}</span>
            <div>
              <h1 className={expressPageTitle}>{td('title')}</h1>
              <p className={expressPageSubtitle}>{td('subtitle')}</p>
            </div>
          </div>
          {boletinPath && (
            <Link to={boletinPath} className={expressBtnSecondary}>
              <FaChartLine /> {td('openBulletin')}
            </Link>
          )}
        </header>

        <ExpressFilterSection title={td('filters')} showClear={filtrosAplicados} onClear={limpiarFiltros}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Campo label={t(`${i18nNs}.fields.ciudad`)}>
              <SelectFenix value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)}>
                <option value="">{td('all')}</option>
                {ciudades.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t(`${i18nNs}.fields.estado`)}>
              <SelectFenix value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">{td('all')}</option>
                {estados.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t(`${i18nNs}.fields.ajustador`)}>
              <SelectFenix value={filtroAjustador} onChange={(e) => setFiltroAjustador(e.target.value)}>
                <option value="">{td('all')}</option>
                {ajustadores.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t(`${i18nNs}.fields.inspector`)}>
              <SelectFenix value={filtroInspector} onChange={(e) => setFiltroInspector(e.target.value)}>
                <option value="">{td('all')}</option>
                {inspectores.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t(`${i18nNs}.fields.tomador`)}>
              <SelectFenix value={filtroTomador} onChange={(e) => setFiltroTomador(e.target.value)}>
                <option value="">{td('all')}</option>
                {tomadores.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={td('from')}>
              <InputFenix type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </Campo>
            <Campo label={td('to')}>
              <InputFenix type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </Campo>
          </div>
        </ExpressFilterSection>

        <section className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ExpressMetricCard
            label={td('kpis.cases')}
            value={kpis.totalCasos}
            hint={td('kpis.casesHint', { active: kpis.casosActivos })}
          />
          <ExpressMetricCard
            label={td('kpis.claimed')}
            value={formatCurrency(kpis.totalReclamado)}
            hint={td('kpis.claimedHint', { value: formatCurrency(kpis.reclamadoActivos) })}
          />
          <ExpressMetricCard
            label={td('kpis.settled')}
            value={formatCurrency(kpis.totalLiquidado)}
            hint={td('kpis.settledHint', { settled: kpis.casosLiquidados, pct: kpis.porcentajeLiquidados })}
          />
          <ExpressMetricCard
            label={td('kpis.reserve')}
            value={formatCurrency(kpis.reservaActivos)}
            hint={td('kpis.reserveHint')}
          />
        </section>

        <section className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <AnsCard
            title={td('ans.inspection')}
            pct={ans.inspeccion.pct}
            ok={ans.inspeccion.ok}
            total={ans.inspeccion.total}
            limite={ans.inspeccion.limiteDias}
            mediana={ans.inspeccion.medianaDias}
            atrasados={kpis.atrasadosInspeccion}
            atrasadosLabel={td('ans.overdue')}
          />
          <AnsCard
            title={td('ans.settlement')}
            pct={ans.liquidacion.pct}
            ok={ans.liquidacion.ok}
            total={ans.liquidacion.total}
            limite={ans.liquidacion.limiteDias}
            mediana={ans.liquidacion.medianaDias}
            atrasados={kpis.atrasadosLiquidacion}
            atrasadosLabel={td('ans.overdue')}
          />
        </section>

        <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <ChartCard title={td('charts.byStatus')} empty={stats.porEstado.length === 0}>
              <ExpressChartPlot height={320}>
                <PieChart>
                  <Pie
                    data={stats.porEstado}
                    dataKey="cantidad"
                    nameKey="estado"
                    cx="42%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={108}
                    paddingAngle={2}
                    stroke={pieStroke}
                    strokeWidth={2}
                  >
                    {stats.porEstado.map((entry, index) => (
                      <Cell key={entry.estado} fill={getFenixChartColor(index, isDark)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [value, name]}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: 11, color: tickColor }}
                    formatter={(value) => truncar(value, 20)}
                  />
                </PieChart>
              </ExpressChartPlot>
          </ChartCard>

          <ChartCard title={td('charts.byCity')} empty={stats.porCiudad.length === 0}>
            <ExpressChartPlot height={Math.max(320, stats.porCiudad.length * 34)}>
              <BarChart data={stats.porCiudad} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  width={128}
                  tick={{ fill: tickColor, fontSize: 10 }}
                  tickFormatter={(v) => truncar(v, 22)}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="cantidad" name={td('kpis.cases')} radius={[0, 4, 4, 0]}>
                  {stats.porCiudad.map((entry, index) => (
                    <Cell key={entry.nombre} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Bar>
              </BarChart>
            </ExpressChartPlot>
          </ChartCard>
        </section>

        <ChartCard title={td('charts.monthlyTrend')} empty={stats.tendenciaMensual.length === 0}>
          <ExpressChartPlot height={360}>
            <ComposedChart data={stats.tendenciaMensual} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="etiqueta" tick={{ fill: tickColor, fontSize: 11 }} />
              <YAxis
                yAxisId="left"
                allowDecimals={false}
                tick={{ fill: tickColor, fontSize: 11 }}
                width={36}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={formatCompactCop}
                tick={{ fill: tickColor, fontSize: 10 }}
                width={72}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => {
                  if (name === td('kpis.cases') || name === 'casos') return [value, td('kpis.cases')];
                  return [formatCurrency(value), name];
                }}
              />
              <Legend wrapperStyle={{ color: tickColor, fontSize: 12 }} />
              <Bar
                yAxisId="right"
                dataKey="reclamado"
                name={td('charts.claimed')}
                fill={getFenixChartColor(3, isDark)}
                radius={[4, 4, 0, 0]}
                barSize={18}
              />
              <Bar
                yAxisId="right"
                dataKey="liquidado"
                name={td('charts.settledAmount')}
                fill={getFenixChartColor(4, isDark)}
                radius={[4, 4, 0, 0]}
                barSize={18}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="casos"
                name={td('kpis.cases')}
                stroke={lineColors.casos}
                strokeWidth={2.5}
                dot={{ fill: lineColors.casos, r: 3 }}
                activeDot={{ r: 6, fill: lineColors.casos }}
              />
            </ComposedChart>
          </ExpressChartPlot>
        </ChartCard>

        <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <HorizontalBars
            title={td('charts.byAdjuster')}
            data={stats.porAjustador}
            isDark={isDark}
            tickColor={tickColor}
            gridStroke={gridStroke}
            tooltipStyle={tooltipStyle}
            seriesName={td('kpis.cases')}
          />
          <HorizontalBars
            title={td('charts.byInspector')}
            data={stats.porInspector}
            isDark={isDark}
            tickColor={tickColor}
            gridStroke={gridStroke}
            tooltipStyle={tooltipStyle}
            seriesName={td('kpis.cases')}
          />
        </section>

        <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <HorizontalBars
            title={td('charts.byHolder')}
            data={stats.porTomador}
            isDark={isDark}
            tickColor={tickColor}
            gridStroke={gridStroke}
            tooltipStyle={tooltipStyle}
            seriesName={td('kpis.cases')}
          />
          <ChartCard title={td('charts.ansDays')} empty={stats.cubetasAns.every((r) => r.inspeccion === 0 && r.liquidacion === 0)}>
            <ExpressChartPlot height={320}>
              <BarChart data={stats.cubetasAns} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="rango" tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} width={36} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ color: tickColor, fontSize: 12 }} />
                <Bar
                  dataKey="inspeccion"
                  name={td('ans.inspectionShort')}
                  fill={getFenixChartColor(0, isDark)}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="liquidacion"
                  name={td('ans.settlementShort')}
                  fill={getFenixChartColor(3, isDark)}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ExpressChartPlot>
          </ChartCard>
        </section>

        {extras.severidad && (
          <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <ChartCard title={td('charts.severity')} empty={stats.severidad.every((r) => r.cantidad === 0)}>
              <ExpressChartPlot height={300}>
                <BarChart data={stats.severidad} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="nivel" tick={{ fill: tickColor, fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={48} />
                  <YAxis allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} width={36} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="cantidad" name={td('kpis.cases')} radius={[4, 4, 0, 0]}>
                    {stats.severidad.map((entry, index) => (
                      <Cell key={entry.nivel} fill={getFenixChartColor(index, isDark)} />
                    ))}
                  </Bar>
                </BarChart>
              </ExpressChartPlot>
            </ChartCard>
            <ChartCard title={td('charts.checklist')} empty={stats.checklist.length === 0}>
              <ExpressChartPlot height={300}>
                <PieChart>
                  <Pie
                    data={stats.checklist}
                    dataKey="cantidad"
                    nameKey="estado"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={100}
                    paddingAngle={3}
                    stroke={pieStroke}
                    strokeWidth={2}
                    label={({ estado, cantidad }) => `${estado} (${cantidad})`}
                  >
                    {stats.checklist.map((entry, index) => (
                      <Cell key={entry.estado} fill={getFenixChartColor(index, isDark)} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ExpressChartPlot>
            </ChartCard>
          </section>
        )}

        {extras.horas && (stats.horasTotales.some((r) => r.horas > 0) || stats.horasPorPersona.length > 0) && (
          <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <ChartCard title={td('charts.hoursType')} empty={stats.horasTotales.every((r) => r.horas === 0)}>
              <ExpressChartPlot height={300}>
                <BarChart data={stats.horasTotales} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="tipo" tick={{ fill: tickColor, fontSize: 11 }} />
                  <YAxis tick={{ fill: tickColor, fontSize: 11 }} width={40} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="horas" name={td('charts.hours')} radius={[4, 4, 0, 0]}>
                    {stats.horasTotales.map((entry, index) => (
                      <Cell key={entry.tipo} fill={getFenixChartColor(index, isDark)} />
                    ))}
                  </Bar>
                </BarChart>
              </ExpressChartPlot>
            </ChartCard>
            <ChartCard title={td('charts.hoursPerson')} empty={stats.horasPorPersona.length === 0}>
              <ExpressChartPlot height={Math.max(300, stats.horasPorPersona.length * 36)}>
                <BarChart
                  data={stats.horasPorPersona}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis type="number" tick={{ fill: tickColor, fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={120}
                    tick={{ fill: tickColor, fontSize: 10 }}
                    tickFormatter={(v) => truncar(v, 20)}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: tickColor, fontSize: 11 }} />
                  <Bar dataKey="viaje" name={td('hours.travel')} stackId="h" fill={getFenixChartColor(0, isDark)} />
                  <Bar dataKey="campo" name={td('hours.field')} stackId="h" fill={getFenixChartColor(3, isDark)} />
                  <Bar dataKey="oficina" name={td('hours.office')} stackId="h" fill={getFenixChartColor(4, isDark)} />
                  <Bar
                    dataKey="secretaria"
                    name={td('hours.admin')}
                    stackId="h"
                    fill={getFenixChartColor(5, isDark)}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ExpressChartPlot>
            </ChartCard>
          </section>
        )}

        {casosFiltrados.length === 0 && (
          <p className="font-body text-sm text-gray-500 dark:text-gray-400">{td('noData')}</p>
        )}
      </div>
    </div>
  );
}

function AnsCard({ title, pct, ok, total, limite, mediana, atrasados, atrasadosLabel }) {
  const ancho = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div className={`${expressChartCard} min-w-0`}>
      <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-2 font-accent text-3xl font-bold text-gray-900 dark:text-white">{fmtPct(pct)}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className="h-full rounded-full bg-fenix-exito" style={{ width: `${ancho}%` }} />
      </div>
      <p className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">
        {ok}/{total} · ≤ {limite} d · mediana {fmtDias(mediana)}
      </p>
      {atrasados > 0 && (
        <p className="mt-2 font-body text-xs font-semibold text-fenix-primario">
          {atrasadosLabel}: {atrasados}
        </p>
      )}
    </div>
  );
}

function ChartCard({ title, empty, children }) {
  const { t } = useTranslation();
  return (
    <div className={`${expressChartCard} min-w-0`}>
      <h3 className="mb-4 font-heading text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      {empty ? (
        <p className="font-body text-sm text-gray-500 dark:text-gray-400">
          {t('catastroficoDashboard.noData')}
        </p>
      ) : (
        children
      )}
    </div>
  );
}

function HorizontalBars({ title, data, isDark, tickColor, gridStroke, tooltipStyle, seriesName }) {
  return (
    <ChartCard title={title} empty={!data.length}>
      <ExpressChartPlot height={Math.max(280, data.length * 34)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="nombre"
            width={140}
            tick={{ fill: tickColor, fontSize: 10 }}
            tickFormatter={(v) => truncar(v, 24)}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="cantidad" name={seriesName} radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.nombre} fill={getFenixChartColor(index, isDark)} />
            ))}
          </Bar>
        </BarChart>
      </ExpressChartPlot>
    </ChartCard>
  );
}
