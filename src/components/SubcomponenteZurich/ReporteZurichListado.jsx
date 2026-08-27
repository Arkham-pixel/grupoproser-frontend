import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { FaFileExcel, FaPlus, FaUpload } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import {
  deleteCasoZurichListado,
  fetchAllCasosZurichListado,
} from '../../services/zurichListadoService.js';
import FormularioZurich from './FormularioZurich.jsx';
import AccionesZurichMenu from './AccionesZurichMenu.jsx';
import ArchiveroZurich from './ArchiveroZurich.jsx';
import ModalImportarExcelZurich, {
  esAdminOSoporteZurich,
} from './ModalImportarExcelZurich.jsx';
import {
  ZURICH_REPORTE_PAGE_SIZE,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  etiquetaTipoPolizaZurich,
  fechaEnRango,
  formatDate,
  normTexto,
} from './zurichHelpers.js';
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
  { clave: 'fechaAutorizacionAnalista', labelKey: 'fechaAutorizacionAnalista' },
  { clave: 'fechaCasoParaPago', labelKey: 'fechaCasoParaPago' },
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
  'TIPO PÓLIZA': etiquetaTipoPolizaZurich(caso),
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
  'FECHA AUTORIZACIÓN ANALISTA': formatDate(caso.fechaAutorizacionAnalista),
  'FECHA CASO PARA PAGO': formatDate(caso.fechaCasoParaPago),
  'DÍAS EN ESTADO': caso.diasEnEstado ?? '',
  'ÚLTIMA GESTIÓN': formatDate(caso.ultimaGestion),
  'DOCUMENTO FALTANTE': caso.documentoFaltante ?? '',
  OBSERVACIONES: caso.observaciones ?? '',
  'Fecha creación': formatDate(caso.createdAt),
});

