import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { FaCog, FaFileExcel } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { deleteCasoFdm, fetchAllCasosFdm } from '../../services/equidadFdmService.js';
import FormularioEquidadFdm from './FormularioEquidadFdm.jsx';
import AccionesFdmMenu from './AccionesFdmMenu.jsx';
import { convertirFechaParaExcelDate } from '../../utils/fechaUtils.js';
import {
  FDM_COLUMNAS_STORAGE_KEY,
  FDM_REPORTE_PAGE_SIZE,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
  formatDate,
} from './equidadFdmHelpers.js';
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
import { FdmPageHeader } from './EquidadFdmUiBlocks.jsx';

const fdmReportRoot = 'min-h-full w-full min-w-0 bg-fenix-fondo p-2 dark:bg-[#0F0F0F] sm:p-4';
const fdmPageWrapWide = 'w-full min-w-0 space-y-4 sm:space-y-6';

const formatDateForExcel = (value) => convertirFechaParaExcelDate(value);

const buildExportRow = (caso) => ({
  Consecutivo: caso.consecutivo ?? '',
  'N°': caso.numero ?? '',
  Nombre: caso.nombre ?? '',
  Cédula: caso.cedula ?? '',
  Celular: caso.celular ?? '',
  'Dirección afectada': caso.direccionAfectada ?? '',
  Municipio: caso.municipio ?? '',
  Ajustador: caso.ajustador ?? '',
  AIF: caso.aif ?? '',
  'Póliza daños vigente': caso.polizaDanosVigente ?? '',
  'Póliza a afectar': caso.polizaAfectar ?? '',
  Orden: caso.orden ?? '',
  'Vigencia póliza': caso.vigenciaPoliza ?? '',
  'Afectaciones anteriores': caso.afectacionesAnteriores ?? '',
  'Siniestro indemnizado': caso.siniestroIndemnizado ?? '',
  'Valor edificio': caso.valorEdificio ?? '',
  'Valor contenido': caso.valorContenido ?? '',
  'Valores indemnizables': caso.valoresIndemnizables ?? '',
  'Subsidio empresarial': caso.subsidioEmpresarial ?? '',
  Cobertura: caso.cobertura ?? '',
  Primas: caso.primas ?? '',
  'Tipo de negocio': caso.tipoNegocio ?? '',
  'Pérdida por contenidos': caso.perdidaContenidos ?? '',
  'Pérdida por edificio': caso.perdidaEdificio ?? '',
  'Total pérdida': caso.totalPerdida ?? '',
  Deducible: caso.deducible ?? '',
  'Total liquidado': caso.totalLiquidado ?? '',
  Subsidio: caso.subsidio ?? '',
  'Valor indemnizado (ajustador)': caso.valorIndemnizadoAjustador ?? '',
  Caso: caso.caso ?? '',
  Siniestro: caso.siniestro ?? '',
  'Fecha de liquidación': formatDateForExcel(caso.fechaLiquidacion),
  'Fecha de aviso': formatDateForExcel(caso.fechaAviso),
  'Valor de objeción': caso.valorObjecion ?? '',
  'Fecha de causación': formatDateForExcel(caso.fechaCausacion),
  'Valor indemnizado': caso.valorIndemnizado ?? '',
  'Fecha de giro': formatDateForExcel(caso.fechaGiro),
  Estado: caso.estado ?? '',
  Observaciones: caso.observaciones ?? '',
  Detalle: caso.detalle ?? '',
  'Creado el': formatDateForExcel(caso.createdAt),
  'Actualizado el': formatDateForExcel(caso.updatedAt),
});

const COLUMNAS_FECHA_EXCEL = [
  'Fecha de liquidación',
  'Fecha de aviso',
  'Fecha de causación',
  'Fecha de giro',
  'Creado el',
  'Actualizado el',
];

const todasLasColumnasFdm = [
  { clave: 'consecutivo', label: 'Consecutivo' },
  { clave: 'nombre', label: 'Nombre' },
  { clave: 'cedula', label: 'Cédula' },
  { clave: 'celular', label: 'Celular' },
  { clave: 'direccionAfectada', label: 'Dirección afectada' },
  { clave: 'municipio', label: 'Municipio' },
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
  { clave: 'fechaAviso', label: 'Fecha de aviso' },
  { clave: 'fechaLiquidacion', label: 'Fecha de liquidación' },
  { clave: 'fechaGiro', label: 'Fecha de giro' },
  { clave: 'estado', label: 'Estado' },
  { clave: 'observaciones', label: 'Observaciones' },
  { clave: 'createdAt', label: 'Creado el' },
  { clave: 'updatedAt', label: 'Actualizado el' },
];

