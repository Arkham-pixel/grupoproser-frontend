import { useTranslation } from 'react-i18next';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import { getSiniestrosEnriquecidos } from '../services/siniestrosApi';
import { obtenerCasosComplex } from '../services/complexService';
import { obtenerResponsables } from '../services/riesgoService';
import Loader from './Loader';
import { useTheme } from '../context/ThemeContext';
import {
  combinarCasosComplex,
  calcularIndicadoresGlobales,
  calcularIndicadoresPorResponsable,
  filtrarCasosPorPeriodo,
  formatearTiempoPromedio,
  FECHA_INICIO_INDICADORES_COMPLEX_LABEL,
} from '../utils/complexTrazabilidadUtils.js';
import {
  complexDashboardRoot,
  complexDashboardWrap,
  complexScope,
  complexSectionTitle,
  complexTableHead,
  complexTableSimple,
  complexTableWrap,
  getFenixChartColor,
} from './SubcomponenteCompex/complexFenixUi.js';
import {
  Campo,
  ComplexChartCard,
  ComplexChartPlot,
  ComplexFilterSection,
  ComplexMetricCard,
  ComplexPageHeader,
  InputFenix,
  SelectFenix,
} from './SubcomponenteCompex/ComplexUiBlocks.jsx';

const IndicadoresHistoricosComplex = ({ embedded = false }) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const dateLang = String(i18n.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  const datePlaceholder = t('complex.ui.indicadores_historicos_complex.placeholder_fecha');

  const INDICADORES_KPI = useMemo(
    () => [
      {
        clave: 'promedioAsignacionContacto',
        muestra: 'asignacionContacto',
        titulo: t('complex.ui.indicadores_historicos_complex.kpi_asignacion_contacto'),
        descripcion: t('complex.ui.indicadores_historicos_complex.kpi_asignacion_contacto_desc'),
      },
      {
        clave: 'promedioContactoInspeccion',
        muestra: 'contactoInspeccion',
        titulo: t('complex.ui.indicadores_historicos_complex.kpi_contacto_inspeccion'),
        descripcion: t('complex.ui.indicadores_historicos_complex.kpi_contacto_inspeccion_desc'),
      },
      {
        clave: 'promedioEtapaPreliminar',
        muestra: 'etapaPreliminar',
        titulo: t('complex.ui.indicadores_historicos_complex.kpi_inspeccion_preliminar'),
        descripcion: t('complex.ui.indicadores_historicos_complex.kpi_inspeccion_preliminar_desc'),
      },
      {
        clave: 'promedioUltimoDocInformeFinal',
        muestra: 'ultimoDocInformeFinal',
        titulo: t('complex.ui.indicadores_historicos_complex.kpi_ultimo_doc_final'),
        descripcion: t('complex.ui.indicadores_historicos_complex.kpi_ultimo_doc_final_desc'),
      },
    ],
    [t]
  );

  const [casos, setCasos] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('2025-01-01');
  const [fechaHasta, setFechaHasta] = useState('');
  const [responsableFiltro, setResponsableFiltro] = useState('');

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const [siniestrosData, complexData, responsablesData] = await Promise.allSettled([
          getSiniestrosEnriquecidos(),
          obtenerCasosComplex(),
          obtenerResponsables(),
        ]);

        const siniestros =
          siniestrosData.status === 'fulfilled' && Array.isArray(siniestrosData.value)
            ? siniestrosData.value
            : [];
        const complex =
          complexData.status === 'fulfilled' && Array.isArray(complexData.value)
            ? complexData.value
            : [];

        setCasos(combinarCasosComplex(siniestros, complex));

        const resp =
          responsablesData.status === 'fulfilled'
            ? responsablesData.value?.success && responsablesData.value?.data
              ? responsablesData.value.data
              : Array.isArray(responsablesData.value)
                ? responsablesData.value
                : []
            : [];
        setResponsables(resp);
      } catch (error) {
        console.error('Error cargando indicadores históricos:', error);
        setCasos([]);
        setResponsables([]);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  const getNombreResponsable = useCallback((caso) => {
    if (
      caso.nombreResponsable &&
      caso.nombreResponsable !== 'Sin asignar' &&
      caso.nombreResponsable.toLowerCase() !== 'sin asignar'
    ) {
      return caso.nombreResponsable;
    }
    if (caso.responsable_form && caso.responsable_form !== 'Sin asignar') {
      return caso.responsable_form;
    }
    if (caso.responsable && caso.responsable !== 'Sin asignar') {
      return caso.responsable;
    }

    const codigo = caso.codiRespnsble ?? caso.codi_responble ?? caso.responsable;
    if (!codigo || codigo === 'Sin asignar') return t('complex.ui.indicadores_historicos_complex.sin_asignar');

    const responsable = responsables.find(
      (r) =>
        String(r.codiRespnsble) === String(codigo) ||
        String(r.codigo) === String(codigo) ||
        r.nmbrRespnsble === String(codigo) ||
        r.nombre === String(codigo)
    );

    return responsable?.nmbrRespnsble || responsable?.nombre || String(codigo);
  }, [responsables, t]);

  const casosFiltrados = useMemo(() => {
    let filtrados = filtrarCasosPorPeriodo(casos, fechaDesde, fechaHasta);

    if (responsableFiltro) {
      filtrados = filtrados.filter(
        (caso) => getNombreResponsable(caso) === responsableFiltro
      );
    }

    return filtrados;
  }, [casos, fechaDesde, fechaHasta, responsableFiltro, getNombreResponsable]);

  const indicadoresGlobales = useMemo(
    () => calcularIndicadoresGlobales(casosFiltrados),
    [casosFiltrados]
  );

  const indicadoresPorResponsable = useMemo(
    () =>
      calcularIndicadoresPorResponsable(casosFiltrados, getNombreResponsable, {
        catalogoResponsables: responsables,
      }),
    [casosFiltrados, responsables, getNombreResponsable]
  );

  const responsablesUnicos = useMemo(() => {
    const sinAsignar = t('complex.ui.indicadores_historicos_complex.sin_asignar');
    const nombres = new Set([sinAsignar]);
    casos.forEach((caso) => {
      const nombre = getNombreResponsable(caso);
      if (nombre) nombres.add(nombre);
    });
    return Array.from(nombres)
      .sort((a, b) => {
        if (a === sinAsignar) return -1;
        if (b === sinAsignar) return 1;
        return a.localeCompare(b);
      })
      .map((nombre) => ({ value: nombre, label: nombre }));
  }, [casos, getNombreResponsable, t]);

  const chartEsperaDocumentos = useMemo(
    () =>
      indicadoresPorResponsable
        .filter((r) => r.casosEsperaDocumentos > 0)
        .slice(0, 12)
        .map((r) => ({
          nombre: r.nombre.length > 22 ? `${r.nombre.slice(0, 20)}…` : r.nombre,
          nombreCompleto: r.nombre,
          cantidad: r.casosEsperaDocumentos,
        })),
    [indicadoresPorResponsable]
  );

  const limpiarFiltros = () => {
    setFechaDesde('2025-01-01');
    setFechaHasta('');
    setResponsableFiltro('');
  };

  const tooltipStyle = {
    backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF',
    border: `1px solid ${isDark ? '#2D2D2D' : '#E6E6E6'}`,
    color: isDark ? '#F5F5F5' : '#1E1E1E',
    borderRadius: '8px',
  };
  const tickColor = isDark ? '#B0B0B0' : '#6B6B6B';
  const gridStroke = isDark ? '#2D2D2D' : '#E5E7EB';

  if (loading) {
    return embedded ? <Loader /> : (
      <div className={complexDashboardRoot}>
        <Loader />
      </div>
    );
  }

  const contenido = (
    <>
        {!embedded && (
          <ComplexPageHeader
            badge="Complex"
            title={t("complex.ui.indicadores_historicos_complex.indicadores_historicos_de_gestion")}
            subtitle={`Tiempos de trazabilidad desde ${FECHA_INICIO_INDICADORES_COMPLEX_LABEL} a la fecha. Los promedios se calculan por responsable (ajustador asignado al caso).`}
            activePath="/complex/indicadores-alertas"
          />
        )}

        <ComplexFilterSection
          title={t("complex.ui.indicadores_historicos_complex.filtros_de_busqueda")}
          showClear={Boolean(fechaHasta || responsableFiltro || fechaDesde !== '2025-01-01')}
          onClear={limpiarFiltros}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Campo label={t("complex.ui.indicadores_historicos_complex.desde")}>
              <InputFenix
                type="date"
                lang={dateLang}
                title={datePlaceholder}
                placeholder={datePlaceholder}
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </Campo>
            <Campo label={t("complex.ui.indicadores_historicos_complex.hasta")}>
              <InputFenix
                type="date"
                lang={dateLang}
                title={datePlaceholder}
                placeholder={datePlaceholder}
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </Campo>
            <Campo label={t("complex.ui.indicadores_historicos_complex.responsable")}>
              <SelectFenix value={responsableFiltro} onChange={(e) => setResponsableFiltro(e.target.value)}>
                <option value="">{t("complex.ui.indicadores_historicos_complex.todos")}</option>
                {responsablesUnicos.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
          </div>
        </ComplexFilterSection>

        <p className="font-body text-sm text-gray-500 dark:text-gray-400">
          {indicadoresGlobales.totalCasos}{t("complex.ui.indicadores_historicos_complex.siniestro_s_en_el_periodo_seleccionado")}{responsableFiltro ? t('complex.ui.indicadores_historicos_complex.filtrado_por', { nombre: responsableFiltro }) : ''}{t("complex.ui.indicadores_historicos_complex.texto")}</p>

        <section aria-label={t("complex.ui.indicadores_historicos_complex.indicadores_globales")}>
          <h2 className={complexSectionTitle}>{t("complex.ui.indicadores_historicos_complex.resumen_del_periodo")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {INDICADORES_KPI.map((ind) => (
              <ComplexMetricCard
                key={ind.clave}
                label={ind.titulo}
                value={formatearTiempoPromedio(indicadoresGlobales[ind.clave])}
                hint={t('complex.ui.indicadores_historicos_complex.casos_ambas_fechas', {
                  count: indicadoresGlobales.muestras[ind.muestra],
                  descripcion: ind.descripcion,
                })}
              />
            ))}
            <ComplexMetricCard
              label={t("complex.ui.indicadores_historicos_complex.cerrados_facturado")}
              value={String(indicadoresGlobales.cerradosPeriodo ?? 0)}
              hint={t("complex.ui.indicadores_historicos_complex.casos_con_estado_facturado_en_el_periodo_cierre_operativ")}
            />
            <ComplexMetricCard
              label={t("complex.ui.indicadores_historicos_complex.en_espera_de_documentos")}
              value={String(indicadoresGlobales.casosEsperaDocumentos)}
              hint={t("complex.ui.indicadores_historicos_complex.siniestros_con_inspeccion_o_solicitud_de_documentos_real")}
            />
          </div>
        </section>

        <section aria-label={t("complex.ui.indicadores_historicos_complex.indicadores_por_responsable")} className="mt-8">
          <h2 className={complexSectionTitle}>{t("complex.ui.indicadores_historicos_complex.desglose_por_responsable")}</h2>
          <div className={complexTableWrap}>
            <table className={complexTableSimple}>
              <thead>
                <tr className={complexTableHead}>
                  <th className="text-left">{t("complex.ui.indicadores_historicos_complex.responsable")}</th>
                  <th className="text-right">{t("complex.ui.indicadores_historicos_complex.casos")}</th>
                  <th className="text-right">{t("complex.ui.indicadores_historicos_complex.asignacion_primer_contacto")}</th>
                  <th className="text-right">{t("complex.ui.indicadores_historicos_complex.primer_contacto_inspeccion")}</th>
                  <th className="text-right">{t("complex.ui.indicadores_historicos_complex.inspeccion_o_solicitud_preliminar")}</th>
                  <th className="text-right">{t("complex.ui.indicadores_historicos_complex.ultimo_documento_informe_final")}</th>
                  <th className="text-right">{t("complex.ui.indicadores_historicos_complex.espera_docs")}</th>
                </tr>
              </thead>
              <tbody>
                {indicadoresPorResponsable.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">{t("complex.ui.indicadores_historicos_complex.no_hay_casos_para_los_filtros_seleccionados")}</td>
                  </tr>
                ) : (
                  indicadoresPorResponsable.map((fila) => (
                    <tr
                      key={fila.nombre}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-4 py-3 font-medium">{fila.nombre}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fila.totalCasos}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatearTiempoPromedio(fila.promedioAsignacionContacto)}
                        {fila.muestras.asignacionContacto > 0 && (
                          <span className="ml-1 text-xs text-gray-400">{t("complex.ui.indicadores_historicos_complex.texto_2")}{fila.muestras.asignacionContacto}{t("complex.ui.indicadores_historicos_complex.texto_3")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatearTiempoPromedio(fila.promedioContactoInspeccion)}
                        {fila.muestras.contactoInspeccion > 0 && (
                          <span className="ml-1 text-xs text-gray-400">{t("complex.ui.indicadores_historicos_complex.texto_2")}{fila.muestras.contactoInspeccion}{t("complex.ui.indicadores_historicos_complex.texto_3")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatearTiempoPromedio(fila.promedioEtapaPreliminar)}
                        {fila.muestras.etapaPreliminar > 0 && (
                          <span className="ml-1 text-xs text-gray-400">{t("complex.ui.indicadores_historicos_complex.texto_2")}{fila.muestras.etapaPreliminar}{t("complex.ui.indicadores_historicos_complex.texto_3")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatearTiempoPromedio(fila.promedioUltimoDocInformeFinal)}
                        {fila.muestras.ultimoDocInformeFinal > 0 && (
                          <span className="ml-1 text-xs text-gray-400">{t("complex.ui.indicadores_historicos_complex.texto_2")}{fila.muestras.ultimoDocInformeFinal}{t("complex.ui.indicadores_historicos_complex.texto_3")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                        {fila.casosEsperaDocumentos}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">{t("complex.ui.indicadores_historicos_complex.entre_parentesis_cantidad_de_casos_con_ambas_fechas_regi")}</p>
        </section>

        {chartEsperaDocumentos.length > 0 && (
          <section className="mt-8" aria-label={t("complex.ui.indicadores_historicos_complex.grafica_espera_de_documentos")}>
            <ComplexChartCard title={t("complex.ui.indicadores_historicos_complex.siniestros_en_espera_de_documentos_por_responsable")}>
              <ComplexChartPlot height={Math.max(280, chartEsperaDocumentos.length * 36)}>
                <BarChart
                  data={chartEsperaDocumentos}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: tickColor, fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={140}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [value, t('complex.ui.indicadores_historicos_complex.en_espera')]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.nombreCompleto || ''}
                  />
                  <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {chartEsperaDocumentos.map((_, index) => (
                      <Cell key={index} fill={getFenixChartColor(index, isDark)} />
                    ))}
                  </Bar>
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          </section>
        )}
    </>
  );

  if (embedded) return contenido;

  return (
    <div className={complexDashboardRoot}>
      <div className={`${complexScope} ${complexDashboardWrap}`}>
        {contenido}
      </div>
    </div>
  );
};

export default IndicadoresHistoricosComplex;
