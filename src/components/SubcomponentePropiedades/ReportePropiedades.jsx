import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { FaCog, FaFileExcel } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import {
  eliminarCasoPropiedades,
  fetchAllCasosPropiedades,
} from '../../services/propiedadesService.js';
import FormularioCasoPropiedades from './FormularioCasoPropiedades.jsx';
import AccionesPropiedadesMenu from './AccionesPropiedadesMenu.jsx';
import { convertirFechaParaExcelDate } from '../../utils/fechaUtils.js';
import {
  PROPIEDADES_COLUMNAS_STORAGE_KEY,
  PROPIEDADES_REPORTE_PAGE_SIZE,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  etiquetaInspeccion,
  fechaEnRango,
  formatDate,
} from './propiedadesHelpers.js';
import {
  expressBtnPrimary,
  expressBtnSecondary,
  expressBtnSuccess,
  expressScope,
  expressTableHead,
  expressTableWrap,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  Campo,
  ExpressAvisoModal,
  ExpressFilterSection,
  ExpressModal,
  InputFenix,
  SelectFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { PropiedadesPageHeader } from './PropiedadesUiBlocks.jsx';
import { FilterSheet, ResponsiveDataList } from '../responsive';

const reportRoot = 'min-h-full w-full min-w-0 bg-fenix-fondo p-2 dark:bg-[#0F0F0F] sm:p-4';
const pageWrapWide = 'w-full min-w-0 space-y-4 sm:space-y-6';

const formatDateForExcel = (value) => convertirFechaParaExcelDate(value);

const buildExportRow = (item) => ({
  Consecutivo: item.consecutivo ?? '',
  Cliente: item.nombreCliente ?? '',
  Documento: item.documento ?? '',
  Celular: item.celular ?? '',
  Email: item.email ?? '',
  Dirección: item.direccion ?? '',
  Localización: item.localizacion ?? '',
  Ciudad: item.ciudad ?? '',
  Departamento: item.departamento ?? '',
  'Clase inmueble': item.claseInmueble ?? '',
  'Tipo inmueble': item.tipoInmueble ?? '',
  'Quién recibe visita': item.destinacion ?? '',
  Aseguradora: item.aseguradora ?? '',
  Póliza: item.poliza ?? '',
  'N° siniestro': item.numeroSiniestro ?? '',
  'N° caso': item.numeroCaso ?? '',
  Responsable: item.responsable ?? '',
  'Fecha solicitud': formatDateForExcel(item.fechaSolicitud),
  Inspección: etiquetaInspeccion(item),
  'ID inspección': item.inspeccionId ?? '',
  Observaciones: item.observaciones ?? '',
  'Creado el': formatDateForExcel(item.createdAt),
  'Actualizado el': formatDateForExcel(item.updatedAt),
});

const COLUMNAS_FECHA_EXCEL = ['Fecha solicitud', 'Creado el', 'Actualizado el'];

const todasLasColumnas = [
  { clave: 'consecutivo', label: 'Consecutivo' },
  { clave: 'nombreCliente', label: 'Cliente' },
  { clave: 'documento', label: 'Documento' },
  { clave: 'celular', label: 'Celular' },
  { clave: 'direccion', label: 'Dirección' },
  { clave: 'ciudad', label: 'Ciudad' },
  { clave: 'departamento', label: 'Departamento' },
  { clave: 'claseInmueble', label: 'Clase' },
  { clave: 'tipoInmueble', label: 'Tipo' },
  { clave: 'destinacion', label: 'Quién recibe' },
  { clave: 'aseguradora', label: 'Aseguradora' },
  { clave: 'poliza', label: 'Póliza' },
  { clave: 'numeroSiniestro', label: 'Siniestro' },
  { clave: 'responsable', label: 'Responsable' },
  { clave: 'inspeccion', label: 'Inspección' },
  { clave: 'fechaSolicitud', label: 'Fecha solicitud' },
  { clave: 'createdAt', label: 'Creado' },
  { clave: 'updatedAt', label: 'Actualizado' },
];

const columnasIniciales = [
  'consecutivo',
  'nombreCliente',
  'ciudad',
  'claseInmueble',
  'tipoInmueble',
  'direccion',
  'responsable',
  'inspeccion',
  'fechaSolicitud',
];

function cargarColumnasGuardadas() {
  try {
    const raw = localStorage.getItem(PROPIEDADES_COLUMNAS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.claves) || parsed.claves.length === 0) return null;
    const ordenadas = parsed.claves
      .map((clave) => todasLasColumnas.find((c) => c.clave === clave))
      .filter(Boolean);
    return ordenadas.length > 0 ? ordenadas : null;
  } catch {
    return null;
  }
}