const columnasInicialesFdm = [
  'consecutivo',
  'nombre',
  'cedula',
  'municipio',
  'ajustador',
  'estado',
  'totalPerdida',
  'totalLiquidado',
  'valorIndemnizado',
  'fechaLiquidacion',
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
  const [casos, setCasos] = useState([]);
  const [filtrados, setFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [registroEditar, setRegistroEditar] = useState(null);
  const [columnasVisibles, setColumnasVisibles] = useState(() => {
    const guardadas = cargarColumnasGuardadas();
    if (guardadas) return guardadas;
    return todasLasColumnasFdm.filter((c) => columnasInicialesFdm.includes(c.clave));
  });
  const [modalColumnasOpen, setModalColumnasOpen] = useState(false);
  const [columnasOrdenadas, setColumnasOrdenadas] = useState([]);
  const [seleccionTemporal, setSeleccionTemporal] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroAjustador, setFiltroAjustador] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [confirmEliminar, setConfirmEliminar] = useState({ open: false, registro: null });
  const [eliminando, setEliminando] = useState(false);
  const [aviso, setAviso] = useState({ open: false, titulo: '', mensaje: '', tipo: 'info' });

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllCasosFdm();
      setCasos(data);
      setFiltrados(data);
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
      setFiltrados((prev) => prev.filter((c) => c._id !== registro._id));
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

  const municipios = useMemo(() => buildOpcionesFiltro(casos, 'municipio'), [casos]);
  const ajustadores = useMemo(() => buildOpcionesFiltro(casos, 'ajustador'), [casos]);
  const estados = useMemo(() => buildOpcionesFiltro(casos, 'estado'), [casos]);

  const filtrosActivos = Boolean(
    busqueda || filtroMunicipio || filtroAjustador || filtroEstado || fechaInicio || fechaFin
  );

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroMunicipio('');
    setFiltroAjustador('');
    setFiltroEstado('');
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
          item.nombre,
          item.cedula,
          item.celular,
          item.direccionAfectada,
          item.municipio,
          item.ajustador,
          item.caso,
          item.siniestro,
          item.polizaAfectar,
        ]
          .filter(Boolean)
          .some((campo) => campo.toString().toLowerCase().includes(termino))
      );
    }
    if (filtroMunicipio) {
      resultado = resultado.filter((item) => coincideFiltroTexto(item.municipio, filtroMunicipio));
    }
    if (filtroAjustador) {
      resultado = resultado.filter((item) => coincideFiltroTexto(item.ajustador, filtroAjustador));
    }
    if (filtroEstado) {
      resultado = resultado.filter((item) => coincideFiltroTexto(item.estado, filtroEstado));
    }
    if (fechaInicio || fechaFin) {
      resultado = resultado.filter((item) =>
        fechaEnRango(item.fechaLiquidacion || item.fechaAviso || item.createdAt, fechaInicio, fechaFin)
      );
    }

    setFiltrados(resultado);
    setPaginaActual(1);
  }, [casos, busqueda, filtroMunicipio, filtroAjustador, filtroEstado, fechaInicio, fechaFin]);

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
      const rows = filtrados.map((item) => buildExportRow(item));
      const worksheet = XLSX.utils.json_to_sheet(rows, { cellDates: true });
      const encabezados = rows.length > 0 ? Object.keys(rows[0]) : [];
      const indicesColumnasFecha = COLUMNAS_FECHA_EXCEL.map((nombre) => encabezados.indexOf(nombre)).filter(
        (idx) => idx >= 0
      );

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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Equidad FDM');
      XLSX.writeFile(workbook, `reporte-equidad-fdm-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
  const CAMPOS_FECHA = new Set(['fechaAviso', 'fechaLiquidacion', 'fechaGiro', 'createdAt', 'updatedAt']);

  const obtenerValorCelda = (item, clave) => {
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
          title={t('equidadFdm.report.title')}
          subtitle={t('equidadFdm.report.subtitle')}
          activePath="/equidad-fdm/reporte"
          actions={
            <>
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
            <Campo label={t('equidadFdm.fields.municipality')}>
              <SelectFenix value={filtroMunicipio} onChange={(e) => setFiltroMunicipio(e.target.value)}>
                <option value="">{t('equidadFdm.report.all')}</option>
                {municipios.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </SelectFenix>
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
                      className="transition hover:bg-gray-50/80 dark:hover:bg-gray-900/30"
                    >
                      <td className="sticky left-0 z-20 overflow-visible whitespace-nowrap bg-white px-4 py-3 dark:bg-[#1A1A1A]">
                        <AccionesFdmMenu
                          onGestionar={() => abrirModalEdicion(item)}
                          onLiquidador={() =>
                            navigate(`/equidad-fdm/liquidador?casoId=${item._id}`, {
                              state: { casoFdm: item },
                            })
                          }
                          onEliminar={() => solicitarEliminar(item)}
                          tieneLiquidador={Boolean(item.liquidador)}
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
