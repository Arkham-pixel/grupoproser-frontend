import React, { useEffect, useMemo, useState } from 'react';
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
  fechaEnRango,
  formatCurrency,
  parseDate,
} from './equidadFdmHelpers.js';
import {
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

const DashboardEquidadFdm = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroAjustador, setFiltroAjustador] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
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
          setError(err.message || 'No fue posible cargar los casos Equidad FDM.');
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
  }, []);

  const filtrosAplicados = Boolean(
    filtroMunicipio || filtroAjustador || filtroEstado || fechaDesde || fechaHasta
  );

  const limpiarFiltros = () => {
    setFiltroMunicipio('');
    setFiltroAjustador('');
    setFiltroEstado('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const casosFiltrados = useMemo(() => {
    return casos.filter((item) => {
      if (filtroMunicipio && !coincideFiltroTexto(item.municipio, filtroMunicipio)) return false;
      if (filtroAjustador && !coincideFiltroTexto(item.ajustador, filtroAjustador)) return false;
      if (filtroEstado && !coincideFiltroTexto(item.estado, filtroEstado)) return false;
      if (fechaDesde || fechaHasta) {
        return fechaEnRango(
          item.fechaLiquidacion || item.fechaAviso || item.createdAt,
          fechaDesde,
          fechaHasta
        );
      }
      return true;
    });
  }, [casos, filtroMunicipio, filtroAjustador, filtroEstado, fechaDesde, fechaHasta]);

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
      const key = String(item.municipio || 'Sin municipio').trim().toUpperCase() || 'SIN MUNICIPIO';
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
          title="Dashboard Equidad FDM"
          subtitle="Indicadores de los casos de Fundación de la Mujer: estados, municipios, ajustadores y valores liquidados."
          activePath="/equidad-fdm/dashboard"
        />

        <ExpressFilterSection title="Filtros" showClear={filtrosAplicados} onClear={limpiarFiltros}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Campo label="Municipio">
              <SelectFenix value={filtroMunicipio} onChange={(e) => setFiltroMunicipio(e.target.value)}>
                <option value="">Todos</option>
                {municipiosUnicos.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label="Ajustador">
              <SelectFenix value={filtroAjustador} onChange={(e) => setFiltroAjustador(e.target.value)}>
                <option value="">Todos</option>
                {ajustadoresUnicos.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label="Estado">
              <SelectFenix value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">Todos</option>
                {estadosUnicos.map((es) => (
                  <option key={es.value} value={es.value}>
                    {es.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label="Fecha desde">
              <InputFenix type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </Campo>
            <Campo label="Fecha hasta">
              <InputFenix type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </Campo>
          </div>
        </ExpressFilterSection>

        <section className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ExpressMetricCard label="Casos FDM" value={totalCasos} hint="Total con filtros aplicados" />
          <ExpressMetricCard
            label="Total pérdida"
            value={formatCurrency(totalPerdida)}
            hint="Suma de pérdidas reportadas"
          />
          <ExpressMetricCard
            label="Total liquidado"
            value={formatCurrency(totalLiquidado)}
            hint={`Indemnizado: ${formatCurrency(totalIndemnizado)}`}
          />
          <ExpressMetricCard
            label="% casos liquidados"
            value={`${porcentajeLiquidados}%`}
            hint={`${casosLiquidados} de ${totalCasos} casos`}
          />
        </section>

        <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <ChartCard title="Casos por estado" empty={casosPorEstado.length === 0}>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={casosPorEstado}
                  dataKey="cantidad"
                  nameKey="estado"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label={({ estado, cantidad }) => `${truncarEtiqueta(estado, 18)} (${cantidad})`}
                >
                  {casosPorEstado.map((entry, index) => (
                    <Cell key={entry.estado} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Casos por municipio" empty={casosPorMunicipio.length === 0}>
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
                  width={160}
                  tick={{ fill: tickColor, fontSize: 10 }}
                  tickFormatter={(v) => truncarEtiqueta(v, 28)}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="cantidad" name="Casos" radius={[0, 4, 4, 0]}>
                  {casosPorMunicipio.map((entry, index) => (
                    <Cell key={entry.municipio} fill={getFenixChartColor(index, isDark)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
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
                    return [formatCurrency(value), name];
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
                  dataKey="liquidado"
                  name="Liquidado"
                  stroke={lineColors.indemnizacion}
                  strokeWidth={2}
                  dot={{ fill: lineColors.indemnizacion, r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="perdida"
                  name="Pérdida"
                  stroke={lineColors.reserva}
                  strokeWidth={2}
                  dot={{ fill: lineColors.reserva, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        <section className="grid w-full min-w-0 grid-cols-1 gap-4">
          <ChartCard title="Casos por ajustador" empty={casosPorAjustador.length === 0}>
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
                  width={160}
                  tick={{ fill: tickColor, fontSize: 10 }}
                  tickFormatter={(v) => truncarEtiqueta(v, 28)}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="cantidad" name="Casos" radius={[0, 4, 4, 0]}>
                  {casosPorAjustador.map((entry, index) => (
                    <Cell key={entry.ajustador} fill={getFenixChartColor(index, isDark)} />
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
        <p className="font-body text-sm text-gray-500 dark:text-gray-400">
          No hay datos disponibles para mostrar.
        </p>
      ) : (
        children
      )}
    </div>
  );
}

export default DashboardEquidadFdm;
