import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { FaFileExcel } from 'react-icons/fa';
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
  ExpressFilterSection,
  InputFenix,
  SelectFenix,
  ThOrdenable,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { fetchAllCasosAllianzListado } from '../../services/allianzListadoService.js';
import {
  BLOQUES_SUMA_ALLIANZ,
  ALLIANZ_REPORTE_PAGE_SIZE,
  ESTADOS_ALLIANZ,
  ESTADOS_CIERRE_ALLIANZ,
  TIPOS_POLIZA_ALLIANZ,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  etiquetaTipoPolizaAllianz,
  formatCurrency,
  formatCurrencyMm,
  formatDate,
  homologarEstadoAllianz,
  resolverDepartamentoAllianz,
} from './allianzHelpers.js';
import { FILTROS_TORRE_VACIOS, TORRE_CONFIG_ALLIANZ_DEFAULT } from './dashboardAllianzTorreConfig.js';
import {
  aplicarFiltrosTorreAllianz,
  construirTorreAllianz,
  diasAntiguedadTotalAllianz,
  filtrosTorreActivos,
} from './dashboardAllianzTorreStats.js';
import { aplicarOrdenTabla, useOrdenTabla } from '../../hooks/useOrdenTabla.js';
import {
  BarrasCasosAllianz,
  KpiTarjeta,
  PillEstadoAllianz,
  PillPolizaAllianz,
} from './tableroAllianzUi.jsx';
import {
  alternarFiltroAllianz,
  colorBarraDiasAllianz,
  colorBarraEstadoAllianz,
  colorBarraPersonaAllianz,
  colorBarraPolizaAllianz,
  truncarAllianz,
} from './tableroAllianzHelpers.js';
import EstadoFranjas, {
  ResumenGerencial,
  TarjetaSumaBloque,
} from '../SubcomponenteDashboardCatastrofico/EstadoFranjas.jsx';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F]';

function opcionesDesdeGetter(casos, getter) {
  const virtual = casos.map((c) => ({ valor: getter(c) }));
  return buildOpcionesFiltro(virtual, 'valor');
}

