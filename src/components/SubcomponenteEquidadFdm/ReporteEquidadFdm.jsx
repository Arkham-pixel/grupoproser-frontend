import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCog, FaFileExcel, FaUpload } from 'react-icons/fa';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { deleteCasoFdm, fetchAllCasosFdm, importarCasosFdm } from '../../services/equidadFdmService.js';
import FormularioEquidadFdm from './FormularioEquidadFdm.jsx';
import AccionesFdmMenu from './AccionesFdmMenu.jsx';
import ArchiveroEquidadFdm from './ArchiveroEquidadFdm.jsx';
import { descargarExcelFdlmBase } from './generarExcelFdlmBase.js';
import { parsearCasosFdmDesdeExcel } from './importarEquidadFdmExcel.js';
import {
  FDM_COLUMNAS_STORAGE_KEY,
  FDM_REPORTE_PAGE_SIZE,
  buildCiudadesFdm,
  buildOpcionesFiltro,
  cantidadArchivosFdm,
  casoTieneArchivosFdm,
  ciudadClaveFdm,
  coincideFiltroTexto,
  esCasoNuevoFdm,
  esUsuarioFdmSoloConArchivos,
  fechaEnRango,
  formatCurrency,
  formatDate,
  leerFiltrosReporteFdm,
  patchFiltrosReporteFdm,
} from './equidadFdmHelpers.js';
import {
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
  expressBtnSuccess,
  expressCard,
  expressCardBody,
  expressCardHeader,
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
import { FdmPageHeader } from './EquidadFdmUiBlocks.jsx';

const fdmReportRoot = 'min-h-full w-full min-w-0 bg-fenix-fondo p-2 dark:bg-[#0F0F0F] sm:p-4';
const fdmPageWrapWide = 'w-full min-w-0 space-y-4 sm:space-y-6';

const todasLasColumnasFdm = [
  { clave: 'esNuevo', label: 'Nuevo' },
  { clave: 'consecutivo', label: 'Consecutivo' },
  { clave: 'evento', label: 'Evento' },
  { clave: 'nombre', label: 'Nombre' },
  { clave: 'cedula', label: 'Cédula' },
  { clave: 'celular', label: 'Celular' },
  { clave: 'direccionAfectada', label: 'Dirección afectada' },
  { clave: 'municipio', label: 'Ciudad / Municipio' },
  { clave: 'departamento', label: 'Departamento' },
  { clave: 'oficinaRadicadora', label: 'Oficina radicadora' },
  { clave: 'ajustador', label: 'Ajustador' },
  { clave: 'aif', label: 'AIF' },
  { clave: 'polizaAfectar', label: 'Póliza a afectar' },
  { clave: 'vigenciaPoliza', label: 'Vigencia póliza' },
  { clave: 'cobertura', label: 'Cobertura' },
  { clave: 'tipoNegocio', label: 'Tipo de negocio' },
  { clave: 'totalPerdida', label: 'Total pérdida' },
  { clave: 'deducible', label: 'Deducible' },
  { clave: 'totalLiquidado', label: 'Total liquidado' },
  { clave: 'valorIndemnizado', label: 'Valor indemnizado' },
  { clave: 'caso', label: 'Caso' },
  { clave: 'siniestro', label: 'Siniestro' },
  { clave: 'fechaRegistro', label: 'Fecha de registro' },
  { clave: 'fechaAviso', label: 'Fecha de aviso' },
  { clave: 'fechaLiquidacion', label: 'Fecha de liquidación' },
  { clave: 'fechaGiro', label: 'Fecha de giro' },
  { clave: 'estado', label: 'Estado' },
  { clave: 'observaciones', label: 'Observaciones' },
  { clave: 'createdAt', label: 'Creado el' },
  { clave: 'updatedAt', label: 'Actualizado el' },
];

const columnasInicialesFdm = [
  'esNuevo',
  'consecutivo',
  'evento',
  'nombre',
  'cedula',
  'municipio',
  'cobertura',
  'estado',
  'fechaRegistro',
  'polizaAfectar',
];

function cargarColumnasGuardadas() {
  try {
    const raw = localStorage.getItem(FDM_COLUMNAS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.claves) || parsed.claves.length === 0) return null;
    const ordenadas = parsed.claves
      .map((clave) => todasLasColumnasFdm.find((c) => c.clave === clave))
      .filter(Boolean);
    return ordenadas.length > 0 ? ordenadas : null;
  } catch {
    return null;
  }
}

