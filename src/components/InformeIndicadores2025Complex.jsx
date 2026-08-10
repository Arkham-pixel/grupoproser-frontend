import { useTranslation } from 'react-i18next';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaDownload, FaFileExcel } from 'react-icons/fa';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getSiniestrosEnriquecidos } from '../services/siniestrosApi';
import { obtenerCasosComplex } from '../services/complexService';
import { obtenerResponsables } from '../services/riesgoService';
import { getEstados } from '../services/estadosService.js';
import Loader from './Loader';
import { useTheme } from '../context/ThemeContext';
import { useProtocoloSiniestros } from '../hooks/useProtocoloSiniestros.js';
import { PROTOCOLO_FECHA_ACTIVACION } from '../config/protocoloSiniestrosDefaults.js';
import {
  construirInformeIndicadoresComplex,
  exportarInformeIndicadoresExcel,
} from '../utils/exportarInformeIndicadoresComplex.js';
import {
  colorBarraCumplimiento,
  formatearPorcentajeCumplimiento,
} from '../utils/complexProtocoloCumplimientoUtils.js';
import {
  complexCard,
  complexSectionTitle,
  complexBtnSecondary,
  complexTableWrap,
  complexTableSimple,
  complexTableHead,
} from './SubcomponenteCompex/complexFenixUi.js';
import {
  Campo,
  ComplexChartCard,
  ComplexChartPlot,
  ComplexFilterSection,
  ComplexMetricCard,
  InputFenix,
} from './SubcomponenteCompex/ComplexUiBlocks.jsx';

const COLORES_VOLUMEN = ['#C8102E', '#F59E0B', '#2563EB', '#16A34A', '#7C3AED'];

