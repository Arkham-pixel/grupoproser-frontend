import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
} from 'recharts';
import { fetchAllCasosFdm } from '../../services/equidadFdmService.js';
import Loader from '../Loader.jsx';
import { useTheme } from '../../context/ThemeContext';
import {
  buildOpcionesFiltro,
  coincideFiltroTexto,
  esCasoNuevoFdm,
  fechaEnRango,
  formatCurrency,
  normalizarMunicipioFdm,
  parseDate,
} from './equidadFdmHelpers.js';
import {
  buildPieLegendPayload,
  expressChartCard,
  expressPageWrap,
  expressScope,
  getFenixChartColor,
  getFenixLineChartColors,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  Campo,
  ExpressFilterSection,
  ExpressMetricCard,
  InputFenix,
  SelectFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { FdmPageHeader } from './EquidadFdmUiBlocks.jsx';

const fdmDashboardRoot = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F]';

const truncarEtiqueta = (valor, max = 28) => {
  const texto = String(valor ?? '').trim();
  if (!texto) return 'Sin nombre';
  return texto.length > max ? `${texto.slice(0, max - 3)}...` : texto;
};

/** Presentación legible en gráficos (evita TODO EN MAYÚSCULAS). */
const formatearEtiquetaLegible = (valor) => {
  const texto = String(valor ?? '').trim();
  if (!texto) return 'Sin nombre';
  if (/^sin\s/i.test(texto)) {
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  }
  if (texto === texto.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(texto)) {
    return texto
      .toLowerCase()
      .split(/\s+/)
      .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  }
  return texto;
};

const formatoLeyendaPieFdm = (total, labelKey) => (value, entry) => {
  const item = entry?.payload ?? {};
  const etiqueta = formatearEtiquetaLegible(item[labelKey] || value || '');
  const cantidad = item.cantidad ?? 0;
  const pct = total > 0 ? Math.round((cantidad / total) * 100) : 0;
  return `${etiqueta}: ${cantidad} (${pct}%)`;
};

const tieneNumeroValidoFdm = (valor) => {
  const nro = String(valor ?? '').trim();
  return Boolean(nro && nro !== '0' && !/^(n\/?a|na|null|-)$/i.test(nro));
};

