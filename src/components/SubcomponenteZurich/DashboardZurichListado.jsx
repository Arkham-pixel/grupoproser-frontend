import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Loader from '../Loader.jsx';
import { useTheme } from '../../context/ThemeContext';
import {
  expressBadge,
  expressChartCard,
  expressPageSubtitle,
  expressPageTitle,
  expressPageWrap,
  expressScope,
  expressTableHead,
  expressTableWrap,
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
import { fetchAllCasosZurichListado } from '../../services/zurichListadoService.js';
import {
  ESTADOS_ZURICH,
  buildOpcionesFiltro,
  coincideFiltroCiudadZurich,
  coincideFiltroTexto,
  etiquetaTipoPolizaZurich,
  fechaEnRango,
} from './zurichHelpers.js';
import {
  DIAS_ESTANCADO_ZURICH,
  construirDashboardZurichListado,
  fechaAltaListadoZurich,
} from './dashboardZurichListadoStats.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F]';

const truncar = (valor, max = 28) => {
  const texto = String(valor ?? '').trim();
  if (!texto) return '—';
  return texto.length > max ? `${texto.slice(0, max - 3)}…` : texto;
};

function opcionesDesdeGetter(casos, getter) {
  const virtual = casos.map((c) => ({ valor: getter(c) }));
  return buildOpcionesFiltro(virtual, 'valor');
}

export default function DashboardZurichListado() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const td = (key, opts) => t(`zurich.listadoDashboard.${key}`, opts);

  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipoPoliza, setFiltroTipoPoliza] = useState('');
  const [filtroCausa, setFiltroCausa] = useState('');
  const [filtroModalidad, setFiltroModalidad] = useState('');
  const [filtroIntermediario, setFiltroIntermediario] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllCasosZurichListado();
        if (!cancelado) setCasos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error cargando dashboard listado Zurich:', err);
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
  }, [t]);

  const filtrosAplicados = Boolean(
    filtroCiudad ||
      filtroEstado ||
      filtroTipoPoliza ||
      filtroCausa ||
      filtroModalidad ||
      filtroIntermediario ||
      fechaDesde ||
      fechaHasta
  );

  const limpiarFiltros = () => {
    setFiltroCiudad('');
    setFiltroEstado('');
    setFiltroTipoPoliza('');
    setFiltroCausa('');
    setFiltroModalidad('');
    setFiltroIntermediario('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const casosFiltrados = useMemo(
    () =>
      casos.filter((item) => {
        if (filtroCiudad && !coincideFiltroCiudadZurich(item.ciudad, filtroCiudad)) return false;
        if (filtroEstado && !coincideFiltroTexto(item.estado, filtroEstado)) return false;
        if (filtroTipoPoliza && !coincideFiltroTexto(etiquetaTipoPolizaZurich(item), filtroTipoPoliza)) {
          return false;
        }
        if (filtroCausa && !coincideFiltroTexto(item.causa, filtroCausa)) return false;
        if (filtroModalidad && !coincideFiltroTexto(item.modalidadAtencion, filtroModalidad)) return false;
        if (filtroIntermediario && !coincideFiltroTexto(item.intermediario, filtroIntermediario)) {
          return false;
        }
        if (fechaDesde || fechaHasta) {
          return fechaEnRango(fechaAltaListadoZurich(item), fechaDesde, fechaHasta);
        }
        return true;
      }),
    [
      casos,
      filtroCiudad,
      filtroEstado,
      filtroTipoPoliza,
      filtroCausa,
      filtroModalidad,
      filtroIntermediario,
      fechaDesde,
      fechaHasta,
    ]
  );

  const stats = useMemo(() => construirDashboardZurichListado(casosFiltrados), [casosFiltrados]);
  const { kpis } = stats;

  const ciudades = useMemo(() => buildOpcionesFiltro(casos, 'ciudad'), [casos]);
  const tiposPoliza = useMemo(() => opcionesDesdeGetter(casos, etiquetaTipoPolizaZurich), [casos]);
  const causas = useMemo(() => buildOpcionesFiltro(casos, 'causa'), [casos]);
  const modalidades = useMemo(() => buildOpcionesFiltro(casos, 'modalidadAtencion'), [casos]);
  const intermediarios = useMemo(() => buildOpcionesFiltro(casos, 'intermediario'), [casos]);

  const tooltipStyle = {
    backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF',
    border: `1px solid ${isDark ? '#2D2D2D' : '#E6E6E6'}`,
    color: isDark ? '#F5F5F5' : '#1E1E1E',
    borderRadius: '8px',
  };
  const tickColor = isDark ? '#B0B0B0' : '#6B6B6B';
  const gridStroke = isDark ? '#2D2D2D' : '#E5E7EB';
  const lineColors = getFenixLineChartColors(isDark);

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

  return (
    <div className={`${root} ${expressScope} p-4 sm:p-6`}>
      <div className={`${expressPageWrap} min-w-0`}>
        <header className="space-y-3">
          <span className={expressBadge}>{td('badge')}</span>
          <div>
            <h1 className={expressPageTitle}>{td('title')}</h1>
            <p className={expressPageSubtitle}>{td('subtitle')}</p>
          </div>
        </header>

        <ExpressFilterSection title={td('filters')} showClear={filtrosAplicados} onClear={limpiarFiltros}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Campo label={t('zurich.fields.ciudad')}>
              <SelectFenix value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)}>
                <option value="">{td('all')}</option>
                {ciudades.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('zurich.fields.estado')}>
              <SelectFenix value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">{td('all')}</option>
                {ESTADOS_ZURICH.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('zurich.fields.tipoPoliza')}>
              <SelectFenix value={filtroTipoPoliza} onChange={(e) => setFiltroTipoPoliza(e.target.value)}>
                <option value="">{td('all')}</option>
                {tiposPoliza.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('zurich.fields.causa')}>
              <SelectFenix value={filtroCausa} onChange={(e) => setFiltroCausa(e.target.value)}>
                <option value="">{td('all')}</option>
                {causas.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('zurich.fields.modalidadAtencion')}>
              <SelectFenix value={filtroModalidad} onChange={(e) => setFiltroModalidad(e.target.value)}>
                <option value="">{td('all')}</option>
                {modalidades.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('zurich.fields.intermediario')}>
              <SelectFenix
                value={filtroIntermediario}
                onChange={(e) => setFiltroIntermediario(e.target.value)}
              >
                <option value="">{td('all')}</option>
                {intermediarios.map((op) => (
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

        <section className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ExpressMetricCard
            label={td('kpis.open')}
            value={kpis.carteraAbierta}
            hint={
              kpis.medianaDias == null
                ? td('kpis.openHint', {
                    stalled: kpis.estancados,
                    days: DIAS_ESTANCADO_ZURICH,
                    total: kpis.totalCasos,
                  })
                : `${td('kpis.openHint', {
                    stalled: kpis.estancados,
                    days: DIAS_ESTANCADO_ZURICH,
                    total: kpis.totalCasos,
                  })} · ${td('kpis.medianDays', { days: kpis.medianaDias })}`
            }
          />
          <ExpressMetricCard
            label={td('kpis.inProgress')}
            value={kpis.enTramite}
            hint={td('kpis.inProgressHint')}
          />
          <ExpressMetricCard
            label={td('kpis.pendingDocs')}
            value={kpis.pendienteDocumento}
            hint={td('kpis.pendingDocsHint')}
          />
          <ExpressMetricCard
            label={td('kpis.objection')}
            value={kpis.enObjecion}
            hint={td('kpis.objectionHint')}
          />
          <ExpressMetricCard
            label={td('kpis.readyPay')}
            value={kpis.listosPago}
            hint={td('kpis.readyPayHint')}
          />
          <ExpressMetricCard
            label={td('kpis.paid')}
            value={kpis.pagados}
            hint={td('kpis.paidHint', { pct: kpis.porcentajePagados })}
          />
        </section>

        <ChartCard title={td('charts.byStatus')} hint={td('charts.byStatusHint')} empty={kpis.totalCasos === 0}>
          <ExpressChartPlot height={Math.max(320, stats.porEstado.length * 40)}>
            <BarChart
              data={stats.porEstado}
              layout="vertical"
              margin={{ top: 4, right: 36, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="estado"
                width={188}
                interval={0}
                tick={{ fill: tickColor, fontSize: 10 }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="cantidad" name={td('kpis.cases')} radius={[0, 4, 4, 0]}>
                {stats.porEstado.map((entry, index) => (
                  <Cell key={entry.estado} fill={getFenixChartColor(index, isDark)} />
                ))}
                <LabelList dataKey="cantidad" position="right" fill={tickColor} fontSize={11} />
              </Bar>
            </BarChart>
          </ExpressChartPlot>
        </ChartCard>

        <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <HorizontalBars
            title={td('charts.byCity')}
            data={stats.porCiudad}
            isDark={isDark}
            tickColor={tickColor}
            gridStroke={gridStroke}
            tooltipStyle={tooltipStyle}
            seriesName={td('kpis.cases')}
          />
          <HorizontalBars
            title={td('charts.byPolicyType')}
            data={stats.porTipoPoliza}
            isDark={isDark}
            tickColor={tickColor}
            gridStroke={gridStroke}
            tooltipStyle={tooltipStyle}
            seriesName={t('zurich.fields.tipoPoliza')}
          />
        </section>

        <ChartCard title={td('charts.monthlyTrend')} empty={stats.tendenciaMensual.length === 0}>
          <ExpressChartPlot height={360}>
            <LineChart data={stats.tendenciaMensual} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="etiqueta" tick={{ fill: tickColor, fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} width={36} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: tickColor, fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="altas"
                name={td('charts.newCases')}
                stroke={lineColors.casos}
                strokeWidth={2.5}
                dot={{ fill: lineColors.casos, r: 3 }}
                activeDot={{ r: 6, fill: lineColors.casos }}
              />
              <Line
                type="monotone"
                dataKey="pagados"
                name={td('charts.paidCases')}
                stroke={getFenixChartColor(3, isDark)}
                strokeWidth={2.5}
                dot={{ fill: getFenixChartColor(3, isDark), r: 3 }}
              />
            </LineChart>
          </ExpressChartPlot>
        </ChartCard>

        <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <HorizontalBars
            title={td('charts.byCause')}
            data={stats.porCausa}
            isDark={isDark}
            tickColor={tickColor}
            gridStroke={gridStroke}
            tooltipStyle={tooltipStyle}
            seriesName={t('zurich.fields.causa')}
          />
          <HorizontalBars
            title={td('charts.byIntermediary')}
            data={stats.porIntermediario}
            isDark={isDark}
            tickColor={tickColor}
            gridStroke={gridStroke}
            tooltipStyle={tooltipStyle}
            seriesName={t('zurich.fields.intermediario')}
          />
        </section>

        <ChartCard title={td('charts.aging')} empty={stats.antigüedad.every((r) => r.cantidad === 0)}>
          <ExpressChartPlot height={320}>
            <BarChart data={stats.antigüedad} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="rango" tick={{ fill: tickColor, fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} width={36} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="cantidad" name={td('kpis.open')} radius={[4, 4, 0, 0]}>
                {stats.antigüedad.map((entry, index) => (
                  <Cell key={entry.rango} fill={getFenixChartColor(index, isDark)} />
                ))}
              </Bar>
            </BarChart>
          </ExpressChartPlot>
        </ChartCard>

        <section className={`${expressTableWrap} min-w-0`}>
          <div className="border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-5">
            <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
              {td('stalled.title', { days: DIAS_ESTANCADO_ZURICH })}
            </h3>
            <p className="mt-1 font-body text-sm text-gray-500 dark:text-gray-400">{td('stalled.hint')}</p>
          </div>
          {stats.estancados.length === 0 ? (
            <p className="px-4 py-6 font-body text-sm text-gray-500 dark:text-gray-400 sm:px-5">
              {td('stalled.empty')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className={expressTableHead}>
                  <tr>
                    <th className="px-4 py-3">{t('zurich.fields.zc')}</th>
                    <th className="px-4 py-3">{t('zurich.fields.siniestro')}</th>
                    <th className="px-4 py-3">{t('zurich.fields.asegurado')}</th>
                    <th className="px-4 py-3">{t('zurich.fields.ciudad')}</th>
                    <th className="px-4 py-3">{t('zurich.fields.estado')}</th>
                    <th className="px-4 py-3">{td('stalled.days')}</th>
                    <th className="px-4 py-3">{td('stalled.reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.estancados.map((row) => (
                    <tr
                      key={String(row.id || `${row.zc}-${row.siniestro}`)}
                      className="border-t border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        {row.id ? (
                          <Link
                            to={`/zurich/listado/caso?casoId=${row.id}`}
                            className="text-fenix-primario hover:underline"
                          >
                            {row.zc || td('stalled.openCase')}
                          </Link>
                        ) : (
                          row.zc || '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.siniestro || '—'}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{truncar(row.asegurado, 32)}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.ciudad || '—'}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.estado}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{row.dias}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{truncar(row.motivo, 48)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {casosFiltrados.length === 0 && (
          <p className="font-body text-sm text-gray-500 dark:text-gray-400">{td('noData')}</p>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, hint, empty, children }) {
  const { t } = useTranslation();
  return (
    <div className={`${expressChartCard} min-w-0`}>
      <h3 className={`font-heading text-lg font-bold text-gray-900 dark:text-white ${hint ? 'mb-1' : 'mb-4'}`}>
        {title}
      </h3>
      {hint ? <p className="mb-4 font-body text-sm text-gray-500 dark:text-gray-400">{hint}</p> : null}
      {empty ? (
        <p className="font-body text-sm text-gray-500 dark:text-gray-400">{t('zurich.listadoDashboard.noData')}</p>
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