export default function DashboardAllianzListado() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const td = (key, opts) => t(`allianz.listadoDashboard.${key}`, opts);

  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_TORRE_VACIOS);
  const [pagina, setPagina] = useState(1);
  const { orden, cambiarOrden } = useOrdenTabla('siniestro', true);
  const config = TORRE_CONFIG_ALLIANZ_DEFAULT;

  const patchFiltro = useCallback((clave, valor) => {
    setFiltros((prev) => ({ ...prev, [clave]: valor }));
    setPagina(1);
  }, []);

  const toggleFiltro = useCallback((clave, valor) => {
    setFiltros((prev) => ({ ...prev, [clave]: alternarFiltroAllianz(prev[clave], valor) }));
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
        console.error('Error cargando tablero Allianz:', err);
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
  const filtrosVisibles = mostrarFiltros || filtrosAplicados;

  const limpiarFiltros = () => {
    setFiltros(FILTROS_TORRE_VACIOS);
    setPagina(1);
  };

  const casosFiltrados = useMemo(
    () => aplicarFiltrosTorreAllianz(casos, filtros, config),
    [casos, filtros, config]
  );

  const stats = useMemo(() => construirTorreAllianz(casosFiltrados, config), [casosFiltrados, config]);
  const { kpis } = stats;
  const totalVista = kpis.totalCasos || 0;
  const openPct = totalVista ? Math.round((kpis.carteraAbierta / totalVista) * 100) : 0;
  const closedPct = totalVista ? Math.round((kpis.finalizados / totalVista) * 100) : 0;
  const reservePct = totalVista ? Math.round((kpis.casosConReserva / totalVista) * 100) : 0;

  const barrasEstado = useMemo(
    () =>
      stats.porEstado.map((fila) => ({
        clave: fila.estado,
        nombre: td(`pipeline.short.${fila.estado}`, { defaultValue: fila.estado }),
        cantidad: fila.cantidad,
        reserva: fila.reserva,
        activo: !filtros.estado || filtros.estado === fila.estado,
      })),
    [stats.porEstado, filtros.estado, t]
  );

  const insightGerencial = useMemo(() => {
    const lineas = [
      t('catastroficoDashboard.executive.portfolio', { total: kpis.totalCasos || 0 }),
      t('catastroficoDashboard.executive.openPct', {
        active: kpis.carteraAbierta || 0,
        pct: openPct,
      }),
      t('catastroficoDashboard.executive.settledPct', { pct: kpis.porcentajeFinalizados || 0 }),
    ];
    const hallazgos = [];
    if (stats.porEstado?.length && (kpis.totalCasos || 0) > 0) {
      const top = [...stats.porEstado].sort((a, b) => (b.cantidad || 0) - (a.cantidad || 0))[0];
      if (top?.cantidad > 0) {
        const pct = Math.round((top.cantidad / kpis.totalCasos) * 100);
        hallazgos.push(
          t('catastroficoDashboard.executive.bottleneck', {
            estado: top.estado,
            cantidad: top.cantidad,
            pct,
          })
        );
      }
    }
    return { lineas, hallazgos };
  }, [kpis, openPct, stats.porEstado, t]);

  const tarjetasSuma = useMemo(() => {
    const mapa = new Map((stats.porEstado || []).map((r) => [r.estado, Number(r.cantidad) || 0]));
    return BLOQUES_SUMA_ALLIANZ.map((bloque) => ({
      id: bloque.id,
      titulo: bloque.titulo,
      subtitulo: bloque.subtitulo,
      desglose: (bloque.estados || []).map((estado) => ({
        clave: estado,
        label: td(`pipeline.short.${estado}`, { defaultValue: estado }),
        cantidad: mapa.get(estado) || 0,
      })),
    }));
  }, [stats.porEstado, t]);

  const barrasPoliza = useMemo(
    () =>
      // Incluye los 6 ramos + "Sin tipo" / "Otros" cuando hay casos, para que la suma cuadre con el total.
      (stats.porTipoPoliza || []).map((fila) => ({
        clave: fila.nombre,
        nombre: fila.nombre,
        cantidad: fila.cantidad,
        reserva: fila.reserva,
        activo: !filtros.tipoPoliza || coincideFiltroTexto(fila.nombre, filtros.tipoPoliza),
      })),
    [stats.porTipoPoliza, filtros.tipoPoliza]
  );

  const barrasAjustador = useMemo(
    () =>
      (stats.porAjustador || []).map((fila) => ({
        clave: fila.nombre,
        nombre: fila.nombre,
        cantidad: fila.cantidad,
        reserva: fila.reserva,
        activo: !filtros.ajustador || coincideFiltroTexto(fila.nombre, filtros.ajustador),
      })),
    [stats.porAjustador, filtros.ajustador]
  );

  const barrasInspector = useMemo(
    () =>
      (stats.porInspector || []).map((fila) => ({
        clave: fila.nombre,
        nombre: fila.nombre,
        cantidad: fila.cantidad,
        reserva: fila.reserva,
        activo: !filtros.inspector || coincideFiltroTexto(fila.nombre, filtros.inspector),
      })),
    [stats.porInspector, filtros.inspector]
  );

  const barrasDias = useMemo(
    () =>
      (stats.porDias || []).map((fila) => ({
        clave: fila.clave || fila.nombre,
        nombre: fila.clave === 'sin-fecha' ? td('charts.noIntakeDate') : fila.nombre,
        cantidad: fila.cantidad,
        reserva: fila.reserva,
        activo: !filtros.antiguedadTotalRango || filtros.antiguedadTotalRango === (fila.clave || fila.nombre),
      })),
    [stats.porDias, filtros.antiguedadTotalRango, t]
  );

  const ciudades = useMemo(() => buildOpcionesFiltro(casos, 'ciudad'), [casos]);
  const ajustadores = useMemo(() => buildOpcionesFiltro(casos, 'ajustador'), [casos]);
  const inspectores = useMemo(() => buildOpcionesFiltro(casos, 'inspector'), [casos]);
  const tiposPoliza = useMemo(() => {
    const extras = opcionesDesdeGetter(casos, etiquetaTipoPolizaAllianz);
    const seen = new Set(TIPOS_POLIZA_ALLIANZ.map((t) => t));
    const canon = TIPOS_POLIZA_ALLIANZ.map((valor) => ({ value: valor, label: valor }));
    extras.forEach((op) => {
      const label = op.label || op.value;
      if (!label || TIPOS_POLIZA_ALLIANZ.includes(label) || seen.has(label)) return;
      // Extras no canónicos se agrupan en el chart como "Otros"; no duplicar ramos.
      if (TIPOS_POLIZA_ALLIANZ.some((t) => coincideFiltroTexto(t, label))) return;
      seen.add(label);
      canon.push({ value: label, label });
    });
    return [
      ...canon,
      { value: 'Sin tipo de póliza', label: 'Sin tipo de póliza' },
      { value: 'Otros', label: 'Otros' },
    ];
  }, [casos]);

  const etiquetaChip = (clave, valor) => {
    const mapa = {
      fechaDesde: `${td('from')}: ${valor}`,
      fechaHasta: `${td('to')}: ${valor}`,
      ciudad: `${t('allianz.fields.ciudad')}: ${valor}`,
      estado: `${t('allianz.fields.estado')}: ${valor}`,
      tipoPoliza: `${t('allianz.fields.tipoPoliza')}: ${valor}`,
      ajustador: `${t('allianz.fields.ajustador')}: ${valor}`,
      inspector: `${t('allianz.fields.inspector')}: ${valor}`,
      antiguedadTotalRango: `${td('filter.agingTotal')}: ${
        valor === 'sin-fecha'
          ? td('charts.noIntakeDate')
          : config.cubetasAntiguedad.find((r) => r.id === valor)?.label || valor
      }`,
      abiertoCerrado: `${td('filter.openClosed')}: ${td(`filter.${valor === 'cerrado' ? 'closed' : 'open'}`)}`,
      busqueda: valor,
    };
    return mapa[clave] || `${clave}: ${valor}`;
  };

  const filasDetalle = useMemo(() => {
    const filas = casosFiltrados.map((caso) => ({
      ...caso,
      estado: homologarEstadoAllianz(caso.estado),
      tipoPolizaEtiqueta: etiquetaTipoPolizaAllianz(caso),
      diasTotal: diasAntiguedadTotalAllianz(caso),
    }));
    return aplicarOrdenTabla(filas, orden);
  }, [casosFiltrados, orden]);

  const totalPaginas = Math.max(1, Math.ceil(filasDetalle.length / ALLIANZ_REPORTE_PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const paginaItems = filasDetalle.slice(
    (paginaActual - 1) * ALLIANZ_REPORTE_PAGE_SIZE,
    paginaActual * ALLIANZ_REPORTE_PAGE_SIZE
  );

  const exportarExcel = () => {
    const filas = filasDetalle.map((caso) => ({
      SINIESTRO: caso.siniestro ?? '',
      ZC: caso.zc ?? '',
      ASEGURADO: caso.asegurado ?? '',
      CIUDAD: caso.ciudad ?? '',
      DEPARTAMENTO: resolverDepartamentoAllianz(caso),
      ESTADO: homologarEstadoAllianz(caso.estado),
      'TIPO PÓLIZA': etiquetaTipoPolizaAllianz(caso),
      AJUSTADOR: caso.ajustador ?? '',
      INSPECTOR: caso.inspector ?? '',
      'DÍAS': caso.diasTotal ?? '',
      RESERVA: caso.reserva ?? caso.valorReservaPreventivaPromedio ?? '',
      'VALOR LIQUIDADO': caso.valorLiquidado ?? '',
      'FECHA CASO NUEVO': formatDate(caso.fechaCasoNuevo),
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas);
    XLSX.utils.book_append_sheet(wb, ws, 'Allianz');
    XLSX.writeFile(wb, `allianz-casos-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

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
      <div className={`${expressPageWrap} min-w-0 space-y-6`}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className={expressBadge}>{td('badge')}</span>
            <div>
              <h1 className={expressPageTitle}>{td('title')}</h1>
              <p className={expressPageSubtitle}>{td('subtitle')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={expressBtnGhost} onClick={() => setMostrarFiltros((v) => !v)}>
              {filtrosVisibles ? td('filtersHide') : td('filtersToggle')}
            </button>
            <button type="button" className={expressBtnSecondary} onClick={exportarExcel} disabled={!filasDetalle.length}>
              <FaFileExcel className="mr-2 inline" />
              {td('detail.export')}
            </button>
          </div>
        </header>

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
              <Campo label={td('searchPlaceholder')}>
                <InputFenix
                  value={filtros.busqueda}
                  onChange={(e) => patchFiltro('busqueda', e.target.value)}
                  placeholder={td('searchPlaceholder')}
                />
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
              <Campo label={t('allianz.fields.ajustador')}>
                <SelectFenix value={filtros.ajustador} onChange={(e) => patchFiltro('ajustador', e.target.value)}>
                  <option value="">{td('all')}</option>
                  <option value="Sin ajustador">Sin ajustador</option>
                  {ajustadores.map((op) => (
                    <option key={`${op.value}-${op.label}`} value={op.label}>
                      {op.label}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={t('allianz.fields.inspector')}>
                <SelectFenix value={filtros.inspector} onChange={(e) => patchFiltro('inspector', e.target.value)}>
                  <option value="">{td('all')}</option>
                  <option value="Sin inspector">Sin inspector</option>
                  {inspectores.map((op) => (
                    <option key={`${op.value}-${op.label}`} value={op.label}>
                      {op.label}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={td('filter.agingTotal')}>
                <SelectFenix
                  value={filtros.antiguedadTotalRango}
                  onChange={(e) => patchFiltro('antiguedadTotalRango', e.target.value)}
                >
                  <option value="">{td('all')}</option>
                  {config.cubetasAntiguedad.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                  <option value="sin-fecha">{td('charts.noIntakeDate')}</option>
                </SelectFenix>
              </Campo>
              <Campo label={t('allianz.fields.ciudad')}>
                <SelectFenix value={filtros.ciudad} onChange={(e) => patchFiltro('ciudad', e.target.value)}>
                  <option value="">{td('all')}</option>
                  {ciudades.map((op) => (
                    <option key={`${op.value}-${op.label}`} value={op.label}>
                      {op.label}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={td('from')}>
                <InputFenix type="date" value={filtros.fechaDesde} onChange={(e) => patchFiltro('fechaDesde', e.target.value)} />
              </Campo>
              <Campo label={td('to')}>
                <InputFenix type="date" value={filtros.fechaHasta} onChange={(e) => patchFiltro('fechaHasta', e.target.value)} />
              </Campo>
              <Campo label={td('filter.openClosed')}>
                <SelectFenix value={filtros.abiertoCerrado} onChange={(e) => patchFiltro('abiertoCerrado', e.target.value)}>
                  <option value="">{td('all')}</option>
                  <option value="abierto">{td('filter.open')}</option>
                  <option value="cerrado">{td('filter.closed')}</option>
                </SelectFenix>
              </Campo>
            </div>
          </ExpressFilterSection>
        )}

        <ResumenGerencial
          titulo={t('catastroficoDashboard.executive.title')}
          hallazgosTitulo={t('catastroficoDashboard.executive.findings')}
          lineas={insightGerencial.lineas}
          hallazgos={insightGerencial.hallazgos}
        />

        <EstadoFranjas
          titulo={t('catastroficoDashboard.franjas.estado')}
          subtitulo={t('catastroficoDashboard.franjas.estadoHint')}
          items={(stats.porEstado || []).map((fila) => ({
            clave: fila.estado,
            label: td(`pipeline.short.${fila.estado}`, { defaultValue: fila.estado }),
            cantidad: fila.cantidad,
            accent: filtros.estado === fila.estado,
          }))}
          total={kpis.totalCasos}
          emptyLabel={td('noData')}
          onSelect={(clave) => toggleFiltro('estado', clave)}
        />

        <section className="grid w-full min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          {tarjetasSuma.map((tarjeta) => (
            <TarjetaSumaBloque
              key={tarjeta.id}
              titulo={tarjeta.titulo}
              subtitulo={tarjeta.subtitulo}
              desglose={tarjeta.desglose}
              totalCartera={kpis.totalCasos}
              onSelectItem={(clave) => toggleFiltro('estado', clave)}
            />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTarjeta
            label={td('kpis.cases')}
            value={kpis.totalCasos}
            hint={td('kpis.splitHint', { open: kpis.carteraAbierta, closed: kpis.finalizados })}
            split={{ openPct, closedPct, title: td('kpis.splitHint', { open: kpis.carteraAbierta, closed: kpis.finalizados }) }}
          />
          <KpiTarjeta
            label={td('kpis.open')}
            value={kpis.carteraAbierta}
            hint={td('kpis.openHint', { total: kpis.totalCasos })}
            share={openPct}
          />
          <KpiTarjeta
            label={td('kpis.closed')}
            value={kpis.finalizados}
            hint={td('kpis.closedHint', { pct: kpis.porcentajeFinalizados })}
            share={closedPct}
          />
          <KpiTarjeta
            label={td('kpis.reserve')}
            value={kpis.casosConReserva ? formatCurrencyMm(kpis.reservaAbierta) : td('pendingLoad')}
            hint={
              kpis.casosConReserva
                ? td('kpis.reserveHint', { count: kpis.casosConReserva })
                : td('kpis.reserveEmpty')
            }
            title={kpis.casosConReserva ? formatCurrency(kpis.reservaAbierta) : undefined}
            share={reservePct}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <BarrasCasosAllianz
            title={td('pipeline.title')}
            hint={td('pipeline.hint')}
            emptyLabel={td('noData')}
            data={barrasEstado}
            isDark={isDark}
            seriesName={td('dimension.cases')}
            onBarClick={(clave) => toggleFiltro('estado', clave)}
            colorFor={colorBarraEstadoAllianz}
            yWidth={124}
          />
          <BarrasCasosAllianz
            title={td('policyTypes.title')}
            hint={td('policyTypes.hint')}
            emptyLabel={td('noData')}
            data={barrasPoliza}
            isDark={isDark}
            seriesName={td('dimension.cases')}
            onBarClick={(clave) => toggleFiltro('tipoPoliza', clave)}
            colorFor={colorBarraPolizaAllianz}
            yWidth={168}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <BarrasCasosAllianz
            title={td('charts.byAdjuster')}
            hint={td('charts.byAdjusterHint')}
            emptyLabel={td('noData')}
            data={barrasAjustador}
            isDark={isDark}
            seriesName={td('dimension.cases')}
            onBarClick={(clave) => toggleFiltro('ajustador', clave)}
            colorFor={colorBarraPersonaAllianz}
            yWidth={150}
          />
          <BarrasCasosAllianz
            title={td('charts.byInspector')}
            hint={td('charts.byInspectorHint')}
            emptyLabel={td('noData')}
            data={barrasInspector}
            isDark={isDark}
            seriesName={td('dimension.cases')}
            onBarClick={(clave) => toggleFiltro('inspector', clave)}
            colorFor={colorBarraPersonaAllianz}
            yWidth={150}
          />
        </section>

        <BarrasCasosAllianz
          title={td('charts.agingTotal')}
          hint={td('charts.agingTotalHint')}
          emptyLabel={td('noData')}
          data={barrasDias}
          isDark={isDark}
          seriesName={td('dimension.cases')}
          onBarClick={(clave) => toggleFiltro('antiguedadTotalRango', clave)}
          colorFor={colorBarraDiasAllianz}
          yWidth={140}
        />

        <section className={`${expressTableWrap} min-w-0`}>
          <div className="border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-5">
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
                      <ThOrdenable campo="asegurado" orden={orden} onOrdenar={cambiarOrden}>
                        {t('allianz.fields.asegurado')}
                      </ThOrdenable>
                      <ThOrdenable campo="ciudad" orden={orden} onOrdenar={cambiarOrden}>
                        {t('allianz.fields.ciudad')}
                      </ThOrdenable>
                      <ThOrdenable campo="ajustador" orden={orden} onOrdenar={cambiarOrden}>
                        {t('allianz.fields.ajustador')}
                      </ThOrdenable>
                      <ThOrdenable campo="inspector" orden={orden} onOrdenar={cambiarOrden}>
                        {t('allianz.fields.inspector')}
                      </ThOrdenable>
                      <ThOrdenable campo="estado" orden={orden} onOrdenar={cambiarOrden}>
                        {t('allianz.fields.estado')}
                      </ThOrdenable>
                      <ThOrdenable campo="diasTotal" orden={orden} onOrdenar={cambiarOrden}>
                        {td('detail.daysTotal')}
                      </ThOrdenable>
                      <ThOrdenable campo="tipoPolizaEtiqueta" orden={orden} onOrdenar={cambiarOrden}>
                        {t('allianz.fields.tipoPoliza')}
                      </ThOrdenable>
                      <ThOrdenable campo="reserva" orden={orden} onOrdenar={cambiarOrden}>
                        {t('allianz.fields.reserva')}
                      </ThOrdenable>
                    </tr>
                  </thead>
                  <tbody>
                    {paginaItems.map((row) => {
                      const reservaMostrada = row.reserva ?? row.valorReservaPreventivaPromedio;
                      return (
                        <tr
                          key={String(row._id || `${row.zc}-${row.siniestro}`)}
                          className="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/40"
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
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {truncarAllianz(row.asegurado, 36)}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.ciudad || '—'}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {truncarAllianz(row.ajustador, 28)}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {truncarAllianz(row.inspector, 28)}
                          </td>
                          <td className="px-4 py-3">
                            <PillEstadoAllianz
                              estado={row.estado}
                              etiqueta={td(`pipeline.short.${row.estado}`, { defaultValue: row.estado })}
                              cerrado={ESTADOS_CIERRE_ALLIANZ.has(row.estado)}
                            />
                          </td>
                          <td className="px-4 py-3 tabular-nums text-gray-800 dark:text-gray-200">
                            {row.diasTotal == null ? td('pendingLoad') : row.diasTotal}
                          </td>
                          <td className="px-4 py-3">
                            <PillPolizaAllianz nombre={row.tipoPolizaEtiqueta} vacioLabel={td('pendingLoad')} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 tabular-nums text-gray-800 dark:text-gray-200">
                            {reservaMostrada == null || reservaMostrada === ''
                              ? td('pendingLoad')
                              : formatCurrency(reservaMostrada)}
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
      </div>
    </div>
  );
}