const InformeIndicadores2025Complex = ({ embedded = false }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { protocolo } = useProtocoloSiniestros();
  const [siniestros, setSiniestros] = useState([]);
  const [complex, setComplex] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState('');

  const [fechaDesdeHistorico, setFechaDesdeHistorico] = useState('2025-01-01');
  const [fechaHastaHistorico, setFechaHastaHistorico] = useState('');
  const [fechaDesdeProtocolo, setFechaDesdeProtocolo] = useState(PROTOCOLO_FECHA_ACTIVACION);
  const [fechaHastaProtocolo, setFechaHastaProtocolo] = useState('');

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const [siniestrosData, complexData, responsablesData, estadosData] = await Promise.allSettled([
          getSiniestrosEnriquecidos(),
          obtenerCasosComplex(),
          obtenerResponsables(),
          getEstados(),
        ]);

        setSiniestros(
          siniestrosData.status === 'fulfilled' && Array.isArray(siniestrosData.value)
            ? siniestrosData.value
            : []
        );
        setComplex(
          complexData.status === 'fulfilled' && Array.isArray(complexData.value)
            ? complexData.value
            : []
        );
        const resp =
          responsablesData.status === 'fulfilled'
            ? responsablesData.value?.success && responsablesData.value?.data
              ? responsablesData.value.data
              : Array.isArray(responsablesData.value)
                ? responsablesData.value
                : []
            : [];
        setResponsables(resp);
        setEstados(
          estadosData.status === 'fulfilled' && Array.isArray(estadosData.value)
            ? estadosData.value
            : []
        );
      } catch (e) {
        console.error(e);
        setSiniestros([]);
        setComplex([]);
        setResponsables([]);
        setEstados([]);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const getNombreResponsable = useCallback(
    (caso) => {
      if (
        caso.nombreResponsable &&
        caso.nombreResponsable !== 'Sin asignar' &&
        caso.nombreResponsable.toLowerCase() !== 'sin asignar'
      ) {
        return caso.nombreResponsable;
      }
      const codigo = caso.codiRespnsble ?? caso.codi_responble ?? caso.responsable;
      if (!codigo || codigo === 'Sin asignar') {
        return t('complex.ui.informe_indicadores2025complex.sin_asignar');
      }
      const responsable = responsables.find(
        (r) =>
          String(r.codiRespnsble) === String(codigo) ||
          String(r.codigo) === String(codigo) ||
          r.nmbrRespnsble === String(codigo) ||
          r.nombre === String(codigo)
      );
      return responsable?.nmbrRespnsble || responsable?.nombre || String(codigo);
    },
    [responsables, t]
  );

  const informe = useMemo(() => {
    if (loading) return null;
    return construirInformeIndicadoresComplex({
      siniestros,
      complex,
      responsables,
      estados,
      protocolo,
      fechaDesdeHistorico,
      fechaHastaHistorico,
      fechaDesdeProtocolo,
      fechaHastaProtocolo,
      obtenerNombreResponsable: getNombreResponsable,
    });
  }, [
    loading,
    siniestros,
    complex,
    responsables,
    estados,
    protocolo,
    fechaDesdeHistorico,
    fechaHastaHistorico,
    fechaDesdeProtocolo,
    fechaHastaProtocolo,
    getNombreResponsable,
  ]);

  const handleExportar = async () => {
    setErrorExport('');
    setExportando(true);
    try {
      await exportarInformeIndicadoresExcel(informe);
    } catch (e) {
      setErrorExport(e.message || t('complex.ui.informe_indicadores2025complex.no_generar_informe'));
    } finally {
      setExportando(false);
    }
  };

  if (loading) {
    return embedded ? <Loader /> : (
      <div className="p-8">
        <Loader />
      </div>
    );
  }

  const hist = informe?.historicoResumen?.[0] || {};
  const prot = informe?.protocoloResumen?.[0] || {};
  const graf = informe?.graficos || {};
  const cons = informe?.consolidadoHistorico || informe?.meta?.consolidadoHistorico || {};
  const cerradosDetalle = cons.cerradosDetalle || [];
  const enGestionDetalle = cons.enGestionDetalle || [];
  const consolidadoCompleto = cons.consolidadoCompleto || [];
  const porEstado = informe?.consolidadoPorEstado || [];

  const tooltipStyle = {
    backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF',
    border: `1px solid ${isDark ? '#2D2D2D' : '#E6E6E6'}`,
    color: isDark ? '#F5F5F5' : '#1E1E1E',
    borderRadius: '8px',
  };
  const tickColor = isDark ? '#B0B0B0' : '#6B6B6B';
  const gridStroke = isDark ? '#2D2D2D' : '#E5E7EB';

  return (
    <div className={embedded ? '' : 'p-4'}>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className={complexSectionTitle}>{t("complex.ui.informe_indicadores2025complex.informe_general")}</h2>
          <p className="font-body text-sm text-gray-600 dark:text-gray-400">{t("complex.ui.informe_indicadores2025complex.genera_un_archivo_excel_con_indicadores_historicos_y_del")}</p>
        </div>
        <button
          type="button"
          onClick={handleExportar}
          disabled={exportando || !informe}
          className={`${complexBtnSecondary} inline-flex items-center gap-2 shrink-0`}
        >
          <FaFileExcel />
          {exportando ? t('complex.ui.informe_indicadores2025complex.generando') : t('complex.ui.informe_indicadores2025complex.descargar_informe_excel')}
        </button>
      </div>

      {errorExport && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {errorExport}
        </p>
      )}

      <ComplexFilterSection title={t("complex.ui.informe_indicadores2025complex.periodos_del_informe")}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">{t("complex.ui.informe_indicadores2025complex.indicadores_historicos")}</p>
            <div className="grid grid-cols-2 gap-3">
              <Campo label={t("complex.ui.informe_indicadores2025complex.desde")}>
                <InputFenix
                  type="date"
                  value={fechaDesdeHistorico}
                  onChange={(e) => setFechaDesdeHistorico(e.target.value)}
                />
              </Campo>
              <Campo label={t("complex.ui.informe_indicadores2025complex.hasta")}>
                <InputFenix
                  type="date"
                  value={fechaHastaHistorico}
                  onChange={(e) => setFechaHastaHistorico(e.target.value)}
                />
              </Campo>
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">{t("complex.ui.informe_indicadores2025complex.nuevo_protocolo_desde")}{PROTOCOLO_FECHA_ACTIVACION}{t("complex.ui.informe_indicadores2025complex.texto")}</p>
            <div className="grid grid-cols-2 gap-3">
              <Campo label={t("complex.ui.informe_indicadores2025complex.desde")}>
                <InputFenix
                  type="date"
                  value={fechaDesdeProtocolo}
                  onChange={(e) => setFechaDesdeProtocolo(e.target.value)}
                />
              </Campo>
              <Campo label={t("complex.ui.informe_indicadores2025complex.hasta")}>
                <InputFenix
                  type="date"
                  value={fechaHastaProtocolo}
                  onChange={(e) => setFechaHastaProtocolo(e.target.value)}
                />
              </Campo>
            </div>
          </div>
        </div>
      </ComplexFilterSection>

      <section className="mt-6" aria-label={t("complex.ui.informe_indicadores2025complex.vista_previa_del_informe")}>
        <h3 className="mb-4 font-heading text-base font-bold text-gray-900 dark:text-white">{t("complex.ui.informe_indicadores2025complex.vista_previa")}</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className={complexCard}>
            <p className="text-xs font-semibold uppercase tracking-wide text-fenix-primario">{t("complex.ui.informe_indicadores2025complex.historico")}</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {informe?.meta?.periodoHistorico}{t("complex.ui.informe_indicadores2025complex.texto_2")}{informe?.meta?.totalCasosHistorico}{t("complex.ui.informe_indicadores2025complex.caso_s")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ComplexMetricCard
                label={t("complex.ui.informe_indicadores2025complex.total_casos")}
                value={String(cons.total ?? hist['Total casos'] ?? 0)}
              />
              <ComplexMetricCard
                label={t("complex.ui.informe_indicadores2025complex.cierre_total")}
                value={`${cons.porcentajeCierreTotal ?? 0}%`}
              />
              <ComplexMetricCard
                label={t("complex.ui.informe_indicadores2025complex.cierre_exitoso_facturado")}
                value={String(cons.cierreExitoso ?? hist['Cierre exitoso (facturado)'] ?? hist['Cerrados (facturado)'] ?? 0)}
              />
              <ComplexMetricCard
                label={t("complex.ui.informe_indicadores2025complex.cierre_exitoso")}
                value={`${cons.porcentajeCierreExitoso ?? 0}%`}
              />
              <ComplexMetricCard
                label={t("complex.ui.informe_indicadores2025complex.otros_cerrados")}
                value={String(cons.otrosCerrados ?? 0)}
              />
              <ComplexMetricCard
                label={t("complex.ui.informe_indicadores2025complex.en_gestion")}
                value={`${cons.enGestion ?? 0} (${cons.porcentajeEnGestion ?? 0}%)`}
              />
              <ComplexMetricCard
                label={t("complex.ui.informe_indicadores2025complex.asignacion_contacto")}
                value={hist['Prom. Asignación → Primer contacto'] || '—'}
              />
              <ComplexMetricCard
                label={t("complex.ui.informe_indicadores2025complex.contacto_inspeccion")}
                value={hist['Prom. Primer contacto → Inspección'] || '—'}
              />
            </div>
            <p className="mt-3 text-xs text-gray-500">{t("complex.ui.informe_indicadores2025complex.cierre_total_facturado_desistido_anulado_total_cierre_ex")}</p>
          </div>

          <div className={complexCard}>
            <p className="text-xs font-semibold uppercase tracking-wide text-fenix-primario">{t("complex.ui.informe_indicadores2025complex.nuevo_protocolo")}</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {informe?.meta?.periodoProtocolo}{t("complex.ui.informe_indicadores2025complex.texto_2")}{informe?.meta?.totalCasosProtocolo}{t("complex.ui.informe_indicadores2025complex.caso_s")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ComplexMetricCard
                label={t("complex.ui.informe_indicadores2025complex.cumplimiento_general")}
                value={prot['Cumplimiento general'] || '—'}
              />
              <ComplexMetricCard
                label={t("complex.ui.informe_indicadores2025complex.total_casos")}
                value={String(prot['Total casos'] ?? informe?.meta?.totalCasosProtocolo ?? 0)}
              />
              <ComplexMetricCard
                label={t("complex.ui.informe_indicadores2025complex.asignacion_contacto")}
                value={prot['Prom. Asignación → Primer contacto'] || '—'}
              />
              <ComplexMetricCard
                label={t("complex.ui.informe_indicadores2025complex.contacto_en_plazo")}
                value={prot['% cumpl. Asignación → Primer contacto'] || '—'}
              />
            </div>
            <p className="mt-3 text-xs text-gray-500">{t("complex.ui.informe_indicadores2025complex.cumplimiento_y_tiempos_del_protocolo_desde")}{PROTOCOLO_FECHA_ACTIVACION}{t("complex.ui.informe_indicadores2025complex.los_facturados_del_ano_estan_en_historico_hoja_excel")}{' '}
              {informe?.protocoloPorAjustador?.length ?? 0}{t("complex.ui.informe_indicadores2025complex.ajustador_es")}</p>
          </div>
        </div>
      </section>

      <section className="mt-8" aria-label={t("complex.ui.informe_indicadores2025complex.consolidado_completo_por_estados")}>
        <h3 className="mb-1 font-heading text-base font-bold text-gray-900 dark:text-white">{t("complex.ui.informe_indicadores2025complex.consolidado_completo_por_estados")}</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{t("complex.ui.informe_indicadores2025complex.periodo")}{informe?.meta?.periodoHistorico || t('complex.ui.informe_indicadores2025complex.historico_default')}{t("complex.ui.informe_indicadores2025complex.conteo_real_por_estado_del_caso_igual_que_el_reporte")}</p>

        {/* 1. Casos cerrados — individuales */}
        <div className={`${complexCard} mb-4`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-fenix-primario">{t("complex.ui.informe_indicadores2025complex.1_casos_cerrados_individuales")}</p>
          <p className="mt-1 mb-3 text-sm text-gray-500 dark:text-gray-400">{t("complex.ui.informe_indicadores2025complex.facturado_exito_pagado_desistido_anulado_otros_cerrados_")}</p>
          <div className={complexTableWrap}>
            <table className={complexTableSimple}>
              <thead>
                <tr className={complexTableHead}>
                  <th className="text-left">{t("complex.ui.informe_indicadores2025complex.estado")}</th>
                  <th className="text-right">{t("complex.ui.informe_indicadores2025complex.casos")}</th>
                  <th className="text-left">{t("complex.ui.informe_indicadores2025complex.tipo_de_cierre")}</th>
                </tr>
              </thead>
              <tbody>
                {cerradosDetalle.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-sm text-gray-500">{t("complex.ui.informe_indicadores2025complex.sin_casos_cerrados_en_el_periodo")}</td>
                  </tr>
                ) : (
                  cerradosDetalle.map((fila) => (
                    <tr key={`cerrado-${fila.estado}`}>
                      <td className="px-3 py-2 text-sm font-medium">{fila.estado}</td>
                      <td className="px-3 py-2 text-right text-sm tabular-nums font-bold">
                        {fila.cantidad}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {fila.categoria === 'cierreExitoso'
                          ? t('complex.ui.informe_indicadores2025complex.exito_facturado_pagado')
                          : 'Finalizado — desistido / anulado'}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
                  <td className="px-3 py-2 text-sm font-bold">{t("complex.ui.informe_indicadores2025complex.total_cerrados")}</td>
                  <td className="px-3 py-2 text-right text-sm tabular-nums font-bold">
                    {cons.totalCerrados ?? 0}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {cons.porcentajeCierreTotal ?? 0}{t("complex.ui.informe_indicadores2025complex.del_total_facturado")}{cons.cierreExitoso ?? 0}{t("complex.ui.informe_indicadores2025complex.desistido_anulado")}{cons.otrosCerrados ?? 0}{t("complex.ui.informe_indicadores2025complex.texto")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. En gestión — individuales */}
        <div className={`${complexCard} mb-4`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-fenix-primario">{t("complex.ui.informe_indicadores2025complex.2_estados_en_gestion_individuales")}</p>
          <p className="mt-1 mb-3 text-sm text-gray-500 dark:text-gray-400">{t("complex.ui.informe_indicadores2025complex.cada_estado_pendiente_o_en_proceso_con_su_cantidad_real")}</p>
          <div className={complexTableWrap}>
            <table className={complexTableSimple}>
              <thead>
                <tr className={complexTableHead}>
                  <th className="text-left">{t("complex.ui.informe_indicadores2025complex.estado")}</th>
                  <th className="text-right">{t("complex.ui.informe_indicadores2025complex.casos")}</th>
                </tr>
              </thead>
              <tbody>
                {enGestionDetalle.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-3 text-sm text-gray-500">{t("complex.ui.informe_indicadores2025complex.sin_casos_en_gestion_en_el_periodo")}</td>
                  </tr>
                ) : (
                  enGestionDetalle.map((fila) => (
                    <tr key={`gestion-${fila.estado}`}>
                      <td className="px-3 py-2 text-sm">{fila.estado}</td>
                      <td className="px-3 py-2 text-right text-sm tabular-nums font-semibold">
                        {fila.cantidad}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
                  <td className="px-3 py-2 text-sm font-bold">{t("complex.ui.informe_indicadores2025complex.total_en_gestion")}</td>
                  <td className="px-3 py-2 text-right text-sm tabular-nums font-bold">
                    {cons.enGestion ?? 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Consolidado completo */}
        <div className={complexCard}>
          <p className="text-xs font-semibold uppercase tracking-wide text-fenix-primario">{t("complex.ui.informe_indicadores2025complex.3_consolidado_completo")}</p>
          <p className="mt-1 mb-3 text-sm text-gray-500 dark:text-gray-400">{t("complex.ui.informe_indicadores2025complex.todos_los_estados_totales_y_porcentaje_de_cierre_debe_cu")}</p>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <ComplexMetricCard label={t("complex.ui.informe_indicadores2025complex.facturado_exito")} value={String(cons.cierreExitoso ?? 0)} />
            <ComplexMetricCard
              label={t("complex.ui.informe_indicadores2025complex.cierre_exitoso")}
              value={`${cons.porcentajeCierreExitoso ?? 0}%`}
            />
            <ComplexMetricCard
              label={t("complex.ui.informe_indicadores2025complex.desistido_anulado_2")}
              value={String(cons.otrosCerrados ?? 0)}
            />
            <ComplexMetricCard
              label={t("complex.ui.informe_indicadores2025complex.total_cerrados_2")}
              value={`${cons.totalCerrados ?? 0} (${cons.porcentajeCierreTotal ?? 0}%)`}
            />
            <ComplexMetricCard
              label={t("complex.ui.informe_indicadores2025complex.en_gestion")}
              value={`${cons.enGestion ?? 0} (${cons.porcentajeEnGestion ?? 0}%)`}
            />
            <ComplexMetricCard label={t("complex.ui.informe_indicadores2025complex.total_general")} value={String(cons.total ?? 0)} />
          </div>
          <div className={complexTableWrap}>
            <table className={complexTableSimple}>
              <thead>
                <tr className={complexTableHead}>
                  <th className="text-left">{t("complex.ui.informe_indicadores2025complex.estado")}</th>
                  <th className="text-right">{t("complex.ui.informe_indicadores2025complex.casos")}</th>
                  <th className="text-right">{t("complex.ui.informe_indicadores2025complex.texto_3")}</th>
                  <th className="text-left">{t("complex.ui.informe_indicadores2025complex.clasificacion")}</th>
                </tr>
              </thead>
              <tbody>
                {(consolidadoCompleto.length ? consolidadoCompleto : porEstado).map((fila) => {
                  const estado = fila.estado || fila.Estado;
                  const cantidad = fila.cantidad ?? fila.Casos;
                  const porcentaje = fila.porcentaje ?? fila['%'];
                  const clasif = fila.etiquetaCategoria || fila.Clasificación;
                  const esTotal = fila.esTotal || estado === 'TOTAL GENERAL';
                  return (
                    <tr
                      key={`full-${estado}`}
                      className={
                        esTotal
                          ? 'border-t-2 border-fenix-primario/40 bg-fenix-primario/5 font-bold'
                          : ''
                      }
                    >
                      <td className="px-3 py-2 text-sm">{estado}</td>
                      <td className="px-3 py-2 text-right text-sm tabular-nums">{cantidad}</td>
                      <td className="px-3 py-2 text-right text-sm tabular-nums">
                        {porcentaje != null && porcentaje !== ''
                          ? String(porcentaje).includes('%')
                            ? porcentaje
                            : `${porcentaje}%`
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{clasif}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-8" aria-label={t("complex.ui.informe_indicadores2025complex.graficas_del_informe")}>
        <h3 className="mb-4 font-heading text-base font-bold text-gray-900 dark:text-white">{t("complex.ui.informe_indicadores2025complex.graficas_del_informe")}</h3>

        <div className="grid gap-6 xl:grid-cols-2">
          {graf.porcentajeCierre?.length > 0 && (
            <ComplexChartCard
              title={t("complex.ui.informe_indicadores2025complex.porcentaje_de_cierre")}
              subtitle={t('complex.ui.informe_indicadores2025complex.cierre_total_exito', { pctCierre: graf.porcentajeCierreTotal ?? cons.porcentajeCierreTotal ?? 0, pctExito: graf.porcentajeCierreExitoso ?? cons.porcentajeCierreExitoso ?? 0 })}
            >
              <ComplexChartPlot height={280}>
                <PieChart>
                  <Pie
                    data={graf.porcentajeCierre}
                    dataKey="valor"
                    nameKey="etiqueta"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {graf.porcentajeCierre.map((item) => (
                      <Cell key={item.etiqueta} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [`${v}%`, t('complex.ui.informe_indicadores2025complex.participacion')]}
                  />
                  <Legend />
                </PieChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}

          {graf.volumenCasos?.length > 0 && (
            <ComplexChartCard title={t("complex.ui.informe_indicadores2025complex.volumen_de_casos")} subtitle={t("complex.ui.informe_indicadores2025complex.comparativo_historico_vs_nuevo_protocolo")}>
              <ComplexChartPlot height={280}>
                <BarChart data={graf.volumenCasos} margin={{ top: 8, right: 16, left: 8, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="etiqueta"
                    tick={{ fill: tickColor, fontSize: 10 }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={64}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: tickColor, fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, t('complex.ui.informe_indicadores2025complex.casos')]} />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {graf.volumenCasos.map((_, i) => (
                      <Cell key={i} fill={COLORES_VOLUMEN[i % COLORES_VOLUMEN.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}

          {graf.consolidadoEstadosBarras?.length > 0 && (
            <ComplexChartCard
              title={t("complex.ui.informe_indicadores2025complex.casos_por_estado")}
              subtitle={t("complex.ui.informe_indicadores2025complex.consolidado_historico_numeros_reales_del_estado_del_caso")}
            >
              <ComplexChartPlot height={Math.max(280, graf.consolidadoEstadosBarras.length * 34)}>
                <BarChart
                  data={graf.consolidadoEstadosBarras}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={140}
                    tick={{ fill: tickColor, fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [v, t('complex.ui.informe_indicadores2025complex.casos')]}
                    labelFormatter={(_, p) => p?.[0]?.payload?.nombreCompleto || ''}
                  />
                  <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {graf.consolidadoEstadosBarras.map((item) => (
                      <Cell
                        key={item.nombreCompleto}
                        fill={
                          item.categoria === 'cierreExitoso'
                            ? '#16A34A'
                            : item.categoria === 'otrosCerrados'
                              ? '#C8102E'
                              : '#2563EB'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}

          {graf.protocoloCumplimiento?.length > 0 && (
            <ComplexChartCard
              title={t("complex.ui.informe_indicadores2025complex.cumplimiento_por_etapa_protocolo")}
              subtitle={`General: ${formatearPorcentajeCumplimiento(graf.cumplimientoGeneral)}`}
            >
              <ComplexChartPlot height={Math.max(280, graf.protocoloCumplimiento.length * 40)}>
                <BarChart
                  data={graf.protocoloCumplimiento}
                  layout="vertical"
                  margin={{ top: 8, right: 40, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: tickColor, fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="nombreCorto"
                    width={56}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [formatearPorcentajeCumplimiento(value), t('complex.ui.informe_indicadores2025complex.cumplimiento')]}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? `${item.nombre} · ${item.cumplidos}/${item.evaluables} en plazo` : '';
                    }}
                  />
                  <Bar dataKey="porcentaje" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {graf.protocoloCumplimiento.map((item) => (
                      <Cell key={item.orden} fill={colorBarraCumplimiento(item.porcentaje)} />
                    ))}
                  </Bar>
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}

          {graf.historicoTiempos?.length > 0 && (
            <ComplexChartCard title={t("complex.ui.informe_indicadores2025complex.tiempos_promedio_historico")} subtitle={t("complex.ui.informe_indicadores2025complex.dias_u_horas_aproximadas_por_etapa")}>
              <ComplexChartPlot height={Math.max(260, graf.historicoTiempos.length * 44)}>
                <BarChart
                  data={graf.historicoTiempos}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={{ fill: tickColor, fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="nombreCorto"
                    width={148}
                    tick={{ fill: tickColor, fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(_, __, props) => [props.payload.etiqueta, t('complex.ui.informe_indicadores2025complex.promedio')]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.nombre || ''}
                  />
                  <Bar dataKey="valor" fill="#C8102E" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}

          {graf.protocoloTiempos?.length > 0 && (
            <ComplexChartCard title={t("complex.ui.informe_indicadores2025complex.tiempos_promedio_protocolo")} subtitle={t("complex.ui.informe_indicadores2025complex.por_paso_de_la_secuencia_oficial")}>
              <ComplexChartPlot height={Math.max(260, graf.protocoloTiempos.length * 40)}>
                <BarChart
                  data={graf.protocoloTiempos}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={{ fill: tickColor, fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="nombreCorto"
                    width={56}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(_, __, props) => [props.payload.etiqueta, t('complex.ui.informe_indicadores2025complex.promedio')]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.nombre || ''}
                  />
                  <Bar dataKey="valor" fill="#2563EB" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}

          {graf.historicoEsperaDocs?.length > 0 && (
            <ComplexChartCard title={t("complex.ui.informe_indicadores2025complex.espera_de_documentos_por_responsable")} subtitle={t("complex.ui.informe_indicadores2025complex.historico_top_10")}>
              <ComplexChartPlot height={Math.max(280, graf.historicoEsperaDocs.length * 36)}>
                <BarChart
                  data={graf.historicoEsperaDocs}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={120}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [v, t('complex.ui.informe_indicadores2025complex.casos')]}
                    labelFormatter={(_, p) => p?.[0]?.payload?.nombreCompleto || ''}
                  />
                  <Bar dataKey="cantidad" fill="#F59E0B" radius={[0, 4, 4, 0]} maxBarSize={24} />
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}

          {graf.protocoloCasosPorAjustador?.length > 0 && (
            <ComplexChartCard title={t("complex.ui.informe_indicadores2025complex.casos_por_ajustador")} subtitle={t("complex.ui.informe_indicadores2025complex.nuevo_protocolo_top_10")}>
              <ComplexChartPlot height={Math.max(280, graf.protocoloCasosPorAjustador.length * 36)}>
                <BarChart
                  data={graf.protocoloCasosPorAjustador}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={120}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [v, t('complex.ui.informe_indicadores2025complex.casos')]}
                    labelFormatter={(_, p) => p?.[0]?.payload?.nombreCompleto || ''}
                  />
                  <Bar dataKey="casos" name={t('complex.ui.informe_indicadores2025complex.casos')} fill="#2563EB" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}

          {graf.protocoloCumplimientoAjustador?.length > 0 && (
            <ComplexChartCard
              title={t("complex.ui.informe_indicadores2025complex.cumplimiento_por_ajustador")}
              subtitle={t("complex.ui.informe_indicadores2025complex.nuevo_protocolo_menor_a_mayor")}
            >
              <ComplexChartPlot height={Math.max(280, graf.protocoloCumplimientoAjustador.length * 36)}>
                <BarChart
                  data={graf.protocoloCumplimientoAjustador}
                  layout="vertical"
                  margin={{ top: 8, right: 40, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: tickColor, fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={120}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [formatearPorcentajeCumplimiento(v), t('complex.ui.informe_indicadores2025complex.cumplimiento')]}
                    labelFormatter={(_, p) => p?.[0]?.payload?.nombreCompleto || ''}
                  />
                  <Bar dataKey="porcentaje" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {graf.protocoloCumplimientoAjustador.map((item) => (
                      <Cell key={item.nombreCompleto} fill={colorBarraCumplimiento(item.porcentaje)} />
                    ))}
                  </Bar>
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}
        </div>
      </section>

      <div className={`${complexCard} mt-6 flex items-start gap-3`}>
        <FaDownload className="mt-1 shrink-0 text-fenix-primario" />
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{t("complex.ui.informe_indicadores2025complex.contenido_del_archivo_excel")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400">
            <li>{t("complex.ui.informe_indicadores2025complex.portada_periodos_fechas_y_notas_metodologicas")}</li>
            <li>{t("complex.ui.informe_indicadores2025complex.historico_resumen_y_por_ajustador")}</li>
            <li>{t("complex.ui.informe_indicadores2025complex.protocolo_resumen_y_por_ajustador_tiempos_y_cumplimiento")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InformeIndicadores2025Complex;
