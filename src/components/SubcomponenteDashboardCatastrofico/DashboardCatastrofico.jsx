import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FaChartLine } from 'react-icons/fa';
import Loader from '../Loader.jsx';
import { useTheme } from '../../context/ThemeContext';
import { filtrarCasosPorAsignacionUsuario } from '../../utils/permisosCasoPorRol.js';
import { filtrarCatalogoPorModulo } from '../../utils/catalogosAsignacionCatastrofico.js';
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
import EstadoFranjas, { ResumenGerencial, TarjetaSumaBloque } from './EstadoFranjas.jsx';

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
  coincideFiltroCiudad,
  buildOpcionesFiltro,
  estados = ESTADOS_EMBUDO_CATASTROFICO,
  estadosGestion = null,
  i18nNs,
  boletinPath,
  extras = {},
  variant = 'cat',
  title,
  subtitle,
  modulo = '',
  normalizarEstadoFn,
  normalizarEstadoGestionFn,
  esCasoActivoFn = null,
  filtroPorAjustador = null,
  chartTitleByAdjuster = null,
  chartSeriesByAdjuster = null,
  chartTitleByInspector = null,
  chartSeriesByInspector = null,
  kpiActivosHint = null,
  filtroEstadoControlado,
  onFiltroEstadoChange,
  filtroEstadoGestionControlado,
  onFiltroEstadoGestionChange,
  mostrarVistaGerencial = true,
  mostrarFranjasEstado = true,
  /** Franjas debajo de «Estados de cartera» (ej. estados facilitador Sura). */
  franjasExtra = null,
  /** Gráfica de barras al lado de «Casos por estado» (reemplaza ciudad en esa fila). */
  chartBesideStatus = null,
  /**
   * Bloques de suma independientes (ej. cerrados Sura).
   * [{ id, titulo, subtitulo, estados: string[] }]
   */
  bloquesSuma = null,
  /** Tarjetas ya calculadas (ej. facilitador) además de bloquesSuma. */
  tarjetasSumaExtra = null,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const td = (key, opts) => t(`catastroficoDashboard.${key}`, opts);
  const esListado = variant === 'listado';
  const esBbvaCat = String(modulo || '')
    .toLowerCase()
    .replace(/[-_\s]/g, '')
    .includes('bbva');
  const esZurich =
    String(i18nNs || '').toLowerCase() === 'zurich' ||
    String(modulo || '')
      .toLowerCase()
      .includes('zurich');
  /** Vista gerencial / franjas: todos los CAT menos BBVA. Zurich CAT las apaga por props; el Dashboard listado las enciende. */
  const excluirVistaGerencial = esBbvaCat;
  const verVistaGerencial = mostrarVistaGerencial && !excluirVistaGerencial;
  const verFranjasEstado = mostrarFranjasEstado && !excluirVistaGerencial;

  const [casos, setCasos] = useState([]);
  const [mapaNombres, setMapaNombres] = useState(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroEstadoInterno, setFiltroEstadoInterno] = useState('');
  const [filtroEstadoGestionInterno, setFiltroEstadoGestionInterno] = useState('');
  const [filtroAjustador, setFiltroAjustador] = useState('');
  const [filtroInspector, setFiltroInspector] = useState('');
  const [filtroTomador, setFiltroTomador] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [tipoFecha, setTipoFecha] = useState('ingreso');
  const coincideCiudad = coincideFiltroCiudad || coincideFiltroTexto;

  const filtroEstado =
    filtroEstadoControlado !== undefined ? filtroEstadoControlado : filtroEstadoInterno;
  const setFiltroEstado = (valor) => {
    const next = valor ?? '';
    if (filtroEstadoControlado === undefined) setFiltroEstadoInterno(next);
    onFiltroEstadoChange?.(next);
  };

  const filtroEstadoGestion =
    filtroEstadoGestionControlado !== undefined
      ? filtroEstadoGestionControlado
      : filtroEstadoGestionInterno;
  const setFiltroEstadoGestion = (valor) => {
    const next = valor ?? '';
    if (filtroEstadoGestionControlado === undefined) setFiltroEstadoGestionInterno(next);
    onFiltroEstadoGestionChange?.(next);
  };

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
        setCasos(filtrarCasosPorAsignacionUsuario(data, { modulo }));
        const jsonResp = resResp?.ok ? await resResp.json().catch(() => []) : [];
        const jsonAj = resAj?.ok ? await resAj.json().catch(() => []) : [];
        const jsonIns = resIns?.ok ? await resIns.json().catch(() => []) : [];
        setMapaNombres(
          construirMapaNombresPersona([
            ...listaDesdeApi(jsonResp),
            ...filtrarCatalogoPorModulo(listaDesdeApi(jsonAj), modulo),
            ...filtrarCatalogoPorModulo(listaDesdeApi(jsonIns), modulo),
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
  }, [fetchCasos, t, modulo]);

  const filtrosAplicados = Boolean(
    filtroCiudad ||
      filtroEstado ||
      filtroEstadoGestion ||
      filtroAjustador ||
      filtroInspector ||
      filtroTomador ||
      fechaDesde ||
      fechaHasta
  );

  const limpiarFiltros = () => {
    setFiltroCiudad('');
    setFiltroEstado('');
    setFiltroEstadoGestion('');
    setFiltroAjustador('');
    setFiltroInspector('');
    setFiltroTomador('');
    setFechaDesde('');
    setFechaHasta('');
    setTipoFecha('ingreso');
  };

  const casosFiltrados = useMemo(
    () =>
      casos.filter((item) => {
        if (filtroCiudad && !coincideCiudad(item.ciudad, filtroCiudad)) return false;
        if (filtroEstado) {
          const estado =
            typeof normalizarEstadoFn === 'function'
              ? (() => {
                  try {
                    return normalizarEstadoFn(item.estado, item);
                  } catch {
                    return normalizarEstadoFn(item.estado);
                  }
                })()
              : item.estado;
          if (!coincideFiltroTexto(estado, filtroEstado)) return false;
        }
        if (filtroEstadoGestion) {
          const estadoG =
            typeof normalizarEstadoGestionFn === 'function'
              ? (() => {
                  try {
                    return normalizarEstadoGestionFn(item.estadoGestion || item.estado, item);
                  } catch {
                    return normalizarEstadoGestionFn(item.estadoGestion || item.estado);
                  }
                })()
              : item.estadoGestion || item.estado;
          if (!coincideFiltroTexto(estadoG, filtroEstadoGestion)) return false;
        }
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
          const fechaRef =
            esZurich && tipoFecha === 'fechaCoordinandoInspeccion'
              ? item.fechaCoordinandoInspeccion
              : item.fechaAviso || item.fechaSiniestro || item.createdAt;
          return fechaEnRango(fechaRef, fechaDesde, fechaHasta);
        }
        return true;
      }),
    [
      casos,
      filtroCiudad,
      filtroEstado,
      filtroEstadoGestion,
      filtroAjustador,
      filtroInspector,
      filtroTomador,
      fechaDesde,
      fechaHasta,
      tipoFecha,
      coincideFiltroTexto,
      coincideCiudad,
      fechaEnRango,
      mapaNombres,
      normalizarEstadoFn,
      normalizarEstadoGestionFn,
      esZurich,
    ]
  );

  const stats = useMemo(
    () =>
      construirDashboardCatastrofico(casosFiltrados, {
        estadosOrden: estados,
        mapaNombres,
        normalizarEstadoFn,
        estadosGestionOrden: estadosGestion,
        normalizarEstadoGestionFn,
        esCasoActivoFn,
        filtroPorAjustador,
      }),
    [
      casosFiltrados,
      estados,
      estadosGestion,
      mapaNombres,
      normalizarEstadoFn,
      normalizarEstadoGestionFn,
      esCasoActivoFn,
      filtroPorAjustador,
    ]
  );

  const dualEstados = Array.isArray(stats.porEstadoGestion);

  const tarjetasDesdeBloques = useMemo(() => {
    const defs = Array.isArray(bloquesSuma) ? bloquesSuma : [];
    if (!defs.length) return [];
    const mapaEstado = new Map((stats.porEstado || []).map((r) => [r.estado, Number(r.cantidad) || 0]));
    const mapaGestion = new Map(
      (stats.porEstadoGestion || []).map((r) => [r.estado, Number(r.cantidad) || 0])
    );
    return defs.map((bloque) => {
      const fuente = String(bloque.fuente || 'estado').toLowerCase();
      const mapa = fuente === 'gestion' ? mapaGestion : mapaEstado;
      return {
        id: bloque.id || bloque.titulo,
        titulo: bloque.titulo,
        subtitulo: bloque.subtitulo,
        fuente,
        desglose: (bloque.estados || []).map((estado) => ({
          clave: estado,
          label: estado,
          cantidad: mapa.get(estado) || 0,
        })),
      };
    });
  }, [bloquesSuma, stats.porEstado, stats.porEstadoGestion]);

  const insightGerencial = useMemo(() => {
    const { kpis: k, ans: a } = stats;
    const total = k.totalCasos || 0;
    const pctActivos = total > 0 ? Math.round((k.casosActivos / total) * 100) : 0;
    const lineas = [
      td('executive.portfolio', { total }),
      td('executive.openPct', { pct: pctActivos, active: k.casosActivos }),
    ];
    if (!esListado) {
      lineas.push(td('executive.settledPct', { pct: k.porcentajeLiquidados ?? 0 }));
    }

    const hallazgos = [];
    const serieEstado = dualEstados ? stats.porEstadoGestion : stats.porEstado;
    if (serieEstado?.length) {
      const top = [...serieEstado].sort((x, y) => (y.cantidad || 0) - (x.cantidad || 0))[0];
      if (top?.cantidad > 0 && total > 0) {
        const pct = Math.round((top.cantidad / total) * 100);
        hallazgos.push(
          td('executive.bottleneck', {
            estado: top.estado,
            cantidad: top.cantidad,
            pct,
          })
        );
      }
    }
    if (dualEstados && stats.porEstado?.length) {
      const topAj = [...stats.porEstado].sort((x, y) => (y.cantidad || 0) - (x.cantidad || 0))[0];
      if (topAj?.cantidad > 0) {
        hallazgos.push(
          td('executive.bottleneckAj', { estado: topAj.estado, cantidad: topAj.cantidad })
        );
      }
    }

    const tendencia = stats.tendenciaMensual || [];
    if (tendencia.length >= 2) {
      const prev = tendencia[tendencia.length - 2];
      const curr = tendencia[tendencia.length - 1];
      const delta = (curr.casos || 0) - (prev.casos || 0);
      if (delta !== 0) {
        hallazgos.push(
          td('executive.monthDelta', {
            delta: delta > 0 ? `+${delta}` : String(delta),
            mes: curr.etiqueta || curr.mes,
          })
        );
      }
    }

    const alertas = [];
    if ((k.atrasadosInspeccion || 0) > 0) {
      alertas.push({
        id: 'ans-insp',
        label: td('executive.alertAnsInsp', { count: k.atrasadosInspeccion }),
      });
    }
    if ((k.atrasadosLiquidacion || 0) > 0) {
      alertas.push({
        id: 'ans-liq',
        label: td('executive.alertAnsLiq', { count: k.atrasadosLiquidacion }),
      });
    }
    if (a?.inspeccion?.pct != null && a.inspeccion.pct < 70) {
      alertas.push({
        id: 'ans-insp-pct',
        label: td('executive.alertAnsInspPct', { pct: a.inspeccion.pct }),
      });
    }

    return { lineas, hallazgos: hallazgos.slice(0, 3), alertas };
  }, [stats, dualEstados, esListado, t]);

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
              <h1 className={expressPageTitle}>{title || td('title')}</h1>
              <p className={expressPageSubtitle}>{subtitle || td('subtitle')}</p>
            </div>
          </div>
          {boletinPath && (
            <Link to={boletinPath} className={expressBtnSecondary}>
              <FaChartLine /> {td('openBulletin')}
            </Link>
          )}
        </header>

        {verVistaGerencial && (
          <ResumenGerencial
            titulo={td('executive.title')}
            hallazgosTitulo={td('executive.findings')}
            lineas={insightGerencial.lineas}
            hallazgos={insightGerencial.hallazgos}
            alertas={insightGerencial.alertas}
          />
        )}

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
              <SelectFenix
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  if (e.target.value) setFiltroEstadoGestion('');
                }}
              >
                <option value="">{td('all')}</option>
                {estados.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            {Array.isArray(estadosGestion) && estadosGestion.length > 0 ? (
              <Campo label={td('filtersGestion')}>
                <SelectFenix
                  value={filtroEstadoGestion}
                  onChange={(e) => {
                    setFiltroEstadoGestion(e.target.value);
                    if (e.target.value) setFiltroEstado('');
                  }}
                >
                  <option value="">{td('all')}</option>
                  {estadosGestion.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
            ) : null}
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
            {!esBbvaCat && (
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
            )}
            {!esListado && (
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
            )}
            {esZurich && (
            <Campo label={td('filterByDate')}>
              <SelectFenix value={tipoFecha} onChange={(e) => setTipoFecha(e.target.value)}>
                <option value="ingreso">{td('dateIngreso')}</option>
                <option value="fechaCoordinandoInspeccion">
                  {t('zurich.fields.fechaCoordinandoInspeccion')}
                </option>
              </SelectFenix>
            </Campo>
            )}
            <Campo
              label={
                esZurich && tipoFecha === 'fechaCoordinandoInspeccion'
                  ? td('fromInspection')
                  : td('from')
              }
            >
              <InputFenix type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </Campo>
            <Campo
              label={
                esZurich && tipoFecha === 'fechaCoordinandoInspeccion'
                  ? td('toInspection')
                  : td('to')
              }
            >
              <InputFenix type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </Campo>
          </div>
        </ExpressFilterSection>

        <section className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ExpressMetricCard
            label={td('kpis.cases')}
            value={kpis.totalCasos}
            hint={
              typeof kpiActivosHint === 'function'
                ? kpiActivosHint(kpis.casosActivos)
                : kpiActivosHint ||
                  td('kpis.casesHint', { active: kpis.casosActivos })
            }
          />
          {!esListado && (
            <>
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
            </>
          )}
        </section>

        {!esListado && (
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
        )}

        {verFranjasEstado && dualEstados ? (
          <section className="grid w-full min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <EstadoFranjas
              titulo={td('franjas.gestion')}
              subtitulo={td('franjas.gestionHint')}
              items={(stats.porEstadoGestion || []).map((r) => ({
                clave: r.estado,
                label: r.estado,
                cantidad: r.cantidad,
              }))}
              total={kpis.totalCasos}
              emptyLabel={td('noData')}
              onSelect={(clave) => {
                setFiltroEstadoGestion(clave);
                setFiltroEstado('');
              }}
            />
            <EstadoFranjas
              titulo={td('franjas.siniestro')}
              subtitulo={td('franjas.siniestroHint')}
              items={stats.porEstado.map((r) => ({
                clave: r.estado,
                label: r.estado,
                cantidad: r.cantidad,
              }))}
              total={kpis.totalCasos}
              emptyLabel={td('noData')}
              onSelect={(clave) => {
                setFiltroEstado(clave);
                setFiltroEstadoGestion('');
              }}
            />
          </section>
        ) : null}

        {verFranjasEstado && !dualEstados ? (
          <EstadoFranjas
            titulo={td('franjas.estado')}
            subtitulo={td('franjas.estadoHint')}
            items={stats.porEstado.map((r) => ({
              clave: r.estado,
              label: r.estado,
              cantidad: r.cantidad,
            }))}
            total={kpis.totalCasos}
            emptyLabel={td('noData')}
            onSelect={(clave) => setFiltroEstado(clave)}
          />
        ) : null}

        {franjasExtra && Array.isArray(franjasExtra.items) && franjasExtra.items.length > 0 ? (
          <EstadoFranjas
            titulo={franjasExtra.titulo}
            subtitulo={franjasExtra.subtitulo}
            items={franjasExtra.items}
            total={franjasExtra.total}
            emptyLabel={franjasExtra.emptyLabel || td('noData')}
            onSelect={franjasExtra.onSelect}
          />
        ) : null}

        {(tarjetasDesdeBloques.length > 0 ||
          (Array.isArray(tarjetasSumaExtra) && tarjetasSumaExtra.length > 0)) && (
          <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            {tarjetasDesdeBloques.map((tarjeta) => (
              <TarjetaSumaBloque
                key={tarjeta.id}
                titulo={tarjeta.titulo}
                subtitulo={tarjeta.subtitulo}
                desglose={tarjeta.desglose}
                totalCartera={kpis.totalCasos}
                onSelectItem={(clave) => {
                  if (tarjeta.fuente === 'gestion') {
                    setFiltroEstadoGestion(clave);
                    setFiltroEstado('');
                  } else {
                    setFiltroEstado(clave);
                    setFiltroEstadoGestion('');
                  }
                }}
              />
            ))}
            {(tarjetasSumaExtra || []).map((tarjeta) => (
              <TarjetaSumaBloque
                key={tarjeta.id || tarjeta.titulo}
                titulo={tarjeta.titulo}
                subtitulo={tarjeta.subtitulo}
                desglose={tarjeta.desglose}
                totalCartera={tarjeta.totalBase ?? franjasExtra?.total ?? 0}
                onSelectItem={tarjeta.onSelectItem}
              />
            ))}
          </section>
        )}

        <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          {dualEstados ? (
            <>
              <HorizontalBars
                title={td('charts.byStatusGestion')}
                data={(stats.porEstadoGestion || []).map((r) => ({
                  nombre: r.estado,
                  cantidad: r.cantidad,
                }))}
                isDark={isDark}
                tickColor={tickColor}
                gridStroke={gridStroke}
                tooltipStyle={tooltipStyle}
                seriesName={td('kpis.cases')}
                labelWidth={168}
                labelMax={34}
              />
              <HorizontalBars
                title={td('charts.byStatusSiniestro')}
                data={stats.porEstado.map((r) => ({
                  nombre: r.estado,
                  cantidad: r.cantidad,
                }))}
                isDark={isDark}
                tickColor={tickColor}
                gridStroke={gridStroke}
                tooltipStyle={tooltipStyle}
                seriesName={td('kpis.cases')}
                labelWidth={168}
                labelMax={34}
              />
            </>
          ) : (
            <HorizontalBars
              title={td('charts.byStatus')}
              data={stats.porEstado.map((r) => ({
                nombre: r.estado,
                cantidad: r.cantidad,
              }))}
              isDark={isDark}
              tickColor={tickColor}
              gridStroke={gridStroke}
              tooltipStyle={tooltipStyle}
              seriesName={td('kpis.cases')}
              labelWidth={168}
              labelMax={34}
            />
          )}

          {!dualEstados && chartBesideStatus ? (
            <HorizontalBars
              title={chartBesideStatus.title}
              data={chartBesideStatus.data || []}
              isDark={isDark}
              tickColor={tickColor}
              gridStroke={gridStroke}
              tooltipStyle={tooltipStyle}
              seriesName={chartBesideStatus.seriesName || td('kpis.cases')}
              labelWidth={chartBesideStatus.labelWidth || 140}
              labelMax={chartBesideStatus.labelMax || 24}
            />
          ) : null}

          {!dualEstados && !chartBesideStatus ? (
          <HorizontalBars
            title={td('charts.byCity')}
            data={stats.porCiudad}
            isDark={isDark}
            tickColor={tickColor}
            gridStroke={gridStroke}
            tooltipStyle={tooltipStyle}
            seriesName={td('kpis.cases')}
          />
          ) : null}
        </section>

        {!dualEstados && chartBesideStatus ? (
          <HorizontalBars
            title={td('charts.byCity')}
            data={stats.porCiudad}
            isDark={isDark}
            tickColor={tickColor}
            gridStroke={gridStroke}
            tooltipStyle={tooltipStyle}
            seriesName={td('kpis.cases')}
          />
        ) : null}

        {dualEstados ? (
          <HorizontalBars
            title={td('charts.byCity')}
            data={stats.porCiudad}
            isDark={isDark}
            tickColor={tickColor}
            gridStroke={gridStroke}
            tooltipStyle={tooltipStyle}
            seriesName={td('kpis.cases')}
          />
        ) : null}

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
                hide={esListado}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => {
                  if (name === td('kpis.cases') || name === 'casos') return [value, td('kpis.cases')];
                  return [formatCurrency(value), name];
                }}
              />
              <Legend wrapperStyle={{ color: tickColor, fontSize: 12 }} />
              {!esListado && (
                <>
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
                </>
              )}
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
            title={
              chartTitleByAdjuster
                ? `${chartTitleByAdjuster} · total ${stats.totalFiltradoAjustador ?? 0}`
                : td('charts.byAdjuster')
            }
            data={stats.porAjustador}
            isDark={isDark}
            tickColor={tickColor}
            gridStroke={gridStroke}
            tooltipStyle={tooltipStyle}
            seriesName={chartSeriesByAdjuster || td('kpis.cases')}
          />
          {!esBbvaCat && (
          <HorizontalBars
            title={
              chartTitleByInspector
                ? `${chartTitleByInspector} · total ${stats.totalFiltradoAjustador ?? 0}`
                : td('charts.byInspector')
            }
            data={stats.porInspector}
            isDark={isDark}
            tickColor={tickColor}
            gridStroke={gridStroke}
            tooltipStyle={tooltipStyle}
            seriesName={chartSeriesByInspector || chartSeriesByAdjuster || td('kpis.cases')}
          />
          )}
        </section>

        {!esListado && (
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
        )}

        {extras.severidad && !esListado && (
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
            <HorizontalBars
              title={td('charts.checklist')}
              data={stats.checklist.map((r) => ({
                nombre: r.estado,
                cantidad: r.cantidad,
              }))}
              isDark={isDark}
              tickColor={tickColor}
              gridStroke={gridStroke}
              tooltipStyle={tooltipStyle}
              seriesName={td('kpis.cases')}
              labelWidth={140}
              labelMax={28}
            />
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

function HorizontalBars({
  title,
  data,
  isDark,
  tickColor,
  gridStroke,
  tooltipStyle,
  seriesName,
  labelWidth = 140,
  labelMax = 24,
}) {
  const rows = Array.isArray(data) ? data : [];
  return (
    <ChartCard title={title} empty={!rows.length}>
      <ExpressChartPlot height={Math.max(280, rows.length * 36)}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 44, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="nombre"
            width={labelWidth}
            tick={{ fill: tickColor, fontSize: 10 }}
            tickFormatter={(v) => truncar(v, labelMax)}
            interval={0}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="cantidad" name={seriesName} radius={[0, 4, 4, 0]} barSize={22}>
            {rows.map((entry, index) => (
              <Cell key={entry.nombre} fill={getFenixChartColor(index, isDark)} />
            ))}
            <LabelList
              dataKey="cantidad"
              position="right"
              fill={tickColor}
              fontSize={12}
              fontWeight={700}
            />
          </Bar>
        </BarChart>
      </ExpressChartPlot>
    </ChartCard>
  );
}