const celdaValor = (item, clave) => {
  if (clave === 'inspeccion') return etiquetaInspeccion(item);
  if (clave === 'fechaSolicitud' || clave === 'createdAt' || clave === 'updatedAt') {
    return formatDate(item[clave]);
  }
  return item[clave] == null ? '' : String(item[clave]);
};

const ReportePropiedades = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [casos, setCasos] = useState([]);
  const [filtrados, setFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [registroEditar, setRegistroEditar] = useState(null);
  const [columnasVisibles, setColumnasVisibles] = useState(() => {
    const guardadas = cargarColumnasGuardadas();
    if (guardadas) return guardadas;
    return todasLasColumnas.filter((c) => columnasIniciales.includes(c.clave));
  });
  const [modalColumnasOpen, setModalColumnasOpen] = useState(false);
  const [columnasOrdenadas, setColumnasOrdenadas] = useState([]);
  const [seleccionTemporal, setSeleccionTemporal] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroClase, setFiltroClase] = useState('');
  const [filtroResponsable, setFiltroResponsable] = useState('');
  const [filtroInspeccion, setFiltroInspeccion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [filtrosSheetOpen, setFiltrosSheetOpen] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState({ open: false, registro: null });
  const [eliminando, setEliminando] = useState(false);
  const [aviso, setAviso] = useState({ open: false, titulo: '', mensaje: '', tipo: 'info' });

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllCasosPropiedades();
      setCasos(data);
      setFiltrados(data);
    } catch (err) {
      console.error('Error cargando reporte Propiedades:', err);
      setError(err.message || t('properties.report.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const abrirGestionar = useCallback((registro) => {
    setRegistroEditar(registro);
    setModalAbierto(true);
  }, []);

  const abrirInspeccion = useCallback(
    (registro) => {
      if (!registro?._id) return;
      const qs = registro.inspeccionId
        ? `?inspeccionId=${encodeURIComponent(registro.inspeccionId)}`
        : '';
      navigate(`/propiedades/inspeccion/${registro._id}${qs}`);
    },
    [navigate]
  );

  const solicitarEliminar = useCallback((registro) => {
    if (!registro?._id) {
      setAviso({
        open: true,
        titulo: t('properties.report.cannotDelete'),
        mensaje: t('properties.report.invalidRecord'),
        tipo: 'error',
      });
      return;
    }
    setConfirmEliminar({ open: true, registro });
  }, [t]);

  const confirmarEliminar = useCallback(async () => {
    const registro = confirmEliminar.registro;
    if (!registro?._id) return;

    setEliminando(true);
    try {
      await eliminarCasoPropiedades(registro._id);
      setCasos((prev) => prev.filter((c) => c._id !== registro._id));
      setFiltrados((prev) => prev.filter((c) => c._id !== registro._id));
      setConfirmEliminar({ open: false, registro: null });
      setAviso({
        open: true,
        titulo: t('properties.report.deleted'),
        mensaje: t('properties.report.caseDeleted', { caseNumber: registro.consecutivo || registro.nombreCliente || '' }),
        tipo: 'success',
      });
    } catch (err) {
      console.error('Error al eliminar caso:', err);
      setConfirmEliminar({ open: false, registro: null });
      setAviso({
        open: true,
        titulo: t('properties.report.deleteError'),
        mensaje: err.message || t('properties.report.deleteErrorMessage'),
        tipo: 'error',
      });
    } finally {
      setEliminando(false);
    }
  }, [confirmEliminar.registro, t]);

  const ciudades = useMemo(() => buildOpcionesFiltro(casos, 'ciudad'), [casos]);
  const clases = useMemo(() => buildOpcionesFiltro(casos, 'claseInmueble'), [casos]);
  const responsables = useMemo(() => buildOpcionesFiltro(casos, 'responsable'), [casos]);

  const filtrosActivosCount = [
    busqueda,
    filtroCiudad,
    filtroClase,
    filtroResponsable,
    filtroInspeccion,
    fechaInicio,
    fechaFin,
  ].filter(Boolean).length;

  const filtrosActivos = filtrosActivosCount > 0;

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroCiudad('');
    setFiltroClase('');
    setFiltroResponsable('');
    setFiltroInspeccion('');
    setFechaInicio('');
    setFechaFin('');
  };

  useEffect(() => {
    let resultado = [...casos];

    if (busqueda) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter((item) =>
        [
          item.consecutivo,
          item.nombreCliente,
          item.documento,
          item.direccion,
          item.ciudad,
          item.departamento,
          item.claseInmueble,
          item.tipoInmueble,
          item.poliza,
          item.numeroSiniestro,
          item.responsable,
        ]
          .filter(Boolean)
          .some((campo) => campo.toString().toLowerCase().includes(termino))
      );
    }
    if (filtroCiudad) {
      resultado = resultado.filter((item) => coincideFiltroTexto(item.ciudad, filtroCiudad));
    }
    if (filtroClase) {
      resultado = resultado.filter((item) => coincideFiltroTexto(item.claseInmueble, filtroClase));
    }
    if (filtroResponsable) {
      resultado = resultado.filter((item) =>
        coincideFiltroTexto(item.responsable, filtroResponsable)
      );
    }
    if (filtroInspeccion === 'con') {
      resultado = resultado.filter((item) => Boolean(item.inspeccionId));
    } else if (filtroInspeccion === 'sin') {
      resultado = resultado.filter((item) => !item.inspeccionId);
    }
    if (fechaInicio || fechaFin) {
      resultado = resultado.filter((item) =>
        fechaEnRango(item.fechaSolicitud || item.createdAt, fechaInicio, fechaFin)
      );
    }

    setFiltrados(resultado);
    setPaginaActual(1);
  }, [
    casos,
    busqueda,
    filtroCiudad,
    filtroClase,
    filtroResponsable,
    filtroInspeccion,
    fechaInicio,
    fechaFin,
  ]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PROPIEDADES_REPORTE_PAGE_SIZE));

  useEffect(() => {
    if (paginaActual > totalPaginas) setPaginaActual(totalPaginas);
  }, [paginaActual, totalPaginas]);

  const filtradosPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * PROPIEDADES_REPORTE_PAGE_SIZE;
    return filtrados.slice(inicio, inicio + PROPIEDADES_REPORTE_PAGE_SIZE);
  }, [filtrados, paginaActual]);

  const indiceDesde =
    filtrados.length === 0 ? 0 : (paginaActual - 1) * PROPIEDADES_REPORTE_PAGE_SIZE + 1;
  const indiceHasta = Math.min(paginaActual * PROPIEDADES_REPORTE_PAGE_SIZE, filtrados.length);

  const exportarExcel = () => {
    if (filtrados.length === 0) {
      setAviso({
        open: true,
        titulo: t('properties.report.noData'),
        mensaje: t('properties.report.noDataExport'),
        tipo: 'warning',
      });
      return;
    }

    try {
      const rows = filtrados.map((item) => buildExportRow(item));
      const worksheet = XLSX.utils.json_to_sheet(rows, { cellDates: true });
      const encabezados = rows.length > 0 ? Object.keys(rows[0]) : [];
      const indicesColumnasFecha = COLUMNAS_FECHA_EXCEL.map((nombre) =>
        encabezados.indexOf(nombre)
      ).filter((idx) => idx >= 0);

      if (indicesColumnasFecha.length > 0 && worksheet['!ref']) {
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let r = 1; r <= range.e.r; r++) {
          for (const c of indicesColumnasFecha) {
            const addr = XLSX.utils.encode_cell({ r, c });
            if (worksheet[addr] && worksheet[addr].t === 'd' && !worksheet[addr].z) {
              worksheet[addr].z = 'dd/mm/yyyy';
            }
          }
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Propiedades');
      XLSX.writeFile(
        workbook,
        `reporte-propiedades-${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (err) {
      console.error('Error exportando Excel Propiedades:', err);
      setAviso({
        open: true,
        titulo: t('properties.report.exportError'),
        mensaje: t('properties.report.exportErrorMessage'),
        tipo: 'error',
      });
    }
  };

  const abrirPersonalizarColumnas = () => {
    setSeleccionTemporal(columnasVisibles.map((c) => c.clave));
    const ordenActual = columnasVisibles.map((c) => c.clave);
    const columnasNoVisibles = todasLasColumnas.filter((c) => !ordenActual.includes(c.clave));
    setColumnasOrdenadas([...columnasVisibles, ...columnasNoVisibles]);
    setModalColumnasOpen(true);
  };

  const guardarColumnasPersonalizadas = () => {
    const seleccionadas = columnasOrdenadas.filter((c) => seleccionTemporal.includes(c.clave));
    setColumnasVisibles(seleccionadas);
    try {
      localStorage.setItem(
        PROPIEDADES_COLUMNAS_STORAGE_KEY,
        JSON.stringify({ claves: seleccionadas.map((c) => c.clave) })
      );
    } catch {
      /* ignore */
    }
    setModalColumnasOpen(false);
  };

  const handleDragStart = (index) => setDraggedIndex(index);
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setColumnasOrdenadas((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggedIndex, 1);
      next.splice(index, 0, moved);
      setDraggedIndex(index);
      return next;
    });
  };
  const handleDragEnd = () => setDraggedIndex(null);

  return (
    <div className={`${expressScope} ${reportRoot}`}>
      <div className={pageWrapWide}>
        <PropiedadesPageHeader
          title={t('properties.report.title')}
          subtitle={t('properties.report.subtitle')}
          activePath="/propiedades/reporte"
          actions={
            <>
              <button type="button" className={expressBtnSecondary} onClick={abrirPersonalizarColumnas}>
                <FaCog className="mr-2" />
                {t('properties.report.columns')}
              </button>
              <button type="button" className={expressBtnSuccess} onClick={exportarExcel}>
                <FaFileExcel className="mr-2" />
                {t('properties.report.excel')}
              </button>
              <button
                type="button"
                className={expressBtnPrimary}
                onClick={() => navigate('/propiedades/carga')}
              >
                {t('properties.page.newCase')}
              </button>
            </>
          }
        />

        <ExpressFilterSection title={t('properties.report.filters')} onClear={limpiarFiltros} showClear={filtrosActivos}>
          <FilterSheet
            open={filtrosSheetOpen}
            onOpenChange={setFiltrosSheetOpen}
            title={t('properties.report.filters')}
            triggerLabel={t('properties.report.filters')}
            activeCount={filtrosActivosCount}
            footer={
              <button
                type="button"
                className={`${expressBtnPrimary} min-h-[44px] w-full`}
                onClick={() => setFiltrosSheetOpen(false)}
              >
                {t('common.apply', { defaultValue: 'Aplicar' })}
              </button>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
              <Campo label={t('common.search')}>
                <InputFenix
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={t('properties.report.searchPlaceholder')}
                />
              </Campo>
              <Campo label={t('properties.fields.city')}>
                <SelectFenix value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)}>
                  <option value="">{t('properties.report.all')}</option>
                  {ciudades.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={t('properties.report.class')}>
                <SelectFenix value={filtroClase} onChange={(e) => setFiltroClase(e.target.value)}>
                  <option value="">{t('properties.report.all')}</option>
                  {clases.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={t('properties.report.responsible')}>
                <SelectFenix
                  value={filtroResponsable}
                  onChange={(e) => setFiltroResponsable(e.target.value)}
                >
                  <option value="">{t('properties.report.all')}</option>
                  {responsables.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={t('properties.report.inspection')}>
                <SelectFenix
                  value={filtroInspeccion}
                  onChange={(e) => setFiltroInspeccion(e.target.value)}
                >
                  <option value="">{t('properties.report.all')}</option>
                  <option value="con">{t('properties.report.withInspection')}</option>
                  <option value="sin">{t('properties.report.withoutInspection')}</option>
                </SelectFenix>
              </Campo>
              <Campo label={t('properties.report.from')}>
                <InputFenix
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </Campo>
              <Campo label={t('properties.report.to')}>
                <InputFenix type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
              </Campo>
            </div>
          </FilterSheet>
        </ExpressFilterSection>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className={expressTableWrap}>
          {loading ? (
            <p className="p-6 text-center font-body text-sm text-gray-500">{t('properties.report.loadingCases')}</p>
          ) : (
            <ResponsiveDataList
              items={filtradosPagina}
              emptyLabel={t('properties.report.noCases')}
              table={
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={expressTableHead}>
                      <tr>
                        {columnasVisibles.map((col) => (
                          <th
                            key={col.clave}
                            className="whitespace-nowrap px-3 py-2 text-left font-body text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300"
                          >
                            {col.label}
                          </th>
                        ))}
                        <th className="whitespace-nowrap px-3 py-2 text-right font-body text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                          {t('properties.report.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#141414]">
                      {filtradosPagina.map((item) => (
                        <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                          {columnasVisibles.map((col) => (
                            <td
                              key={col.clave}
                              className="max-w-[14rem] truncate px-3 py-2 font-body text-sm text-gray-800 dark:text-gray-200"
                              title={celdaValor(item, col.clave)}
                            >
                              {celdaValor(item, col.clave)}
                            </td>
                          ))}
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            <AccionesPropiedadesMenu
                              tieneInspeccion={Boolean(item.inspeccionId)}
                              onGestionar={() => abrirGestionar(item)}
                              onInspeccion={() => abrirInspeccion(item)}
                              onEliminar={() => solicitarEliminar(item)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
              renderCard={(item) => (
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#141414]">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-heading font-semibold text-gray-900 dark:text-white">
                        {celdaValor(item, 'nombreCliente')}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {celdaValor(item, 'consecutivo')} · {celdaValor(item, 'ciudad')}
                      </p>
                    </div>
                    <AccionesPropiedadesMenu
                      tieneInspeccion={Boolean(item.inspeccionId)}
                      onGestionar={() => abrirGestionar(item)}
                      onInspeccion={() => abrirInspeccion(item)}
                      onEliminar={() => solicitarEliminar(item)}
                    />
                  </div>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {['claseInmueble', 'responsable', 'fechaSolicitud', 'inspeccion'].map((clave) => (
                      <div key={clave} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          {columnasVisibles.find((c) => c.clave === clave)?.label || clave}
                        </dt>
                        <dd className="mt-0.5 truncate text-sm text-gray-800 dark:text-gray-200">
                          {celdaValor(item, clave)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            />
          )}

          {!loading && filtrados.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
              <p className="font-body text-xs text-gray-500">
                {t('properties.report.showing', { from: indiceDesde, to: indiceHasta, total: filtrados.length })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={expressBtnSecondary}
                  disabled={paginaActual <= 1}
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                >
                  {t('properties.report.previous')}
                </button>
                <span className="font-body text-xs text-gray-600 dark:text-gray-300">
                  {paginaActual} / {totalPaginas}
                </span>
                <button
                  type="button"
                  className={expressBtnSecondary}
                  disabled={paginaActual >= totalPaginas}
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                >
                  {t('properties.report.next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ExpressModal
        open={modalAbierto}
        onClose={() => {
          setModalAbierto(false);
          setRegistroEditar(null);
        }}
        title={t('properties.report.manageCase')}
        wide
      >
        <FormularioCasoPropiedades
          initialData={registroEditar}
          embed
          onClose={() => {
            setModalAbierto(false);
            setRegistroEditar(null);
          }}
          onSaved={async () => {
            await recargar();
            setModalAbierto(false);
            setRegistroEditar(null);
          }}
        />
      </ExpressModal>

      <ExpressModal
        open={modalColumnasOpen}
        onClose={() => setModalColumnasOpen(false)}
        title={t('properties.report.customizeColumns')}
      >
        <div className="p-4 sm:p-6">
          <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-300">
            {t('properties.report.columnsHelp')}
          </p>
          <ul className="mb-4 max-h-80 space-y-1 overflow-y-auto">
            {columnasOrdenadas.map((col, index) => (
              <li
                key={col.clave}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className="flex cursor-grab items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900"
              >
                <input
                  type="checkbox"
                  checked={seleccionTemporal.includes(col.clave)}
                  onChange={() => {
                    setSeleccionTemporal((prev) =>
                      prev.includes(col.clave)
                        ? prev.filter((c) => c !== col.clave)
                        : [...prev, col.clave]
                    );
                  }}
                />
                <span className="font-body text-sm text-gray-800 dark:text-gray-200">{col.label}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col justify-end gap-2 sm:flex-row">
            <button
              type="button"
              className={expressBtnSecondary}
              onClick={() => setModalColumnasOpen(false)}
            >
              {t('common.cancel')}
            </button>
            <button type="button" className={expressBtnPrimary} onClick={guardarColumnasPersonalizadas}>
              {t('common.save')}
            </button>
          </div>
        </div>
      </ExpressModal>

      <ExpressAvisoModal
        open={confirmEliminar.open}
        onClose={() => !eliminando && setConfirmEliminar({ open: false, registro: null })}
        titulo={t('properties.report.deleteCase')}
        mensaje={t('properties.report.deleteConfirm', { caseNumber: confirmEliminar.registro?.consecutivo || confirmEliminar.registro?.nombreCliente || '' })}
        tipo="warning"
        onConfirm={confirmarEliminar}
        confirmTexto={t('properties.report.delete')}
        cancelTexto={t('common.cancel')}
        confirmando={eliminando}
      />

      <ExpressAvisoModal
        open={aviso.open}
        onClose={() => setAviso((a) => ({ ...a, open: false }))}
        titulo={aviso.titulo}
        mensaje={aviso.mensaje}
        tipo={aviso.tipo}
      />
    </div>
  );
};

export default ReportePropiedades;