const DashboardEquidadFdm = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroAjustador, setFiltroAjustador] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('');
  const [filtroNuevos, setFiltroNuevos] = useState('nuevos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    let cancelado = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllCasosFdm();
        if (!cancelado) setCasos(data);
      } catch (err) {
        console.error('Error cargando casos FDM (dashboard):', err);
        if (!cancelado) {
          setError(err.message || t('equidadFdm.dashboard.loadError'));
          setCasos([]);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelado = true;
    };
  }, [t]);

  const filtrosAplicados = Boolean(
    filtroMunicipio || filtroAjustador || filtroEstado || filtroEvento || filtroNuevos || fechaDesde || fechaHasta
  );

  const limpiarFiltros = () => {
    setFiltroMunicipio('');
    setFiltroAjustador('');
    setFiltroEstado('');
    setFiltroEvento('');
    setFiltroNuevos('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const casosFiltrados = useMemo(() => {
    return casos.filter((item) => {
      if (filtroMunicipio) {
        const munItem = normalizarMunicipioFdm(item.municipio) || '';
        if (!coincideFiltroTexto(munItem, filtroMunicipio) && !coincideFiltroTexto(item.municipio, filtroMunicipio)) {
          return false;
        }
      }
      if (filtroAjustador && !coincideFiltroTexto(item.ajustador, filtroAjustador)) return false;
      if (filtroEstado && !coincideFiltroTexto(item.estado, filtroEstado)) return false;
      if (filtroEvento && !coincideFiltroTexto(item.evento, filtroEvento)) return false;
      if (filtroNuevos === 'nuevos' && !esCasoNuevoFdm(item)) return false;
      if (filtroNuevos === 'anteriores' && esCasoNuevoFdm(item)) return false;
      if (fechaDesde || fechaHasta) {
        return fechaEnRango(
          item.fechaRegistro || item.fechaLiquidacion || item.fechaAviso || item.createdAt,
          fechaDesde,
          fechaHasta
        );
      }
      return true;
    });
  }, [casos, filtroMunicipio, filtroAjustador, filtroEstado, filtroEvento, filtroNuevos, fechaDesde, fechaHasta]);

  const totalCasos = casosFiltrados.length;
  const totalPerdida = casosFiltrados.reduce((acc, item) => acc + (item.totalPerdidaNumero || 0), 0);
  const totalLiquidado = casosFiltrados.reduce((acc, item) => acc + (item.totalLiquidadoNumero || 0), 0);
  const totalIndemnizado = casosFiltrados.reduce((acc, item) => acc + (item.valorIndemnizadoNumero || 0), 0);
  const casosLiquidados = casosFiltrados.filter((item) =>
    String(item.estado || '').toUpperCase().includes('LIQUID')
  ).length;
  const porcentajeLiquidados = totalCasos === 0 ? 0 : Math.round((casosLiquidados / totalCasos) * 100);

  const casosPorEstado = useMemo(() => {
    const agrupado = casosFiltrados.reduce((acc, item) => {
      const key = String(item.estado || 'Sin estado').trim().toUpperCase() || 'SIN ESTADO';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(agrupado)
      .map(([estado, cantidad]) => ({ estado, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [casosFiltrados]);

  const casosPorMunicipio = useMemo(() => {
    const agrupado = casosFiltrados.reduce((acc, item) => {
      const normalizado = normalizarMunicipioFdm(item.municipio);
      const key = normalizado || 'Sin municipio';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(agrupado)
      .map(([municipio, cantidad]) => ({ municipio, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
  }, [casosFiltrados]);

  const casosPorAjustador = useMemo(() => {
    const agrupado = casosFiltrados.reduce((acc, item) => {
      const key = String(item.ajustador || 'Sin ajustador').trim().toUpperCase() || 'SIN AJUSTADOR';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(agrupado)
      .map(([ajustador, cantidad]) => ({ ajustador, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
  }, [casosFiltrados]);

  /** onBase: casos con número de caso vs sin número de caso. */
  const onBaseData = useMemo(() => {
    let conCaso = 0;
    let sinCaso = 0;
    for (const item of casosFiltrados) {
      if (tieneNumeroValidoFdm(item.caso)) conCaso += 1;
      else sinCaso += 1;
    }
    return [
      { clave: 'conCaso', label: t('equidadFdm.dashboard.onBaseWithCase'), cantidad: conCaso },
      { clave: 'sinCaso', label: t('equidadFdm.dashboard.onBaseWithoutCase'), cantidad: sinCaso },
    ].filter((row) => row.cantidad > 0 || casosFiltrados.length === 0);
  }, [casosFiltrados, t]);

  const onBaseTotales = useMemo(() => {
    const con = onBaseData.find((r) => r.clave === 'conCaso')?.cantidad || 0;
    const sin = onBaseData.find((r) => r.clave === 'sinCaso')?.cantidad || 0;
    return { con, sin, total: con + sin };
  }, [onBaseData]);

  const leyendaPorEstado = useMemo(
    () => buildPieLegendPayload(casosPorEstado, 'estado', isDark),
    [casosPorEstado, isDark]
  );

  const leyendaOnBase = useMemo(
    () =>
      onBaseData.map((item, index) => ({
        value: item.label,
        type: 'circle',
        color: getFenixChartColor(index === 0 ? 0 : 3, isDark),
        payload: item,
      })),
    [onBaseData, isDark]
  );

  /** Siniestros: casos con número de siniestro vs sin número de siniestro. */
  const siniestrosData = useMemo(() => {
    let conSiniestro = 0;
    let sinSiniestro = 0;
    for (const item of casosFiltrados) {
      if (tieneNumeroValidoFdm(item.siniestro)) conSiniestro += 1;
      else sinSiniestro += 1;
    }
    return [
      { clave: 'conSiniestro', label: t('equidadFdm.dashboard.withClaimNumber'), cantidad: conSiniestro },
      { clave: 'sinSiniestro', label: t('equidadFdm.dashboard.withoutClaimNumber'), cantidad: sinSiniestro },
    ].filter((row) => row.cantidad > 0 || casosFiltrados.length === 0);
  }, [casosFiltrados, t]);

  const siniestrosTotales = useMemo(() => {
    const con = siniestrosData.find((r) => r.clave === 'conSiniestro')?.cantidad || 0;
    const sin = siniestrosData.find((r) => r.clave === 'sinSiniestro')?.cantidad || 0;
    return { con, sin, total: con + sin };
  }, [siniestrosData]);

  const leyendaSiniestros = useMemo(
    () =>
      siniestrosData.map((item, index) => ({
        value: item.label,
        type: 'circle',
        color: getFenixChartColor(index === 0 ? 1 : 4, isDark),
        payload: item,
      })),
    [siniestrosData, isDark]
  );

  const tendenciaMensual = useMemo(() => {
    const agrupado = casosFiltrados.reduce((acc, item) => {
      const fecha =
        parseDate(item.fechaLiquidacion) || parseDate(item.fechaAviso) || parseDate(item.createdAt);
      if (!fecha) return acc;
      const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[clave]) {
        acc[clave] = { mes: clave, casos: 0, liquidado: 0, perdida: 0 };
      }
      acc[clave].casos += 1;
      acc[clave].liquidado += item.totalLiquidadoNumero || 0;
      acc[clave].perdida += item.totalPerdidaNumero || 0;
      return acc;
    }, {});

    return Object.values(agrupado)
      .sort((a, b) => (a.mes > b.mes ? 1 : -1))
      .slice(-12);
  }, [casosFiltrados]);

  const municipiosUnicos = useMemo(() => buildOpcionesFiltro(casos, 'municipio'), [casos]);
  const ajustadoresUnicos = useMemo(() => buildOpcionesFiltro(casos, 'ajustador'), [casos]);
  const estadosUnicos = useMemo(() => buildOpcionesFiltro(casos, 'estado'), [casos]);
  const eventosUnicos = useMemo(() => buildOpcionesFiltro(casos, 'evento'), [casos]);
  const totalNuevos = useMemo(() => casos.filter((item) => esCasoNuevoFdm(item)).length, [casos]);

  const tooltipStyle = {
    backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF',
    border: `1px solid ${isDark ? '#2D2D2D' : '#E6E6E6'}`,
    color: isDark ? '#F5F5F5' : '#1E1E1E',
    borderRadius: '8px',
  };

  const tickColor = isDark ? '#B0B0B0' : '#6B6B6B';
  const gridStroke = isDark ? '#2D2D2D' : '#E5E7EB';
  const pieStroke = isDark ? '#0F0F0F' : '#FFFFFF';
  const lineColors = getFenixLineChartColors(isDark);

  if (loading) {
    return (
      <div className={`${fdmDashboardRoot} p-4 sm:p-6`}>
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${fdmDashboardRoot} ${expressScope} p-4 sm:p-6`}>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`${fdmDashboardRoot} ${expressScope} p-4 sm:p-6`}>
      <div className={`${expressPageWrap} min-w-0`}>
        <FdmPageHeader
          title={t('equidadFdm.dashboard.title')}
          subtitle={t('equidadFdm.dashboard.subtitle')}
          activePath="/equidad-fdm/dashboard"
        />

        <ExpressFilterSection title={t('equidadFdm.dashboard.filters')} showClear={filtrosAplicados} onClear={limpiarFiltros}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Campo label={t('equidadFdm.fields.municipality')}>
              <SelectFenix value={filtroMunicipio} onChange={(e) => setFiltroMunicipio(e.target.value)}>
                <option value="">{t('equidadFdm.dashboard.all')}</option>
                {municipiosUnicos.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('equidadFdm.fields.adjuster')}>
              <SelectFenix value={filtroAjustador} onChange={(e) => setFiltroAjustador(e.target.value)}>
                <option value="">{t('equidadFdm.dashboard.all')}</option>
                {ajustadoresUnicos.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('equidadFdm.fields.status')}>
              <SelectFenix value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">{t('equidadFdm.dashboard.all')}</option>
                {estadosUnicos.map((es) => (
                  <option key={es.value} value={es.value}>
                    {es.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('equidadFdm.fields.event')}>
              <SelectFenix value={filtroEvento} onChange={(e) => setFiltroEvento(e.target.value)}>
                <option value="">{t('equidadFdm.dashboard.all')}</option>
                {eventosUnicos.map((ev) => (
                  <option key={ev.value} value={ev.value}>
                    {ev.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('equidadFdm.fields.newCases')}>
              <SelectFenix value={filtroNuevos} onChange={(e) => setFiltroNuevos(e.target.value)}>
                <option value="">{t('equidadFdm.dashboard.all')}</option>
                <option value="nuevos">{t('equidadFdm.report.onlyNew', { count: totalNuevos })}</option>
                <option value="anteriores">{t('equidadFdm.report.previousCases')}</option>
              </SelectFenix>
            </Campo>
            <Campo label={t('equidadFdm.dashboard.from')}>
              <InputFenix type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </Campo>
            <Campo label={t('equidadFdm.dashboard.to')}>
              <InputFenix type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </Campo>
          </div>
        </ExpressFilterSection>

        <section className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ExpressMetricCard label={t('equidadFdm.dashboard.cases')} value={totalCasos} hint={t('equidadFdm.dashboard.filteredTotal')} />
          <ExpressMetricCard
            label={t('equidadFdm.dashboard.totalLoss')}
            value={formatCurrency(totalPerdida)}
            hint={t('equidadFdm.dashboard.reportedLosses')}
          />
          <ExpressMetricCard
            label={t('equidadFdm.dashboard.totalSettled')}
            value={formatCurrency(totalLiquidado)}
            hint={t('equidadFdm.dashboard.indemnified', { value: formatCurrency(totalIndemnizado) })}
          />
          <ExpressMetricCard
            label={t('equidadFdm.dashboard.settledCasesPercent')}
            value={`${porcentajeLiquidados}%`}
            hint={t('equidadFdm.dashboard.ofCases', {
              settled: casosLiquidados,
              total: totalCasos,
              percent: porcentajeLiquidados,
            })}
          />
        </section>

        <section className="grid w-full min-w-0 grid-cols-1 gap-4">
          <ChartCard title={t('equidadFdm.dashboard.byStatus')} empty={casosPorEstado.length === 0}>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={casosPorEstado}
                  dataKey="cantidad"
                  nameKey="estado"
                  cx="42%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  stroke={pieStroke}
                  strokeWidth={2}
                >
                  {casosPorEstado.map((entry, index) => (
                    <Cell key={entry.estado} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, props) => {
                    const cantidad = props.payload?.cantidad || value || 0;
                    const pct = totalCasos > 0 ? Math.round((cantidad / totalCasos) * 100) : 0;
                    return [`${cantidad} (${pct}%)`, formatearEtiquetaLegible(props.payload?.estado)];
                  }}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  payload={leyendaPorEstado}
                  formatter={formatoLeyendaPieFdm(totalCasos, 'estado')}
                  wrapperStyle={{ fontSize: '11px', color: tickColor, paddingLeft: '8px', lineHeight: '1.45' }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <ChartCard
            title={t('equidadFdm.dashboard.onBase')}
            empty={casosFiltrados.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={onBaseData}
                  dataKey="cantidad"
                  nameKey="label"
                  cx="50%"
                  cy="46%"
                  innerRadius={58}
                  outerRadius={92}
                  stroke={pieStroke}
                  strokeWidth={2}
                >
                  {onBaseData.map((entry) => (
                    <Cell
                      key={entry.clave}
                      fill={
                        entry.clave === 'conCaso'
                          ? getFenixChartColor(0, isDark)
                          : getFenixChartColor(3, isDark)
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, props) => {
                    const cantidad = props.payload?.cantidad || value || 0;
                    const pct =
                      onBaseTotales.total > 0 ? Math.round((cantidad / onBaseTotales.total) * 100) : 0;
                    return [`${cantidad} (${pct}%)`, props.payload?.label || ''];
                  }}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                  payload={leyendaOnBase}
                  formatter={(value, entry) => {
                    const cantidad = entry?.payload?.cantidad ?? 0;
                    const pct =
                      onBaseTotales.total > 0 ? Math.round((cantidad / onBaseTotales.total) * 100) : 0;
                    return `${value}: ${cantidad} (${pct}%)`;
                  }}
                  wrapperStyle={{
                    fontSize: '12px',
                    color: tickColor,
                    paddingTop: '8px',
                    lineHeight: '1.5',
                  }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
            <p className="mt-2 text-center font-body text-xs text-gray-500 dark:text-gray-400">
              {t('equidadFdm.dashboard.onBaseTotal', { total: onBaseTotales.total })}
            </p>
          </ChartCard>

          <ChartCard
            title={t('equidadFdm.dashboard.byClaimNumber')}
            empty={casosFiltrados.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={siniestrosData}
                  dataKey="cantidad"
                  nameKey="label"
                  cx="50%"
                  cy="46%"
                  innerRadius={58}
                  outerRadius={92}
                  stroke={pieStroke}
                  strokeWidth={2}
                >
                  {siniestrosData.map((entry) => (
                    <Cell
                      key={entry.clave}
                      fill={
                        entry.clave === 'conSiniestro'
                          ? getFenixChartColor(1, isDark)
                          : getFenixChartColor(4, isDark)
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, props) => {
                    const cantidad = props.payload?.cantidad || value || 0;
                    const pct =
                      siniestrosTotales.total > 0
                        ? Math.round((cantidad / siniestrosTotales.total) * 100)
                        : 0;
                    return [`${cantidad} (${pct}%)`, props.payload?.label || ''];
                  }}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                  payload={leyendaSiniestros}
                  formatter={(value, entry) => {
                    const cantidad = entry?.payload?.cantidad ?? 0;
                    const pct =
                      siniestrosTotales.total > 0
                        ? Math.round((cantidad / siniestrosTotales.total) * 100)
                        : 0;
                    return `${value}: ${cantidad} (${pct}%)`;
                  }}
                  wrapperStyle={{
                    fontSize: '12px',
                    color: tickColor,
                    paddingTop: '8px',
                    lineHeight: '1.5',
                  }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
            <p className="mt-2 text-center font-body text-xs text-gray-500 dark:text-gray-400">
              {t('equidadFdm.dashboard.claimNumberTotal', { total: siniestrosTotales.total })}
            </p>
          </ChartCard>
        </section>

        <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <ChartCard title={t('equidadFdm.dashboard.byMunicipality')} empty={casosPorMunicipio.length === 0}>
            <ResponsiveContainer width="100%" height={Math.max(320, casosPorMunicipio.length * 34)}>
              <BarChart
                data={casosPorMunicipio}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="municipio"
                  width={148}
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickFormatter={(v) => truncarEtiqueta(formatearEtiquetaLegible(v), 22)}
                />
                <Tooltip
                  formatter={(value) => [value, t('equidadFdm.dashboard.cases')]}
                  labelFormatter={(label) => formatearEtiquetaLegible(label)}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="cantidad" name={t('equidadFdm.dashboard.cases')} radius={[0, 4, 4, 0]}>
                  {casosPorMunicipio.map((entry, index) => (
                    <Cell key={entry.municipio} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('equidadFdm.dashboard.byAdjuster')} empty={casosPorAjustador.length === 0}>
            <ResponsiveContainer width="100%" height={Math.max(320, casosPorAjustador.length * 36)}>
              <BarChart
                data={casosPorAjustador}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="ajustador"
                  width={148}
                  tick={{ fill: tickColor, fontSize: 11 }}
                  tickFormatter={(v) => truncarEtiqueta(formatearEtiquetaLegible(v), 22)}
                />
                <Tooltip
                  formatter={(value) => [value, t('equidadFdm.dashboard.cases')]}
                  labelFormatter={(label) => formatearEtiquetaLegible(label)}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="cantidad" name={t('equidadFdm.dashboard.cases')} radius={[0, 4, 4, 0]}>
                  {casosPorAjustador.map((entry, index) => (
                    <Cell key={entry.ajustador} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        <section className="grid w-full min-w-0 grid-cols-1 gap-4">
          <ChartCard title={t('equidadFdm.dashboard.monthlyTrend')} empty={tendenciaMensual.length === 0}>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={tendenciaMensual} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="mes" tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  allowDecimals={false}
                  tick={{ fill: tickColor, fontSize: 11 }}
                  width={40}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => formatCurrency(v).replace(/\s/g, '')}
                  tick={{ fill: tickColor, fontSize: 10 }}
                  width={72}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'Casos') return [value, t('equidadFdm.dashboard.cases')];
                    return [formatCurrency(value), name];
                  }}
                  contentStyle={tooltipStyle}
                />
                <Legend wrapperStyle={{ color: tickColor, fontSize: '12px' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="casos"
                  name={t('equidadFdm.dashboard.cases')}
                  stroke={lineColors.casos}
                  strokeWidth={2.5}
                  dot={{ fill: lineColors.casos, r: 3 }}
                  activeDot={{ r: 6, fill: lineColors.casos }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="liquidado"
                  name={t('equidadFdm.dashboard.settled')}
                  stroke={lineColors.indemnizacion}
                  strokeWidth={2}
                  dot={{ fill: lineColors.indemnizacion, r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="perdida"
                  name={t('equidadFdm.dashboard.loss')}
                  stroke={lineColors.reserva}
                  strokeWidth={2}
                  dot={{ fill: lineColors.reserva, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>
      </div>
    </div>
  );
};

function ChartCard({ title, empty, children }) {
  const { t } = useTranslation();
  return (
    <div className={`${expressChartCard} min-w-0`}>
      <h3 className="mb-4 font-heading text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      {empty ? (
        <p className="font-body text-sm text-gray-500 dark:text-gray-400">
          {t('equidadFdm.dashboard.noData')}
        </p>
      ) : (
        children
      )}
    </div>
  );
}

export default DashboardEquidadFdm;
