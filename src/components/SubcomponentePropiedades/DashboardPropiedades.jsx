import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { fetchAllCasosPropiedades } from '../../services/propiedadesService.js';
import Loader from '../Loader.jsx';
import { useTheme } from '../../context/ThemeContext';
import {
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
} from './propiedadesHelpers.js';
import {
  expressChartCard,
  expressPageWrap,
  expressScope,
  getFenixChartColor,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  Campo,
  ExpressFilterSection,
  ExpressMetricCard,
  InputFenix,
  SelectFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { PropiedadesPageHeader } from './PropiedadesUiBlocks.jsx';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F]';

const truncarEtiqueta = (valor, max = 28) => {
  const texto = String(valor ?? '').trim();
  if (!texto) return 'Sin dato';
  return texto.length > max ? `${texto.slice(0, max - 3)}...` : texto;
};

const DashboardPropiedades = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroClase, setFiltroClase] = useState('');
  const [filtroResponsable, setFiltroResponsable] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    let cancelado = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllCasosPropiedades();
        if (!cancelado) setCasos(data);
      } catch (err) {
        console.error('Error cargando dashboard Propiedades:', err);
        if (!cancelado) {
          setError(err.message || 'No fue posible cargar los casos.');
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

  const limpiarFiltros = () => {
    setFiltroCiudad('');
    setFiltroClase('');
    setFiltroResponsable('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const filtrados = useMemo(() => {
    return casos.filter((item) => {
      if (filtroCiudad && !coincideFiltroTexto(item.ciudad, filtroCiudad)) return false;
      if (filtroClase && !coincideFiltroTexto(item.claseInmueble, filtroClase)) return false;
      if (filtroResponsable && !coincideFiltroTexto(item.responsable, filtroResponsable)) {
        return false;
      }
      if (fechaDesde || fechaHasta) {
        return fechaEnRango(item.fechaSolicitud || item.createdAt, fechaDesde, fechaHasta);
      }
      return true;
    });
  }, [casos, filtroCiudad, filtroClase, filtroResponsable, fechaDesde, fechaHasta]);

  const total = filtrados.length;
  const conInspeccion = filtrados.filter((i) => Boolean(i.inspeccionId)).length;
  const sinInspeccion = total - conInspeccion;
  const pctInspeccion = total === 0 ? 0 : Math.round((conInspeccion / total) * 100);

  const porClase = useMemo(() => {
    const agrupado = filtrados.reduce((acc, item) => {
      const key = String(item.claseInmueble || 'Sin clase').trim() || 'Sin clase';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(agrupado)
      .map(([clase, cantidad]) => ({ clase, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [filtrados]);

  const porCiudad = useMemo(() => {
    const agrupado = filtrados.reduce((acc, item) => {
      const key = String(item.ciudad || 'Sin ciudad').trim() || 'Sin ciudad';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(agrupado)
      .map(([ciudad, cantidad]) => ({ ciudad, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
  }, [filtrados]);

  const porInspeccion = useMemo(
    () => [
      { estado: 'Con inspección', cantidad: conInspeccion },
      { estado: 'Sin inspección', cantidad: sinInspeccion },
    ],
    [conInspeccion, sinInspeccion]
  );

  const opcionesCiudad = useMemo(() => buildOpcionesFiltro(casos, 'ciudad'), [casos]);
  const opcionesClase = useMemo(() => buildOpcionesFiltro(casos, 'claseInmueble'), [casos]);
  const opcionesResponsable = useMemo(
    () => buildOpcionesFiltro(casos, 'responsable'),
    [casos]
  );

  if (loading) {
    return (
      <div className={`${expressScope} ${root} flex items-center justify-center p-10`}>
        <Loader />
      </div>
    );
  }

  return (
    <div className={`${expressScope} ${root} p-4 sm:p-6`}>
      <div className={`${expressPageWrap} space-y-6`}>
        <PropiedadesPageHeader
          title="Dashboard Propiedades"
          subtitle="Resumen de casos del módulo. La inspección se diligencia desde el reporte."
          activePath="/propiedades/dashboard"
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <ExpressFilterSection
          title="Filtros"
          onClear={limpiarFiltros}
          showClear={Boolean(
            filtroCiudad || filtroClase || filtroResponsable || fechaDesde || fechaHasta
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Campo label="Ciudad">
              <SelectFenix value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)}>
                <option value="">Todas</option>
                {opcionesCiudad.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label="Clase de inmueble">
              <SelectFenix value={filtroClase} onChange={(e) => setFiltroClase(e.target.value)}>
                <option value="">Todas</option>
                {opcionesClase.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label="Responsable">
              <SelectFenix
                value={filtroResponsable}
                onChange={(e) => setFiltroResponsable(e.target.value)}
              >
                <option value="">Todos</option>
                {opcionesResponsable.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label="Desde">
              <InputFenix
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </Campo>
            <Campo label="Hasta">
              <InputFenix
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </Campo>
          </div>
        </ExpressFilterSection>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ExpressMetricCard label="Total casos" value={String(total)} />
          <ExpressMetricCard label="Con inspección" value={String(conInspeccion)} />
          <ExpressMetricCard label="Sin inspección" value={String(sinInspeccion)} />
          <ExpressMetricCard label="% inspeccionados" value={`${pctInspeccion}%`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className={expressChartCard}>
            <h3 className="mb-3 font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
              Por clase de inmueble
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porClase}>
                  <XAxis
                    dataKey="clase"
                    tickFormatter={(v) => truncarEtiqueta(v, 12)}
                    stroke={isDark ? '#9CA3AF' : '#6B7280'}
                    fontSize={11}
                  />
                  <YAxis allowDecimals={false} stroke={isDark ? '#9CA3AF' : '#6B7280'} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                    {porClase.map((_, idx) => (
                      <Cell key={idx} fill={getFenixChartColor(idx, isDark)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={expressChartCard}>
            <h3 className="mb-3 font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
              Por ciudad (top 10)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porCiudad} layout="vertical" margin={{ left: 24 }}>
                  <XAxis type="number" allowDecimals={false} stroke={isDark ? '#9CA3AF' : '#6B7280'} />
                  <YAxis
                    type="category"
                    dataKey="ciudad"
                    width={100}
                    tickFormatter={(v) => truncarEtiqueta(v, 14)}
                    stroke={isDark ? '#9CA3AF' : '#6B7280'}
                    fontSize={11}
                  />
                  <Tooltip />
                  <Bar dataKey="cantidad" radius={[0, 6, 6, 0]}>
                    {porCiudad.map((_, idx) => (
                      <Cell key={idx} fill={getFenixChartColor(idx + 2, isDark)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`${expressChartCard} lg:col-span-2`}>
            <h3 className="mb-3 font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
              Estado de inspección
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={porInspeccion}
                    dataKey="cantidad"
                    nameKey="estado"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {porInspeccion.map((entry, idx) => (
                      <Cell key={entry.estado} fill={getFenixChartColor(idx, isDark)} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPropiedades;
