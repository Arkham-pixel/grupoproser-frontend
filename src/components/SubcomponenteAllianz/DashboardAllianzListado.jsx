import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { FaFileExcel } from 'react-icons/fa';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Loader from '../Loader.jsx';
import { useTheme } from '../../context/ThemeContext';
import {
  expressBadge,
  expressBtnGhost,
  expressBtnSecondary,
  expressPageSubtitle,
  expressPageTitle,
  expressPageWrap,
  expressScope,
  expressTableHead,
  expressTableScroll,
  expressTableWrap,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  Campo,
  ExpressChartPlot,
  ExpressFilterSection,
  InputFenix,
  SelectFenix,
  ThOrdenable,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { fetchAllCasosAllianzListado } from '../../services/allianzListadoService.js';
import {
  ALLIANZ_REPORTE_PAGE_SIZE,
  ESTADOS_ALLIANZ,
  buildOpcionesFiltro,
  etiquetaTipoPolizaAllianz,
  formatCurrency,
  formatCurrencyMm,
  formatDate,
  homologarEstadoAllianz,
  resolverDepartamentoAllianz,
} from './allianzHelpers.js';
import {
  FILTROS_TORRE_VACIOS,
  TABS_TORRE_ALLIANZ,
  TORRE_CONFIG_ALLIANZ_DEFAULT,
} from './dashboardAllianzTorreConfig.js';
import {
  aplicarFiltrosTorreAllianz,
  clasificarAlertaAllianz,
  construirTorreAllianz,
  diasAntiguedadTotalAllianz,
  diasEnEstadoNumeroAllianz,
  filtrosTorreActivos,
} from './dashboardAllianzTorreStats.js';
import { aplicarOrdenTabla, useOrdenTabla } from '../../hooks/useOrdenTabla.js';
import {
  AnsBloques,
  ChartCard,
  DualAxisChart,
  HeatmapAns,
  HeroKpi,
  HorizontalBars,
  alternarValor,
  claseNivelAlerta,
  colorAgingId,
  formatEjeCop,
  tintaBarras,
  tooltipChartStyle,
  truncar,
} from '../SubcomponenteZurich/torreZurichUi.jsx';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F]';

function opcionesDesdeGetter(casos, getter) {
  const virtual = casos.map((c) => ({ valor: getter(c) }));
  return buildOpcionesFiltro(virtual, 'valor');
}

function etiquetaMedianaDias(days, td) {
  if (days == null || !Number.isFinite(Number(days))) return td('dash');
  const n = Number(days);
  if (n === 0) return td('charts.timesLessThanOne');
  const cifra = Number.isInteger(n)
    ? String(n)
    : n.toLocaleString('es-CO', { maximumFractionDigits: 1 });
  return td('charts.timesDays', { days: cifra });
}

function kpiDinero(td, monto, count) {
  if (!count) {
    return { value: td('pendingLoad'), hint: td('kpis.moneyEmpty'), title: undefined };
  }
  return {
    value: formatCurrencyMm(monto),
    hint: td('kpis.moneyHint', { count }),
    title: formatCurrency(monto),
  };
}

