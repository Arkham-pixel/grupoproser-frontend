import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { FaFileExcel, FaPlus, FaUpload } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import {
  deleteCasoEquidadCat,
  fetchAllCasosEquidadCat,
} from '../../services/equidadCatService.js';
import FormularioEquidadCat from './FormularioEquidadCat.jsx';
import AccionesEquidadCatMenu from './AccionesEquidadCatMenu.jsx';
import ModalImportarExcelEquidadCat, {
  esAdminOSoporteEquidadCat,
} from './ModalImportarExcelEquidadCat.jsx';
import {
  EQUIDAD_CAT_REPORTE_PAGE_SIZE,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatDate,
  formatCurrency,
  diasEnEstadoEquidadCat,
  ultimaGestionEquidadCat,
  normTexto,
} from './equidadCatHelpers.js';
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
import { etiquetaSesionPersona, filtrarCasosAsignadosASesion } from '../../utils/permisosCasoPorRol.js';

function valorOrdenEquidadCat(item, clave) {
  if (clave === 'diasEnEstado') return diasEnEstadoEquidadCat(item);
  if (clave === 'ultimaGestion') return ultimaGestionEquidadCat(item);
  return item[clave];
}

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo p-2 dark:bg-[#0F0F0F] sm:p-4';
const wrap = 'w-full min-w-0 space-y-4 sm:space-y-6';

const COLUMNAS = [
  { clave: 'consecutivo', labelKey: 'consecutivo' },
  { clave: 'fechaAviso', labelKey: 'fechaAviso' },
  { clave: 'producto', labelKey: 'producto' },
  { clave: 'numeroPoliza', labelKey: 'numeroPoliza' },
  { clave: 'siniestro', labelKey: 'siniestro' },
  { clave: 'numeroCasoCliente', labelKey: 'numeroCasoCliente' },
  { clave: 'asegurado', labelKey: 'asegurado' },
  { clave: 'celular', labelKey: 'celular' },
  { clave: 'tomador', labelKey: 'tomador' },
  { clave: 'analista', labelKey: 'analista' },
  { clave: 'ajustador', labelKey: 'ajustador' },
  { clave: 'fechaAsignacion', labelKey: 'fechaAsignacion' },
  { clave: 'asignacion', labelKey: 'asignacion' },
  { clave: 'estado', labelKey: 'estado' },
  { clave: 'departamento', labelKey: 'departamento' },
  { clave: 'ciudad', labelKey: 'ciudad' },
  { clave: 'reserva', labelKey: 'reserva' },
  { clave: 'comentariosAnalista', labelKey: 'comentariosAnalista' },
  { clave: 'valorAsegurado', labelKey: 'valorAsegurado' },
  { clave: 'deducibleMaxPct', labelKey: 'deducibleMaxPct' },
  { clave: 'tipoDeducible', labelKey: 'tipoDeducible' },
  { clave: 'deducibleSmmlv', labelKey: 'deducibleSmmlv' },
  { clave: 'fechaDefinicion', labelKey: 'fechaDefinicion' },
  { clave: 'fechaUltimoDocumento', labelKey: 'fechaUltimoDocumento' },
  { clave: 'fechaCausacion', labelKey: 'fechaCausacion' },
  { clave: 'fechaGiro', labelKey: 'fechaGiro' },
  { clave: 'valorIndemnizado', labelKey: 'valorIndemnizado' },
  { clave: 'visita', labelKey: 'visita' },
  { clave: 'fechaVisita', labelKey: 'fechaVisita' },
  { clave: 'asignadoAAjustador', labelKey: 'asignadoAAjustador' },
  { clave: 'intermediario', labelKey: 'intermediario' },
  { clave: 'reservaDirecta', labelKey: 'reservaDirecta' },
  { clave: 'reservaGastos', labelKey: 'reservaGastos' },
  { clave: 'diferenciaReserva', labelKey: 'diferenciaReserva' },
  { clave: 'ajustadorLider', labelKey: 'ajustadorLider' },
  { clave: 'inspector', labelKey: 'inspector' },
  { clave: 'modalidadAtencion', labelKey: 'modalidadAtencion' },
  { clave: 'diasEnEstado', labelKey: 'diasEnEstado' },
  { clave: 'ultimaGestion', labelKey: 'ultimaGestion' },
  { clave: 'documentoFaltante', labelKey: 'documentoFaltante' },
  { clave: 'observaciones', labelKey: 'observaciones' },
];

const CAMPOS_MONEDA_REPORTE = new Set([
  'reserva',
  'valorAsegurado',
  'valorIndemnizado',
  'reservaDirecta',
  'reservaGastos',
  'diferenciaReserva',
]);

const buildExportRow = (caso) => ({
  Consecutivo: caso.consecutivo ?? '',
  'Fecha de aviso': formatDate(caso.fechaAviso),
  Producto: caso.producto ?? '',
  PÓLIZA: caso.numeroPoliza ?? '',
  SINIESTRO: caso.siniestro ?? '',
  CASO: caso.numeroCasoCliente ?? '',
  ASEGURADO: caso.asegurado ?? '',
  CELULAR: caso.celular ?? caso.telefonoAsegurado ?? '',
  TOMADOR: caso.tomador ?? '',
  ANALISTA: caso.analista ?? '',
  AJUSTADOR: caso.ajustador ?? '',
  'FECHA DE ASIGNACIÓN': formatDate(caso.fechaAsignacion),
  ASIGNACION: caso.asignacion ?? '',
  ESTADO: caso.estado ?? '',
  DEPARTAMENTO: caso.departamento ?? '',
  CIUDAD: caso.ciudad ?? '',
  RESERVA: caso.reserva ?? '',
  'COMENTARIOS ANALISTA': caso.comentariosAnalista ?? '',
  'VALOR ASEGURADO': caso.valorAsegurado ?? caso.valorAseguradoInmueble ?? '',
  'DEDUCIBLE MAX %': caso.deducibleMaxPct ?? '',
  'TIPO DEDUCIBLE': caso.tipoDeducible ?? '',
  'DEDUCIBLE SMMLV': caso.deducibleSmmlv ?? '',
  'FECHA DEFINICIÓN': formatDate(caso.fechaDefinicion),
  'FECHA ULTIMO DOCUMENTO': formatDate(caso.fechaUltimoDocumento),
  'FECHA CAUSACIÓN': formatDate(caso.fechaCausacion),
  'FECHA GIRO': formatDate(caso.fechaGiro),
  'VALOR INDEMNIZADO': caso.valorIndemnizado ?? '',
  VISITA: caso.visita ?? '',
  'FECHA VISITA': formatDate(caso.fechaVisita),
  'Ya se asigno a Ajustador?': caso.asignadoAAjustador ?? '',
  INTERMEDIARIO: caso.intermediario ?? '',
  'RESERVA DIRECTA': caso.reservaDirecta ?? '',
  'RESERVA GASTOS': caso.reservaGastos ?? '',
  DIFERENCIA: caso.diferenciaReserva ?? '',
  'AJUSTADOR LIDER': caso.ajustadorLider ?? '',
  INSPECTOR: caso.inspector ?? '',
  MODALIDAD: caso.modalidadAtencion ?? '',
  'DÍAS EN ESTADO': diasEnEstadoEquidadCat(caso) || '',
  'ÚLTIMA GESTIÓN': formatDate(ultimaGestionEquidadCat(caso)),
  'DOCUMENTO FALTANTE': caso.documentoFaltante ?? '',
  OBSERVACIONES: caso.observaciones ?? '',
});

export default function ReporteEquidadCat({ modoAsignados = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const [pagina, setPagina] = useState(1);
  const { orden, cambiarOrden } = useOrdenTabla();
  const [casoEdicion, setCasoEdicion] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [modalImportOpen, setModalImportOpen] = useState(false);
  const puedeImportarExcel = esAdminOSoporteEquidadCat();

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllCasosEquidadCat(2000);
      setCasos(modoAsignados ? filtrarCasosAsignadosASesion(data) : data);
    } catch (err) {
      setError(err.message || t('equidadCat.report.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t, modoAsignados]);

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
        if (!fechaEnRango(c.fechaAviso || c.createdAt, fechaInicio, fechaFin)) return false;
      }
      if (!q) return true;
      const blob = [
        c.consecutivo,
        c.siniestro,
        c.numeroCasoCliente,
        c.numeroPoliza,
        c.producto,
        c.asegurado,
        c.tomador,
        c.analista,
        c.celular,
        c.intermediario,
        c.ciudad,
        c.departamento,
        c.estado,
        c.ajustadorLider,
        c.ajustador,
        c.inspector,
        c.comentariosAnalista,
        c.observaciones,
      ]
        .map(normTexto)
        .join(' ');
      return blob.includes(q);
    });
  }, [casos, busqueda, filtroCiudad, filtroEstado, filtroAjustador, fechaInicio, fechaFin]);

  const casosOrdenados = useMemo(
    () => aplicarOrdenTabla(filtrados, orden, valorOrdenEquidadCat),
    [filtrados, orden]
  );

  const totalPaginas = Math.max(1, Math.ceil(casosOrdenados.length / EQUIDAD_CAT_REPORTE_PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * EQUIDAD_CAT_REPORTE_PAGE_SIZE;
  const paginaItems = casosOrdenados.slice(desde, desde + EQUIDAD_CAT_REPORTE_PAGE_SIZE);

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
    'fechaAviso',
    'fechaAsignacion',
    'fechaVisita',
    'fechaDefinicion',
    'fechaUltimoDocumento',
    'fechaCausacion',
    'fechaGiro',
    'ultimaGestion',
  ]);

  const obtenerValorCelda = (item, clave) => {
    if (clave === 'diasEnEstado') return diasEnEstadoEquidadCat(item) || '—';
    if (clave === 'ultimaGestion') return formatDate(ultimaGestionEquidadCat(item)) || '—';
    if (clave === 'celular') return item.celular || item.telefonoAsegurado || '—';
    if (clave === 'valorAsegurado') {
      const v = item.valorAsegurado ?? item.valorAseguradoInmueble;
      if (v === null || v === undefined || v === '') return '—';
      return formatCurrency(v);
    }
    const valor = item[clave];
    if (valor === null || valor === undefined || valor === '') return '—';
    if (FECHAS_LISTADO.has(clave)) return formatDate(valor) || '—';
    if (CAMPOS_MONEDA_REPORTE.has(clave)) return formatCurrency(valor);
    return String(valor);
  };

  const exportarExcel = () => {
    if (!casosOrdenados.length) {
      setAviso({
        tipo: 'error',
        titulo: t('equidadCat.report.noData'),
        mensaje: t('equidadCat.report.noDataExport'),
      });
      return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(casosOrdenados.map(buildExportRow));
    XLSX.utils.book_append_sheet(wb, ws, 'Equidad CAT');
    XLSX.writeFile(wb, `equidad-cat-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const solicitarEliminar = (item) => {
    setAviso({
      tipo: 'confirm',
      titulo: t('equidadCat.report.confirmDeleteTitle'),
      mensaje: t('equidadCat.report.confirmDeleteMessage', {
        caseNumber: item.consecutivo || item.siniestro,
      }),
      onConfirm: async () => {
        try {
          await deleteCasoEquidadCat(item._id);
          setAviso({
            tipo: 'ok',
            titulo: t('equidadCat.report.deleted'),
            mensaje: t('equidadCat.report.caseDeleted', {
              caseNumber: item.consecutivo || item.siniestro || '',
            }),
          });
          await recargar();
        } catch (err) {
          setAviso({
            tipo: 'error',
            titulo: t('equidadCat.report.deleteError'),
            mensaje: err.message || t('equidadCat.report.deleteErrorMessage'),
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
            <span className={expressBadge}>Equidad CAT</span>
            <div>
              <h1 className={expressPageTitle}>
                {modoAsignados
                  ? `${t('equidadCat.listadoReport.title')} — ${t('nav.assignedCases')}`
                  : t('equidadCat.listadoReport.title')}
              </h1>
              <p className={expressPageSubtitle}>
                {modoAsignados
                  ? t('common.assignedCasesHint', { name: nombreSesion || '—' })
                  : t('equidadCat.listadoReport.subtitle')}
              </p>
            </div>
            <nav className="flex flex-wrap gap-2">
              <Link
                to="/equidad-cat/carga"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                <FaPlus />
                {t('nav.equidadCatAddCase')}
              </Link>
              <Link
                to="/equidad-cat/dashboard"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                {t('nav.equidadCatDashboard')}
              </Link>
              {modoAsignados ? (
                <Link
                  to="/equidad-cat/reporte"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  {t('nav.equidadCatReport')}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-2 font-body text-sm font-semibold text-white shadow-sm">
                  {t('nav.equidadCatReport')}
                </span>
              )}
              {modoAsignados ? (
                <span className="inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-2 font-body text-sm font-semibold text-white shadow-sm">
                  {t('nav.assignedCases')}
                </span>
              ) : (
                <Link
                  to="/equidad-cat/mis-casos"
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
                {t('equidadCat.report.importExcel')}
              </button>
            )}
            <button type="button" className={expressBtnSecondary} onClick={exportarExcel} disabled={loading}>
              <FaFileExcel />
              {t('equidadCat.report.exportExcel')}
            </button>
          </div>
        </header>

        <ExpressFilterSection
          title={t('equidadCat.report.filters')}
          showClear={filtrosActivos}
          onClear={limpiarFiltros}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Campo label={t('common.search')}>
              <InputFenix
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={t('equidadCat.listadoReport.searchPlaceholder')}
              />
            </Campo>
            <Campo label={t('equidadCat.fields.ciudad')}>
              <SelectFenix value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)}>
                <option value="">{t('equidadCat.report.all')}</option>
                {ciudades.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('equidadCat.fields.estado')}>
              <SelectFenix value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">{t('equidadCat.report.all')}</option>
                {estados.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('equidadCat.fields.ajustador')}>
              <SelectFenix
                value={filtroAjustador}
                onChange={(e) => setFiltroAjustador(e.target.value)}
              >
                <option value="">{t('equidadCat.report.all')}</option>
                {ajustadores.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('equidadCat.report.from')}>
              <InputFenix type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </Campo>
            <Campo label={t('equidadCat.report.to')}>
              <InputFenix type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </Campo>
          </div>
          <p className="mt-4 font-body text-sm text-gray-500 dark:text-gray-400">
            {loading
              ? t('common.loading')
              : t('equidadCat.report.recordsSummary', {
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
                    {t('equidadCat.report.actions')}
                  </th>
                  {COLUMNAS.map((col) => (
                    <ThOrdenable
                      key={col.clave}
                      campo={col.clave}
                      orden={orden}
                      onOrdenar={cambiarOrden}
                    >
                      {col.clave === 'consecutivo'
                        ? t('equidadCat.report.consecutivo')
                        : t(`equidadCat.fields.${col.labelKey}`)}
                    </ThOrdenable>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
                {loading ? (
                  <tr>
                    <td colSpan={COLUMNAS.length + 1} className="px-4 py-8 text-center text-sm text-gray-500">
                      {t('equidadCat.report.loadingCases')}
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
                      {t('equidadCat.report.noCases')}
                    </td>
                  </tr>
                ) : (
                  paginaItems.map((item) => (
                    <tr key={item._id} className="transition hover:bg-gray-50/80 dark:hover:bg-gray-900/30">
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-3 dark:bg-[#1A1A1A]">
                        <AccionesEquidadCatMenu
                          tieneLiquidador={!!item.liquidador}
                          tieneInforme={!!item.informeUnico}
                          onGestionar={() => setCasoEdicion(item)}
                          onArchivero={() =>
                            navigate(`/equidad-cat/archivero?casoId=${item._id}`, {
                              state: { casoEquidadCat: item },
                            })
                          }
                          docsCount={Array.isArray(item.archivos) ? item.archivos.length : 0}
                          onLiquidador={() =>
                            navigate(`/equidad-cat/liquidador?casoId=${item._id}&tab=liquidador`, {
                              state: { casoEquidadCat: item },
                            })
                          }
                          onInformeUnico={() =>
                            navigate(`/equidad-cat/informe-unico?casoId=${item._id}&tab=informe`, {
                              state: { casoEquidadCat: item },
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
          title={t('equidadCat.page.editCase', { caseNumber: casoEdicion.consecutivo || '' })}
          wide
        >
          <FormularioEquidadCat
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

      <ModalImportarExcelEquidadCat
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
