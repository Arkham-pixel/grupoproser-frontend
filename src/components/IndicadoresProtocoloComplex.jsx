import { useTranslation } from 'react-i18next';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import { getSiniestrosEnriquecidos } from '../services/siniestrosApi';
import { obtenerCasosComplex } from '../services/complexService';
import { obtenerResponsables, obtenerAseguradoras } from '../services/riesgoService';
import Loader from './Loader';
import { useTheme } from '../context/ThemeContext';
import {
  agruparIndicadoresProtocolo,
  calcularIndicadoresProtocoloGlobales,
  combinarCasosComplex,
  filtrarCasosProtocolo,
  formatearTiempoPromedio,
  FECHA_INICIO_PROTOCOLO_COMPLEX_LABEL,
  resolverGrupoAjustador,
  resolverGrupoCompania,
  resolverGrupoRamo,
} from '../utils/complexTrazabilidadUtils.js';
import {
  complexDashboardRoot,
  complexDashboardWrap,
  complexScope,
  complexSectionTitle,
  complexTableHead,
  complexTableSimple,
  complexTableWrap,
  complexBtnGhost,
  complexCard,
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
import { useProtocoloSiniestros } from '../hooks/useProtocoloSiniestros.js';
import {
  INDICADORES_PROTOCOLO_DEF,
  PROTOCOLO_DOCUMENTO,
  SECUENCIA_INDICADORES_TIEMPO,
  TIEMPOS_OBJETIVO_SERVICIO,
  plazoObjetivoIndicador,
} from '../config/protocoloSiniestrosDefaults.js';
import {
  agruparCumplimientoProtocolo,
  calcularCumplimientoProtocoloGlobales,
  claseColorCumplimiento,
  colorBarraCumplimiento,
  datosChartCumplimientoProtocolo,
  formatearPorcentajeCumplimiento,
} from '../utils/complexProtocoloCumplimientoUtils.js';

const INDICADOR_I18N = {
  promedioAsignacionContacto: 'ind_asignacion_contacto',
  promedioContactoInspeccion: 'ind_contacto_inspeccion',
  promedioInspeccionSolicitudDocs: 'ind_inspeccion_docs',
  promedioEtapaPreliminar: 'ind_preliminar',
  promedioUltimoDocInformeFinal: 'ind_final',
  promedioInformeFinalAutorizacion: 'ind_autorizacion',
  promedioAprobacionPresentacion: 'ind_presentacion',
  promedioAsignacionCierre: 'ind_cierre',
};

function traducirIndicadorDef(def, t) {
  const prefix = INDICADOR_I18N[def.clave];
  if (!prefix) {
    return {
      ...def,
      label: def.label,
      desdeLegible: def.desdeLegible || '',
      hastaLegible: def.hastaLegible || '',
      plazoLegible: def.plazoLegible || def.plazoObjetivo || '',
      plazoObjetivo: def.plazoObjetivo || '',
    };
  }
  const base = 'complex.ui.indicadores_protocolo_complex';
  return {
    ...def,
    label: t(`${base}.${prefix}_label`),
    desdeLegible: t(`${base}.${prefix}_desde`, { defaultValue: def.desdeLegible || '' }),
    hastaLegible: t(`${base}.${prefix}_hasta`, { defaultValue: def.hastaLegible || '' }),
    plazoLegible: t(`${base}.${prefix}_plazo`, { defaultValue: def.plazoLegible || '' }),
    plazoObjetivo: t(`${base}.${prefix}_objetivo`, { defaultValue: def.plazoObjetivo || '' }),
  };
}

const ETAPAS_DESGLOSE_BASE = INDICADORES_PROTOCOLO_DEF.filter(
  (item) => item.etapaId && item.imputableAjustador !== false
).map((def, index) => ({
  clave: def.clave,
  muestra: def.muestra,
  orden: index + 1,
  def,
}));

function buildEtapasDesglose(t) {
  return ETAPAS_DESGLOSE_BASE.map(({ def, orden, clave, muestra }) => ({
    clave,
    muestra,
    orden,
    ...traducirIndicadorDef(def, t),
  }));
}

const RESUMEN_PLAZOS_I18N = [
  { etapaId: 'contactoInicial', valorKey: 'resumen_plazo_contacto_valor', tituloKey: 'resumen_plazo_contacto_titulo' },
  { etapaId: 'informePreliminar', valorKey: 'resumen_plazo_preliminar_valor', tituloKey: 'resumen_plazo_preliminar_titulo' },
  { etapaId: 'inspeccion', valorKey: 'resumen_plazo_inspeccion_valor', tituloKey: 'resumen_plazo_inspeccion_titulo' },
  { etapaId: 'informeFinal', valorKey: 'resumen_plazo_final_valor', tituloKey: 'resumen_plazo_final_titulo' },
];

const UNIDAD_POR_MUESTRA = Object.fromEntries(
  SECUENCIA_INDICADORES_TIEMPO.map((s) => [s.muestra, s.unidad || 'dias'])
);

function formatearEtiquetaPeriodo(fechaDesde, fechaHasta, t, locale = 'es-CO') {
  const formatear = (valor) => {
    if (!valor) return null;
    const [year, month, day] = valor.split('-').map(Number);
    if (!year || !month || !day) return valor;
    return new Date(year, month - 1, day).toLocaleDateString(locale);
  };

  const desde = formatear(fechaDesde) || FECHA_INICIO_PROTOCOLO_COMPLEX_LABEL;
  const hasta = formatear(fechaHasta);
  return hasta
    ? `${desde} – ${hasta}`
    : t('complex.ui.indicadores_protocolo_complex.periodo_desde', { desde });
}

function CeldaPromedio({ valor, muestra, unidad }) {
  const { t } = useTranslation();
  return (
    <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
      {formatearTiempoPromedio(valor, t, unidad)}
      {muestra > 0 && <span className="ml-1 text-xs text-gray-400">{t("complex.ui.indicadores_protocolo_complex.texto")}{muestra}{t("complex.ui.indicadores_protocolo_complex.texto_2")}</span>}
    </td>
  );
}

function CeldaCumplimiento({ datos, className = '' }) {
  const { t } = useTranslation();
  if (!datos || datos.evaluables === 0) {
    return <td className={`px-3 py-3 text-right tabular-nums text-gray-400 ${className}`}>{t("complex.ui.indicadores_protocolo_complex.texto_3")}</td>;
  }

  return (
    <td
      className={`px-3 py-3 text-right tabular-nums whitespace-nowrap ${claseColorCumplimiento(datos.porcentaje)} ${className}`}
      title={t('complex.ui.indicadores_protocolo_complex.etapas_en_plazo', {
        cumplidos: datos.cumplidos,
        evaluables: datos.evaluables,
      })}
    >
      {formatearPorcentajeCumplimiento(datos.porcentaje)}
      <span className="ml-1 text-xs font-normal text-gray-400">{t("complex.ui.indicadores_protocolo_complex.texto")}{datos.cumplidos}{t("complex.ui.indicadores_protocolo_complex.texto_4")}{datos.evaluables}{t("complex.ui.indicadores_protocolo_complex.texto_2")}</span>
    </td>
  );
}

function EncabezadoEtapaTabla({ etapa }) {
  const { t } = useTranslation();
  return (
    <th
      className="align-top border-l border-gray-200 px-2 py-2 text-left dark:border-gray-700 min-w-[132px] max-w-[152px]"
      title={etapa.label}
    >
      <span className="inline-block rounded-md bg-fenix-primario/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fenix-primario">{t('complex.ui.indicadores_protocolo_complex.paso_n', { n: etapa.orden })}
      </span>
      <p className="mt-1.5 text-[11px] font-semibold leading-snug text-gray-800 dark:text-gray-100">
        {t('complex.ui.indicadores_protocolo_complex.de_desde', { desde: etapa.desdeLegible })}
      </p>
      <p className="text-[11px] leading-snug text-gray-600 dark:text-gray-300">
        {t('complex.ui.indicadores_protocolo_complex.a_hasta', { hasta: etapa.hastaLegible })}
      </p>
      <p className="mt-1 text-[10px] leading-snug text-gray-500 dark:text-gray-400">
        {t('complex.ui.indicadores_protocolo_complex.plazo_valor', { plazo: etapa.plazoLegible })}
      </p>
    </th>
  );
}

function CeldaEtapaResumen({ valor, muestra, cumplimiento, plazoObjetivo, unidad }) {
  const { t } = useTranslation();
  return (
    <td
      className="px-2 py-2.5 text-right align-top min-w-[96px] border-l border-gray-100 dark:border-gray-800"
      title={plazoObjetivo || undefined}
    >
      <p className="font-medium tabular-nums text-sm text-gray-900 dark:text-gray-100">
        {formatearTiempoPromedio(valor, t, unidad)}
      </p>
      {cumplimiento?.evaluables > 0 ? (
        <p
          className={`mt-0.5 text-xs tabular-nums font-semibold ${claseColorCumplimiento(cumplimiento.porcentaje)}`}
          title={t('complex.ui.indicadores_protocolo_complex.en_plazo_corto', {
            cumplidos: cumplimiento.cumplidos,
            evaluables: cumplimiento.evaluables,
          })}
        >
          {formatearPorcentajeCumplimiento(cumplimiento.porcentaje)}
        </p>
      ) : (
        <p className="mt-0.5 text-xs text-gray-400">{t("complex.ui.indicadores_protocolo_complex.sin")}</p>
      )}
      {muestra > 0 && (
        <p className="mt-0.5 text-[10px] text-gray-400 tabular-nums">{muestra}{t("complex.ui.indicadores_protocolo_complex.caso_s")}</p>
      )}
    </td>
  );
}

function TarjetaEtapaConsolidado({ etapa, valor, muestra, cumplimiento, protocolo }) {
  const { t } = useTranslation();
  const pct = cumplimiento?.evaluables > 0 ? cumplimiento.porcentaje : null;

  return (
    <div
      className="flex min-w-[176px] max-w-[196px] shrink-0 flex-col rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-[#1A1A1A]"
      title={t('complex.ui.indicadores_protocolo_complex.objetivo_simple', {
        objetivo: plazoObjetivoIndicador(etapa.clave, protocolo, t, etapa.plazoObjetivo),
      })}
    >
      <span className="inline-block w-fit rounded-md bg-fenix-primario/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fenix-primario">{t('complex.ui.indicadores_protocolo_complex.paso_n', { n: etapa.orden })}
      </span>
      <p className="mt-2 text-sm font-semibold leading-snug text-gray-900 dark:text-white">
        {t('complex.ui.indicadores_protocolo_complex.de_desde', { desde: etapa.desdeLegible })}
      </p>
      <p className="text-sm leading-snug text-gray-600 dark:text-gray-300">
        {t('complex.ui.indicadores_protocolo_complex.a_hasta', { hasta: etapa.hastaLegible })}
      </p>
      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
        {t('complex.ui.indicadores_protocolo_complex.plazo_valor', { plazo: etapa.plazoLegible })}
      </p>
      <p className="mt-2 font-accent text-lg font-bold tabular-nums text-gray-900 dark:text-white">
        {formatearTiempoPromedio(valor, t, UNIDAD_POR_MUESTRA[etapa.muestra])}
      </p>
      {pct != null ? (
        <p className={`mt-1 text-sm font-semibold tabular-nums ${claseColorCumplimiento(pct)}`}>
          {formatearPorcentajeCumplimiento(pct)}
          <span className="ml-1 text-xs font-normal text-gray-400">{t("complex.ui.indicadores_protocolo_complex.texto")}{cumplimiento.cumplidos}{t("complex.ui.indicadores_protocolo_complex.texto_4")}{cumplimiento.evaluables}{t("complex.ui.indicadores_protocolo_complex.texto_2")}</span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-gray-400">{t("complex.ui.indicadores_protocolo_complex.sin_datos_de_cumplimiento")}</p>
      )}
      {muestra > 0 && (
        <p className="mt-1 text-[10px] text-gray-400">{muestra}{t("complex.ui.indicadores_protocolo_complex.caso_s_medidos")}</p>
      )}
    </div>
  );
}

function FilaDesgloseTabla({
  fila,
  modoTabla,
  esConsolidado = false,
  etapas = [],
}) {
  const filaClass = esConsolidado
    ? 'border-b-2 border-fenix-primario/30 bg-fenix-primario/5 dark:bg-red-950/20 font-semibold'
    : 'border-b border-gray-100 dark:border-gray-800';

  const celdaGrupoClass = esConsolidado
    ? 'px-3 py-3 font-bold sticky left-0 bg-red-50 dark:bg-[#221010] z-10 text-fenix-primario'
    : 'px-3 py-3 font-medium sticky left-0 bg-white dark:bg-[#1A1A1A] z-10';

  return (
    <tr className={filaClass}>
      <td className={celdaGrupoClass}>{fila.nombre}</td>
      <td className="px-3 py-3 text-right tabular-nums">{fila.totalCasos}</td>
      <CeldaCumplimiento datos={fila.cumplimiento?.general} className={esConsolidado ? 'font-semibold' : ''} />
      {modoTabla === 'resumen' ? (
        etapas.map((etapa) => (
          <CeldaEtapaResumen
            key={etapa.muestra}
            valor={fila[etapa.clave]}
            muestra={fila.muestras?.[etapa.muestra]}
            cumplimiento={fila.cumplimiento?.[etapa.muestra]}
            plazoObjetivo={etapa.plazoObjetivo}
            unidad={UNIDAD_POR_MUESTRA[etapa.muestra]}
          />
        ))
      ) : (
        <>
          {etapas.map((col) => (
            <CeldaPromedio
              key={col.clave}
              valor={fila[col.clave]}
              muestra={fila.muestras?.[col.muestra]}
              unidad={UNIDAD_POR_MUESTRA[col.muestra]}
            />
          ))}
          {etapas.map((col) => (
            <CeldaCumplimiento
              key={`pct-${col.muestra}`}
              datos={fila.cumplimiento?.[col.muestra]}
            />
          ))}
        </>
      )}
      <td className="px-3 py-3 text-right tabular-nums">{fila.cerradosPeriodo}</td>
      <td
        className={`px-3 py-3 text-right tabular-nums ${
          fila.pendientesDocs30Dias > 0
            ? 'font-semibold text-amber-600 dark:text-amber-400'
            : ''
        }`}
      >
        {fila.pendientesDocs30Dias}
      </td>
    </tr>
  );
}

const IndicadoresProtocoloComplex = ({ embedded = false }) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { protocolo } = useProtocoloSiniestros();
  const dateLang = String(i18n.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  const datePlaceholder = t('complex.ui.indicadores_protocolo_complex.placeholder_fecha');
  const ETAPAS_DESGLOSE = useMemo(() => buildEtapasDesglose(t), [t]);
  const indicadoresTraducidos = useMemo(
    () => INDICADORES_PROTOCOLO_DEF.map((def) => traducirIndicadorDef(def, t)),
    [t]
  );
  const resumenPlazos = useMemo(
    () =>
      RESUMEN_PLAZOS_I18N.map((item) => ({
        etapaId: item.etapaId,
        valor: t(`complex.ui.indicadores_protocolo_complex.${item.valorKey}`),
        titulo: t(`complex.ui.indicadores_protocolo_complex.${item.tituloKey}`),
      })),
    [t]
  );
  const notasProtocolo = useMemo(
    () => [1, 2, 3, 4, 5, 6, 7].map((n) => t(`complex.ui.indicadores_protocolo_complex.nota_${n}`)),
    [t]
  );

  const MODOS_TABLA_DESGLOSE = useMemo(
    () => [
      { value: 'resumen', label: t('complex.ui.indicadores_protocolo_complex.vista_resumen') },
      { value: 'detalle', label: t('complex.ui.indicadores_protocolo_complex.vista_detallada') },
    ],
    [t]
  );

  const VISTAS = useMemo(
    () => [
      { value: 'ajustador', label: t('complex.ui.indicadores_protocolo_complex.por_ajustador') },
      { value: 'compania', label: t('complex.ui.indicadores_protocolo_complex.por_compania') },
      { value: 'ramo', label: t('complex.ui.indicadores_protocolo_complex.por_ramo') },
    ],
    [t]
  );

  const [casos, setCasos] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [aseguradoras, setAseguradoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('2025-10-01');
  const [fechaHasta, setFechaHasta] = useState('');
  const [vista, setVista] = useState('ajustador');
  const [modoTablaDesglose, setModoTablaDesglose] = useState('resumen');

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const [siniestrosData, complexData, responsablesData, aseguradorasData] =
          await Promise.allSettled([
            getSiniestrosEnriquecidos(),
            obtenerCasosComplex(),
            obtenerResponsables(),
            obtenerAseguradoras(),
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

        const aseg =
          aseguradorasData.status === 'fulfilled'
            ? aseguradorasData.value?.success && aseguradorasData.value?.data
              ? aseguradorasData.value.data
              : Array.isArray(aseguradorasData.value)
                ? aseguradorasData.value
                : []
            : [];
        setAseguradoras(aseg);
      } catch (error) {
        console.error('Error cargando indicadores de protocolo:', error);
        setCasos([]);
        setResponsables([]);
        setAseguradoras([]);
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

    const codigo = caso.codiRespnsble ?? caso.codi_responble ?? caso.responsable;
    if (!codigo || codigo === 'Sin asignar') {
      return t('complex.ui.indicadores_protocolo_complex.sin_asignar');
    }

    const responsable = responsables.find(
      (r) =>
        String(r.codiRespnsble) === String(codigo) ||
        String(r.codigo) === String(codigo) ||
        r.nmbrRespnsble === String(codigo) ||
        r.nombre === String(codigo)
    );

    return responsable?.nmbrRespnsble || responsable?.nombre || String(codigo);
  }, [responsables, t]);

  const getNombreCompania = useCallback((codigo) => {
    if (!codigo) return t('complex.ui.indicadores_protocolo_complex.sin_compania');
    const aseg = aseguradoras.find((a) => {
      const cod1 = a.cod1Asgrdra ? String(a.cod1Asgrdra).trim() : '';
      const codi = a.codiAsgrdra ? String(a.codiAsgrdra).trim() : '';
      const buscado = String(codigo).trim();
      return cod1 === buscado || codi === buscado;
    });
    return aseg?.rzonSocial || String(codigo);
  }, [aseguradoras, t]);

  const periodoFiltro = useMemo(
    () => ({ fechaDesde, fechaHasta }),
    [fechaDesde, fechaHasta]
  );

  const casosFiltrados = useMemo(
    () => filtrarCasosProtocolo(casos, fechaDesde, fechaHasta),
    [casos, fechaDesde, fechaHasta]
  );

  const indicadoresGlobales = useMemo(
    () => calcularIndicadoresProtocoloGlobales(casosFiltrados, periodoFiltro),
    [casosFiltrados, periodoFiltro]
  );

  const resolverGrupo = useMemo(() => {
    if (vista === 'compania') {
      return (caso) => resolverGrupoCompania(caso, getNombreCompania);
    }
    if (vista === 'ramo') {
      return (caso) => resolverGrupoRamo(caso);
    }
    return (caso, catalogo) =>
      resolverGrupoAjustador(caso, catalogo, getNombreResponsable);
  }, [vista, getNombreCompania, getNombreResponsable]);

  const filasDesglose = useMemo(
    () =>
      agruparIndicadoresProtocolo(casosFiltrados, resolverGrupo, {
        periodo: periodoFiltro,
        catalogoResponsables: responsables,
      }),
    [casosFiltrados, resolverGrupo, periodoFiltro, responsables]
  );

  const cumplimientoGlobales = useMemo(
    () => calcularCumplimientoProtocoloGlobales(casosFiltrados, protocolo),
    [casosFiltrados, protocolo]
  );

  const cumplimientoPorGrupo = useMemo(() => {
    const filas = agruparCumplimientoProtocolo(
      casosFiltrados,
      resolverGrupo,
      protocolo,
      { catalogoResponsables: responsables }
    );
    return Object.fromEntries(filas.map((fila) => [fila.clave, fila]));
  }, [casosFiltrados, resolverGrupo, protocolo, responsables]);

  const filasDesgloseConCumplimiento = useMemo(
    () =>
      filasDesglose.map((fila) => {
        const cumplimiento =
          cumplimientoPorGrupo[fila.clave] || cumplimientoPorGrupo[fila.nombre];
        return cumplimiento ? { ...fila, cumplimiento } : fila;
      }),
    [filasDesglose, cumplimientoPorGrupo]
  );

  const etiquetaVista =
    VISTAS.find((v) => v.value === vista)?.label || t('complex.ui.indicadores_protocolo_complex.desglose');
  const etiquetaPeriodo = formatearEtiquetaPeriodo(
    fechaDesde,
    fechaHasta,
    t,
    String(i18n.language || 'es').toLowerCase().startsWith('en') ? 'en-US' : 'es-CO'
  );

  const filaConsolidado = useMemo(
    () => ({
      nombre: t('complex.ui.indicadores_protocolo_complex.total_general'),
      totalCasos: indicadoresGlobales.totalCasos,
      cerradosPeriodo: indicadoresGlobales.cerradosPeriodo,
      pendientesDocs30Dias: indicadoresGlobales.pendientesDocs30Dias,
      muestras: indicadoresGlobales.muestras,
      cumplimiento: cumplimientoGlobales,
      ...ETAPAS_DESGLOSE.reduce((acc, col) => {
        acc[col.clave] = indicadoresGlobales[col.clave];
        return acc;
      }, {}),
    }),
    [indicadoresGlobales, cumplimientoGlobales, ETAPAS_DESGLOSE, t]
  );

  const etiquetaGrupo =
    vista === 'ajustador'
      ? t('complex.ui.indicadores_protocolo_complex.ajustador')
      : vista === 'compania'
        ? t('complex.ui.indicadores_protocolo_complex.compania')
        : t('complex.ui.indicadores_protocolo_complex.ramo');

  const columnasTablaResumen = ETAPAS_DESGLOSE.length + 5;
  const columnasTablaDetalle = ETAPAS_DESGLOSE.length * 2 + 5;

  const chartDocs30 = useMemo(
    () =>
      filasDesglose
        .filter((f) => f.pendientesDocs30Dias > 0)
        .slice(0, 12)
        .map((f) => ({
          nombre: f.nombre.length > 22 ? `${f.nombre.slice(0, 20)}…` : f.nombre,
          nombreCompleto: f.nombre,
          cantidad: f.pendientesDocs30Dias,
        })),
    [filasDesglose]
  );

  const chartCumplimiento = useMemo(
    () => datosChartCumplimientoProtocolo(cumplimientoGlobales, indicadoresTraducidos),
    [cumplimientoGlobales, indicadoresTraducidos]
  );

  const limpiarFiltros = () => {
    setFechaDesde('2025-10-01');
    setFechaHasta('');
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
            badge={t('complex.ui.indicadores_protocolo_complex.badge_nuevo')}
            title={t("complex.ui.indicadores_protocolo_complex.indicadores_de_gestion_nuevo_protocolo")}
            subtitle={t('complex.ui.indicadores_protocolo_complex.subtitle_casos', {
              documento: PROTOCOLO_DOCUMENTO,
              fecha: FECHA_INICIO_PROTOCOLO_COMPLEX_LABEL,
            })}
            activePath="/complex/indicadores-alertas"
          />
        )}

        <ComplexFilterSection
          title={t("complex.ui.indicadores_protocolo_complex.filtros")}
          showClear={Boolean(
            fechaHasta || fechaDesde !== '2025-10-01'
          )}
          onClear={limpiarFiltros}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Campo label={t("complex.ui.indicadores_protocolo_complex.desde")}>
              <InputFenix
                type="date"
                lang={dateLang}
                title={datePlaceholder}
                placeholder={datePlaceholder}
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </Campo>
            <Campo label={t("complex.ui.indicadores_protocolo_complex.hasta")}>
              <InputFenix
                type="date"
                lang={dateLang}
                title={datePlaceholder}
                placeholder={datePlaceholder}
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </Campo>
            <Campo label={t("complex.ui.indicadores_protocolo_complex.desglose")}>
              <SelectFenix value={vista} onChange={(e) => setVista(e.target.value)}>
                {VISTAS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
          </div>
        </ComplexFilterSection>

        <section className="mb-6 rounded-xl border border-fenix-primario/20 bg-gray-50 p-4 dark:bg-gray-900/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-fenix-primario">{t("complex.ui.indicadores_protocolo_complex.protocolo_oficial")}</p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{t('complex.ui.indicadores_protocolo_complex.protocolo_objetivo')}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {resumenPlazos.map((item) => (
              <div
                key={item.etapaId}
                className="rounded-lg border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-[#1A1A1A]"
              >
                <p className="text-lg font-bold text-fenix-primario">{item.valor}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{item.titulo}</p>
              </div>
            ))}
          </div>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-gray-600 dark:text-gray-400">
            {notasProtocolo.map((nota) => (
              <li key={nota}>{nota}</li>
            ))}
          </ul>
        </section>

        <p className="font-body text-sm text-gray-500 dark:text-gray-400">{t("complex.ui.indicadores_protocolo_complex.periodo")}{etiquetaPeriodo}{t("complex.ui.indicadores_protocolo_complex.texto_5")}{indicadoresGlobales.totalCasos}{t("complex.ui.indicadores_protocolo_complex.caso_s_recibidos")}{' '}
          {indicadoresGlobales.cerradosPeriodo}{t("complex.ui.indicadores_protocolo_complex.cerrados")}</p>

        <section aria-label={t("complex.ui.indicadores_protocolo_complex.cumplimiento_general")}>
          <h2 className={complexSectionTitle}>{t("complex.ui.indicadores_protocolo_complex.cumplimiento_vs_protocolo")}</h2>
          <p className="mb-4 font-body text-sm text-gray-500 dark:text-gray-400">{t("complex.ui.indicadores_protocolo_complex.porcentaje_de_etapas_completadas_dentro_del_plazo_oficia")}</p>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ComplexMetricCard
              label={t("complex.ui.indicadores_protocolo_complex.cumplimiento_general")}
              value={formatearPorcentajeCumplimiento(cumplimientoGlobales.general.porcentaje)}
              hint={t('complex.ui.indicadores_protocolo_complex.etapas_evaluadas_en_plazo', {
                cumplidos: cumplimientoGlobales.general.cumplidos,
                evaluables: cumplimientoGlobales.general.evaluables,
              })}
            />
            {indicadoresTraducidos.filter((ind) => ind.etapaId).map((ind) => {
              const datos = cumplimientoGlobales[ind.muestra];
              return (
                <ComplexMetricCard
                  key={`cumpl-${ind.clave}`}
                  label={`% ${ind.label}`}
                  value={formatearPorcentajeCumplimiento(datos?.porcentaje)}
                  hint={t('complex.ui.indicadores_protocolo_complex.objetivo_protocolo', {
                    objetivo: plazoObjetivoIndicador(ind.clave, protocolo, t, ind.plazoObjetivo),
                    cumplidos: datos?.cumplidos ?? 0,
                    evaluables: datos?.evaluables ?? 0,
                  })}
                />
              );
            })}
          </div>

          {chartCumplimiento.length > 0 && (
            <ComplexChartCard title={t("complex.ui.indicadores_protocolo_complex.cumplimiento_por_indicador_vs_protocolo")}>
              <ComplexChartPlot height={Math.max(280, chartCumplimiento.length * 44)}>
                <BarChart
                  data={chartCumplimiento}
                  layout="vertical"
                  margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    unit="%"
                    tick={{ fill: tickColor, fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="nombreCorto"
                    width={168}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [
                      formatearPorcentajeCumplimiento(value),
                      t('complex.ui.indicadores_protocolo_complex.cumplimiento'),
                    ]}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      if (!item) return '';
                      const ind = indicadoresTraducidos.find((i) => i.clave === item.clave);
                      return t('complex.ui.indicadores_protocolo_complex.tooltip_objetivo_plazo', {
                        nombre: item.nombre,
                        objetivo: plazoObjetivoIndicador(
                          item.clave,
                          protocolo,
                          t,
                          ind?.plazoObjetivo
                        ),
                        cumplidos: item.cumplidos,
                        evaluables: item.evaluables,
                      });
                    }}
                  />
                  <Bar dataKey="porcentaje" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {chartCumplimiento.map((item) => (
                      <Cell key={item.muestra} fill={colorBarraCumplimiento(item.porcentaje)} />
                    ))}
                  </Bar>
                </BarChart>
              </ComplexChartPlot>
            </ComplexChartCard>
          )}
        </section>

        <section aria-label={t("complex.ui.indicadores_protocolo_complex.promedios_generales")}>
          <h2 className={complexSectionTitle}>{t("complex.ui.indicadores_protocolo_complex.promedio_general_vs_protocolo")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {indicadoresTraducidos.map((ind) => (
              <ComplexMetricCard
                key={ind.clave}
                label={ind.label}
                value={formatearTiempoPromedio(
                  indicadoresGlobales[ind.clave],
                  t,
                  UNIDAD_POR_MUESTRA[ind.muestra]
                )}
                hint={t('complex.ui.indicadores_protocolo_complex.objetivo_casos', {
                  objetivo: plazoObjetivoIndicador(ind.clave, protocolo, t, ind.plazoObjetivo),
                  casos: indicadoresGlobales.muestras[ind.muestra],
                })}
              />
            ))}
          </div>
        </section>

        <section aria-label={t("complex.ui.indicadores_protocolo_complex.indicadores_operativos")} className="mt-6">
          <h2 className={complexSectionTitle}>{t("complex.ui.indicadores_protocolo_complex.indicadores_operativos")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ComplexMetricCard
              label={t("complex.ui.indicadores_protocolo_complex.cerrados_facturado")}
              value={String(indicadoresGlobales.cerradosPeriodo)}
              hint={t("complex.ui.indicadores_protocolo_complex.estado_facturado_entre_los_casos_del_periodo")}
            />
            <ComplexMetricCard
              label={t("complex.ui.indicadores_protocolo_complex.pendientes_de_documentos")}
              value={String(indicadoresGlobales.casosEsperaDocumentos)}
              hint={t("complex.ui.indicadores_protocolo_complex.sin_ultimo_documento_ni_informe_final_con_inspeccion_o_s")}
            />
            <ComplexMetricCard
              label={t("complex.ui.indicadores_protocolo_complex.docs_pendientes_30_dias")}
              value={String(indicadoresGlobales.pendientesDocs30Dias)}
              hint={t("complex.ui.indicadores_protocolo_complex.en_espera_de_documentos_con_mas_de_30_dias_desde_solicit")}
            />
          </div>
        </section>

        <section aria-label={t("complex.ui.indicadores_protocolo_complex.consolidado_general")} className="mt-8">
          <h2 className={complexSectionTitle}>{t("complex.ui.indicadores_protocolo_complex.consolidado_general")}</h2>
          <p className="mb-4 font-body text-sm text-gray-500 dark:text-gray-400">{t("complex.ui.indicadores_protocolo_complex.resumen_del_periodo")}{etiquetaPeriodo}{t("complex.ui.indicadores_protocolo_complex.cada_etapa_muestra_el_tiempo_promedio_y_el_de_cumplimien")}</p>

          <div className={`${complexCard} mb-6`}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ComplexMetricCard
                label={t("complex.ui.indicadores_protocolo_complex.casos_en_el_periodo")}
                value={String(indicadoresGlobales.totalCasos)}
                hint={t("complex.ui.indicadores_protocolo_complex.asignados_en_el_rango_de_fechas_filtrado")}
              />
              <ComplexMetricCard
                label={t("complex.ui.indicadores_protocolo_complex.cumplimiento_general")}
                value={formatearPorcentajeCumplimiento(cumplimientoGlobales.general.porcentaje)}
                hint={t('complex.ui.indicadores_protocolo_complex.etapas_en_plazo', {
                  cumplidos: cumplimientoGlobales.general.cumplidos,
                  evaluables: cumplimientoGlobales.general.evaluables,
                })}
              />
              <ComplexMetricCard
                label={t("complex.ui.indicadores_protocolo_complex.cerrados_facturado")}
                value={String(indicadoresGlobales.cerradosPeriodo)}
                hint={t("complex.ui.indicadores_protocolo_complex.con_finiquito_dentro_del_rango_de_fechas")}
              />
              <ComplexMetricCard
                label={t("complex.ui.indicadores_protocolo_complex.docs_pendientes_30_dias")}
                value={String(indicadoresGlobales.pendientesDocs30Dias)}
                hint={t("complex.ui.indicadores_protocolo_complex.casos_en_espera_de_documentacion_con_mas_de_30_dias")}
              />
            </div>

            <div className="mt-6">
              <p className="mb-3 font-body text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("complex.ui.indicadores_protocolo_complex.secuencia_de_etapas_tiempo_promedio_y_cumplimiento")}</p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {ETAPAS_DESGLOSE.map((etapa) => (
                  <TarjetaEtapaConsolidado
                    key={etapa.muestra}
                    etapa={etapa}
                    valor={indicadoresGlobales[etapa.clave]}
                    muestra={indicadoresGlobales.muestras[etapa.muestra]}
                    cumplimiento={cumplimientoGlobales[etapa.muestra]}
                    protocolo={protocolo}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section aria-label={t("complex.ui.indicadores_protocolo_complex.desglose_gerencial")} className="mt-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className={`${complexSectionTitle} mb-0`}>{etiquetaVista}</h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("complex.ui.indicadores_protocolo_complex.modo_de_tabla")}>
              {MODOS_TABLA_DESGLOSE.map((modo) => (
                <button
                  key={modo.value}
                  type="button"
                  onClick={() => setModoTablaDesglose(modo.value)}
                  className={`${complexBtnGhost} ${
                    modoTablaDesglose === modo.value
                      ? 'border-fenix-primario bg-fenix-primario/10 text-fenix-primario dark:border-red-500 dark:bg-red-950/30 dark:text-red-400'
                      : ''
                  }`}
                >
                  {modo.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mb-4 font-body text-sm text-gray-500 dark:text-gray-400">
            {modoTablaDesglose === 'resumen'
              ? t('complex.ui.indicadores_protocolo_complex.hint_vista_resumen')
              : t('complex.ui.indicadores_protocolo_complex.hint_vista_detallada')}
          </p>

          <div className={complexTableWrap}>
            <table
              className={`${complexTableSimple} ${
                modoTablaDesglose === 'detalle' ? 'min-w-[2200px]' : 'min-w-[1400px]'
              }`}
            >
              <thead>
                {modoTablaDesglose === 'resumen' ? (
                  <tr className={complexTableHead}>
                    <th className="text-left sticky left-0 bg-inherit z-10">{etiquetaGrupo}</th>
                    <th className="text-right">{t("complex.ui.indicadores_protocolo_complex.casos")}</th>
                    <th className="text-right align-top">{t("complex.ui.indicadores_protocolo_complex.cumplimiento")}</th>
                    {ETAPAS_DESGLOSE.map((etapa) => (
                      <EncabezadoEtapaTabla key={etapa.muestra} etapa={etapa} />
                    ))}
                    <th className="text-right align-top">{t("complex.ui.indicadores_protocolo_complex.casos_cerrados")}</th>
                    <th className="text-right align-top">{t("complex.ui.indicadores_protocolo_complex.documentos_pendientes_30_dias")}</th>
                  </tr>
                ) : (
                  <>
                    <tr className={complexTableHead}>
                      <th rowSpan={2} className="text-left sticky left-0 bg-inherit z-10 align-bottom">
                        {etiquetaGrupo}
                      </th>
                      <th rowSpan={2} className="text-right align-bottom">{t("complex.ui.indicadores_protocolo_complex.casos")}</th>
                      <th rowSpan={2} className="text-right align-bottom">{t("complex.ui.indicadores_protocolo_complex.cumplimiento")}</th>
                      <th
                        colSpan={ETAPAS_DESGLOSE.length}
                        className="text-center border-b border-gray-200 dark:border-gray-700"
                      >{t("complex.ui.indicadores_protocolo_complex.tiempos_promedio")}</th>
                      <th
                        colSpan={ETAPAS_DESGLOSE.length}
                        className="text-center border-b border-gray-200 dark:border-gray-700"
                      >{t("complex.ui.indicadores_protocolo_complex.cumplimiento_vs_protocolo_2")}</th>
                      <th rowSpan={2} className="text-right align-bottom">{t("complex.ui.indicadores_protocolo_complex.casos_cerrados")}</th>
                      <th rowSpan={2} className="text-right align-bottom">{t("complex.ui.indicadores_protocolo_complex.docs_pendientes_30_dias_2")}</th>
                    </tr>
                    <tr className={complexTableHead}>
                      {ETAPAS_DESGLOSE.map((col) => (
                        <th key={col.clave} className="text-right align-top text-xs min-w-[120px]">
                          <span className="block font-semibold">{col.label}</span>
                          <span className="mt-0.5 block text-[10px] font-normal text-gray-500">{t("complex.ui.indicadores_protocolo_complex.tiempo_promedio")}</span>
                        </th>
                      ))}
                      {ETAPAS_DESGLOSE.map((col) => (
                        <th key={`pct-${col.muestra}`} className="text-right align-top text-xs min-w-[120px]">
                          <span className="block font-semibold">{col.label}</span>
                          <span className="mt-0.5 block text-[10px] font-normal text-gray-500">{t("complex.ui.indicadores_protocolo_complex.en_plazo")}</span>
                        </th>
                      ))}
                    </tr>
                  </>
                )}
              </thead>
              <tbody>
                {filasDesgloseConCumplimiento.length === 0 ? (
                  <tr>
                    <td
                      colSpan={modoTablaDesglose === 'resumen' ? columnasTablaResumen : columnasTablaDetalle}
                      className="px-4 py-6 text-center text-sm text-gray-500"
                    >{t("complex.ui.indicadores_protocolo_complex.no_hay_casos_del_nuevo_protocolo_para_los_filtros_selecc")}</td>
                  </tr>
                ) : (
                  <>
                    <FilaDesgloseTabla
                      fila={filaConsolidado}
                      modoTabla={modoTablaDesglose}
                      esConsolidado
                      etapas={ETAPAS_DESGLOSE}
                    />
                    {filasDesgloseConCumplimiento.map((fila) => (
                      <FilaDesgloseTabla
                        key={fila.nombre}
                        fila={fila}
                        modoTabla={modoTablaDesglose}
                        etapas={ETAPAS_DESGLOSE}
                      />
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">{t("complex.ui.indicadores_protocolo_complex.promedios_redondeados_a_dias_u_horas_aproximadas_porcent")}{' '}
            {[1, 2, 3, 4]
              .map((n) =>
                t(`complex.ui.indicadores_protocolo_complex.tiempo_objetivo_${n}`, {
                  defaultValue: `${TIEMPOS_OBJETIVO_SERVICIO[n - 1]?.escenario} (${TIEMPOS_OBJETIVO_SERVICIO[n - 1]?.tiempo})`,
                })
              )
              .join(' · ')}
            {t("complex.ui.indicadores_protocolo_complex.texto_6")}</p>
        </section>

        {chartDocs30.length > 0 && (
          <section className="mt-8" aria-label={t("complex.ui.indicadores_protocolo_complex.documentos_pendientes_mas_de_30_dias")}>
            <ComplexChartCard
              title={t('complex.ui.indicadores_protocolo_complex.pendientes_docs_titulo', {
                vista: etiquetaVista.toLowerCase(),
              })}
            >
              <ComplexChartPlot height={Math.max(280, chartDocs30.length * 36)}>
                <BarChart
                  data={chartDocs30}
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
                    formatter={(value) => [value, t('complex.ui.indicadores_protocolo_complex.casos')]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.nombreCompleto || ''}
                  />
                  <Bar dataKey="cantidad" name={t('complex.ui.indicadores_protocolo_complex.casos')} radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {chartDocs30.map((_, index) => (
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

export default IndicadoresProtocoloComplex;