export default function DashboardAllianzListado() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const td = (key, opts) => t(`allianz.listadoDashboard.${key}`, opts);

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS_TORRE_ALLIANZ.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'resumen';
  const setTab = (next) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', next);
    setSearchParams(nextParams, { replace: true });
  };

  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_TORRE_VACIOS);
  const [granularidad, setGranularidad] = useState('semana');
  const [pagina, setPagina] = useState(1);
  const { orden, cambiarOrden } = useOrdenTabla('siniestro', true);
  const config = TORRE_CONFIG_ALLIANZ_DEFAULT;

  const patchFiltro = useCallback((clave, valor) => {
    setFiltros((prev) => ({ ...prev, [clave]: valor }));
    setPagina(1);
  }, []);

  const patchFiltros = useCallback((patch) => {
    setFiltros((prev) => ({ ...prev, ...patch }));
    setPagina(1);
  }, []);

  const toggleFiltro = useCallback((clave, valor) => {
    setFiltros((prev) => ({ ...prev, [clave]: alternarValor(prev[clave], valor) }));
    setPagina(1);
  }, []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllCasosAllianzListado();
        if (cancelado) return;
        setCasos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error cargando torre listado Allianz:', err);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chips = useMemo(() => filtrosTorreActivos(filtros), [filtros]);
  const filtrosAplicados = chips.length > 0;

  const limpiarFiltros = () => {
    setFiltros(FILTROS_TORRE_VACIOS);
    setPagina(1);
  };

  const casosFiltrados = useMemo(
    () => aplicarFiltrosTorreAllianz(casos, filtros, config),
    [casos, filtros, config]
  );

  const hayFiltroFecha = Boolean(filtros.fechaDesde || filtros.fechaHasta);
  const stats = useMemo(
    () => construirTorreAllianz(casosFiltrados, config, { granularidad, hayFiltroFecha }),
    [casosFiltrados, config, granularidad, hayFiltroFecha]
  );
  const { kpis } = stats;

  const ciudades = useMemo(() => buildOpcionesFiltro(casos, 'ciudad'), [casos]);
  const departamentos = useMemo(
    () => opcionesDesdeGetter(casos, (c) => resolverDepartamentoAllianz(c)),
    [casos]
  );
  const tiposPoliza = useMemo(() => opcionesDesdeGetter(casos, etiquetaTipoPolizaAllianz), [casos]);
  const causas = useMemo(() => buildOpcionesFiltro(casos, 'causa'), [casos]);
  const modalidades = useMemo(() => buildOpcionesFiltro(casos, 'modalidadAtencion'), [casos]);
  const intermediarios = useMemo(() => buildOpcionesFiltro(casos, 'intermediario'), [casos]);

  const tooltipStyle = tooltipChartStyle(isDark);
  const tickColor = isDark ? '#B0B0B0' : '#6B6B6B';
  const gridStroke = isDark ? '#2D2D2D' : '#E5E7EB';
  const ink = tintaBarras(isDark);
  const filtrosVisibles = mostrarFiltros || filtrosAplicados;

  const etiquetaChip = (clave, valor) => {
    const mapa = {
      fechaDesde: `${td('from')}: ${valor}`,
      fechaHasta: `${td('to')}: ${valor}`,
      ciudad: `${t('allianz.fields.ciudad')}: ${valor}`,
      departamento: `${t('allianz.fields.departamento')}: ${valor}`,
      estado: `${t('allianz.fields.estado')}: ${valor}`,
      tipoPoliza: `${t('allianz.fields.tipoPoliza')}: ${valor}`,
      modalidad: `${t('allianz.fields.modalidadAtencion')}: ${valor}`,
      causa: `${t('allianz.fields.causa')}: ${valor}`,
      intermediario: `${t('allianz.fields.intermediario')}: ${valor}`,
      abiertoCerrado: `${td('filter.openClosed')}: ${td(`filter.${valor === 'cerrado' ? 'closed' : 'open'}`)}`,
      conReserva: `${td('filter.withReserve')}: ${td(valor === 'si' ? 'filter.withReserveYes' : 'filter.withReserveNo')}`,
      reservaRango: `${td('filter.reserveRange')}: ${config.rangosReserva.find((r) => r.id === valor)?.label || valor}`,
      antiguedadRango: `${td('filter.aging')}: ${valor}`,
      antiguedadTotalRango: `${td('filter.agingTotal')}: ${valor}`,
      documentoCategoria: `${td('filter.document')}: ${config.documentos.categorias.find((c) => c.id === valor)?.label || valor}`,
      ansInspeccion: `${td('filter.ansInspection')}: ${td(`ans.${valor}`)}`,
      ansLiquidacion: `${td('filter.ansSettlement')}: ${td(`ans.${valor}`)}`,
      nivelAlerta: `${td('filter.alertLevel')}: ${td(`alert.${valor}`)}`,
      busqueda: `${td('searchPlaceholder')}: ${valor}`,
    };
    return mapa[clave] || `${clave}: ${valor}`;
  };

  const aplicarBucketFecha = (clave) => {
    if (!clave) return;
    const [y, m, d] = String(clave).split('-').map(Number);
    const desde = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (granularidad === 'dia') {
      setFiltros((prev) => ({ ...prev, fechaDesde: desde, fechaHasta: desde }));
    } else {
      const fin = new Date(y, m - 1, d);
      fin.setDate(fin.getDate() + 6);
      const hasta = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`;
      setFiltros((prev) => ({ ...prev, fechaDesde: desde, fechaHasta: hasta }));
    }
    setPagina(1);
  };

  const filasDetalle = useMemo(() => {
    const filas = casosFiltrados.map((caso) => {
      const alerta = clasificarAlertaAllianz(caso, config);
      return {
        ...caso,
        estado: homologarEstadoAllianz(caso.estado),
        diasEstado: diasEnEstadoNumeroAllianz(caso),
        diasTotal: diasAntiguedadTotalAllianz(caso),
        tipoPolizaEtiqueta: etiquetaTipoPolizaAllianz(caso),
        alertaNivel: alerta?.nivel || '',
      };
    });
    return aplicarOrdenTabla(filas, orden);
  }, [casosFiltrados, config, orden]);

  const totalPaginas = Math.max(1, Math.ceil(filasDetalle.length / ALLIANZ_REPORTE_PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const paginaItems = filasDetalle.slice(
    (paginaActual - 1) * ALLIANZ_REPORTE_PAGE_SIZE,
    paginaActual * ALLIANZ_REPORTE_PAGE_SIZE
  );

  const exportarExcel = () => {
    const filas = filasDetalle.map((caso) => ({
      ZC: caso.zc ?? '',
      SINIESTRO: caso.siniestro ?? '',
      ASEGURADO: caso.asegurado ?? '',
      CIUDAD: caso.ciudad ?? '',
      DEPARTAMENTO: resolverDepartamentoAllianz(caso),
      ESTADO: caso.estado ?? '',
      'TIPO PÓLIZA': etiquetaTipoPolizaAllianz(caso),
      MODALIDAD: caso.modalidadAtencion ?? '',
      CAUSA: caso.causa ?? '',
      RESERVA: caso.reserva ?? caso.valorReservaPreventivaPromedio ?? '',
      'VALOR RECLAMADO': caso.valorReclamado ?? '',
      'VALOR LIQUIDADO': caso.valorLiquidado ?? '',
      'DÍAS ESTADO': caso.diasEstado ?? '',
      'DÍAS TOTAL': caso.diasTotal ?? '',
      ALERTA: caso.alertaNivel ? td(`alert.${caso.alertaNivel}`) : '',
      'DOCUMENTO FALTANTE': caso.documentoFaltante ?? '',
      'FECHA CASO NUEVO': formatDate(caso.fechaCasoNuevo),
      'FECHA VISITA': formatDate(caso.fechaVisita || caso.fechaInspeccion),
      'FECHA CASO PARA PAGO': formatDate(caso.fechaCasoParaPago),
      'FECHA PAGADO': formatDate(caso.fechaCasoPagado),
      'FECHA OBJETADO': formatDate(caso.fechaObjetado),
      'FECHA ANULADO': formatDate(caso.fechaAnulado),
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas);
    XLSX.utils.book_append_sheet(wb, ws, 'Torre Allianz');
    XLSX.writeFile(wb, `allianz-torre-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const liquidadoKpi = kpiDinero(td, kpis.valorLiquidado, kpis.casosConLiquidado);
  const reservaKpi = kpiDinero(td, kpis.reservaAbierta, kpis.casosConReserva);

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
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className={expressBadge}>{td('badge')}</span>
            <div>
              <h1 className={expressPageTitle}>{td('title')}</h1>
              <p className={expressPageSubtitle}>{td('subtitle')}</p>
            </div>
          </div>
          <button type="button" className={expressBtnGhost} onClick={() => setMostrarFiltros((v) => !v)}>
            {filtrosVisibles ? td('filtersHide') : td('filtersToggle')}
          </button>
        </header>

        <nav className="flex flex-wrap gap-2" aria-label={td('title')}>
          {TABS_TORRE_ALLIANZ.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center rounded-lg px-3 py-2 font-body text-sm font-semibold transition ${
                tab === id
                  ? 'bg-fenix-primario text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
              }`}
            >
              {td(`tabs.${id}`)}
            </button>
          ))}
        </nav>

        {filtrosAplicados && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-body text-xs font-semibold uppercase tracking-wide text-gray-500">
              {td('activeFilters')}
            </span>
            {chips.map(([clave, valor]) => (
              <button
                key={clave}
                type="button"
                onClick={() => patchFiltro(clave, '')}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 font-body text-xs text-gray-700 hover:border-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                {etiquetaChip(clave, valor)} ×
              </button>
            ))}
            <button type="button" className={expressBtnGhost} onClick={limpiarFiltros}>
              {td('resetFilters')}
            </button>
          </div>
        )}

        {filtrosVisibles && (
          <ExpressFilterSection title={td('filters')} showClear={filtrosAplicados} onClear={limpiarFiltros}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Campo label={td('from')}>
                <InputFenix type="date" value={filtros.fechaDesde} onChange={(e) => patchFiltro('fechaDesde', e.target.value)} />
              </Campo>
              <Campo label={td('to')}>
                <InputFenix type="date" value={filtros.fechaHasta} onChange={(e) => patchFiltro('fechaHasta', e.target.value)} />
              </Campo>
              <Campo label={t('allianz.fields.ciudad')}>
                <SelectFenix value={filtros.ciudad} onChange={(e) => patchFiltro('ciudad', e.target.value)}>
                  <option value="">{td('all')}</option>
                  {ciudades.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={t('allianz.fields.departamento')}>
                <SelectFenix value={filtros.departamento} onChange={(e) => patchFiltro('departamento', e.target.value)}>
                  <option value="">{td('all')}</option>
                  {departamentos.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={t('allianz.fields.estado')}>
                <SelectFenix value={filtros.estado} onChange={(e) => patchFiltro('estado', e.target.value)}>
                  <option value="">{td('all')}</option>
                  {ESTADOS_ALLIANZ.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={t('allianz.fields.tipoPoliza')}>
                <SelectFenix value={filtros.tipoPoliza} onChange={(e) => patchFiltro('tipoPoliza', e.target.value)}>
                  <option value="">{td('all')}</option>
                  {tiposPoliza.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={t('allianz.fields.modalidadAtencion')}>
                <SelectFenix value={filtros.modalidad} onChange={(e) => patchFiltro('modalidad', e.target.value)}>
                  <option value="">{td('all')}</option>
                  {modalidades.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={t('allianz.fields.causa')}>
                <SelectFenix value={filtros.causa} onChange={(e) => patchFiltro('causa', e.target.value)}>
                  <option value="">{td('all')}</option>
                  {causas.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={t('allianz.fields.intermediario')}>
                <SelectFenix value={filtros.intermediario} onChange={(e) => patchFiltro('intermediario', e.target.value)}>
                  <option value="">{td('all')}</option>
                  {intermediarios.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={td('filter.openClosed')}>
                <SelectFenix value={filtros.abiertoCerrado} onChange={(e) => patchFiltro('abiertoCerrado', e.target.value)}>
                  <option value="">{td('all')}</option>
                  <option value="abierto">{td('filter.open')}</option>
                  <option value="cerrado">{td('filter.closed')}</option>
                </SelectFenix>
              </Campo>
              <Campo label={td('filter.withReserve')}>
                <SelectFenix value={filtros.conReserva} onChange={(e) => patchFiltro('conReserva', e.target.value)}>
                  <option value="">{td('all')}</option>
                  <option value="si">{td('filter.withReserveYes')}</option>
                  <option value="no">{td('filter.withReserveNo')}</option>
                </SelectFenix>
              </Campo>
              <Campo label={td('filter.reserveRange')}>
                <SelectFenix value={filtros.reservaRango} onChange={(e) => patchFiltro('reservaRango', e.target.value)}>
                  <option value="">{td('all')}</option>
                  {config.rangosReserva.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={td('filter.document')}>
                <SelectFenix
                  value={filtros.documentoCategoria}
                  onChange={(e) => patchFiltro('documentoCategoria', e.target.value)}
                >
                  <option value="">{td('all')}</option>
                  {config.documentos.categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={td('searchPlaceholder')}>
                <InputFenix
                  value={filtros.busqueda}
                  onChange={(e) => patchFiltro('busqueda', e.target.value)}
                  placeholder={td('searchPlaceholder')}
                />
              </Campo>
            </div>
          </ExpressFilterSection>
        )}

        {tab === 'resumen' && (
          <ResumenPanel
            td={td}
            t={t}
            stats={stats}
            kpis={kpis}
            filtros={filtros}
            hayFiltroFecha={hayFiltroFecha}
            granularidad={granularidad}
            setGranularidad={setGranularidad}
            toggleFiltro={toggleFiltro}
            patchFiltro={patchFiltro}
            aplicarBucketFecha={aplicarBucketFecha}
            liquidadoKpi={liquidadoKpi}
            reservaKpi={reservaKpi}
            ink={ink}
            tickColor={tickColor}
            gridStroke={gridStroke}
            tooltipStyle={tooltipStyle}
            isDark={isDark}
          />
        )}

        {tab === 'operacion' && (
          <OperacionPanel
            td={td}
            stats={stats}
            filtros={filtros}
            toggleFiltro={toggleFiltro}
            patchFiltros={patchFiltros}
            isDark={isDark}
            ink={ink}
            tickColor={tickColor}
            gridStroke={gridStroke}
            tooltipStyle={tooltipStyle}
          />
        )}

        {tab === 'economico' && (
          <EconomicoPanel
            td={td}
            t={t}
            stats={stats}
            kpis={kpis}
            liquidadoKpi={liquidadoKpi}
            reservaKpi={reservaKpi}
            toggleFiltro={toggleFiltro}
            isDark={isDark}
            tickColor={tickColor}
            gridStroke={gridStroke}
            tooltipStyle={tooltipStyle}
          />
        )}

        {tab === 'detalle' && (
          <section className={`${expressTableWrap} min-w-0`}>
            <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h3 className="font-heading text-lg font-semibold text-gray-900 dark:text-white">{td('detail.title')}</h3>
                <p className="mt-1 font-body text-sm text-gray-500 dark:text-gray-400">{td('detail.hint')}</p>
                <p className="mt-1 font-body text-xs text-gray-500">
                  {td('detail.records', {
                    count: filasDetalle.length,
                    page: paginaActual,
                    totalPages: totalPaginas,
                  })}
                </p>
              </div>
              <button type="button" className={expressBtnSecondary} onClick={exportarExcel} disabled={!filasDetalle.length}>
                <FaFileExcel className="mr-2 inline" />
                {td('detail.export')}
              </button>
            </div>
            {filasDetalle.length === 0 ? (
              <p className="px-4 py-6 font-body text-sm text-gray-500 dark:text-gray-400 sm:px-5">{td('detail.empty')}</p>
            ) : (
              <>
                <div className={expressTableScroll}>
                  <table className="min-w-full text-sm">
                    <thead className={expressTableHead}>
                      <tr>
                        <ThOrdenable campo="siniestro" orden={orden} onOrdenar={cambiarOrden}>
                          {t('allianz.fields.siniestro')}
                        </ThOrdenable>
                        <ThOrdenable campo="zc" orden={orden} onOrdenar={cambiarOrden}>
                          {t('allianz.fields.zc')}
                        </ThOrdenable>
                        <ThOrdenable campo="asegurado" orden={orden} onOrdenar={cambiarOrden}>
                          {t('allianz.fields.asegurado')}
                        </ThOrdenable>
                        <ThOrdenable campo="ciudad" orden={orden} onOrdenar={cambiarOrden}>
                          {t('allianz.fields.ciudad')}
                        </ThOrdenable>
                        <ThOrdenable campo="estado" orden={orden} onOrdenar={cambiarOrden}>
                          {t('allianz.fields.estado')}
                        </ThOrdenable>
                        <ThOrdenable campo="diasEstado" orden={orden} onOrdenar={cambiarOrden}>
                          {td('detail.daysState')}
                        </ThOrdenable>
                        <ThOrdenable campo="diasTotal" orden={orden} onOrdenar={cambiarOrden}>
                          {td('detail.daysTotal')}
                        </ThOrdenable>
                        <ThOrdenable campo="reserva" orden={orden} onOrdenar={cambiarOrden}>
                          {t('allianz.fields.reserva')}
                        </ThOrdenable>
                        <ThOrdenable campo="valorLiquidado" orden={orden} onOrdenar={cambiarOrden}>
                          {t('allianz.fields.valorLiquidado')}
                        </ThOrdenable>
                        <ThOrdenable campo="alertaNivel" orden={orden} onOrdenar={cambiarOrden}>
                          {td('detail.alert')}
                        </ThOrdenable>
                      </tr>
                    </thead>
                    <tbody>
                      {paginaItems.map((row) => {
                        const reservaMostrada = row.reserva ?? row.valorReservaPreventivaPromedio;
                        return (
                          <tr
                            key={String(row._id || `${row.zc}-${row.siniestro}`)}
                            className="border-t border-gray-100 dark:border-gray-800"
                          >
                            <td className="px-4 py-3 font-medium">
                              {row._id ? (
                                <Link
                                  to={`/allianz/listado/caso?casoId=${row._id}`}
                                  className="text-fenix-primario hover:underline"
                                >
                                  {row.siniestro || td('intervention.openCase')}
                                </Link>
                              ) : (
                                row.siniestro || '—'
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.zc || '—'}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{truncar(row.asegurado, 32)}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.ciudad || '—'}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.estado}</td>
                            <td className="px-4 py-3 tabular-nums">{row.diasEstado ?? '—'}</td>
                            <td className="px-4 py-3 tabular-nums">{row.diasTotal ?? '—'}</td>
                            <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                              {reservaMostrada == null || reservaMostrada === ''
                                ? td('pendingLoad')
                                : formatCurrency(reservaMostrada)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                              {row.valorLiquidado == null || row.valorLiquidado === ''
                                ? td('pendingLoad')
                                : formatCurrency(row.valorLiquidado)}
                            </td>
                            <td className={`px-4 py-3 font-semibold ${claseNivelAlerta(row.alertaNivel)}`}>
                              {row.alertaNivel ? td(`alert.${row.alertaNivel}`) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-end gap-2 px-4 py-3">
                  <button
                    type="button"
                    className={expressBtnGhost}
                    disabled={paginaActual <= 1}
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  >
                    ‹
                  </button>
                  <span className="font-body text-sm text-gray-600 dark:text-gray-300">
                    {paginaActual} / {totalPaginas}
                  </span>
                  <button
                    type="button"
                    className={expressBtnGhost}
                    disabled={paginaActual >= totalPaginas}
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  >
                    ›
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {casosFiltrados.length === 0 && tab !== 'detalle' && (
          <p className="font-body text-sm text-gray-500 dark:text-gray-400">{td('noData')}</p>
        )}
      </div>
    </div>
  );
}

function ResumenPanel({
  td,
  t,
  stats,
  kpis,
  filtros,
  hayFiltroFecha,
  granularidad,
  setGranularidad,
  toggleFiltro,
  patchFiltro,
  aplicarBucketFecha,
  liquidadoKpi,
  reservaKpi,
  ink,
  tickColor,
  gridStroke,
  tooltipStyle,
  isDark,
}) {
  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-[#1A1A1A]">
        <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 lg:grid-cols-4 sm:divide-x sm:divide-y-0 dark:divide-gray-800">
          <HeroKpi
            label={td('kpis.open')}
            value={kpis.carteraAbierta}
            hint={td('kpis.openHint', { total: kpis.totalCasos, critical: kpis.criticos })}
          />
          <HeroKpi
            label={td('kpis.attended')}
            value={kpis.atendidos}
            hint={td('kpis.attendedHint', { total: kpis.totalCasos })}
          />
          <HeroKpi
            label={td('kpis.inspections')}
            value={kpis.inspecciones}
            hint={td('kpis.inspectionsHint', { coordinating: kpis.enInspeccion })}
          />
          <HeroKpi
            label={td('kpis.pendingDocs')}
            value={kpis.pendienteDocumento}
            hint={td('kpis.pendingDocsHint')}
            tone={kpis.pendienteDocumento > 0 ? 'warn' : undefined}
          />
        </div>
        <div className="grid grid-cols-1 divide-y divide-gray-100 border-t border-gray-100 sm:grid-cols-2 lg:grid-cols-4 sm:divide-x sm:divide-y-0 dark:divide-gray-800 dark:border-gray-800">
          <HeroKpi
            label={td('kpis.reserve')}
            value={reservaKpi.value}
            hint={reservaKpi.hint}
            title={reservaKpi.title}
          />
          <HeroKpi
            label={td('kpis.settled')}
            value={liquidadoKpi.value}
            hint={liquidadoKpi.hint}
            title={liquidadoKpi.title}
          />
          <HeroKpi
            label={td('kpis.closed')}
            value={`${kpis.finalizados} · ${kpis.porcentajeFinalizados}%`}
            hint={td('kpis.closedHint', { pct: kpis.porcentajeFinalizados })}
          />
          <HeroKpi
            label={td('kpis.critical')}
            value={kpis.criticos}
            hint={td('kpis.criticalHint', { high: kpis.altos, medium: kpis.medios })}
            tone={kpis.criticos > 0 ? 'danger' : undefined}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-gray-900 dark:text-white">{td('pipeline.title')}</h2>
          <p className="mt-1 font-body text-sm text-gray-500 dark:text-gray-400">{td('pipeline.hint')}</p>
        </div>
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 sm:grid-cols-4 xl:grid-cols-7 dark:border-gray-800 dark:bg-gray-800">
          {stats.porEstado.map((fila) => {
            const activo = filtros.estado === fila.estado;
            const valorClase = fila.alerta ? 'text-fenix-primario' : 'text-gray-900 dark:text-white';
            return (
              <button
                key={fila.estado}
                type="button"
                onClick={() => toggleFiltro('estado', fila.estado)}
                title={`${td('pipeline.cases', { count: fila.cantidad })} · ${td('pipeline.reserve', {
                  amount: formatCurrency(fila.reserva || 0),
                })}`}
                className={`min-w-0 overflow-hidden border-r border-b border-gray-100 bg-white px-3 py-4 text-left last:border-r-0 dark:border-gray-800 dark:bg-[#1A1A1A] ${
                  activo ? 'ring-2 ring-inset ring-fenix-primario' : ''
                }`}
              >
                <p className={`font-accent text-xl font-semibold tabular-nums tracking-tight ${valorClase}`}>
                  {fila.cantidad}
                </p>
                <p className="mt-1 font-body text-[10px] font-semibold uppercase leading-tight tracking-wide text-gray-500 dark:text-gray-400">
                  {td(`pipeline.short.${fila.estado}`, { defaultValue: fila.estado })}
                </p>
                <p className="mt-1 truncate font-body text-[10px] text-gray-400">
                  {fila.reserva ? formatCurrencyMm(fila.reserva) : td('pipeline.openShare', { pct: fila.pctAbiertos })}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <ChartCard
        title={td('charts.inflow')}
        hint={td('charts.inflowHint')}
        empty={!stats.serieFlujo.length}
        action={
          <div className="flex gap-1">
            {['dia', 'semana'].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGranularidad(g)}
                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                  granularidad === g ? 'bg-fenix-primario text-white' : expressBtnGhost
                }`}
              >
                {td(`granularity.${g === 'dia' ? 'day' : 'week'}`)}
              </button>
            ))}
          </div>
        }
      >
        <ExpressChartPlot height={300}>
          <ComposedChart data={stats.serieFlujo} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="etiqueta" tick={{ fill: tickColor, fontSize: 10 }} interval={0} />
            <YAxis allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} width={36} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar
              dataKey="ingresos"
              name={td('charts.inflowIn')}
              fill={ink}
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(entry) => aplicarBucketFecha(entry?.clave ?? entry?.payload?.clave)}
            />
            <Line type="monotone" dataKey="finalizados" name={td('charts.inflowOut')} stroke="#16A34A" strokeWidth={2} />
            <Line type="monotone" dataKey="backlog" name={td('charts.inflowBacklog')} stroke="#DC2626" strokeWidth={2} />
          </ComposedChart>
        </ExpressChartPlot>
      </ChartCard>

      <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <HorizontalBars
          title={td('charts.reserveByStatus')}
          hint={td('charts.reserveByStatusHint')}
          data={stats.reservaPorEstado}
          dataKey="valor"
          tickColor={tickColor}
          gridStroke={gridStroke}
          tooltipStyle={tooltipStyle}
          seriesName={td('kpis.reserve')}
          fill={ink}
          formatTick={formatEjeCop}
          formatValue={formatCurrency}
          onBarClick={(nombre) => {
            const fila = stats.reservaPorEstado.find((f) => f.nombre === nombre);
            if (fila) toggleFiltro('estado', fila.nombre);
          }}
        />
        <ChartCard
          title={td('charts.pareto')}
          hint={`${td('charts.paretoHint')} ${td('charts.paretoSummary', {
            p1: stats.concentracion.top1,
            p5: stats.concentracion.top5,
            p10: stats.concentracion.top10,
            p20: stats.concentracion.top20,
          })}`}
          empty={!stats.pareto.length}
        >
          <ExpressChartPlot height={Math.max(280, stats.pareto.length * 28)}>
            <ComposedChart data={stats.pareto} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis type="number" tickFormatter={formatEjeCop} tick={{ fill: tickColor, fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="siniestro"
                width={90}
                interval={0}
                tick={{ fill: tickColor, fontSize: 10 }}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
              <Bar
                dataKey="reserva"
                name={td('kpis.reserve')}
                fill={isDark ? '#F87171' : '#DC2626'}
                cursor="pointer"
                onClick={(entry) => patchFiltro('busqueda', entry?.siniestro || entry?.payload?.siniestro || '')}
              />
            </ComposedChart>
          </ExpressChartPlot>
        </ChartCard>
      </section>

      <p className="font-body text-xs text-gray-400">
        {hayFiltroFecha ? td('kpis.newHintFiltered') : td('kpis.newHintState', { count: kpis.nuevos })}
      </p>

      <TablaIntervencion td={td} t={t} filas={stats.intervencion} />
    </>
  );
}

