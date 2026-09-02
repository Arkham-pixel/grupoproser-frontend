import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { FaFileExcel, FaInfoCircle, FaPlus, FaUpload } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import {
  deleteCasoBbvaCatListado,
  fetchAllCasosBbvaCatListado,
} from '../../services/bbvaCatListadoService.js';
import FormularioBbvaCat from './FormularioBbvaCat.jsx';
import AccionesBbvaCatMenu from './AccionesBbvaCatMenu.jsx';
import ArchiveroBbvaCat from './ArchiveroBbvaCat.jsx';
import MapaBloquesBbvaCatPanel from './MapaBloquesBbvaCatPanel.jsx';
import ModalImportarExcelBbvaCat, {
  esAdminOSoporteBbvaCat,
} from './ModalImportarExcelBbvaCat.jsx';
import { esRolSoloBbva } from '../../config/roles.js';
import {
  BBVA_CAT_REPORTE_PAGE_SIZE,
  RADIO_KM_ANALISTA_BBVA_CAT,
  RADIO_KM_LISTADO_BBVA_CAT,
  STORAGE_ORIGEN_LISTADO_BBVA_CAT,
  buildOpcionesFiltro,
  casoTieneArchivosBbvaCat,
  coincideFiltroCiudadBbvaCat,
  coincideFiltroTexto,
  etiquetaTipoPolizaBbvaCat,
  fechaEnRango,
  formatCurrency,
  formatDate,
  liquidadorGuardadoBbvaCat,
  normTexto,
  numeroGuardadoBbvaCat,
} from './bbvaCatHelpers.js';
import {
  expressBadge,
  expressBtnPrimary,
  expressBtnSecondary,
  expressPageSubtitle,
  expressPageTitle,
  expressScope,
  expressTableHead,
  expressTableScroll,
  expressTableWrap,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  Campo,
  ExpressAvisoModal,
  ExpressFilterSection,
  ExpressModal,
  InputFenix,
  SelectFenix,
  ThOrdenable,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { aplicarOrdenTabla, useOrdenTabla, valorOrdenPorDefecto } from '../../hooks/useOrdenTabla.js';
import { etiquetaSesionPersona, filtrarCasosAsignadosASesion } from '../../utils/permisosCasoPorRol.js';
import { useFiltroCasoExclusivo } from '../../utils/filtroCasoExclusivo.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo p-2 dark:bg-[#0F0F0F] sm:p-4';
const wrap = 'w-full min-w-0 space-y-4 sm:space-y-6';

const COLUMNAS = [
  { clave: 'consecutivo', labelKey: 'consecutivo' },
  { clave: 'zc', labelKey: 'zc' },
  { clave: 'siniestro', labelKey: 'siniestro' },
  { clave: 'tipoIdentificacion', labelKey: 'tipoIdentificacion' },
  { clave: 'identificacion', labelKey: 'identificacion' },
  { clave: 'numeroPoliza', labelKey: 'numeroPoliza' },
  { clave: 'tipoPoliza', labelKey: 'tipoPoliza' },
  { clave: 'causa', labelKey: 'causa' },
  { clave: 'asegurado', labelKey: 'asegurado' },
  { clave: 'intermediario', labelKey: 'intermediario' },
  { clave: 'correoIntermediario', labelKey: 'correoIntermediario' },
  { clave: 'telefonoIntermediario', labelKey: 'telefonoIntermediario' },
  { clave: 'telefonoAsegurado', labelKey: 'telefonoAsegurado' },
  { clave: 'correoAsegurado', labelKey: 'correoAsegurado' },
  { clave: 'ciudad', labelKey: 'ciudad' },
  { clave: 'estado', labelKey: 'estado' },
  { clave: 'reserva', labelKey: 'reserva' },
  { clave: 'valorEstimadoAseguradora', labelKey: 'valorEstimadoAseguradora' },
  { clave: 'valorAseguradoInmueble', labelKey: 'valorAseguradoInmueble' },
  { clave: 'valorReclamado', labelKey: 'valorReclamado' },
  { clave: 'valorAseguradoContenidos', labelKey: 'valorAseguradoContenidos' },
  { clave: 'valorReservaPreventivaPromedio', labelKey: 'valorReservaPreventivaPromedio' },
  { clave: 'valorComercialInmueble', labelKey: 'valorComercialInmueble' },
  { clave: 'valorLiquidado', labelKey: 'valorLiquidado' },
  { clave: 'valorALiquidar', labelKey: 'valorALiquidar' },
  { clave: 'observacionReserva', labelKey: 'observacionReserva' },
  { clave: 'modalidadAtencion', labelKey: 'modalidadAtencion' },
  { clave: 'ajustadorLider', labelKey: 'ajustadorLider' },
  { clave: 'ajustador', labelKey: 'ajustador' },
  { clave: 'fechaAsignacion', labelKey: 'fechaAsignacion' },
  { clave: 'fechaVisita', labelKey: 'fechaVisita' },
  { clave: 'fechaCasoNuevo', labelKey: 'fechaCasoNuevo' },
  { clave: 'fechaCoordinandoInspeccion', labelKey: 'fechaCoordinandoInspeccion' },
  { clave: 'fechaAnalisisCaso', labelKey: 'fechaAnalisisCaso' },
  { clave: 'fechaSolicitudDocumento', labelKey: 'fechaSolicitudDocumento' },
  { clave: 'fechaRecepcionDocumento', labelKey: 'fechaRecepcionDocumento' },
  { clave: 'fechaObjecion', labelKey: 'fechaObjecion' },
  { clave: 'fechaObjetado', labelKey: 'fechaObjetado' },
  { clave: 'fechaAutorizacionAnalista', labelKey: 'fechaAutorizacionAnalista' },
  { clave: 'fechaCasoParaPago', labelKey: 'fechaCasoParaPago' },
  { clave: 'fechaCasoPagado', labelKey: 'fechaCasoPagado' },
  { clave: 'diasEnEstado', labelKey: 'diasEnEstado' },
  { clave: 'ultimaGestion', labelKey: 'ultimaGestion' },
  { clave: 'documentoFaltante', labelKey: 'documentoFaltante' },
  { clave: 'observaciones', labelKey: 'observaciones' },
];

const buildExportRow = (caso) => ({
  Consecutivo: caso.consecutivo ?? '',
  ZC: caso.zc ?? '',
  STRO: caso.siniestro ?? '',
  'TIPO IDENTIFICACIÓN': caso.tipoIdentificacion ?? '',
  IDENTIFICACIÓN: caso.identificacion ?? '',
  PÓLIZA: caso.numeroPoliza ?? '',
  'TIPO PÓLIZA': etiquetaTipoPolizaBbvaCat(caso),
  CAUSA: caso.causa ?? '',
  ASEGURADO: caso.asegurado ?? '',
  INTERMEDIARIO: caso.intermediario ?? '',
  'CORREO INTERMEDIARIO': caso.correoIntermediario ?? '',
  'TELEFONO INTERMEDIARIO': caso.telefonoIntermediario ?? '',
  'TELEFONO ASEGURADO': caso.telefonoAsegurado ?? '',
  'CORREO ASEGURADO': caso.correoAsegurado ?? '',
  CIUDAD: caso.ciudad ?? '',
  ESTADO: caso.estado ?? '',
  RESERVA_BBVA: caso.reserva ?? '',
  'VALOR ESTIMADO ASEGURADORA': caso.valorEstimadoAseguradora ?? '',
  'VALOR ASEGURADO INMUEBLE': caso.valorAseguradoInmueble ?? '',
  'VALOR RECLAMADO BBVA': caso.valorReclamado ?? '',
  'VALOR ASEGURADO CONTENIDOS': caso.valorAseguradoContenidos ?? '',
  'VALOR RESERVA PREVENTIVA PROMEDIO': caso.valorReservaPreventivaPromedio ?? '',
  'VALOR COMERCIAL INMUEBLE': caso.valorComercialInmueble ?? '',
  'RESERVA AJUSTADOR': caso.valorLiquidado ?? '',
  'VALOR A LIQUIDAR': caso.valorALiquidar ?? '',
  'OBSERVACIÓN RESERVA': caso.observacionReserva ?? '',
  MODALIDAD: caso.modalidadAtencion ?? '',
  'AJUSTADOR LIDER': caso.ajustadorLider ?? '',
  AJUSTADOR: caso.ajustador ?? '',
  'FECHA ASIGNACIÓN': formatDate(caso.fechaAsignacion),
  'FECHA VISITA': formatDate(caso.fechaVisita),
  'FECHA CASO NUEVO': formatDate(caso.fechaCasoNuevo),
  'FECHA COORDINANDO INSPECCIÓN': formatDate(caso.fechaCoordinandoInspeccion),
  'FECHA ANÁLISIS': formatDate(caso.fechaAnalisisCaso),
  'FECHA SOLICITUD DOCUMENTO': formatDate(caso.fechaSolicitudDocumento),
  'FECHA RECEPCIÓN DOCUMENTO': formatDate(caso.fechaRecepcionDocumento),
  'FECHA OBJECIÓN': formatDate(caso.fechaObjecion),
  'FECHA OBJETADO': formatDate(caso.fechaObjetado),
  'FECHA AUTORIZACIÓN ANALISTA': formatDate(caso.fechaAutorizacionAnalista),
  'FECHA CASO PARA PAGO': formatDate(caso.fechaCasoParaPago),
  'FECHA CASO PAGADO': formatDate(caso.fechaCasoPagado),
  'DÍAS EN ESTADO': caso.diasEnEstado ?? '',
  'ÚLTIMA GESTIÓN': formatDate(caso.ultimaGestion),
  'DOCUMENTO FALTANTE': caso.documentoFaltante ?? '',
  OBSERVACIONES: caso.observaciones ?? '',
  'Fecha creación': formatDate(caso.createdAt),
});

export default function ReporteBbvaCatListado({ modo = 'listado', modoAsignados = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { casoIdUrl, coincide: coincideCasoUrl, limpiar: limpiarCasoUrl, activo: filtroCasoUrl } =
    useFiltroCasoExclusivo();
  const esAnalista = modo === 'analista';
  const esBbvaSolo = esRolSoloBbva();
  const nombreSesion = etiquetaSesionPersona();
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroAjustador, setFiltroAjustador] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [incluirConArchivos, setIncluirConArchivos] = useState(false);
  const [mapaReloadToken, setMapaReloadToken] = useState(0);
  const [pagina, setPagina] = useState(1);
  const { orden, cambiarOrden } = useOrdenTabla();
  const [casoEdicion, setCasoEdicion] = useState(null);
  const [casoArchivero, setCasoArchivero] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [bloqueSeleccionadoId, setBloqueSeleccionadoId] = useState(null);
  const [siniestrosBloqueSeleccionado, setSiniestrosBloqueSeleccionado] = useState([]);
  const [modalImportOpen, setModalImportOpen] = useState(false);
  const puedeImportarExcel = esAdminOSoporteBbvaCat();

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllCasosBbvaCatListado(2000);
      setCasos(modoAsignados ? filtrarCasosAsignadosASesion(data) : data);
    } catch (err) {
      setError(err.message || t('bbvaCat.report.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t, modoAsignados]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  useEffect(() => {
    marcarOrigenListado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esAnalista]);

  const ciudades = useMemo(() => buildOpcionesFiltro(casos, 'ciudad'), [casos]);
  const estados = useMemo(() => buildOpcionesFiltro(casos, 'estado'), [casos]);
  const ajustadores = useMemo(() => buildOpcionesFiltro(casos, 'ajustador'), [casos]);
  const listadoPorClave = useMemo(() => {
    const m = new Map();
    casos.forEach((c) => {
      const k = String(c.zc || c.siniestro || '').trim();
      if (k && !m.has(k)) m.set(k, c);
    });
    return m;
  }, [casos]);
  const conteoArchivos = useMemo(() => {
    let con = 0;
    casos.forEach((c) => {
      if (casoTieneArchivosBbvaCat(c)) con += 1;
    });
    return { total: casos.length, conArchivo: con, pendientes: casos.length - con };
  }, [casos]);

  const filtrados = useMemo(() => {
    const q = normTexto(busqueda);
    const siniestrosBloque = new Set(
      (siniestrosBloqueSeleccionado || []).map((s) => String(s).trim()).filter(Boolean)
    );
    return casos.filter((c) => {
      if (!coincideCasoUrl(c)) return false;
      if (casoIdUrl) return true;
      const conArchivo = casoTieneArchivosBbvaCat(c);
      if (!modoAsignados) {
        if (esAnalista) {
          const buscarDocumentados = Boolean(q) || incluirConArchivos;
          if (!buscarDocumentados && conArchivo) return false;
        } else if (!conArchivo) {
          return false;
        }
      }
      if (bloqueSeleccionadoId) {
        if (siniestrosBloque.size === 0) return false;
        const keys = [c.siniestro, c.zc].map((v) => String(v || '').trim()).filter(Boolean);
        if (!keys.some((k) => siniestrosBloque.has(k))) return false;
      }
      if (!coincideFiltroCiudadBbvaCat(c.ciudad, filtroCiudad)) return false;
      if (!coincideFiltroTexto(c.estado, filtroEstado)) return false;
      if (!coincideFiltroTexto(c.ajustador, filtroAjustador)) return false;
      if (fechaInicio || fechaFin) {
        if (!fechaEnRango(c.createdAt, fechaInicio, fechaFin)) return false;
      }
      if (!q) return true;
      const blob = [
        c.consecutivo,
        c.zc,
        c.siniestro,
        c.tipoIdentificacion,
        c.identificacion,
        c.numeroPoliza,
        c.tipoPoliza,
        c.tipoPolizaOtro,
        c.causa,
        c.asegurado,
        c.intermediario,
        c.correoIntermediario,
        c.telefonoIntermediario,
        c.telefonoAsegurado,
        c.correoAsegurado,
        c.ciudad,
        c.estado,
        c.ajustadorLider,
        c.ajustador,
        c.observaciones,
      ]
        .map(normTexto)
        .join(' ');
      return blob.includes(q);
    });
  }, [
    casos,
    busqueda,
    filtroCiudad,
    filtroEstado,
    filtroAjustador,
    fechaInicio,
    fechaFin,
    bloqueSeleccionadoId,
    siniestrosBloqueSeleccionado,
    esAnalista,
    incluirConArchivos,
    modoAsignados,
    casoIdUrl,
    coincideCasoUrl,
  ]);

  const casosOrdenados = useMemo(
    () => aplicarOrdenTabla(filtrados, orden, valorOrdenPorDefecto),
    [filtrados, orden]
  );

  const totalPaginas = Math.max(1, Math.ceil(casosOrdenados.length / BBVA_CAT_REPORTE_PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * BBVA_CAT_REPORTE_PAGE_SIZE;
  const paginaItems = casosOrdenados.slice(desde, desde + BBVA_CAT_REPORTE_PAGE_SIZE);

  useEffect(() => {
    setPagina(1);
  }, [
    busqueda,
    filtroCiudad,
    filtroEstado,
    filtroAjustador,
    fechaInicio,
    fechaFin,
    bloqueSeleccionadoId,
    siniestrosBloqueSeleccionado,
    incluirConArchivos,
    orden.campo,
    orden.asc,
    casoIdUrl,
  ]);

  const marcarOrigenListado = () => {
    try {
      sessionStorage.setItem(
        STORAGE_ORIGEN_LISTADO_BBVA_CAT,
        esAnalista ? 'analista' : 'listado'
      );
    } catch {
      /* ignore */
    }
  };

  const hrefDesdeMapa = (casoMapa) => {
    const k = String(casoMapa?.zc || casoMapa?.siniestro || '').trim();
    const lst = k ? listadoPorClave.get(k) : null;
    if (lst?._id) {
      return `/bbva-cat/listado/caso?casoId=${lst._id}&tab=liquidador`;
    }
    return casoMapa?._id ? `/bbva-cat/caso?casoId=${casoMapa._id}` : '/bbva-cat/listado/analista';
  };

  const irACasoListado = (item, tab) => {
    marcarOrigenListado();
    navigate(`/bbva-cat/listado/caso?casoId=${item._id}&tab=${tab}`, {
      state: { casoBbvaCat: item },
    });
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroCiudad('');
    setFiltroEstado('');
    setFiltroAjustador('');
    setFechaInicio('');
    setFechaFin('');
    setBloqueSeleccionadoId(null);
    setSiniestrosBloqueSeleccionado([]);
    setIncluirConArchivos(false);
    limpiarCasoUrl();
  };

  const FECHAS_LISTADO = new Set([
    'fechaAsignacion',
    'fechaVisita',
    'fechaCasoNuevo',
    'fechaCoordinandoInspeccion',
    'fechaAnalisisCaso',
    'fechaSolicitudDocumento',
    'fechaRecepcionDocumento',
    'fechaObjecion',
    'fechaObjetado',
    'fechaAutorizacionAnalista',
    'fechaCasoParaPago',
    'fechaCasoPagado',
    'ultimaGestion',
  ]);

  const obtenerValorCelda = (item, clave) => {
    if (clave === 'tipoPoliza') return etiquetaTipoPolizaBbvaCat(item) || '—';
    if (
      clave === 'reserva' ||
      clave === 'valorEstimadoAseguradora' ||
      clave === 'valorAseguradoInmueble' ||
      clave === 'valorReclamado' ||
      clave === 'valorAseguradoContenidos' ||
      clave === 'valorReservaPreventivaPromedio' ||
      clave === 'valorComercialInmueble' ||
      clave === 'valorLiquidado' ||
      clave === 'valorALiquidar'
    ) {
      const n = numeroGuardadoBbvaCat(item[clave]);
      if (n == null) {
        if (clave === 'valorALiquidar' && liquidadorGuardadoBbvaCat(item)) {
          return formatCurrency(0);
        }
        return '—';
      }
      return formatCurrency(n);
    }
    const valor = item[clave];
    if (valor === null || valor === undefined || valor === '') return '—';
    if (FECHAS_LISTADO.has(clave)) return formatDate(valor) || '—';
    return String(valor);
  };

  const exportarExcel = () => {
    if (!casosOrdenados.length) {
      setAviso({
        tipo: 'error',
        titulo: t('bbvaCat.report.noData'),
        mensaje: t('bbvaCat.report.noDataExport'),
      });
      return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(casosOrdenados.map(buildExportRow));
    XLSX.utils.book_append_sheet(wb, ws, 'Listado BBVA CAT');
    XLSX.writeFile(wb, `bbva-cat-listado-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const solicitarEliminar = (item) => {
    setAviso({
      tipo: 'confirm',
      titulo: t('bbvaCat.report.confirmDeleteTitle'),
      mensaje: t('bbvaCat.report.confirmDeleteMessage', {
        caseNumber: item.consecutivo || item.zc || item.siniestro,
      }),
      onConfirm: async () => {
        try {
          await deleteCasoBbvaCatListado(item._id);
          setAviso({
            tipo: 'ok',
            titulo: t('bbvaCat.report.deleted'),
            mensaje: t('bbvaCat.report.caseDeleted', {
              caseNumber: item.consecutivo || item.zc || '',
            }),
          });
          await recargar();
        } catch (err) {
          setAviso({
            tipo: 'error',
            titulo: t('bbvaCat.report.deleteError'),
            mensaje: err.message || t('bbvaCat.report.deleteErrorMessage'),
          });
        }
      },
    });
  };

  const filtrosActivos = Boolean(
    busqueda ||
      filtroCiudad ||
      filtroEstado ||
      filtroAjustador ||
      fechaInicio ||
      fechaFin ||
      bloqueSeleccionadoId ||
      (esAnalista && incluirConArchivos) ||
      filtroCasoUrl
  );

  return (
    <div className={`${expressScope} ${root}`}>
      <div className={wrap}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className={expressBadge}>
              {esAnalista && !modoAsignados ? 'BBVA CAT · Analista' : 'BBVA CAT · Listado'}
            </span>
            <div>
              <h1 className={expressPageTitle}>
                {modoAsignados
                  ? `${t('bbvaCat.listadoReport.title')} — ${t('nav.assignedCases')}`
                  : esAnalista
                    ? t('bbvaCat.listadoReport.analistaTitle')
                    : t('bbvaCat.listadoReport.title')}
              </h1>
              <p className={expressPageSubtitle}>
                {modoAsignados
                  ? t('common.assignedCasesHint', { name: nombreSesion || '—' })
                  : esAnalista
                    ? t('bbvaCat.listadoReport.analistaSubtitle')
                    : t('bbvaCat.listadoReport.subtitleDocumented')}
              </p>
            </div>
            <nav className="flex flex-wrap gap-2">
              <Link
                to="/bbva-cat/carga"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                <FaPlus />
                {t('nav.bbvaCatAddCase')}
              </Link>
              <Link
                to="/bbva-cat/listado/dashboard"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                {t('nav.bbvaCatListadoDashboard')}
              </Link>
              {esAnalista && !modoAsignados ? (
                <span className="inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-2 font-body text-sm font-semibold text-white shadow-sm">
                  {t('nav.bbvaCatListadoAnalista')}
                </span>
              ) : (
                <Link
                  to="/bbva-cat/listado/analista"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  {t('nav.bbvaCatListadoAnalista')}
                </Link>
              )}
              {!esBbvaSolo &&
                (esAnalista || modoAsignados ? (
                  <Link
                    to="/bbva-cat/listado/reporte"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  >
                    {t('nav.bbvaCatListadoReport')}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-2 font-body text-sm font-semibold text-white shadow-sm">
                    {t('nav.bbvaCatListadoReport')}
                  </span>
                ))}
              {modoAsignados ? (
                <span className="inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-2 font-body text-sm font-semibold text-white shadow-sm">
                  {t('nav.assignedCases')}
                </span>
              ) : (
                <Link
                  to="/bbva-cat/listado/mis-casos"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  {t('nav.assignedCases')}
                </Link>
              )}
            </nav>
          </div>
          <div className="flex flex-wrap gap-2">
            {puedeImportarExcel && !modoAsignados && (
              <button
                type="button"
                className={expressBtnPrimary}
                onClick={() => setModalImportOpen(true)}
                disabled={loading}
              >
                <FaUpload />
                {t('bbvaCat.report.importExcel')}
              </button>
            )}
            <button type="button" className={expressBtnSecondary} onClick={exportarExcel} disabled={loading}>
              <FaFileExcel />
              {t('bbvaCat.report.exportExcel')}
            </button>
          </div>
        </header>

        <ExpressFilterSection
          title={t('bbvaCat.report.filters')}
          showClear={filtrosActivos}
          onClear={limpiarFiltros}
        >
          {esAnalista && (
            <div className="mb-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <FaInfoCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p className="font-body text-sm leading-relaxed">
                {t('bbvaCat.listadoReport.searchIndependentlyHint')}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Campo label={t('common.search')}>
              <InputFenix
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={t('bbvaCat.listadoReport.searchPlaceholder')}
              />
            </Campo>
            <Campo label={t('bbvaCat.fields.ciudad')}>
              <SelectFenix value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)}>
                <option value="">{t('bbvaCat.report.all')}</option>
                {ciudades.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('bbvaCat.fields.estado')}>
              <SelectFenix value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">{t('bbvaCat.report.all')}</option>
                {estados.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('bbvaCat.fields.ajustador')}>
              <SelectFenix
                value={filtroAjustador}
                onChange={(e) => setFiltroAjustador(e.target.value)}
              >
                <option value="">{t('bbvaCat.report.all')}</option>
                {ajustadores.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('bbvaCat.report.from')}>
              <InputFenix type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </Campo>
            <Campo label={t('bbvaCat.report.to')}>
              <InputFenix type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </Campo>
            {esAnalista && (
              <Campo label={t('bbvaCat.listadoReport.includeDocumented')}>
                <label className="mt-2 inline-flex items-center gap-2 font-body text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-fenix-primario focus:ring-fenix-primario"
                    checked={incluirConArchivos}
                    onChange={(e) => setIncluirConArchivos(e.target.checked)}
                  />
                  {t('bbvaCat.listadoReport.includeDocumentedHint')}
                </label>
              </Campo>
            )}
          </div>
          <p className="mt-4 font-body text-sm text-gray-500 dark:text-gray-400">
            {loading
              ? t('common.loading')
              : esAnalista
                ? t('bbvaCat.listadoReport.analistaSummary', {
                    pendientes: conteoArchivos.pendientes,
                    conArchivo: conteoArchivos.conArchivo,
                    visibles: filtrados.length,
                    page: paginaActual,
                    totalPages: totalPaginas,
                  })
                : t('bbvaCat.report.recordsSummary', {
                    count: filtrados.length,
                    page: paginaActual,
                    totalPages: totalPaginas,
                  })}
          </p>
        </ExpressFilterSection>

        <MapaBloquesBbvaCatPanel
          ciudad={filtroCiudad}
          estado={filtroEstado}
          bloqueSeleccionadoId={bloqueSeleccionadoId}
          onBloqueChange={(bloqueId, _casoIds, extra) => {
            setBloqueSeleccionadoId(bloqueId);
            setSiniestrosBloqueSeleccionado(extra?.siniestros || []);
            setPagina(1);
          }}
          compact
          radioKmInicial={esAnalista ? RADIO_KM_ANALISTA_BBVA_CAT : RADIO_KM_LISTADO_BBVA_CAT}
          depurarArchivos
          incluirConArchivos={esAnalista ? incluirConArchivos : false}
          soloConArchivos={!esAnalista}
          reloadToken={mapaReloadToken}
          getCasoHref={hrefDesdeMapa}
        />

        <div className={`${expressTableWrap} w-full min-w-0`}>
          <div className={expressTableScroll}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className={expressTableHead}>
                <tr>
                  <th className="sticky left-0 top-0 z-30 bg-gray-50 px-4 py-3 dark:bg-gray-900">
                    {t('bbvaCat.report.actions')}
                  </th>
                  {COLUMNAS.map((col) => (
                    <ThOrdenable
                      key={col.clave}
                      campo={col.clave}
                      orden={orden}
                      onOrdenar={cambiarOrden}
                    >
                      {col.clave === 'consecutivo'
                        ? t('bbvaCat.report.consecutivo')
                        : t(`bbvaCat.fields.${col.labelKey}`)}
                    </ThOrdenable>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
                {loading ? (
                  <tr>
                    <td colSpan={COLUMNAS.length + 1} className="px-4 py-8 text-center text-sm text-gray-500">
                      {t('bbvaCat.report.loadingCases')}
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={COLUMNAS.length + 1} className="px-4 py-8 text-center text-sm text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNAS.length + 1} className="px-4 py-8 text-center text-sm text-gray-500">
                      {esAnalista
                        ? t('bbvaCat.listadoReport.noCasesAnalista')
                        : t('bbvaCat.listadoReport.noCasesDocumented')}
                    </td>
                  </tr>
                ) : (
                  paginaItems.map((item) => {
                    const resaltado =
                      siniestrosBloqueSeleccionado.length === 1 &&
                      [item.siniestro, item.zc].some(
                        (v) => String(v || '').trim() === String(siniestrosBloqueSeleccionado[0]).trim()
                      );
                    return (
                    <tr
                      key={item._id}
                      className={`transition hover:bg-gray-50/80 dark:hover:bg-gray-900/30 ${
                        resaltado ? 'bg-amber-50/80 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <td
                        className={`sticky left-0 z-10 whitespace-nowrap px-4 py-3 ${
                          resaltado
                            ? 'bg-amber-50/80 dark:bg-amber-950/20'
                            : 'bg-white dark:bg-[#1A1A1A]'
                        }`}
                      >
                        <AccionesBbvaCatMenu
                          docsCount={item.nArchivos ?? item.archivos?.length ?? 0}
                          tieneLiquidador={!!item.liquidador}
                          tieneInforme={!!item.informeUnico}
                          onGestionar={() => setCasoEdicion(item)}
                          onArchivero={() => setCasoArchivero(item)}
                          onLiquidador={() => irACasoListado(item, 'liquidador')}
                          onInformeUnico={() => irACasoListado(item, 'informe')}
                          onEliminar={() => solicitarEliminar(item)}
                        />
                      </td>
                      {COLUMNAS.map((col) => (
                        <td
                          key={col.clave}
                          className="whitespace-nowrap px-4 py-3 font-body text-sm text-gray-800 dark:text-gray-200"
                        >
                          {obtenerValorCelda(item, col.clave)}
                        </td>
                      ))}
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {!loading && filtrados.length > 0 && totalPaginas > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
              <button
                type="button"
                className={expressBtnSecondary}
                disabled={paginaActual <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                {t('common.prev')}
              </button>
              <span className="font-body text-sm text-gray-500">
                {paginaActual} / {totalPaginas}
              </span>
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={paginaActual >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </div>
      </div>

      {casoEdicion && (
        <ExpressModal
          open
          onClose={() => setCasoEdicion(null)}
          title={t('bbvaCat.page.editCase', { caseNumber: casoEdicion.consecutivo || '' })}
          wide
        >
          <FormularioBbvaCat
            embed
            origen="listado"
            initialData={casoEdicion}
            onClose={() => setCasoEdicion(null)}
            onSaved={async () => {
              setCasoEdicion(null);
              await recargar();
              setMapaReloadToken((n) => n + 1);
            }}
          />
        </ExpressModal>
      )}

      {casoArchivero && (
        <ExpressModal
          open
          onClose={() => setCasoArchivero(null)}
          title={t('bbvaCat.archive.title')}
          wide
        >
          <ArchiveroBbvaCat
            origen="listado"
            caso={casoArchivero}
            onClose={() => setCasoArchivero(null)}
            onChanged={(actualizado) => {
              setCasoArchivero(actualizado);
              recargar();
              setMapaReloadToken((n) => n + 1);
            }}
          />
        </ExpressModal>
      )}

      <ModalImportarExcelBbvaCat
        open={modalImportOpen}
        onClose={() => setModalImportOpen(false)}
        onCompleted={async () => {
          await recargar();
          setMapaReloadToken((n) => n + 1);
        }}
      />

      {aviso && (
        <ExpressAvisoModal
          open
          tipo={aviso.tipo}
          titulo={aviso.titulo}
          mensaje={aviso.mensaje}
          onClose={() => setAviso(null)}
          onConfirm={aviso.onConfirm}
        />
      )}
    </div>
  );
}
