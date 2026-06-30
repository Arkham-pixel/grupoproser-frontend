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

const expressDashboardRoot =
  'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F]';

const truncarEtiqueta = (valor, max = 28) => {
  const texto = String(valor ?? '').trim();
  if (!texto) return 'Sin nombre';
  return texto.length > max ? `${texto.slice(0, max - 3)}...` : texto;
};

const DashboardExpress = () => {
  const getMonthSafe = (fecha) => fecha.getMonth() + 1;
  const getYearSafe = (fecha) => fecha.getFullYear();
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
    loadingCatalogos,
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

  const casosPorAseguradora = useMemo(() => {
    const agrupado = siniestrosFiltrados.reduce((acc, item) => {
      const key = obtenerNombreAseguradora(item.aseguradora) || item.aseguradora || 'Sin aseguradora';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(agrupado)
      .map(([aseguradora, cantidad]) => ({ aseguradora, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
  }, [siniestrosFiltrados, obtenerNombreAseguradora]);

  const casosPorEstado = useMemo(() => {
    const agrupado = siniestrosFiltrados.reduce((acc, item) => {
      const key = obtenerNombreEstado(item.estadoProceso) || item.estadoProceso || 'Sin estado';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(agrupado)
      .map(([estado, cantidad]) => ({ estado, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
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
      .slice(0, 10);
  }, [siniestrosFiltrados, obtenerNombreResponsable]);

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

  const lineColors = getFenixLineChartColors(isDark);

  if (loading || loadingCatalogos) {
    return (
      <div className={`${expressDashboardRoot} p-4 sm:p-6`}>
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${expressDashboardRoot} ${expressScope} p-4 sm:p-6`}>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`${expressDashboardRoot} ${expressScope} p-4 sm:p-6`}>
      <div className={`${expressPageWrap} min-w-0`}>
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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

        <section className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <section className="grid w-full min-w-0 grid-cols-1 gap-4">
          <ChartCard title="Tendencia mensual" empty={tendenciaMensual.length === 0}>
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
                    if (name === 'Casos') return [value, 'Casos'];
                    return [
                      formatCurrency(value),
                      name === 'Indemnización' ? 'Indemnización' : 'Reserva',
                    ];
                  }}
                  contentStyle={tooltipStyle}
                />
                <Legend wrapperStyle={{ color: tickColor, fontSize: '12px' }} />
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

        <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <ChartCard title="Casos por estado" empty={casosPorEstado.length === 0}>
            <ResponsiveContainer width="100%" height={Math.max(320, casosPorEstado.length * 34)}>
              <BarChart
                data={casosPorEstado}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="estado"
                  width={150}
                  tick={{ fill: tickColor, fontSize: 10 }}
                  tickFormatter={(v) => truncarEtiqueta(v, 28)}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="cantidad" name="Casos" radius={[0, 4, 4, 0]}>
                  {casosPorEstado.map((entry, index) => (
                    <Cell key={entry.estado} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Distribución por aseguradora" empty={casosPorAseguradora.length === 0}>
            <ResponsiveContainer
              width="100%"
              height={Math.max(320, casosPorAseguradora.length * 34)}
            >
              <BarChart
                data={casosPorAseguradora}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="aseguradora"
                  width={150}
                  tick={{ fill: tickColor, fontSize: 10 }}
                  tickFormatter={(v) => truncarEtiqueta(v, 28)}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="cantidad" name="Casos" radius={[0, 4, 4, 0]}>
                  {casosPorAseguradora.map((entry, index) => (
                    <Cell key={entry.aseguradora} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        <section className="grid w-full min-w-0 grid-cols-1 gap-4">
          <ChartCard title="Top responsables" empty={casosPorResponsable.length === 0}>
            <ResponsiveContainer
              width="100%"
              height={Math.max(320, casosPorResponsable.length * 36)}
            >
              <BarChart
                data={casosPorResponsable}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="responsable"
                  width={160}
                  tick={{ fill: tickColor, fontSize: 10 }}
                  tickFormatter={(v) => truncarEtiqueta(v, 28)}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="cantidad" name="Casos" radius={[0, 4, 4, 0]}>
                  {casosPorResponsable.map((entry, index) => (
                    <Cell key={entry.responsable} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>
      </div>
    </div>
  );
};

function ChartCard({ title, empty, children }) {
  return (
    <div className={`${expressChartCard} min-w-0`}>
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