function OperacionPanel({
  td,
  stats,
  filtros,
  toggleFiltro,
  patchFiltros,
  isDark,
  ink,
  tickColor,
  gridStroke,
  tooltipStyle,
}) {
  return (
    <>
      <ChartCard title={td('heatmap.title')} hint={td('heatmap.hint')} empty={false}>
        <HeatmapAns
      estados={ESTADOS_ALLIANZ}
          cubetas={stats.heatmap.cubetas}
          celdas={stats.heatmap.celdas}
          isDark={isDark}
          etiquetaEstado={(estado) => td(`pipeline.short.${estado}`, { defaultValue: estado })}
          activo={{ estado: filtros.estado, cubetaId: filtros.antiguedadRango }}
          onCelda={(estado, cubetaId) => {
            const mismo = filtros.estado === estado && filtros.antiguedadRango === cubetaId;
            patchFiltros({
              estado: mismo ? '' : estado,
              antiguedadRango: mismo ? '' : cubetaId,
            });
          }}
        />
      </ChartCard>

      <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <ChartCard
          title={td('charts.agingStatus')}
          hint={td('charts.agingStatusHint')}
          empty={stats.antiguedadEstado.every((r) => !r.cantidad)}
        >
          <ExpressChartPlot height={280}>
            <ComposedChart data={stats.antiguedadEstado} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} />
              <YAxis yAxisId="casos" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} width={36} />
              <YAxis yAxisId="reserva" orientation="right" tickFormatter={formatEjeCop} tick={{ fill: tickColor, fontSize: 10 }} width={48} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => (name === td('kpis.reserve') ? formatCurrency(value) : value)}
              />
              <Legend />
              <Bar
                yAxisId="casos"
                dataKey="cantidad"
                name={td('kpis.cases')}
                cursor="pointer"
                onClick={(entry) => toggleFiltro('antiguedadRango', entry?.id || entry?.payload?.id)}
              >
                {stats.antiguedadEstado.map((entry) => (
                  <Cell key={entry.id} fill={colorAgingId(entry.id, isDark)} />
                ))}
              </Bar>
              <Line yAxisId="reserva" dataKey="reserva" name={td('kpis.reserve')} stroke="#DC2626" strokeWidth={2} />
            </ComposedChart>
          </ExpressChartPlot>
        </ChartCard>
        <ChartCard
          title={td('charts.agingTotal')}
          hint={td('charts.agingTotalHint')}
          empty={stats.antiguedadTotal.every((r) => !r.cantidad)}
        >
          <ExpressChartPlot height={280}>
            <ComposedChart data={stats.antiguedadTotal} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} />
              <YAxis yAxisId="casos" allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} width={36} />
              <YAxis yAxisId="reserva" orientation="right" tickFormatter={formatEjeCop} tick={{ fill: tickColor, fontSize: 10 }} width={48} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => (name === td('kpis.reserve') ? formatCurrency(value) : value)}
              />
              <Legend />
              <Bar
                yAxisId="casos"
                dataKey="cantidad"
                name={td('kpis.cases')}
                cursor="pointer"
                onClick={(entry) => toggleFiltro('antiguedadTotalRango', entry?.id || entry?.payload?.id)}
              >
                {stats.antiguedadTotal.map((entry) => (
                  <Cell key={entry.id} fill={colorAgingId(entry.id, isDark)} />
                ))}
              </Bar>
              <Line yAxisId="reserva" dataKey="reserva" name={td('kpis.reserve')} stroke="#DC2626" strokeWidth={2} />
            </ComposedChart>
          </ExpressChartPlot>
        </ChartCard>
      </section>

      <ChartCard title={td('charts.times')} hint={td('charts.timesHint')} empty={!stats.tiemposEtapa.length}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {stats.tiemposEtapa.map((tramo) => (
            <div key={tramo.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 dark:border-gray-800 dark:bg-gray-900/40">
              <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {td(`times.${tramo.id}`)}
              </p>
              <p className="mt-2 font-accent text-xl font-semibold tabular-nums leading-tight text-gray-900 dark:text-white">
                {etiquetaMedianaDias(tramo.mediana, td)}
              </p>
              <p className="mt-1 font-body text-xs text-gray-500 dark:text-gray-400">
                {td('charts.timesSample', { n: tramo.n })}
              </p>
            </div>
          ))}
        </div>
      </ChartCard>

      <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <AnsBloques
          titulo={td('ans.inspection')}
          hint={td('ans.inspectionHint')}
          data={stats.ansInspeccion}
          limite={stats.ansInspeccion.limite}
          onSelect={(id) => toggleFiltro('ansInspeccion', id)}
          activo={filtros.ansInspeccion}
          td={td}
        />
        <AnsBloques
          titulo={td('ans.settlement')}
          hint={td('ans.settlementHint')}
          data={stats.ansLiquidacion}
          limite={stats.ansLiquidacion.limite}
          onSelect={(id) => toggleFiltro('ansLiquidacion', id)}
          activo={filtros.ansLiquidacion}
          td={td}
        />
      </section>

      <HorizontalBars
        title={td('charts.docs')}
        hint={td('charts.docsHint')}
        data={stats.documentos.map((d) => ({ nombre: d.label, cantidad: d.cantidad, id: d.id }))}
        dataKey="cantidad"
        tickColor={tickColor}
        gridStroke={gridStroke}
        tooltipStyle={tooltipStyle}
        seriesName={td('kpis.cases')}
        fill={ink}
        mostrarValor
        onBarClick={(nombre) => {
          const fila = stats.documentos.find((d) => d.label === nombre);
          if (fila) toggleFiltro('documentoCategoria', fila.id);
        }}
      />
    </>
  );
}

