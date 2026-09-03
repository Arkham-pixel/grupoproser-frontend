import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { FaFileExcel, FaPlus, FaUpload } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import {
  deleteCasoAllianzListado,
  fetchAllCasosAllianzListado,
} from '../../services/allianzListadoService.js';
import FormularioAllianz from './FormularioAllianz.jsx';
import AccionesAllianzMenu from './AccionesAllianzMenu.jsx';
import ModalImportarExcelAllianz, {
  esAdminOSoporteAllianz,
} from './ModalImportarExcelAllianz.jsx';
import {
  ALLIANZ_REPORTE_PAGE_SIZE,
  buildOpcionesFiltro,
  casoAllianzCoincideFiltroDocumento,
  casoAllianzEnReporteInformes,
  casoAllianzTieneInforme,
  casoAllianzTieneLiquidador,
  coincideFiltroCiudadAllianz,
  coincideFiltroTexto,
  etiquetaTipoPolizaAllianz,
  fechaEnRango,
  formatDate,
  diasEnEstadoAllianz,
  ultimaGestionAllianz,
  normTexto,
  textoDocumentosAllianz,
} from './allianzHelpers.js';
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
import { aplicarOrdenTabla, useOrdenTabla } from '../../hooks/useOrdenTabla.js';
import {
  etiquetaSesionPersona,
  esSesionReporteInformesAllianz,
  filtrarCasosAsignadosASesion,
} from '../../utils/permisosCasoPorRol.js';
import { useFiltroCasoExclusivo } from '../../utils/filtroCasoExclusivo.js';

function valorOrdenAllianzListado(item, clave) {
  if (clave === 'tipoPoliza') return etiquetaTipoPolizaAllianz(item);
  if (clave === 'diasEnEstado') return diasEnEstadoAllianz(item);
  if (clave === 'ultimaGestion') return ultimaGestionAllianz(item);
  if (clave === 'documentos') return textoDocumentosAllianz(item);
  return item[clave];
}

const COLUMNA_DOCUMENTOS = { clave: 'documentos', labelKey: 'documentos' };

const navLinkAllianz =
  'inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200';
