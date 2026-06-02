import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaTable } from 'react-icons/fa';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { fetchAllSiniestrosExpress } from '../../services/expressService.js';
import Loader from '../Loader.jsx';
import { useTheme } from '../../context/ThemeContext';
import {
  buildOpcionesFiltroResponsable,
  buildOpcionesFiltroAseguradora,
  buildOpcionesFiltroEstado,
  coincideFiltroResponsable,
  coincideFiltroAseguradora,
  coincideFiltroEstado,
  formatCurrency,
  parseDate,
  avisoEnRango,
  useExpressCatalogos,
} from './expressHelpers.js';
import {
  buildPieLegendPayload,
  expressChartCard,
  expressBtnSecondary,
  expressPageWrap,
  expressScope,
  getFenixChartColor,
  getFenixLineChartColors,
} from './expressFenixUi.js';
import {
  Campo,
  ExpressFilterSection,
  ExpressMetricCard,
  ExpressPageHeader,
  InputFenix,
  SelectFenix,
} from './ExpressUiBlocks.jsx';

const DashboardExpress = () => {
  const getMonthSafe = (fecha) => fecha.getUTCMonth() + 1;
  const getYearSafe = (fecha) => fecha.getUTCFullYear();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [siniestros, setSiniestros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filtroResponsable, setFiltroResponsable] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroAseguradora, setFiltroAseguradora] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const {
    catalogoResponsables,
    catalogoAseguradoras,
    catalogoEstados,
    obtenerNombreEstado,
    obtenerNombreAseguradora,
    obtenerNombreResponsable,
  } = useExpressCatalogos();

  useEffect(() => {
    let cancelado = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllSiniestrosExpress();
        setSiniestros(data);
      } catch (err) {
        console.error('Error cargando siniestros express (dashboard):', err);
        if (!cancelado) {
          setError(err.message || 'No fue posible cargar los siniestros Express.');
          setSiniestros([]);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelado = true;
    };
  }, []);

  const filtrosAplicados = Boolean(
    filtroResponsable || filtroEstado || filtroAseguradora || fechaDesde || fechaHasta
  );

  const limpiarFiltros = () => {
    setFiltroResponsable('');
    setFiltroEstado('');
    setFiltroAseguradora('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const siniestrosFiltrados = useMemo(() => {
    return siniestros.filter((item) => {
      let ok = true;
      if (filtroResponsable) {
        ok =
          ok &&
          coincideFiltroResponsable(item.responsable, filtroResponsable, catalogoResponsables);
      }
      if (filtroEstado) {
        ok = ok && coincideFiltroEstado(item.estadoProceso, filtroEstado, catalogoEstados);
      }
      if (filtroAseguradora) {
        ok =
          ok &&
          coincideFiltroAseguradora(item.aseguradora, filtroAseguradora, catalogoAseguradoras);
      }
      if (fechaDesde || fechaHasta) {
        ok = ok && avisoEnRango(item.avisoSiniestro, fechaDesde, fechaHasta);
      }
      return ok;
    });
  }, [siniestros, filtroResponsable, filtroEstado, filtroAseguradora, fechaDesde, fechaHasta, catalogoResponsables, catalogoAseguradoras, catalogoEstados]);

  const totalCasos = siniestrosFiltrados.length;
  const totalIndemnizacion = siniestrosFiltrados.reduce(
    (acumulado, item) => acumulado + (item.valorIndemnizacionNumero || 0),
    0
  );
  const totalReserva = siniestrosFiltrados.reduce(
    (acumulado, item) => acumulado + (item.reservaNumero || 0),
    0
  );
  const casosCerrados = siniestrosFiltrados.filter((item) => {
    const estadoTexto = (obtenerNombreEstado(item.estadoProceso) || item.estadoProceso || '')
      .toString()
      .toLowerCase();
    return estadoTexto.includes('cerr');
  }).length;
  const porcentajeCerrados = totalCasos === 0 ? 0 : Math.round((casosCerrados / totalCasos) * 100);

  const casosPorEstado = useMemo(() => {
    const agrupado = siniestrosFiltrados.reduce((acc, item) => {
      const key = obtenerNombreEstado(item.estadoProceso) || item.estadoProceso || 'Sin estado';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(agrupado).map(([estado, cantidad]) => ({ estado, cantidad }));
  }, [siniestrosFiltrados, obtenerNombreEstado]);

  const casosPorResponsable = useMemo(() => {
    const agrupado = siniestrosFiltrados.reduce((acc, item) => {
      const key = obtenerNombreResponsable(item.responsable) || item.responsable || 'Sin responsable';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(agrupado)
      .map(([responsable, cantidad]) => ({ responsable, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 8);
  }, [siniestrosFiltrados, obtenerNombreResponsable]);

  const casosPorAseguradora = useMemo(() => {
    const agrupado = siniestrosFiltrados.reduce((acc, item) => {
      const key = obtenerNombreAseguradora(item.aseguradora) || item.aseguradora || 'Sin aseguradora';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(agrupado).map(([aseguradora, cantidad]) => ({ aseguradora, cantidad }));
  }, [siniestrosFiltrados, obtenerNombreAseguradora]);

  const tendenciaMensual = useMemo(() => {
    const agrupado = siniestrosFiltrados.reduce((acc, item) => {
      const fecha = parseDate(item.avisoSiniestro) || parseDate(item.createdAt);
      if (!fecha) return acc;
      const clave = `${getYearSafe(fecha)}-${String(getMonthSafe(fecha)).padStart(2, '0')}`;
      if (!acc[clave]) {
        acc[clave] = { mes: clave, casos: 0, indemnizacion: 0, reserva: 0 };
      }
      acc[clave].casos += 1;
      acc[clave].indemnizacion += item.valorIndemnizacionNumero || 0;
      acc[clave].reserva += item.reservaNumero || 0;
      return acc;
    }, {});

    return Object.values(agrupado)
      .sort((a, b) => (a.mes > b.mes ? 1 : -1))
      .slice(-12);
  }, [siniestrosFiltrados]);

  const responsablesUnicos = useMemo(
    () =>
      buildOpcionesFiltroResponsable(siniestros, catalogoResponsables, obtenerNombreResponsable),
    [siniestros, catalogoResponsables, obtenerNombreResponsable]
  );
  const estadosUnicos = useMemo(
    () => buildOpcionesFiltroEstado(siniestros, catalogoEstados, obtenerNombreEstado),
    [siniestros, catalogoEstados, obtenerNombreEstado]
  );
  const aseguradorasUnicas = useMemo(
    () =>
      buildOpcionesFiltroAseguradora(siniestros, catalogoAseguradoras, obtenerNombreAseguradora),
    [siniestros, catalogoAseguradoras, obtenerNombreAseguradora]
  );

  const tooltipStyle = {
    backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF',
    border: `1px solid ${isDark ? '#2D2D2D' : '#E6E6E6'}`,
    color: isDark ? '#F5F5F5' : '#1E1E1E',
    borderRadius: '8px',
  };

  const tickColor = isDark ? '#B0B0B0' : '#6B6B6B';
  const gridStroke = isDark ? '#2D2D2D' : '#E5E7EB';
  const pieStroke = isDark ? '#1A1A1A' : '#FFFFFF';

  const lineColors = getFenixLineChartColors(isDark);

  const leyendaCasosPorEstado = useMemo(
    () => buildPieLegendPayload(casosPorEstado, 'estado', isDark),
    [casosPorEstado, isDark]
  );
  const leyendaCasosPorAseguradora = useMemo(
    () => buildPieLegendPayload(casosPorAseguradora, 'aseguradora', isDark),
    [casosPorAseguradora, isDark]
  );

  const formatoLeyendaPie = (total, labelKey) => (value, entry) => {
    const item = entry?.payload ?? {};
    const etiqueta = item[labelKey] || value || 'Sin nombre';
    const cantidad = item.cantidad ?? 0;
    const pct = total > 0 ? ((cantidad / total) * 100).toFixed(1) : 0;
    return `${etiqueta}: ${cantidad} (${pct}%)`;
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${expressScope} p-4 sm:p-6`}>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`${expressScope} p-4 sm:p-6`}>
      <div className={expressPageWrap}>
        <ExpressPageHeader
          title="Dashboard Express"
          subtitle="Analiza tendencias, responsables, aseguradoras e indemnizaciones de los procesos Express."
          activePath="/express/dashboard"
          actions={
            <Link to="/express/tablero" className={expressBtnSecondary}>
              <FaTable />
              Tablero operativo (Excel)
            </Link>
          }
        />

        <ExpressFilterSection title="Filtros" showClear={filtrosAplicados} onClear={limpiarFiltros}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Campo label="Responsable">
              <SelectFenix value={filtroResponsable} onChange={(e) => setFiltroResponsable(e.target.value)}>
                <option value="">Todos</option>
                {responsablesUnicos.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label="Estado">
              <SelectFenix value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">Todos</option>
                {estadosUnicos.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label="Aseguradora">
              <SelectFenix value={filtroAseguradora} onChange={(e) => setFiltroAseguradora(e.target.value)}>
                <option value="">Todas</option>
                {aseguradorasUnicas.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label="Aviso desde">
              <InputFenix type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </Campo>
            <Campo label="Aviso hasta">
              <InputFenix type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </Campo>
          </div>
        </ExpressFilterSection>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ExpressMetricCard
            label="Casos Express"
            value={totalCasos}
            hint="Total con filtros aplicados"
          />
          <ExpressMetricCard
            label="Valor indemnización"
            value={formatCurrency(totalIndemnizacion)}
            hint="Suma de indemnizaciones"
          />
          <ExpressMetricCard
            label="Reserva acumulada"
            value={formatCurrency(totalReserva)}
            hint="Total de reservas"
          />
          <ExpressMetricCard
            label="% casos cerrados"
            value={`${porcentajeCerrados}%`}
            hint={`${casosCerrados} de ${totalCasos} casos`}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Casos por estado" empty={casosPorEstado.length === 0}>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={casosPorEstado}
                  dataKey="cantidad"
                  nameKey="estado"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={60}
                  stroke={pieStroke}
                  strokeWidth={2}
                >
                  {casosPorEstado.map((entry, index) => (
                    <Cell key={entry.estado} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => {
                    const estado = props.payload?.estado || name;
                    const cantidad = props.payload?.cantidad || value || 0;
                    const pct = totalCasos > 0 ? ((cantidad / totalCasos) * 100).toFixed(1) : 0;
                    return [`${cantidad} casos (${pct}%)`, estado];
                  }}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  payload={leyendaCasosPorEstado}
                  formatter={formatoLeyendaPie(totalCasos, 'estado')}
                  wrapperStyle={{ fontSize: '12px', color: tickColor }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Distribución por aseguradora" empty={casosPorAseguradora.length === 0}>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={casosPorAseguradora}
                  dataKey="cantidad"
                  nameKey="aseguradora"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={60}
                  stroke={pieStroke}
                  strokeWidth={2}
                >
                  {casosPorAseguradora.map((entry, index) => (
                    <Cell key={entry.aseguradora} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => {
                    const nombre = props.payload?.aseguradora || name;
                    const cantidad = props.payload?.cantidad || value || 0;
                    const pct = totalCasos > 0 ? ((cantidad / totalCasos) * 100).toFixed(1) : 0;
                    return [`${cantidad} casos (${pct}%)`, nombre];
                  }}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  payload={leyendaCasosPorAseguradora}
                  formatter={formatoLeyendaPie(totalCasos, 'aseguradora')}
                  wrapperStyle={{ fontSize: '12px', color: tickColor }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Top responsables" empty={casosPorResponsable.length === 0}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={casosPorResponsable} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor }} />
                <YAxis type="category" dataKey="responsable" width={140} tick={{ fill: tickColor }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="cantidad" name="Casos" radius={[0, 4, 4, 0]}>
                  {casosPorResponsable.map((entry, index) => (
                    <Cell key={entry.responsable} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Tendencia mensual" empty={tendenciaMensual.length === 0}>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={tendenciaMensual}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="mes" tick={{ fill: tickColor }} />
                <YAxis yAxisId="left" allowDecimals={false} tick={{ fill: tickColor }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={formatCurrency}
                  tick={{ fill: tickColor }}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'Casos') return [value, 'Casos'];
                    return [
                      formatCurrency(value),
                      name === 'indemnizacion' ? 'Indemnización' : 'Reserva',
                    ];
                  }}
                  contentStyle={tooltipStyle}
                />
                <Legend wrapperStyle={{ color: tickColor }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="casos"
                  name="Casos"
                  stroke={lineColors.casos}
                  strokeWidth={2.5}
                  dot={{ fill: lineColors.casos, r: 3 }}
                  activeDot={{ r: 6, fill: lineColors.casos }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="indemnizacion"
                  name="Indemnización"
                  stroke={lineColors.indemnizacion}
                  strokeWidth={2}
                  dot={{ fill: lineColors.indemnizacion, r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="reserva"
                  name="Reserva"
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
  return (
    <div className={expressChartCard}>
      <h3 className="mb-4 font-heading text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      {empty ? (
        <p className="font-body text-sm text-gray-500 dark:text-gray-400">No hay datos disponibles para mostrar.</p>
      ) : (
        children
      )}
    </div>
  );
}

export default DashboardExpress;