function EconomicoPanel({
  td,
  t,
  stats,
  kpis,
  liquidadoKpi,
  reservaKpi,
  toggleFiltro,
  isDark,
  tickColor,
  gridStroke,
  tooltipStyle,
}) {
  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-[#1A1A1A]">
        <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-gray-800">
          <HeroKpi
            label={td('kpis.reserve')}
            value={kpis.casosConReserva ? formatCurrency(kpis.reservaAbierta) : reservaKpi.value}
            hint={reservaKpi.hint}
            title={reservaKpi.title}
          />
          <HeroKpi
            label={td('kpis.settled')}
            value={kpis.casosConLiquidado ? formatCurrency(kpis.valorLiquidado) : liquidadoKpi.value}
            hint={liquidadoKpi.hint}
            title={liquidadoKpi.title}
          />
          <HeroKpi
            label={td('kpis.claimed')}
            value={kpis.casosConReclamado ? formatCurrency(kpis.valorReclamado) : td('pendingLoad')}
            hint={
              kpis.casosConReclamado
                ? td('kpis.moneyHint', { count: kpis.casosConReclamado })
                : td('kpis.moneyEmpty')
            }
            title={kpis.casosConReclamado ? formatCurrency(kpis.valorReclamado) : undefined}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-gray-900 dark:text-white">{td('charts.severity')}</h2>
          <p className="mt-1 font-body text-sm text-gray-500 dark:text-gray-400">{td('charts.severityHint')}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          {stats.severidad.map((rango) => (
            <button
              key={rango.id}
              type="button"
              onClick={() => toggleFiltro('reservaRango', rango.id)}
              className="rounded-2xl border border-gray-100 bg-white px-3 py-4 text-left dark:border-gray-800 dark:bg-[#1A1A1A]"
            >
              <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-gray-500">{rango.label}</p>
              <p className="mt-2 font-accent text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">
                {rango.cantidad}
              </p>
              <p className="mt-1 truncate font-body text-xs text-gray-500" title={formatCurrency(rango.reserva)}>
                {rango.reserva ? formatCurrencyMm(rango.reserva) : td('pendingLoad')}
              </p>
            </button>
          ))}
        </div>
      </section>

      <DualAxisChart
        title={td('charts.byCity')}
        hint={td('charts.byCityHint')}
        data={stats.porCiudad.slice(0, 12)}
        tickColor={tickColor}
        gridStroke={gridStroke}
        tooltipStyle={tooltipStyle}
        isDark={isDark}
        casosLabel={td('dimension.cases')}
        reservaLabel={td('dimension.reserve')}
        onBarClick={(nombre) => toggleFiltro('ciudad', nombre)}
      />
      <TablaDimension td={td} titulo={td('charts.byCity')} filas={stats.porCiudad} onRow={(n) => toggleFiltro('ciudad', n)} />
      <TablaDimension
        td={td}
        titulo={td('charts.byPolicy')}
        filas={stats.porTipoPoliza}
        onRow={(n) => toggleFiltro('tipoPoliza', n)}
      />
      <TablaDimension
        td={td}
        titulo={td('charts.byModality')}
        filas={stats.porModalidad}
        onRow={(n) => toggleFiltro('modalidad', n)}
      />

      {stats.mostrarTriplete ? (
        <HorizontalBars
          title={td('charts.triplete')}
          hint={td('charts.tripleteHint')}
          data={stats.triplete}
          dataKey="valor"
          tickColor={tickColor}
          gridStroke={gridStroke}
          tooltipStyle={tooltipStyle}
          seriesName={td('kpis.reserve')}
          fill={tintaBarras(isDark)}
          formatTick={formatEjeCop}
          formatValue={formatCurrency}
        />
      ) : (
        <p className="font-body text-sm text-gray-500 dark:text-gray-400">
          {td('charts.tripleteHidden', { count: kpis.casosTriplete })}
        </p>
      )}

      <ChartCard title={td('charts.completeness')} hint={td('charts.completenessHint')} empty={!stats.completitud.length}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.completitud.map((fila) => (
            <div key={fila.id} className="rounded-xl border border-gray-100 px-3 py-3 dark:border-gray-800">
              <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {td(`completenessFields.${fila.id}`)}
              </p>
              <p className="mt-1 font-accent text-xl font-semibold tabular-nums">{fila.pct}%</p>
              <p className="font-body text-xs text-gray-400">{fila.n}</p>
            </div>
          ))}
        </div>
      </ChartCard>

      <section className={`${expressTableWrap} min-w-0`}>
        <div className="border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-5">
          <h3 className="font-heading text-lg font-semibold text-gray-900 dark:text-white">{td('largeLosses.title')}</h3>
          <p className="mt-1 font-body text-sm text-gray-500 dark:text-gray-400">{td('largeLosses.hint')}</p>
        </div>
        {stats.topReservas.length === 0 ? (
          <p className="px-4 py-6 font-body text-sm text-gray-500 sm:px-5">{td('largeLosses.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className={expressTableHead}>
                <tr>
                  <th className="px-4 py-3">{t('allianz.fields.siniestro')}</th>
                  <th className="px-4 py-3">{t('allianz.fields.asegurado')}</th>
                  <th className="px-4 py-3">{t('allianz.fields.ciudad')}</th>
                  <th className="px-4 py-3">{t('allianz.fields.estado')}</th>
                  <th className="px-4 py-3">{td('largeLosses.reserve')}</th>
                  <th className="px-4 py-3">{td('largeLosses.share')}</th>
                  <th className="px-4 py-3">{td('detail.alert')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.topReservas.map((row) => (
                  <tr key={String(row.id || row.siniestro || row.zc)} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium">
                      {row.id ? (
                        <Link to={`/allianz/listado/caso?casoId=${row.id}`} className="text-fenix-primario hover:underline">
                          {row.siniestro || row.zc || td('intervention.openCase')}
                        </Link>
                      ) : (
                        row.siniestro || row.zc || '—'
                      )}
                    </td>
                    <td className="px-4 py-3">{truncar(row.asegurado, 32)}</td>
                    <td className="px-4 py-3">{row.ciudad || '—'}</td>
                    <td className="px-4 py-3">{row.estado}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{formatCurrency(row.reserva)}</td>
                    <td className="px-4 py-3 tabular-nums">{row.pct}%</td>
                    <td className={`px-4 py-3 font-semibold ${claseNivelAlerta(row.alerta)}`}>
                      {row.alerta ? td(`alert.${row.alerta}`) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function TablaDimension({ td, titulo, filas, onRow }) {
  if (!filas?.length) return null;
  return (
    <section className={`${expressTableWrap} min-w-0`}>
      <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-5">
        <h3 className="font-heading text-base font-semibold text-gray-900 dark:text-white">{titulo}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className={expressTableHead}>
            <tr>
              <th className="px-4 py-3">{titulo}</th>
              <th className="px-4 py-3">{td('dimension.cases')}</th>
              <th className="px-4 py-3">{td('dimension.reserve')}</th>
              <th className="px-4 py-3">{td('dimension.avg')}</th>
              <th className="px-4 py-3">{td('dimension.pct')}</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr
                key={fila.nombre}
                className="cursor-pointer border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/40"
                onClick={() => {
                  if (fila.nombre === 'Otros') return;
                  onRow?.(fila.nombre);
                }}
              >
                <td className="px-4 py-2">{fila.nombre}</td>
                <td className="px-4 py-2 tabular-nums">{fila.cantidad}</td>
                <td className="whitespace-nowrap px-4 py-2 tabular-nums">
                  {fila.reserva ? formatCurrency(fila.reserva) : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-2 tabular-nums">
                  {fila.promedio ? formatCurrency(fila.promedio) : '—'}
                </td>
                <td className="px-4 py-2 tabular-nums">{fila.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TablaIntervencion({ td, t, filas }) {
  return (
    <section className={`${expressTableWrap} min-w-0`}>
      <div className="border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-5">
        <h3 className="font-heading text-lg font-semibold text-gray-900 dark:text-white">{td('intervention.title')}</h3>
        <p className="mt-1 font-body text-sm text-gray-500 dark:text-gray-400">{td('intervention.hint')}</p>
      </div>
      {filas.length === 0 ? (
        <p className="px-4 py-6 font-body text-sm text-gray-500 sm:px-5">{td('intervention.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className={expressTableHead}>
              <tr>
                <th className="px-4 py-3">{t('allianz.fields.siniestro')}</th>
                <th className="px-4 py-3">{t('allianz.fields.asegurado')}</th>
                <th className="px-4 py-3">{t('allianz.fields.ciudad')}</th>
                <th className="px-4 py-3">{t('allianz.fields.estado')}</th>
                <th className="px-4 py-3">{td('intervention.daysState')}</th>
                <th className="px-4 py-3">{td('largeLosses.reserve')}</th>
                <th className="px-4 py-3">{td('intervention.level')}</th>
                <th className="px-4 py-3">{td('intervention.reason')}</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((row) => (
                <tr key={String(row.id || row.siniestro || row.zc)} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3 font-medium">
                    {row.id ? (
                      <Link to={`/allianz/listado/caso?casoId=${row.id}`} className="text-fenix-primario hover:underline">
                        {row.siniestro || row.zc || td('intervention.openCase')}
                      </Link>
                    ) : (
                      row.siniestro || row.zc || '—'
                    )}
                  </td>
                  <td className="px-4 py-3">{truncar(row.asegurado, 28)}</td>
                  <td className="px-4 py-3">{row.ciudad || '—'}</td>
                  <td className="px-4 py-3">{row.estado}</td>
                  <td className={`px-4 py-3 font-semibold tabular-nums ${claseNivelAlerta(row.nivel)}`}>
                    {row.diasEstado ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                    {row.reserva ? formatCurrency(row.reserva) : '—'}
                  </td>
                  <td className={`px-4 py-3 font-semibold ${claseNivelAlerta(row.nivel)}`}>{td(`alert.${row.nivel}`)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {(row.tipos || []).map((tipo) => td(`alert.${tipo}`)).join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