const ReporteEquidadFdm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filtrosUrl = useMemo(() => leerFiltrosReporteFdm(searchParams), [searchParams]);
  const {
    busqueda,
    filtroAjustador,
    filtroEstado,
    filtroEvento,
    filtroNuevos,
    fechaInicio,
    fechaFin,
    ciudad: ciudadUrl,
    pagina: paginaActual,
  } = filtrosUrl;

  const setBusqueda = (v) => patchFiltrosReporteFdm(setSearchParams, { busqueda: v });
  const setFiltroAjustador = (v) => patchFiltrosReporteFdm(setSearchParams, { filtroAjustador: v });
  const setFiltroEstado = (v) => patchFiltrosReporteFdm(setSearchParams, { filtroEstado: v });
  const setFiltroEvento = (v) => patchFiltrosReporteFdm(setSearchParams, { filtroEvento: v });
  const setFiltroNuevos = (v) => patchFiltrosReporteFdm(setSearchParams, { filtroNuevos: v });
  const setFechaInicio = (v) => patchFiltrosReporteFdm(setSearchParams, { fechaInicio: v });
  const setFechaFin = (v) => patchFiltrosReporteFdm(setSearchParams, { fechaFin: v });
  const setPaginaActual = (v) => {
    const next = typeof v === 'function' ? v(paginaActual) : v;
    patchFiltrosReporteFdm(setSearchParams, { pagina: next }, { resetPage: false });
  };

  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [registroEditar, setRegistroEditar] = useState(null);
  const [casoArchivero, setCasoArchivero] = useState(null);
  const [columnasVisibles, setColumnasVisibles] = useState(() => {
    const guardadas = cargarColumnasGuardadas();
    if (guardadas) return guardadas;
    return todasLasColumnasFdm.filter((c) => columnasInicialesFdm.includes(c.clave));
  });
  const [modalColumnasOpen, setModalColumnasOpen] = useState(false);
  const [columnasOrdenadas, setColumnasOrdenadas] = useState([]);
  const [seleccionTemporal, setSeleccionTemporal] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState({ open: false, registro: null });
  const [eliminando, setEliminando] = useState(false);
  const [aviso, setAviso] = useState({ open: false, titulo: '', mensaje: '', tipo: 'info' });
  const [importando, setImportando] = useState(false);
  const [resumenImport, setResumenImport] = useState(null);
  const fileInputRef = useRef(null);

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllCasosFdm();
      setCasos(data);
    } catch (err) {
      console.error('Error cargando casos Equidad FDM:', err);
      setError(err.message || t('equidadFdm.report.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportando(true);
    setResumenImport(null);
    try {
      const { casos: filas } = await parsearCasosFdmDesdeExcel(file);
      if (!filas.length) {
        throw new Error(t('equidadFdm.bulk.emptyFile'));
      }
      const resumen = await importarCasosFdm(filas);
      setResumenImport(resumen);
      setFiltroNuevos('nuevos');
      await recargar();
      setAviso({
        open: true,
        titulo: t('equidadFdm.bulk.title'),
        mensaje: t('equidadFdm.bulk.success', {
          created: resumen.creados ?? 0,
          updated: resumen.actualizados ?? 0,
          merged: resumen.fusionadosEnArchivo ?? 0,
          skipped: resumen.omitidos ?? 0,
        }),
        tipo: 'success',
      });
    } catch (err) {
      console.error('Error importando Equidad FDM:', err);
      setAviso({
        open: true,
        titulo: t('equidadFdm.bulk.error'),
        mensaje: err.message || t('equidadFdm.bulk.error'),
        tipo: 'error',
      });
    } finally {
      setImportando(false);
    }
  };

  const abrirModalEdicion = useCallback((registro) => {
    setRegistroEditar(registro);
    setModalAbierto(true);
  }, []);

  const cerrarModalEdicion = useCallback(() => {
    setModalAbierto(false);
    setRegistroEditar(null);
  }, []);

  const manejarGuardado = useCallback(async () => {
    await recargar();
    cerrarModalEdicion();
  }, [recargar, cerrarModalEdicion]);

  const solicitarEliminar = useCallback((registro) => {
    if (!registro?._id) {
      setAviso({
        open: true,
        titulo: t('equidadFdm.report.cannotDelete'),
        mensaje: t('equidadFdm.report.invalidRecord'),
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
      await deleteCasoFdm(registro._id);
      setCasos((prev) => prev.filter((c) => c._id !== registro._id));
      setConfirmEliminar({ open: false, registro: null });
      setAviso({
        open: true,
        titulo: t('equidadFdm.report.deleted'),
        mensaje: t('equidadFdm.report.caseDeleted', { caseNumber: registro.consecutivo || registro.nombre || '' }),
        tipo: 'success',
      });
    } catch (err) {
      console.error('Error al eliminar caso Equidad FDM:', err);
      setConfirmEliminar({ open: false, registro: null });
      setAviso({
        open: true,
        titulo: t('equidadFdm.report.deleteError'),
        mensaje: err.message || t('equidadFdm.report.deleteErrorMessage'),
        tipo: 'error',
      });
    } finally {
      setEliminando(false);
    }
  }, [confirmEliminar.registro, t]);

  const ajustadores = useMemo(() => buildOpcionesFiltro(casos, 'ajustador'), [casos]);
  const estados = useMemo(() => buildOpcionesFiltro(casos, 'estado'), [casos]);
  const eventos = useMemo(() => buildOpcionesFiltro(casos, 'evento'), [casos]);
  const totalNuevos = useMemo(() => casos.filter((item) => esCasoNuevoFdm(item)).length, [casos]);
  const filtroMunicipio = ciudadUrl;

  const soloConArchivos = esUsuarioFdmSoloConArchivos();

  const casosBase = useMemo(() => {
    let resultado = [...casos];

    // Login 1065012991: solo casos que ya tienen documentos en el archivero
    if (soloConArchivos) {
      resultado = resultado.filter((item) => casoTieneArchivosFdm(item));
    }

    if (busqueda) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter((item) =>
        [
          item.consecutivo,
          item.nombre,
          item.cedula,
          item.celular,
          item.direccionAfectada,
          item.municipio,
          item.ajustador,
          item.caso,
          item.siniestro,
          item.evento,
          item.polizaAfectar,
        ]
          .filter(Boolean)
          .some((campo) => campo.toString().toLowerCase().includes(termino))
      );
    }
    if (filtroAjustador) {
      resultado = resultado.filter((item) => coincideFiltroTexto(item.ajustador, filtroAjustador));
    }
    if (filtroEstado) {
      resultado = resultado.filter((item) => coincideFiltroTexto(item.estado, filtroEstado));
    }
    if (filtroEvento) {
      resultado = resultado.filter((item) => coincideFiltroTexto(item.evento, filtroEvento));
    }
    if (filtroNuevos === 'nuevos') {
      resultado = resultado.filter((item) => esCasoNuevoFdm(item));
    } else if (filtroNuevos === 'anteriores') {
      resultado = resultado.filter((item) => !esCasoNuevoFdm(item));
    }
    if (fechaInicio || fechaFin) {
      resultado = resultado.filter((item) =>
        fechaEnRango(
          item.fechaRegistro || item.fechaLiquidacion || item.fechaAviso || item.createdAt,
          fechaInicio,
          fechaFin
        )
      );
    }
    return resultado;
  }, [
    casos,
    soloConArchivos,
    busqueda,
    filtroAjustador,
    filtroEstado,
    filtroEvento,
    filtroNuevos,
    fechaInicio,
    fechaFin,
  ]);

  const ciudades = useMemo(() => buildCiudadesFdm(casosBase), [casosBase]);
  const ciudadActiva = useMemo(
    () => ciudades.find((c) => c.value === filtroMunicipio) || null,
    [ciudades, filtroMunicipio]
  );

  const filtrados = useMemo(() => {
    if (!filtroMunicipio) return casosBase;
    return casosBase.filter((item) => ciudadClaveFdm(item) === filtroMunicipio);
  }, [casosBase, filtroMunicipio]);

  const filtrosActivos = Boolean(
    busqueda ||
      filtroMunicipio ||
      filtroAjustador ||
      filtroEstado ||
      filtroEvento ||
      filtroNuevos ||
      fechaInicio ||
      fechaFin
  );

  const limpiarFiltros = () => {
    patchFiltrosReporteFdm(setSearchParams, {
      busqueda: '',
      filtroAjustador: '',
      filtroEstado: '',
      filtroEvento: '',
      filtroNuevos: '',
      fechaInicio: '',
      fechaFin: '',
      ciudad: '',
    });
  };

  const hrefCiudad = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('ciudad', value);
    else next.delete('ciudad');
    next.delete('page');
    const qs = next.toString();
    return qs ? `/equidad-fdm/reporte?${qs}` : '/equidad-fdm/reporte';
  };

  const abrirLiquidador = (item) => {
    const ret = searchParams.toString();
    const base = `/equidad-fdm/liquidador?casoId=${item._id}`;
    navigate(ret ? `${base}&ret=${encodeURIComponent(ret)}` : base, {
      state: { casoFdm: item },
    });
  };

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / FDM_REPORTE_PAGE_SIZE));

  useEffect(() => {
    if (paginaActual > totalPaginas) setPaginaActual(totalPaginas);
  }, [paginaActual, totalPaginas]);

  const filtradosPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * FDM_REPORTE_PAGE_SIZE;
    return filtrados.slice(inicio, inicio + FDM_REPORTE_PAGE_SIZE);
  }, [filtrados, paginaActual]);

  const indiceDesde = filtrados.length === 0 ? 0 : (paginaActual - 1) * FDM_REPORTE_PAGE_SIZE + 1;
  const indiceHasta = Math.min(paginaActual * FDM_REPORTE_PAGE_SIZE, filtrados.length);

  const exportarExcel = () => {
    if (filtrados.length === 0) {
      setAviso({
        open: true,
        titulo: t('equidadFdm.report.noData'),
        mensaje: t('equidadFdm.report.noDataExport'),
        tipo: 'warning',
      });
      return;
    }

    try {
      descargarExcelFdlmBase(filtrados, {
        nombreArchivo: filtroMunicipio
          ? `FDLM ${filtroMunicipio} ${new Date().toISOString().slice(0, 10)}.xlsx`
          : undefined,
      });
    } catch (err) {
      console.error('Error exportando Excel Equidad FDM:', err);
      setAviso({
        open: true,
        titulo: t('equidadFdm.report.exportError'),
        mensaje: t('equidadFdm.report.exportErrorMessage'),
        tipo: 'error',
      });
    }
  };

  const abrirPersonalizarColumnas = () => {
    setSeleccionTemporal(columnasVisibles.map((c) => c.clave));
    const ordenActual = columnasVisibles.map((c) => c.clave);
    const columnasNoVisibles = todasLasColumnasFdm.filter((c) => !ordenActual.includes(c.clave));
    setColumnasOrdenadas([...columnasVisibles, ...columnasNoVisibles]);
    setModalColumnasOpen(true);
  };

  const guardarColumnasPersonalizadas = () => {
    const seleccionadas = columnasOrdenadas.filter((c) => seleccionTemporal.includes(c.clave));
    setColumnasVisibles(seleccionadas);
    try {
      localStorage.setItem(
        FDM_COLUMNAS_STORAGE_KEY,
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
    const nuevas = [...columnasOrdenadas];
    const item = nuevas[draggedIndex];
    nuevas.splice(draggedIndex, 1);
    nuevas.splice(index, 0, item);
    setColumnasOrdenadas(nuevas);
    setDraggedIndex(index);
  };
  const handleDragEnd = () => setDraggedIndex(null);
  const toggleColumna = (clave) => {
    setSeleccionTemporal((prev) =>
      prev.includes(clave) ? prev.filter((c) => c !== clave) : [...prev, clave]
    );
  };

  const CAMPOS_MONEDA = new Set([
    'totalPerdida',
    'deducible',
    'totalLiquidado',
    'valorIndemnizado',
  ]);
  const CAMPOS_FECHA = new Set([
    'fechaRegistro',
    'fechaAviso',
    'fechaLiquidacion',
    'fechaGiro',
    'createdAt',
    'updatedAt',
  ]);

  const obtenerValorCelda = (item, clave) => {
    if (clave === 'esNuevo') {
      return esCasoNuevoFdm(item) ? (
        <span className="inline-flex rounded-full bg-fenix-primario px-2 py-0.5 font-body text-xs font-semibold text-white">
          {t('equidadFdm.report.newBadge')}
        </span>
      ) : (
        '—'
      );
    }
    if (CAMPOS_MONEDA.has(clave)) {
      return item[clave] === null || item[clave] === undefined ? '—' : formatCurrency(item[clave]);
    }
    if (CAMPOS_FECHA.has(clave)) {
      return formatDate(item[clave]) || '—';
    }
    const valor = item[clave];
    return valor === null || valor === undefined || valor === '' ? '—' : String(valor);
  };

  const listaColumnasModal = columnasOrdenadas.length > 0 ? columnasOrdenadas : todasLasColumnasFdm;

  return (
    <div className={`${expressScope} ${fdmReportRoot}`}>
      <div className={fdmPageWrapWide}>
        <FdmPageHeader
          title={
            ciudadActiva
              ? t('equidadFdm.report.titleCity', { city: ciudadActiva.label })
              : t('equidadFdm.report.title')
          }
          subtitle={
            ciudadActiva
              ? t('equidadFdm.report.subtitleCity', { city: ciudadActiva.label, count: ciudadActiva.count })
              : t('equidadFdm.report.subtitle')
          }
          activePath="/equidad-fdm/reporte"
          actions={
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xlsm,.xls"
                className="hidden"
                onChange={handleImportExcel}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={expressBtnGhost}
                disabled={loading || importando}
              >
                <FaUpload />
                {importando ? t('equidadFdm.bulk.importing') : t('equidadFdm.bulk.upload')}
              </button>
              <button type="button" onClick={abrirPersonalizarColumnas} className={expressBtnSecondary}>
                <FaCog />
                {t('equidadFdm.report.columns')}
              </button>
              <button
                type="button"
                onClick={exportarExcel}
                className={expressBtnSuccess}
                disabled={loading || filtrados.length === 0}
              >
                <FaFileExcel />
                {t('equidadFdm.report.exportExcel')}
              </button>
            </>
          }
        />

        <section className={expressCard}>
          <div className={expressCardHeader}>
            <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
              {t('equidadFdm.report.cityWindows')}
            </h2>
            <p className="mt-1 font-body text-xs text-gray-500 dark:text-gray-400">
              {t('equidadFdm.report.cityHint')}
            </p>
          </div>
          <div className={expressCardBody}>
            <nav className="flex flex-wrap gap-2" aria-label={t('equidadFdm.report.cityWindows')}>
              <Link
                to={hrefCiudad('')}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 font-body text-sm font-semibold transition ${
                  !filtroMunicipio
                    ? 'bg-fenix-primario text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
                }`}
              >
                {t('equidadFdm.report.allCities')}
                <span className={`rounded-full px-2 py-0.5 text-xs ${!filtroMunicipio ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  {casosBase.length}
                </span>
              </Link>
              {ciudades.map((ciudad) => {
                const activa = filtroMunicipio === ciudad.value;
                return (
                  <Link
                    key={ciudad.value}
                    to={hrefCiudad(ciudad.value)}
                    title={t('equidadFdm.report.openCityWindow', { city: ciudad.label })}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 font-body text-sm font-semibold transition ${
                      activa
                        ? 'bg-fenix-primario text-white shadow-sm'
                        : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
                    }`}
                  >
                    {ciudad.label}
                    <span className={`rounded-full px-2 py-0.5 text-xs ${activa ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      {ciudad.count}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>

        <ExpressFilterSection title={t('equidadFdm.report.filters')} showClear={filtrosActivos} onClear={limpiarFiltros}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Campo label={t('common.search')}>
              <InputFenix
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={t('equidadFdm.report.searchPlaceholder')}
              />
            </Campo>
            <Campo label={t('equidadFdm.fields.adjuster')}>
              <SelectFenix value={filtroAjustador} onChange={(e) => setFiltroAjustador(e.target.value)}>
                <option value="">{t('equidadFdm.report.all')}</option>
                {ajustadores.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('equidadFdm.fields.status')}>
              <SelectFenix value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">{t('equidadFdm.report.all')}</option>
                {estados.map((es) => (
                  <option key={es.value} value={es.value}>
                    {es.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('equidadFdm.fields.event')}>
              <SelectFenix value={filtroEvento} onChange={(e) => setFiltroEvento(e.target.value)}>
                <option value="">{t('equidadFdm.report.all')}</option>
                {eventos.map((ev) => (
                  <option key={ev.value} value={ev.value}>
                    {ev.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('equidadFdm.fields.newCases')}>
              <SelectFenix value={filtroNuevos} onChange={(e) => setFiltroNuevos(e.target.value)}>
                <option value="">{t('equidadFdm.report.all')}</option>
                <option value="nuevos">{t('equidadFdm.report.onlyNew', { count: totalNuevos })}</option>
                <option value="anteriores">{t('equidadFdm.report.previousCases')}</option>
              </SelectFenix>
            </Campo>
            <Campo label={t('equidadFdm.report.from')}>
              <InputFenix type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </Campo>
            <Campo label={t('equidadFdm.report.to')}>
              <InputFenix type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </Campo>
          </div>
          <p className="mt-4 font-body text-sm text-gray-500 dark:text-gray-400">
            {loading
              ? t('common.loading')
              : filtrados.length === 0
                ? t('equidadFdm.report.zeroRecords')
                : t('equidadFdm.report.recordsSummary', { count: filtrados.length, from: indiceDesde, to: indiceHasta, page: paginaActual, totalPages: totalPaginas })}
          </p>
        </ExpressFilterSection>

        <div className={`${expressTableWrap} w-full min-w-0`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className={expressTableHead}>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 bg-gray-50 px-4 py-3 dark:bg-gray-900/50">
                    {t('equidadFdm.report.actions')}
                  </th>
                  {columnasVisibles.map((col) => (
                    <th key={col.clave} scope="col" className="px-4 py-3">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
                {loading ? (
                  <tr>
                    <td
                      colSpan={columnasVisibles.length + 1}
                      className="px-4 py-8 text-center font-body text-sm text-gray-500"
                    >
                      {t('equidadFdm.report.loadingCases')}
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={columnasVisibles.length + 1}
                      className="px-4 py-8 text-center font-body text-sm text-red-600 dark:text-red-400"
                    >
                      {error}
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columnasVisibles.length + 1}
                      className="px-4 py-8 text-center font-body text-sm text-gray-500"
                    >
                      {t('equidadFdm.report.noCases')}
                    </td>
                  </tr>
                ) : (
                  filtradosPagina.map((item) => (
                    <tr
                      key={item._id ?? `${item.consecutivo}-${item.cedula}`}
                      className={`transition hover:bg-gray-50/80 dark:hover:bg-gray-900/30 ${
                        esCasoNuevoFdm(item) ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                      }`}
                    >
                      <td className="sticky left-0 z-20 overflow-visible whitespace-nowrap bg-white px-4 py-3 dark:bg-[#1A1A1A]">
                        <AccionesFdmMenu
                          onGestionar={() => abrirModalEdicion(item)}
                          onArchivero={() => setCasoArchivero(item)}
                          onLiquidador={() => abrirLiquidador(item)}
                          onEliminar={() => solicitarEliminar(item)}
                          tieneLiquidador={Boolean(item.liquidador)}
                          cantidadArchivos={cantidadArchivosFdm(item)}
                        />
                      </td>
                      {columnasVisibles.map((col) => (
                        <td
                          key={col.clave}
                          className={`px-4 py-3 font-body text-sm text-gray-800 dark:text-gray-200 ${
                            col.clave === 'observaciones' ? 'max-w-xs' : 'whitespace-nowrap'
                          }`}
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

          {!loading && !error && filtrados.length > 0 && totalPaginas > 1 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800 sm:flex-row">
              <p className="font-body text-sm text-gray-500 dark:text-gray-400">
                {t('equidadFdm.report.pageOf', { page: paginaActual, total: totalPaginas })}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={expressBtnSecondary}
                  disabled={paginaActual <= 1}
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                >
                  {t('equidadFdm.report.previous')}
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                  .filter((n) => {
                    if (totalPaginas <= 7) return true;
                    if (n === 1 || n === totalPaginas) return true;
                    return Math.abs(n - paginaActual) <= 1;
                  })
                  .map((n, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev != null && n - prev > 1;
                    return (
                      <React.Fragment key={n}>
                        {showEllipsis && <span className="px-1 font-body text-sm text-gray-400">…</span>}
                        <button
                          type="button"
                          className={
                            n === paginaActual ? expressBtnPrimary : `${expressBtnSecondary} !min-w-[2.25rem]`
                          }
                          onClick={() => setPaginaActual(n)}
                        >
                          {n}
                        </button>
                      </React.Fragment>
                    );
                  })}
                <button
                  type="button"
                  className={expressBtnSecondary}
                  disabled={paginaActual >= totalPaginas}
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                >
                  {t('equidadFdm.report.next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ExpressModal
        open={modalColumnasOpen}
        onClose={() => setModalColumnasOpen(false)}
        title={t('equidadFdm.report.customizeColumns')}
      >
        <div className="p-4 sm:p-6">
          <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
            {t('equidadFdm.report.columnsHelp')}
          </p>
          <div className="mb-4 max-h-60 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-700 sm:max-h-80">
            {listaColumnasModal.map((campo, index) => (
              <div
                key={campo.clave}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`mb-1 flex cursor-move items-center gap-2 rounded-lg p-2 transition ${
                  draggedIndex === index
                    ? 'bg-red-50/80 opacity-60 dark:bg-red-950/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900/40'
                }`}
              >
                <span className="text-gray-400">☰</span>
                <label className="flex flex-1 cursor-pointer items-center gap-2 font-body text-sm">
                  <input
                    type="checkbox"
                    className="accent-fenix-primario"
                    checked={seleccionTemporal.includes(campo.clave)}
                    onChange={() => toggleColumna(campo.clave)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {campo.label}
                </label>
              </div>
            ))}
          </div>
          <div className="flex flex-col justify-end gap-2 sm:flex-row">
            <button type="button" className={expressBtnSecondary} onClick={() => setModalColumnasOpen(false)}>
              {t('common.cancel')}
            </button>
            <button type="button" className={expressBtnPrimary} onClick={guardarColumnasPersonalizadas}>
              {t('common.save')}
            </button>
          </div>
        </div>
      </ExpressModal>

      <ExpressModal open={modalAbierto} onClose={cerrarModalEdicion} title={t('equidadFdm.report.manageCase')} wide>
        <div className="p-2 sm:p-4">
          <FormularioEquidadFdm
            initialData={registroEditar}
            embed
            onClose={cerrarModalEdicion}
            onSaved={manejarGuardado}
          />
        </div>
      </ExpressModal>

      {casoArchivero && (
        <ExpressModal
          open
          onClose={() => setCasoArchivero(null)}
          title={t('equidadFdm.archive.title')}
          wide
        >
          <div className="p-2 sm:p-4">
            <ArchiveroEquidadFdm
              caso={casoArchivero}
              onClose={() => setCasoArchivero(null)}
              onChanged={(actualizado) => {
                setCasoArchivero(actualizado);
                setCasos((prev) =>
                  prev.map((c) => (c._id === actualizado._id ? { ...c, ...actualizado } : c))
                );
              }}
            />
          </div>
        </ExpressModal>
      )}

      <ExpressAvisoModal
        open={confirmEliminar.open}
        onClose={() => !eliminando && setConfirmEliminar({ open: false, registro: null })}
        titulo={t('equidadFdm.report.deleteCase')}
        tipo="warning"
        mensaje={
          confirmEliminar.registro
            ? t('equidadFdm.report.deleteConfirm', { caseNumber: confirmEliminar.registro.consecutivo || confirmEliminar.registro.nombre || '' })
            : ''
        }
        onConfirm={confirmarEliminar}
        confirmTexto={t('equidadFdm.report.delete')}
        cancelTexto={t('common.cancel')}
        confirmando={eliminando}
      />

      <ExpressAvisoModal
        open={aviso.open}
        onClose={() => setAviso((prev) => ({ ...prev, open: false }))}
        titulo={aviso.titulo}
        mensaje={aviso.mensaje}
        tipo={aviso.tipo}
      />
    </div>
  );
};

export default ReporteEquidadFdm;