export default function ReporteZurichListado() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroAjustador, setFiltroAjustador] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [pagina, setPagina] = useState(1);
  const { orden, cambiarOrden } = useOrdenTabla();
  const [casoEdicion, setCasoEdicion] = useState(null);
  const [casoArchivero, setCasoArchivero] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [modalImportOpen, setModalImportOpen] = useState(false);
  const puedeImportarExcel = esAdminOSoporteZurich();

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCasos(await fetchAllCasosZurichListado(2000));
    } catch (err) {
      setError(err.message || t('zurich.report.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const ciudades = useMemo(() => buildOpcionesFiltro(casos, 'ciudad'), [casos]);
  const estados = useMemo(() => buildOpcionesFiltro(casos, 'estado'), [casos]);
  const ajustadores = useMemo(() => buildOpcionesFiltro(casos, 'ajustador'), [casos]);

  const filtrados = useMemo(() => {
    const q = normTexto(busqueda);
    return casos.filter((c) => {
      if (!coincideFiltroTexto(c.ciudad, filtroCiudad)) return false;
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
        c.inspector,
        c.observaciones,
      ]
        .map(normTexto)
        .join(' ');
      return blob.includes(q);
    });
  }, [casos, busqueda, filtroCiudad, filtroEstado, filtroAjustador, fechaInicio, fechaFin]);

  const casosOrdenados = useMemo(
    () => aplicarOrdenTabla(filtrados, orden, valorOrdenPorDefecto),
    [filtrados, orden]
  );

  const totalPaginas = Math.max(1, Math.ceil(casosOrdenados.length / ZURICH_REPORTE_PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * ZURICH_REPORTE_PAGE_SIZE;
  const paginaItems = casosOrdenados.slice(desde, desde + ZURICH_REPORTE_PAGE_SIZE);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroCiudad, filtroEstado, filtroAjustador, fechaInicio, fechaFin, orden.campo, orden.asc]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroCiudad('');
    setFiltroEstado('');
    setFiltroAjustador('');
    setFechaInicio('');
    setFechaFin('');
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
    'fechaAutorizacionAnalista',
    'fechaCasoParaPago',
    'ultimaGestion',
  ]);

  const obtenerValorCelda = (item, clave) => {
    if (clave === 'tipoPoliza') return etiquetaTipoPolizaZurich(item) || '—';
    const valor = item[clave];
    if (valor === null || valor === undefined || valor === '') return '—';
    if (FECHAS_LISTADO.has(clave)) return formatDate(valor) || '—';
    return String(valor);
  };

  const exportarExcel = () => {
    if (!casosOrdenados.length) {
      setAviso({
        tipo: 'error',
        titulo: t('zurich.report.noData'),
        mensaje: t('zurich.report.noDataExport'),
      });
      return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(casosOrdenados.map(buildExportRow));
    XLSX.utils.book_append_sheet(wb, ws, 'Listado Zurich');
    XLSX.writeFile(wb, `zurich-listado-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const solicitarEliminar = (item) => {
    setAviso({
      tipo: 'confirm',
      titulo: t('zurich.report.confirmDeleteTitle'),
      mensaje: t('zurich.report.confirmDeleteMessage', {
        caseNumber: item.consecutivo || item.zc || item.siniestro,
      }),
      onConfirm: async () => {
        try {
          await deleteCasoZurichListado(item._id);
          setAviso({
            tipo: 'ok',
            titulo: t('zurich.report.deleted'),
            mensaje: t('zurich.report.caseDeleted', {
              caseNumber: item.consecutivo || item.zc || '',
            }),
          });
          await recargar();
        } catch (err) {
          setAviso({
            tipo: 'error',
            titulo: t('zurich.report.deleteError'),
            mensaje: err.message || t('zurich.report.deleteErrorMessage'),
          });
        }
      },
    });
  };

  const filtrosActivos = Boolean(
    busqueda || filtroCiudad || filtroEstado || filtroAjustador || fechaInicio || fechaFin
  );

  return (
    <div className={`${expressScope} ${root}`}>
      <div className={wrap}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className={expressBadge}>Zurich · Listado</span>
            <div>
              <h1 className={expressPageTitle}>{t('zurich.listadoReport.title')}</h1>
              <p className={expressPageSubtitle}>{t('zurich.listadoReport.subtitle')}</p>
            </div>
            <nav className="flex flex-wrap gap-2">
              <Link
                to="/zurich/carga"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                <FaPlus />
                {t('nav.zurichAddCase')}
              </Link>
              <Link
                to="/zurich/listado/dashboard"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                {t('nav.zurichListadoDashboard')}
              </Link>
              <span className="inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-2 font-body text-sm font-semibold text-white shadow-sm">
                {t('nav.zurichListadoReport')}
              </span>
            </nav>
          </div>
          <div className="flex flex-wrap gap-2">
            {puedeImportarExcel && (
              <button
                type="button"
                className={expressBtnPrimary}
                onClick={() => setModalImportOpen(true)}
                disabled={loading}
              >
                <FaUpload />
                {t('zurich.report.importExcel')}
              </button>
            )}
            <button type="button" className={expressBtnSecondary} onClick={exportarExcel} disabled={loading}>
              <FaFileExcel />
              {t('zurich.report.exportExcel')}
            </button>
          </div>
        </header>

        <ExpressFilterSection
          title={t('zurich.report.filters')}
          showClear={filtrosActivos}
          onClear={limpiarFiltros}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Campo label={t('common.search')}>
              <InputFenix
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={t('zurich.listadoReport.searchPlaceholder')}
              />
            </Campo>
            <Campo label={t('zurich.fields.ciudad')}>
              <SelectFenix value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)}>
                <option value="">{t('zurich.report.all')}</option>
                {ciudades.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('zurich.fields.estado')}>
              <SelectFenix value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">{t('zurich.report.all')}</option>
                {estados.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('zurich.fields.ajustador')}>
              <SelectFenix
                value={filtroAjustador}
                onChange={(e) => setFiltroAjustador(e.target.value)}
              >
                <option value="">{t('zurich.report.all')}</option>
                {ajustadores.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('zurich.report.from')}>
              <InputFenix type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </Campo>
            <Campo label={t('zurich.report.to')}>
              <InputFenix type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </Campo>
          </div>
          <p className="mt-4 font-body text-sm text-gray-500 dark:text-gray-400">
            {loading
              ? t('common.loading')
              : t('zurich.report.recordsSummary', {
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
                    {t('zurich.report.actions')}
                  </th>
                  {COLUMNAS.map((col) => (
                    <ThOrdenable
                      key={col.clave}
                      campo={col.clave}
                      orden={orden}
                      onOrdenar={cambiarOrden}
                    >
                      {col.clave === 'consecutivo'
                        ? t('zurich.report.consecutivo')
                        : t(`zurich.fields.${col.labelKey}`)}
                    </ThOrdenable>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
                {loading ? (
                  <tr>
                    <td colSpan={COLUMNAS.length + 1} className="px-4 py-8 text-center text-sm text-gray-500">
                      {t('zurich.report.loadingCases')}
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
                      {t('zurich.report.noCases')}
                    </td>
                  </tr>
                ) : (
                  paginaItems.map((item) => (
                    <tr key={item._id} className="transition hover:bg-gray-50/80 dark:hover:bg-gray-900/30">
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-3 dark:bg-[#1A1A1A]">
                        <AccionesZurichMenu
                          docsCount={item.archivos?.length || 0}
                          tieneLiquidador={!!item.liquidador}
                          tieneInforme={!!item.informeUnico}
                          onGestionar={() => setCasoEdicion(item)}
                          onArchivero={() => setCasoArchivero(item)}
                          onAbrirCaso={() =>
                            navigate(`/zurich/listado/caso?casoId=${item._id}&tab=liquidador`, {
                              state: { casoZurich: item },
                            })
                          }
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
          title={t('zurich.page.editCase', { caseNumber: casoEdicion.consecutivo || '' })}
          wide
        >
          <FormularioZurich
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

      {casoArchivero && (
        <ExpressModal
          open
          onClose={() => setCasoArchivero(null)}
          title={t('zurich.archive.title')}
          wide
        >
          <ArchiveroZurich
            origen="listado"
            caso={casoArchivero}
            onClose={() => setCasoArchivero(null)}
            onChanged={(actualizado) => {
              setCasoArchivero(actualizado);
              setCasos((prev) =>
                prev.map((c) => (c._id === actualizado._id ? { ...c, ...actualizado } : c))
              );
            }}
          />
        </ExpressModal>
      )}

      <ModalImportarExcelZurich
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
