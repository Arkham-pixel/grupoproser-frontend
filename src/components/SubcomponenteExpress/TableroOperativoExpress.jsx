import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { Link } from 'react-router-dom';
import { FaChartLine, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { fetchAllSiniestrosExpress } from '../../services/expressService.js';
import Loader from '../Loader.jsx';
import { useTheme } from '../../context/ThemeContext';
import {
  parseDate,
  useExpressCatalogos,
} from './expressHelpers.js';
import {
  buildPieLegendPayload,
  expressBtnSecondary,
  expressPageWrap,
  expressScope,
  getFenixChartColor,
} from './expressFenixUi.js';
import { Campo, ExpressPageHeader, SelectFenix } from './ExpressUiBlocks.jsx';
import {
  MESES_EXPRESS,
  buildAsignacionPorAjustador,
  buildConteoHitoPorAjustador,
  buildEstadoPorAjustadorMes,
  buildEstadoTotalAnio,
  etiquetaMesAnio,
  estadosMesToChartData,
  estadosToChartData,
  filtrarPorAnioAviso,
  filtrarPorMesAnioAviso,
} from './expressDashboardStats.js';
import { TablaHitoPorAjustador, TableroPivotTresColumnas } from './ExpressDashboardPivot.jsx';

const TableroOperativoExpress = () => {
  const getMonthSafe = (fecha) => fecha.getMonth() + 1;
  const getYearSafe = (fecha) => fecha.getFullYear();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [siniestros, setSiniestros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [extrasAbiertos, setExtrasAbiertos] = useState(false);

  const ahora = new Date();
  const [mesPivot, setMesPivot] = useState(ahora.getMonth() + 1);
  const [anioPivot, setAnioPivot] = useState(ahora.getFullYear());
  const [anioTotal, setAnioTotal] = useState('TODOS');
  const periodoInicializado = useRef(false);

  const { obtenerNombreEstado, obtenerNombreResponsable } = useExpressCatalogos();

  useEffect(() => {
    let cancelado = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllSiniestrosExpress();
        setSiniestros(data);
      } catch (err) {
        if (!cancelado) {
          setError(err.message || 'No fue posible cargar los datos.');
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

  useEffect(() => {
    if (periodoInicializado.current || siniestros.length === 0) return;
    let fechaMax = null;
    for (const item of siniestros) {
      const fecha = parseDate(item.avisoSiniestro);
      if (fecha && (!fechaMax || fecha > fechaMax)) fechaMax = fecha;
    }
    if (fechaMax) {
      setMesPivot(getMonthSafe(fechaMax));
      setAnioPivot(getYearSafe(fechaMax));
    }
    periodoInicializado.current = true;
  }, [siniestros]);

  const aniosDisponibles = useMemo(() => {
    const set = new Set();
    siniestros.forEach((item) => {
      const fecha = parseDate(item.avisoSiniestro) || parseDate(item.createdAt);
      if (fecha) set.add(getYearSafe(fecha));
    });
    const lista = [...set].sort((a, b) => b - a);
    return ['TODOS', ...(lista.length > 0 ? lista : [anioPivot])];
  }, [siniestros, anioPivot]);

  const casosMesPivot = useMemo(
    () => filtrarPorMesAnioAviso(siniestros, mesPivot, anioPivot),
    [siniestros, mesPivot, anioPivot]
  );

  const casosAnioTotal = useMemo(
    () => filtrarPorAnioAviso(siniestros, anioTotal),
    [siniestros, anioTotal]
  );

  const tablaAsignacionMes = useMemo(
    () => buildAsignacionPorAjustador(casosMesPivot, obtenerNombreResponsable),
    [casosMesPivot, obtenerNombreResponsable]
  );

  const tablaEstadoMes = useMemo(
    () => buildEstadoPorAjustadorMes(casosMesPivot, obtenerNombreResponsable, obtenerNombreEstado),
    [casosMesPivot, obtenerNombreResponsable, obtenerNombreEstado]
  );

  const tablaEstadoAnio = useMemo(
    () => buildEstadoTotalAnio(casosAnioTotal, obtenerNombreEstado),
    [casosAnioTotal, obtenerNombreEstado]
  );

  const casosCifrasMes = useMemo(
    () =>
      siniestros.filter((item) => {
        const fecha = parseDate(item.fechaPresentacionCifras);
        return (
          fecha &&
          getMonthSafe(fecha) === Number(mesPivot) &&
          getYearSafe(fecha) === Number(anioPivot)
        );
      }),
    [siniestros, mesPivot, anioPivot]
  );

  const casosFiniquitoMes = useMemo(
    () =>
      siniestros.filter((item) => {
        const fecha = parseDate(item.fechaFiniquitosFirmado);
        return (
          fecha &&
          getMonthSafe(fecha) === Number(mesPivot) &&
          getYearSafe(fecha) === Number(anioPivot)
        );
      }),
    [siniestros, mesPivot, anioPivot]
  );

  const tablaCifrasMes = useMemo(
    () =>
      buildConteoHitoPorAjustador(casosCifrasMes, 'fechaPresentacionCifras', obtenerNombreResponsable),
    [casosCifrasMes, obtenerNombreResponsable]
  );

  const tablaFiniquitoMes = useMemo(
    () =>
      buildConteoHitoPorAjustador(casosFiniquitoMes, 'fechaFiniquitosFirmado', obtenerNombreResponsable),
    [casosFiniquitoMes, obtenerNombreResponsable]
  );

  const chartEstadosMes = useMemo(
    () => estadosMesToChartData(tablaEstadoMes.grupos),
    [tablaEstadoMes.grupos]
  );

  const chartEstadosAnio = useMemo(
    () => estadosToChartData(tablaEstadoAnio.filas),
    [tablaEstadoAnio.filas]
  );

  const etiquetaPeriodoMes = etiquetaMesAnio(mesPivot, anioPivot);
  const etiquetaAnioTotal = anioTotal === 'TODOS' ? 'general' : anioTotal;

  const tickColor = isDark ? '#B0B0B0' : '#6B6B6B';
  const pieStroke = isDark ? '#1A1A1A' : '#FFFFFF';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF',
    border: `1px solid ${isDark ? '#2D2D2D' : '#E6E6E6'}`,
    color: isDark ? '#F5F5F5' : '#1E1E1E',
    borderRadius: '8px',
    fontSize: '12px',
  };

  const totalChartMes = chartEstadosMes.reduce((s, i) => s + i.cantidad, 0);
  const totalChartAnio = chartEstadosAnio.reduce((s, i) => s + i.cantidad, 0);

  const leyendaEstadosMes = useMemo(
    () => buildPieLegendPayload(chartEstadosMes, 'estado', isDark),
    [chartEstadosMes, isDark]
  );
  const leyendaEstadosAnio = useMemo(
    () => buildPieLegendPayload(chartEstadosAnio, 'estado', isDark),
    [chartEstadosAnio, isDark]
  );

  const formatoLeyendaPie = (total, labelKey) => (value, entry) => {
    const item = entry?.payload ?? {};
    const etiqueta = item[labelKey] || value || '';
    const cantidad = item.cantidad ?? 0;
    const pct = total > 0 ? ((cantidad / total) * 100).toFixed(1) : 0;
    return `${etiqueta}: ${cantidad} (${pct}%)`;
  };

  if (loading) {
    return (
      <div className="p-4">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${expressScope} p-4`}>
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      </div>
    );
  }

  return (
    <div className={`${expressScope} p-3 sm:p-4`}>
      <div className={`${expressPageWrap} max-w-6xl`}>
        <ExpressPageHeader
          badge="Express"
          title="Tablero operativo"
          subtitle="Vista compacta tipo Excel: tres tablas en paralelo."
          activePath="/express/tablero"
          actions={
            <Link to="/express/dashboard" className={`${expressBtnSecondary} !py-2 !text-xs`}>
              <FaChartLine />
              Dashboard
            </Link>
          }
        />

        <div className="mb-3 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-[#1A1A1A]">
          <Campo label="Mes" className="!mb-0 min-w-[7rem]">
            <SelectFenix
              className="!py-1.5 !text-xs"
              value={mesPivot}
              onChange={(e) => setMesPivot(Number(e.target.value))}
            >
              {MESES_EXPRESS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <Campo label="Año mes" className="!mb-0 min-w-[5.5rem]">
            <SelectFenix
              className="!py-1.5 !text-xs"
              value={anioPivot}
              onChange={(e) => setAnioPivot(Number(e.target.value))}
            >
              {aniosDisponibles.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <Campo label="Año total" className="!mb-0 min-w-[5.5rem]">
            <SelectFenix
              className="!py-1.5 !text-xs"
              value={anioTotal}
              onChange={(e) =>
                setAnioTotal(e.target.value === 'TODOS' ? 'TODOS' : Number(e.target.value))
              }
            >
              {aniosDisponibles.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <p className="ml-auto font-body text-xs text-gray-500 dark:text-gray-400">
            Mes: <strong className="text-gray-800 dark:text-gray-200">{tablaAsignacionMes.granTotal}</strong>
            {' · '}
            Año: <strong className="text-gray-800 dark:text-gray-200">{tablaEstadoAnio.granTotal}</strong>
          </p>
        </div>

        <TableroPivotTresColumnas
          tablaAsignacion={tablaAsignacionMes}
          tablaEstadoMes={tablaEstadoMes}
          tablaEstadoAnio={tablaEstadoAnio}
          tituloAsignacion={`Asignación por ajustador en ${etiquetaPeriodoMes}`}
          tituloEstadoMes={`Estado casos asignados en ${etiquetaPeriodoMes} por ajustador`}
          tituloEstadoAnio={`Estado actual del total de casos ${etiquetaAnioTotal}`}
        />

        <p className="mt-2 font-body text-[10px] text-gray-500 dark:text-gray-400">
          ▶ en la primera tabla despliega el detalle por fecha de aviso.
        </p>

        <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setExtrasAbiertos((v) => !v)}
            className="flex w-full items-center gap-2 font-body text-sm font-semibold text-gray-700 hover:text-fenix-primario dark:text-gray-300"
          >
            {extrasAbiertos ? <FaChevronDown /> : <FaChevronRight />}
            Gráficos y hitos del mes (opcional)
          </button>

          {extrasAbiertos && (
            <div className="mt-3 space-y-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <MiniChart
                  title={`Estados — ${etiquetaPeriodoMes}`}
                  data={chartEstadosMes}
                  total={totalChartMes}
                  leyenda={leyendaEstadosMes}
                  isDark={isDark}
                  pieStroke={pieStroke}
                  tickColor={tickColor}
                  tooltipStyle={tooltipStyle}
                  formatoLeyenda={formatoLeyendaPie(totalChartMes, 'estado')}
                />
                <MiniChart
                  title={`Estados — año ${anioTotal}`}
                  data={chartEstadosAnio}
                  total={totalChartAnio}
                  leyenda={leyendaEstadosAnio}
                  isDark={isDark}
                  pieStroke={pieStroke}
                  tickColor={tickColor}
                  tooltipStyle={tooltipStyle}
                  formatoLeyenda={formatoLeyendaPie(totalChartAnio, 'estado')}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <TablaHitoPorAjustador
                  titulo={`Presentación cifras — ${etiquetaPeriodoMes}`}
                  datos={tablaCifrasMes}
                />
                <TablaHitoPorAjustador
                  titulo={`Finiquitos firmados — ${etiquetaPeriodoMes}`}
                  datos={tablaFiniquitoMes}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function MiniChart({
  title,
  data,
  total,
  leyenda,
  isDark,
  pieStroke,
  tickColor,
  tooltipStyle,
  formatoLeyenda,
}) {
  const [animateIn, setAnimateIn] = useState(true);
  const hasData = Boolean(data?.length);

  const dataSignature = useMemo(
    () => (data || []).map((item) => `${item.estado}:${item.cantidad}`).join('|'),
    [data]
  );

  useEffect(() => {
    if (!hasData) return undefined;
    setAnimateIn(false);
    const t = setTimeout(() => setAnimateIn(true), 24);
    return () => clearTimeout(t);
  }, [dataSignature, hasData]);

  if (!hasData) {
    return (
      <div className="rounded border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-[#1A1A1A]">
        <p className="font-body text-xs font-semibold text-gray-700 dark:text-gray-300">{title}</p>
        <p className="mt-2 font-body text-xs text-gray-500">Sin datos</p>
      </div>
    );
  }

  const darkenHex = (hex, factor = 0.72) => {
    const clean = String(hex || '#999999').replace('#', '');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
    const n = Number.parseInt(full, 16);
    if (Number.isNaN(n)) return hex;
    const r = Math.max(0, Math.min(255, Math.floor(((n >> 16) & 255) * factor)));
    const g = Math.max(0, Math.min(255, Math.floor(((n >> 8) & 255) * factor)));
    const b = Math.max(0, Math.min(255, Math.floor((n & 255) * factor)));
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  };

  const depthLayers = 8;
  const muchosItems = data.length > 5;

  return (
    <div className="rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-[#1A1A1A]">
      <p className="mb-1 px-1 font-body text-xs font-semibold text-gray-800 dark:text-gray-200">{title}</p>
      <div
        style={{
          opacity: animateIn ? 1 : 0,
          transform: animateIn ? 'translateX(0) scale(1)' : 'translateX(14px) scale(0.98)',
          transition: 'opacity 320ms ease, transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <ResponsiveContainer width="100%" height={muchosItems ? 190 : 220}>
          <PieChart>
            {Array.from({ length: depthLayers }).map((_, layer) => (
              <Pie
                key={`depth-${layer}`}
                data={data}
                dataKey="cantidad"
                nameKey="estado"
                cx="50%"
                cy={`${50 + layer * 0.45}%`}
                outerRadius={muchosItems ? 62 : 72}
                innerRadius={0}
                paddingAngle={1}
                minAngle={2}
                stroke="none"
                isAnimationActive={false}
                style={{ transform: 'scaleY(0.72)', transformOrigin: 'center center' }}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`${entry.estado}-depth-${layer}`}
                    fill={darkenHex(getFenixChartColor(index, isDark), 0.62)}
                  />
                ))}
              </Pie>
            ))}
            <Pie
              data={data}
              dataKey="cantidad"
              nameKey="estado"
              cx="50%"
              cy="50%"
              outerRadius={muchosItems ? 62 : 72}
              innerRadius={0}
              paddingAngle={1}
              minAngle={2}
              stroke={pieStroke}
              strokeWidth={1}
              isAnimationActive
              animationDuration={550}
              animationEasing="ease-out"
              style={{ transform: 'scaleY(0.72)', transformOrigin: 'center center' }}
            >
              {data.map((entry, index) => (
                <Cell key={entry.estado} fill={getFenixChartColor(index, isDark)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name, payload) => {
                const cantidad = Number(value) || 0;
                const pct = total > 0 ? ((cantidad / total) * 100).toFixed(1) : '0.0';
                return [`${cantidad} (${pct}%)`, payload?.payload?.estado || name];
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <ul
          className={`mt-2 grid gap-x-3 gap-y-1 px-1 ${
            muchosItems ? 'max-h-44 grid-cols-1 overflow-y-auto sm:grid-cols-2' : 'grid-cols-1'
          }`}
          aria-label={`Leyenda: ${title}`}
        >
          {leyenda.map((entry) => (
            <li
              key={entry.value}
              className="flex min-w-0 items-start gap-1.5 font-body leading-snug"
              style={{ fontSize: '10px', color: tickColor }}
            >
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden
              />
              <span className="min-w-0 break-words">{formatoLeyenda(entry.value, entry)}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-1 px-1 font-body text-[11px] font-semibold" style={{ color: tickColor }}>
        Total: {total}
      </p>
    </div>
  );
}

export default TableroOperativoExpress;