const navActiveAllianz =
  'inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-2 font-body text-sm font-semibold text-white shadow-sm';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo p-2 dark:bg-[#0F0F0F] sm:p-4';
const wrap = 'w-full min-w-0 space-y-4 sm:space-y-6';

const COLUMNAS = [
  { clave: 'consecutivo', labelKey: 'consecutivo' },
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
  { clave: 'modalidadAtencion', labelKey: 'modalidadAtencion' },
  { clave: 'ajustadorLider', labelKey: 'ajustadorLider' },
  { clave: 'ajustador', labelKey: 'ajustador' },
  { clave: 'inspector', labelKey: 'inspector' },
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
  { clave: 'fechaAnulado', labelKey: 'fechaAnulado' },
  { clave: 'diasEnEstado', labelKey: 'diasEnEstado' },
  { clave: 'ultimaGestion', labelKey: 'ultimaGestion' },
  { clave: 'documentoFaltante', labelKey: 'documentoFaltante' },
  { clave: 'observaciones', labelKey: 'observaciones' },
];

const buildExportRow = (caso, { incluirDocumentos = false } = {}) => ({
  ...(incluirDocumentos ? { Documentos: textoDocumentosAllianz(caso) || '' } : {}),
  Consecutivo: caso.consecutivo ?? '',
  Siniestro: caso.siniestro ?? '',
  'TIPO IDENTIFICACIÓN': caso.tipoIdentificacion ?? '',
  IDENTIFICACIÓN: caso.identificacion ?? '',
  PÓLIZA: caso.numeroPoliza ?? '',
  'TIPO PÓLIZA': etiquetaTipoPolizaAllianz(caso),
  CAUSA: caso.causa ?? '',
  ASEGURADO: caso.asegurado ?? '',
  INTERMEDIARIO: caso.intermediario ?? '',
  'CORREO INTERMEDIARIO': caso.correoIntermediario ?? '',
  'TELEFONO INTERMEDIARIO': caso.telefonoIntermediario ?? '',
  'TELEFONO ASEGURADO': caso.telefonoAsegurado ?? '',
  'CORREO ASEGURADO': caso.correoAsegurado ?? '',
  CIUDAD: caso.ciudad ?? '',
  ESTADO: caso.estado ?? '',
  MODALIDAD: caso.modalidadAtencion ?? '',
  'AJUSTADOR LIDER': caso.ajustadorLider ?? '',
  AJUSTADOR: caso.ajustador ?? '',
  INSPECTOR: caso.inspector ?? '',
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
  'FECHA PAGADO': formatDate(caso.fechaCasoPagado),
  'FECHA ANULADO': formatDate(caso.fechaAnulado),
  'DÍAS EN ESTADO': diasEnEstadoAllianz(caso) || '',
  'ÚLTIMA GESTIÓN': formatDate(ultimaGestionAllianz(caso)),
  'DOCUMENTO FALTANTE': caso.documentoFaltante ?? '',
  OBSERVACIONES: caso.observaciones ?? '',
  'Fecha creación': formatDate(caso.createdAt),
});

export default function ReporteAllianzListado({ modoAsignados = false, soloInformes = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { casoIdUrl, coincide: coincideCasoUrl, limpiar: limpiarCasoUrl, activo: filtroCasoUrl } =
    useFiltroCasoExclusivo();
  const nombreSesion = etiquetaSesionPersona();
  const puedeVerInformes = esSesionReporteInformesAllianz();
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroAjustador, setFiltroAjustador] = useState('');
  const [filtroDocumento, setFiltroDocumento] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [pagina, setPagina] = useState(1);
  const { orden, cambiarOrden } = useOrdenTabla();
  const [casoEdicion, setCasoEdicion] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [modalImportOpen, setModalImportOpen] = useState(false);
  const puedeImportarExcel = esAdminOSoporteAllianz();

  const columnas = useMemo(
    () => (soloInformes ? [COLUMNA_DOCUMENTOS, ...COLUMNAS] : COLUMNAS),
    [soloInformes]
  );

  useEffect(() => {
    if (soloInformes && !puedeVerInformes) {
      navigate('/allianz/listado/reporte', { replace: true });
    }
  }, [soloInformes, puedeVerInformes, navigate]);

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllCasosAllianzListado(2000);
      let lista = modoAsignados ? filtrarCasosAsignadosASesion(data) : data;
      if (soloInformes) lista = lista.filter(casoAllianzEnReporteInformes);
      setCasos(lista);
    } catch (err) {
      setError(err.message || t('allianz.report.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t, modoAsignados, soloInformes]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const ciudades = useMemo(() => buildOpcionesFiltro(casos, 'ciudad'), [casos]);
  const estados = useMemo(() => buildOpcionesFiltro(casos, 'estado'), [casos]);
  const ajustadores = useMemo(() => buildOpcionesFiltro(casos, 'ajustador'), [casos]);

  const filtrados = useMemo(() => {
    const q = normTexto(busqueda);
    return casos.filter((c) => {
      if (soloInformes && !casoAllianzEnReporteInformes(c)) return false;
      if (soloInformes && !casoAllianzCoincideFiltroDocumento(c, filtroDocumento)) return false;
      if (!coincideCasoUrl(c)) return false;
      if (casoIdUrl) return true;
      if (!coincideFiltroCiudadAllianz(c.ciudad, filtroCiudad)) return false;
      if (!coincideFiltroTexto(c.estado, filtroEstado)) return false;
      if (!coincideFiltroTexto(c.ajustador, filtroAjustador)) return false;
      if (fechaInicio || fechaFin) {
        if (!fechaEnRango(c.createdAt, fechaInicio, fechaFin)) return false;
      }
      if (!q) return true;
      const blob = [
        c.consecutivo,
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
        c.inspector,
        c.observaciones,
        textoDocumentosAllianz(c),
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
    filtroDocumento,
    fechaInicio,
    fechaFin,
    casoIdUrl,
    coincideCasoUrl,
    soloInformes,
  ]);

  const casosOrdenados = useMemo(
    () => aplicarOrdenTabla(filtrados, orden, valorOrdenAllianzListado),
    [filtrados, orden]
  );

  const totalPaginas = Math.max(1, Math.ceil(casosOrdenados.length / ALLIANZ_REPORTE_PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * ALLIANZ_REPORTE_PAGE_SIZE;
  const paginaItems = casosOrdenados.slice(desde, desde + ALLIANZ_REPORTE_PAGE_SIZE);

  useEffect(() => {
    setPagina(1);
  }, [
    busqueda,
    filtroCiudad,
    filtroEstado,
    filtroAjustador,
    filtroDocumento,
    fechaInicio,
    fechaFin,
    orden.campo,
    orden.asc,
    casoIdUrl,
  ]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroCiudad('');
    setFiltroEstado('');
    setFiltroAjustador('');
    setFiltroDocumento('');
    setFechaInicio('');
    setFechaFin('');
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
    'fechaAnulado',
    'ultimaGestion',
  ]);

  const obtenerValorCelda = (item, clave) => {
    if (clave === 'documentos') return textoDocumentosAllianz(item) || '—';
    if (clave === 'tipoPoliza') return etiquetaTipoPolizaAllianz(item) || '—';
    if (clave === 'diasEnEstado') return diasEnEstadoAllianz(item) || '—';
    if (clave === 'ultimaGestion') return formatDate(ultimaGestionAllianz(item)) || '—';
    const valor = item[clave];
    if (valor === null || valor === undefined || valor === '') return '—';
    if (FECHAS_LISTADO.has(clave)) return formatDate(valor) || '—';
    return String(valor);
  };

  const exportarExcel = () => {
    if (!casosOrdenados.length) {
      setAviso({
        tipo: 'error',
        titulo: t('allianz.report.noData'),
        mensaje: t('allianz.report.noDataExport'),
      });
      return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      casosOrdenados.map((caso) => buildExportRow(caso, { incluirDocumentos: soloInformes }))
    );
    XLSX.utils.book_append_sheet(wb, ws, soloInformes ? 'Informes Allianz' : 'Listado Allianz');
    XLSX.writeFile(
      wb,
      `${soloInformes ? 'allianz-informes' : 'allianz-listado'}-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const solicitarEliminar = (item) => {
    setAviso({
      tipo: 'confirm',
      titulo: t('allianz.report.confirmDeleteTitle'),
      mensaje: t('allianz.report.confirmDeleteMessage', {
        caseNumber: item.consecutivo || item.siniestro,
      }),
      onConfirm: async () => {
        try {
          await deleteCasoAllianzListado(item._id);
          setAviso({
            tipo: 'ok',
            titulo: t('allianz.report.deleted'),
            mensaje: t('allianz.report.caseDeleted', {
              caseNumber: item.consecutivo || item.siniestro || '',
            }),
          });
          await recargar();
        } catch (err) {
          setAviso({
            tipo: 'error',
            titulo: t('allianz.report.deleteError'),
            mensaje: err.message || t('allianz.report.deleteErrorMessage'),
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
      filtroDocumento ||
      fechaInicio ||
      fechaFin ||
      filtroCasoUrl
  );

  if (soloInformes && !puedeVerInformes) return null;

  return (
    <div className={`${expressScope} ${root}`}>
      <div className={wrap}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className={expressBadge}>{soloInformes ? 'Allianz · Informes' : 'Allianz · Listado'}</span>
            <div>
              <h1 className={expressPageTitle}>
                {modoAsignados
                  ? `${t('allianz.listadoReport.title')} — ${t('nav.assignedCases')}`
                  : soloInformes
                    ? t('allianz.listadoReport.informesTitle')
                    : t('allianz.listadoReport.title')}
              </h1>
              <p className={expressPageSubtitle}>
                {modoAsignados
                  ? t('common.assignedCasesHint', { name: nombreSesion || '—' })
                  : soloInformes
                    ? t('allianz.listadoReport.informesSubtitle')
                    : t('allianz.listadoReport.subtitle')}
              </p>
            </div>
            <nav className="flex flex-wrap gap-2">
              <Link to="/allianz/carga" className={navLinkAllianz}>
                <FaPlus />
                {t('nav.allianzAddCase')}
              </Link>
              <Link to="/allianz/listado/dashboard" className={navLinkAllianz}>
                {t('nav.allianzListadoDashboard')}
              </Link>
              {modoAsignados || soloInformes ? (
                <Link to="/allianz/listado/reporte" className={navLinkAllianz}>
                  {t('nav.allianzListadoReport')}
                </Link>
              ) : (
                <span className={navActiveAllianz}>{t('nav.allianzListadoReport')}</span>
              )}
              {puedeVerInformes &&
                (soloInformes ? (
                  <span className={navActiveAllianz}>{t('nav.allianzInformesReport')}</span>
                ) : (
                  <Link to="/allianz/listado/informes" className={navLinkAllianz}>
                    {t('nav.allianzInformesReport')}
                  </Link>
                ))}
              {modoAsignados ? (
                <span className={navActiveAllianz}>{t('nav.assignedCases')}</span>
              ) : (
                <Link to="/allianz/listado/mis-casos" className={navLinkAllianz}>
                  {t('nav.assignedCases')}
                </Link>
              )}
            </nav>
          </div>
          <div className="flex flex-wrap gap-2">
            {puedeImportarExcel && !modoAsignados && !soloInformes && (
              <button
                type="button"
                className={expressBtnPrimary}
                onClick={() => setModalImportOpen(true)}
                disabled={loading}
              >
                <FaUpload />
                {t('allianz.report.importExcel')}
              </button>
            )}
            <button type="button" className={expressBtnSecondary} onClick={exportarExcel} disabled={loading}>
              <FaFileExcel />
              {t('allianz.report.exportExcel')}
            </button>
          </div>
        </header>

        <ExpressFilterSection
          title={t('allianz.report.filters')}
          showClear={filtrosActivos}
          onClear={limpiarFiltros}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Campo label={t('common.search')}>
              <InputFenix
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={t('allianz.listadoReport.searchPlaceholder')}
              />
            </Campo>
            <Campo label={t('allianz.fields.ciudad')}>
              <SelectFenix value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)}>
                <option value="">{t('allianz.report.all')}</option>
                {ciudades.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('allianz.fields.estado')}>
              <SelectFenix value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">{t('allianz.report.all')}</option>
                {estados.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('allianz.fields.ajustador')}>
              <SelectFenix
                value={filtroAjustador}
                onChange={(e) => setFiltroAjustador(e.target.value)}
              >
                <option value="">{t('allianz.report.all')}</option>
                {ajustadores.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            {soloInformes && (
              <Campo label={t('allianz.listadoReport.filterDocumentos')}>
                <SelectFenix
                  value={filtroDocumento}
                  onChange={(e) => setFiltroDocumento(e.target.value)}
                >
                  <option value="">{t('allianz.report.all')}</option>
                  <option value="unico">{t('allianz.listadoReport.doc.unico')}</option>
                  <option value="final">{t('allianz.listadoReport.doc.final')}</option>
                  <option value="preliminar">{t('allianz.listadoReport.doc.preliminar')}</option>
                  <option value="liquidador">{t('allianz.listadoReport.doc.liquidador')}</option>
                </SelectFenix>
              </Campo>
            )}
            <Campo label={t('allianz.report.from')}>
              <InputFenix type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </Campo>
            <Campo label={t('allianz.report.to')}>
              <InputFenix type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </Campo>
          </div>
          <p className="mt-4 font-body text-sm text-gray-500 dark:text-gray-400">
            {loading
              ? t('common.loading')
              : t('allianz.report.recordsSummary', {
                  count: filtrados.length,
                  page: paginaActual,
                  totalPages: totalPaginas,
                })}
          </p>
        </ExpressFilterSection>

        <div className={`${expressTableWrap} w-full min-w-0`}>
          <div className={expressTableScroll}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className={expressTableHead}>
                <tr>
                  <th className="sticky left-0 top-0 z-30 bg-gray-50 px-4 py-3 dark:bg-gray-900">
                    {t('allianz.report.actions')}
                  </th>
                  {columnas.map((col) => (
                    <ThOrdenable
                      key={col.clave}
                      campo={col.clave}
                      orden={orden}
                      onOrdenar={cambiarOrden}
                    >
                      {col.clave === 'consecutivo'
                        ? t('allianz.report.consecutivo')
                        : col.clave === 'documentos'
                          ? t('allianz.listadoReport.documentos')
                          : t(`allianz.fields.${col.labelKey}`)}
                    </ThOrdenable>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
                {loading ? (
                  <tr>
                    <td colSpan={columnas.length + 1} className="px-4 py-8 text-center text-sm text-gray-500">
                      {t('allianz.report.loadingCases')}
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={columnas.length + 1} className="px-4 py-8 text-center text-sm text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={columnas.length + 1} className="px-4 py-8 text-center text-sm text-gray-500">
                      {soloInformes
                        ? t('allianz.listadoReport.noInformes')
                        : t('allianz.report.noCases')}
                    </td>
                  </tr>
                ) : (
                  paginaItems.map((item) => (
                    <tr key={item._id} className="transition hover:bg-gray-50/80 dark:hover:bg-gray-900/30">
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-3 dark:bg-[#1A1A1A]">
                        <AccionesAllianzMenu
                          tieneLiquidador={casoAllianzTieneLiquidador(item)}
                          tieneInforme={casoAllianzTieneInforme(item)}
                          onGestionar={() => setCasoEdicion(item)}
                          onLiquidador={() =>
                            navigate(`/allianz/listado/caso?casoId=${item._id}&tab=liquidador`, {
                              state: { casoAllianz: item },
                            })
                          }
                          onInformeAgil={() =>
                            navigate(`/allianz/listado/caso?casoId=${item._id}&tab=informe-agil`, {
                              state: { casoAllianz: item },
                            })
                          }
                          onInformeUnico={() =>
                            navigate(`/allianz/listado/caso?casoId=${item._id}&tab=informe`, {
                              state: { casoAllianz: item },
                            })
                          }
                          onEliminar={() => solicitarEliminar(item)}
                        />
                      </td>
                      {columnas.map((col) => (
                        <td
                          key={col.clave}
                          className="whitespace-nowrap px-4 py-3 font-body text-sm text-gray-800 dark:text-gray-200"
                        >
                          {obtenerValorCelda(item, col.clave)}
                        </td>
                      ))}
                    </tr>
                  ))
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
          title={t('allianz.page.editCase', { caseNumber: casoEdicion.consecutivo || '' })}
          wide
        >
          <FormularioAllianz
            embed
            origen="listado"
            initialData={casoEdicion}
            onClose={() => setCasoEdicion(null)}
            onSaved={async () => {
              setCasoEdicion(null);
              await recargar();
            }}
          />
        </ExpressModal>
      )}

      <ModalImportarExcelAllianz
        open={modalImportOpen}
        onClose={() => setModalImportOpen(false)}
        onCompleted={async () => {
          await recargar();
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
