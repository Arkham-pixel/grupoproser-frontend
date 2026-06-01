import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { FaCog, FaFileExcel, FaTasks, FaTrash } from 'react-icons/fa';
import { deleteSiniestroExpress, getSiniestrosExpressPaginado } from '../../services/expressService.js';
import SubcomponenteExpress from './SubcomponenteExpress.jsx';
import { convertirFechaParaExcelDate } from '../../utils/fechaUtils.js';
import {
  EXPRESS_COLUMNAS_STORAGE_KEY,
  EXPRESS_LIMIT_FETCH,
  EXPRESS_REPORTE_PAGE_SIZE,
  formatCurrency,
  formatDate,
  useExpressCatalogos,
} from './expressHelpers.js';
import {
  expressBtnDanger,
  expressBtnPrimary,
  expressBtnSecondary,
  expressBtnSuccess,
  expressScope,
  expressTableHead,
  expressTableWrap,
} from './expressFenixUi.js';
import {
  Campo,
  ExpressAvisoModal,
  ExpressFilterSection,
  ExpressModal,
  ExpressPageHeader,
  InputFenix,
  SelectFenix,
} from './ExpressUiBlocks.jsx';

const formatDateForExcel = (value) => convertirFechaParaExcelDate(value);
const expressReportRoot = 'min-h-full w-full min-w-0 bg-fenix-fondo p-2 dark:bg-[#0F0F0F] sm:p-4';
const expressPageWrapWide = 'w-full min-w-0 space-y-4 sm:space-y-6';

const buildExportRow = (siniestro, { getNombreResponsable, getNombreAseguradora, getNombreEstado }) => ({
  Consecutivo: siniestro.consecutivo ?? '',
  Responsable: getNombreResponsable(siniestro.responsable) || siniestro.responsable || '',
  'Código Workflow': siniestro.codigoWorkflow ?? '',
  'Número de Siniestro': siniestro.numeroSiniestro ?? '',
  'Aviso de Siniestro': formatDateForExcel(siniestro.avisoSiniestro),
  'Fecha Recibo Documentos': formatDateForExcel(siniestro.fechaReciboDocumentos),
  'Fecha Cargue Finiquito': formatDateForExcel(siniestro.fechaCargueFiniquito),
  Amparo: siniestro.amparo ?? '',
  'Valor Indemnización': siniestro.valorIndemnizacion ?? '',
  'Reservas (COP)': siniestro.reserva ?? '',
  Aseguradora: getNombreAseguradora(siniestro.aseguradora) || siniestro.aseguradora || '',
  Intermediario: siniestro.intermediario ?? '',
  'Ciudad Siniestro': siniestro.ciudadSiniestro ?? '',
  'Asegurado/Beneficiario': siniestro.aseguradoBeneficiario ?? '',
  'Fecha Solicitud Documentos': formatDateForExcel(siniestro.fechaSolicitudDocumentos),
  'Fecha Presentación Cifras': formatDateForExcel(siniestro.fechaPresentacionCifras),
  'Fecha Finiquitos Firmado': formatDateForExcel(siniestro.fechaFiniquitosFirmado),
  'Estado del Proceso': getNombreEstado(siniestro.estadoProceso) || siniestro.estadoProceso || '',
  'Observaciones Seguimiento': siniestro.observacionesSeguimiento ?? '',
  'Creado el': formatDateForExcel(siniestro.createdAt),
  'Actualizado el': formatDateForExcel(siniestro.updatedAt),
});

const todasLasColumnasExpress = [
  { clave: 'consecutivo', label: 'Consecutivo' },
  { clave: 'numeroSiniestro', label: 'Número Siniestro' },
  { clave: 'responsable', label: 'Responsable' },
  { clave: 'codigoWorkflow', label: 'Código Workflow' },
  { clave: 'aseguradora', label: 'Aseguradora' },
  { clave: 'estadoProceso', label: 'Estado' },
  { clave: 'avisoSiniestro', label: 'Aviso Siniestro' },
  { clave: 'fechaReciboDocumentos', label: 'Fecha Recibo Documentos' },
  { clave: 'fechaCargueFiniquito', label: 'Fecha Cargue Finiquito' },
  { clave: 'fechaSolicitudDocumentos', label: 'Fecha Solicitud Documentos' },
  { clave: 'fechaPresentacionCifras', label: 'Fecha Presentación Cifras' },
  { clave: 'fechaFiniquitosFirmado', label: 'Fecha Finiquitos Firmado' },
  { clave: 'amparo', label: 'Amparo' },
  { clave: 'valorIndemnizacion', label: 'Valor Indemnización' },
  { clave: 'reserva', label: 'Reservas (COP)' },
  { clave: 'intermediario', label: 'Intermediario' },
  { clave: 'ciudadSiniestro', label: 'Ciudad Siniestro' },
  { clave: 'aseguradoBeneficiario', label: 'Asegurado/Beneficiario' },
  { clave: 'observacionesSeguimiento', label: 'Observaciones Seguimiento' },
  { clave: 'createdAt', label: 'Creado el' },
  { clave: 'updatedAt', label: 'Actualizado el' },
];

const columnasInicialesExpress = [
  'consecutivo',
  'numeroSiniestro',
  'responsable',
  'aseguradora',
  'estadoProceso',
  'avisoSiniestro',
  'valorIndemnizacion',
  'reserva',
  'aseguradoBeneficiario',
  'observacionesSeguimiento',
];

function cargarColumnasGuardadas() {
  try {
    const raw = localStorage.getItem(EXPRESS_COLUMNAS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.claves) || parsed.claves.length === 0) return null;
    const ordenadas = parsed.claves
      .map((clave) => todasLasColumnasExpress.find((c) => c.clave === clave))
      .filter(Boolean);
    return ordenadas.length > 0 ? ordenadas : null;
  } catch {
    return null;
  }
}

const ReporteExpress = () => {
  const [siniestros, setSiniestros] = useState([]);
  const [filtrados, setFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [registroEditar, setRegistroEditar] = useState(null);
  const [columnasVisibles, setColumnasVisibles] = useState(() => {
    const guardadas = cargarColumnasGuardadas();
    if (guardadas) return guardadas;
    return todasLasColumnasExpress.filter((c) => columnasInicialesExpress.includes(c.clave));
  });
  const [modalColumnasOpen, setModalColumnasOpen] = useState(false);
  const [columnasOrdenadas, setColumnasOrdenadas] = useState([]);
  const [seleccionTemporal, setSeleccionTemporal] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroResponsable, setFiltroResponsable] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroAseguradora, setFiltroAseguradora] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [confirmEliminar, setConfirmEliminar] = useState({ open: false, registro: null });
  const [eliminando, setEliminando] = useState(false);
  const [avisoEliminar, setAvisoEliminar] = useState({
    open: false,
    titulo: '',
    mensaje: '',
    tipo: 'info',
  });

  const { obtenerNombreEstado, obtenerNombreAseguradora, obtenerNombreResponsable } =
    useExpressCatalogos();

  const recargarDespuesDeEdicion = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const respuesta = await getSiniestrosExpressPaginado({
        page: 1,
        limit: EXPRESS_LIMIT_FETCH,
      });
      const data = Array.isArray(respuesta?.data)
        ? respuesta.data
        : Array.isArray(respuesta)
          ? respuesta
          : [];
      setSiniestros(data);
      setFiltrados(data);
    } catch (err) {
      console.error('Error recargando siniestros express:', err);
      setError(err.message || 'Error al recargar los siniestros express');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const respuesta = await getSiniestrosExpressPaginado({
          page: 1,
          limit: EXPRESS_LIMIT_FETCH,
        });
        if (cancelado) return;
        const data = Array.isArray(respuesta?.data) ? respuesta.data : Array.isArray(respuesta) ? respuesta : [];
        setSiniestros(data);
        setFiltrados(data);
      } catch (err) {
        console.error('Error cargando siniestros express:', err);
        if (!cancelado) {
          setError(err.message || 'Error al cargar los siniestros express');
          setSiniestros([]);
          setFiltrados([]);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelado = true;
    };
  }, []);

  const abrirModalEdicion = useCallback((registro) => {
    setRegistroEditar(registro);
    setModalAbierto(true);
  }, []);

  const solicitarEliminar = useCallback((registro) => {
    if (!registro?._id) {
      setAvisoEliminar({
        open: true,
        titulo: 'No se puede eliminar',
        mensaje: 'Este registro no tiene identificador válido.',
        tipo: 'error',
      });
      return;
    }
    setConfirmEliminar({ open: true, registro });
  }, []);

  const cerrarConfirmEliminar = useCallback(() => {
    if (eliminando) return;
    setConfirmEliminar({ open: false, registro: null });
  }, [eliminando]);

  const confirmarEliminar = useCallback(async () => {
    const registro = confirmEliminar.registro;
    if (!registro?._id) return;

    setEliminando(true);
    try {
      await deleteSiniestroExpress(registro._id);
      setSiniestros((prev) => prev.filter((s) => s._id !== registro._id));
      setFiltrados((prev) => prev.filter((s) => s._id !== registro._id));
      setConfirmEliminar({ open: false, registro: null });
      setAvisoEliminar({
        open: true,
        titulo: 'Eliminado',
        mensaje: `El caso ${
          registro.consecutivo || registro.numeroSiniestro || ''
        } fue eliminado correctamente.`,
        tipo: 'success',
      });
    } catch (err) {
      console.error('Error al eliminar siniestro express:', err);
      setConfirmEliminar({ open: false, registro: null });
      setAvisoEliminar({
        open: true,
        titulo: 'Error al eliminar',
        mensaje: err.message || 'No se pudo eliminar el registro.',
        tipo: 'error',
      });
    } finally {
      setEliminando(false);
    }
  }, [confirmEliminar.registro]);

  const cerrarModalEdicion = useCallback(() => {
    setModalAbierto(false);
    setRegistroEditar(null);
  }, []);

  const manejarExpressGuardado = useCallback(async () => {
    await recargarDespuesDeEdicion();
    cerrarModalEdicion();
  }, [recargarDespuesDeEdicion, cerrarModalEdicion]);

  const responsables = useMemo(() => {
    const conjunto = new Set(siniestros.map((item) => item.responsable).filter(Boolean));
    return Array.from(conjunto)
      .map((value) => ({ value, label: obtenerNombreResponsable(value) || value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [siniestros, obtenerNombreResponsable]);

  const estados = useMemo(() => {
    const conjunto = new Set(siniestros.map((item) => item.estadoProceso).filter(Boolean));
    return Array.from(conjunto)
      .map((value) => ({ value, label: obtenerNombreEstado(value) || value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [siniestros, obtenerNombreEstado]);

  const aseguradoras = useMemo(() => {
    const conjunto = new Set(siniestros.map((item) => item.aseguradora).filter(Boolean));
    return Array.from(conjunto)
      .map((value) => ({ value, label: obtenerNombreAseguradora(value) || value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [siniestros, obtenerNombreAseguradora]);

  const filtrosActivos = Boolean(
    busqueda || filtroResponsable || filtroEstado || filtroAseguradora || fechaInicio || fechaFin
  );

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroResponsable('');
    setFiltroEstado('');
    setFiltroAseguradora('');
    setFechaInicio('');
    setFechaFin('');
  };

  useEffect(() => {
    let resultado = [...siniestros];

    if (busqueda) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter((item) =>
        [
          item.numeroSiniestro,
          item.consecutivo,
          item.codigoWorkflow,
          item.aseguradoBeneficiario,
          item.ciudadSiniestro,
          obtenerNombreResponsable(item.responsable),
          obtenerNombreAseguradora(item.aseguradora),
          obtenerNombreEstado(item.estadoProceso),
        ]
          .filter(Boolean)
          .some((campo) => campo.toString().toLowerCase().includes(termino))
      );
    }

    if (filtroResponsable) resultado = resultado.filter((item) => item.responsable === filtroResponsable);
    if (filtroEstado) resultado = resultado.filter((item) => item.estadoProceso === filtroEstado);
    if (filtroAseguradora) resultado = resultado.filter((item) => item.aseguradora === filtroAseguradora);
    if (fechaInicio) {
      resultado = resultado.filter((item) => {
        const fecha = item.avisoSiniestro ? item.avisoSiniestro.slice(0, 10) : '';
        return fecha && fecha >= fechaInicio;
      });
    }
    if (fechaFin) {
      resultado = resultado.filter((item) => {
        const fecha = item.avisoSiniestro ? item.avisoSiniestro.slice(0, 10) : '';
        return fecha && fecha <= fechaFin;
      });
    }

    setFiltrados(resultado);
    setPaginaActual(1);
  }, [
    siniestros,
    busqueda,
    filtroResponsable,
    filtroEstado,
    filtroAseguradora,
    fechaInicio,
    fechaFin,
    obtenerNombreResponsable,
    obtenerNombreAseguradora,
    obtenerNombreEstado,
  ]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / EXPRESS_REPORTE_PAGE_SIZE));

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  const filtradosPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * EXPRESS_REPORTE_PAGE_SIZE;
    return filtrados.slice(inicio, inicio + EXPRESS_REPORTE_PAGE_SIZE);
  }, [filtrados, paginaActual]);

  const indiceDesde =
    filtrados.length === 0 ? 0 : (paginaActual - 1) * EXPRESS_REPORTE_PAGE_SIZE + 1;
  const indiceHasta = Math.min(paginaActual * EXPRESS_REPORTE_PAGE_SIZE, filtrados.length);

  const exportarExcel = () => {
    if (filtrados.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }
    const rows = filtrados.map((item) =>
      buildExportRow(item, {
        getNombreResponsable: obtenerNombreResponsable,
        getNombreAseguradora: obtenerNombreAseguradora,
        getNombreEstado: obtenerNombreEstado,
      })
    );

    const worksheet = XLSX.utils.json_to_sheet(rows, { cellDates: true });
    const columnasFecha = [
      'Aviso de Siniestro',
      'Fecha Recibo Documentos',
      'Fecha Cargue Finiquito',
      'Fecha Solicitud Documentos',
      'Fecha Presentación Cifras',
      'Fecha Finiquitos Firmado',
      'Creado el',
      'Actualizado el',
    ];
    const encabezados = rows.length > 0 ? Object.keys(rows[0]) : [];
    const indicesColumnasFecha = columnasFecha.map((nombre) => encabezados.indexOf(nombre)).filter((idx) => idx >= 0);

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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Express');
    XLSX.writeFile(workbook, `reporte-express-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const abrirPersonalizarColumnas = () => {
    setSeleccionTemporal(columnasVisibles.map((c) => c.clave));
    const ordenActual = columnasVisibles.map((c) => c.clave);
    const columnasNoVisibles = todasLasColumnasExpress.filter((c) => !ordenActual.includes(c.clave));
    setColumnasOrdenadas([...columnasVisibles, ...columnasNoVisibles]);
    setModalColumnasOpen(true);
  };

  const guardarColumnasPersonalizadas = () => {
    const columnasSeleccionadasOrdenadas = columnasOrdenadas.filter((c) =>
      seleccionTemporal.includes(c.clave)
    );
    setColumnasVisibles(columnasSeleccionadasOrdenadas);
    try {
      localStorage.setItem(
        EXPRESS_COLUMNAS_STORAGE_KEY,
        JSON.stringify({ claves: columnasSeleccionadasOrdenadas.map((c) => c.clave) })
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
    const newColumnas = [...columnasOrdenadas];
    const draggedItem = newColumnas[draggedIndex];
    newColumnas.splice(draggedIndex, 1);
    newColumnas.splice(index, 0, draggedItem);
    setColumnasOrdenadas(newColumnas);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => setDraggedIndex(null);

  const toggleColumna = (clave) => {
    setSeleccionTemporal((prev) =>
      prev.includes(clave) ? prev.filter((c) => c !== clave) : [...prev, clave]
    );
  };

  const obtenerValorCelda = (item, clave) => {
    switch (clave) {
      case 'consecutivo':
        return item.consecutivo || '—';
      case 'numeroSiniestro':
        return item.numeroSiniestro || '—';
      case 'responsable':
        return obtenerNombreResponsable(item.responsable) || item.responsable || '—';
      case 'codigoWorkflow':
        return item.codigoWorkflow || '—';
      case 'aseguradora':
        return obtenerNombreAseguradora(item.aseguradora) || item.aseguradora || '—';
      case 'estadoProceso':
        return obtenerNombreEstado(item.estadoProceso) || item.estadoProceso || '—';
      case 'avisoSiniestro':
        return formatDate(item.avisoSiniestro) || '—';
      case 'fechaReciboDocumentos':
        return formatDate(item.fechaReciboDocumentos) || '—';
      case 'fechaCargueFiniquito':
        return formatDate(item.fechaCargueFiniquito) || '—';
      case 'fechaSolicitudDocumentos':
        return formatDate(item.fechaSolicitudDocumentos) || '—';
      case 'fechaPresentacionCifras':
        return formatDate(item.fechaPresentacionCifras) || '—';
      case 'fechaFiniquitosFirmado':
        return formatDate(item.fechaFiniquitosFirmado) || '—';
      case 'amparo':
        return item.amparo || '—';
      case 'valorIndemnizacion':
        return formatCurrency(item.valorIndemnizacionNumero ?? item.valorIndemnizacion) || '—';
      case 'reserva':
        return formatCurrency(item.reservaNumero ?? item.reserva) || '—';
      case 'intermediario':
        return item.intermediario || '—';
      case 'ciudadSiniestro':
        return item.ciudadSiniestro || '—';
      case 'aseguradoBeneficiario':
        return item.aseguradoBeneficiario || '—';
      case 'observacionesSeguimiento':
        return item.observacionesSeguimiento || '—';
      case 'createdAt':
        return formatDate(item.createdAt) || '—';
      case 'updatedAt':
        return formatDate(item.updatedAt) || '—';
      default:
        return '—';
    }
  };

  const listaColumnasModal = columnasOrdenadas.length > 0 ? columnasOrdenadas : todasLasColumnasExpress;

  return (
    <div className={`${expressScope} ${expressReportRoot}`}>
      <div className={expressPageWrapWide}>
        <ExpressPageHeader
          title="Reporte Express"
          subtitle="Visualiza, filtra y exporta los procesos Express registrados en el sistema."
          activePath="/express/reporte"
          actions={
            <>
              <button
                type="button"
                onClick={abrirPersonalizarColumnas}
                className={expressBtnSecondary}
              >
                <FaCog />
                Columnas
              </button>
              <button
                type="button"
                onClick={exportarExcel}
                className={expressBtnSuccess}
                disabled={loading || filtrados.length === 0}
              >
                <FaFileExcel />
                Exportar Excel
              </button>
            </>
          }
        />

        <ExpressFilterSection title="Filtros de búsqueda" showClear={filtrosActivos} onClear={limpiarFiltros}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Campo label="Buscar">
              <InputFenix
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Número, consecutivo, asegurado…"
              />
            </Campo>
            <Campo label="Responsable">
              <SelectFenix value={filtroResponsable} onChange={(e) => setFiltroResponsable(e.target.value)}>
                <option value="">Todos</option>
                {responsables.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label="Estado">
              <SelectFenix value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">Todos</option>
                {estados.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label="Aseguradora">
              <SelectFenix value={filtroAseguradora} onChange={(e) => setFiltroAseguradora(e.target.value)}>
                <option value="">Todas</option>
                {aseguradoras.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label="Aviso desde">
              <InputFenix type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </Campo>
            <Campo label="Aviso hasta">
              <InputFenix type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </Campo>
          </div>
          <p className="mt-4 font-body text-sm text-gray-500 dark:text-gray-400">
            {loading
              ? 'Cargando…'
              : filtrados.length === 0
                ? '0 registros'
                : `${filtrados.length} registro(s) · mostrando ${indiceDesde}–${indiceHasta} (página ${paginaActual} de ${totalPaginas})`}
          </p>
        </ExpressFilterSection>

        <div className={`${expressTableWrap} w-full min-w-0`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className={expressTableHead}>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 bg-gray-50 px-4 py-3 dark:bg-gray-900/50">
                    Acciones
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
                      Cargando siniestros express…
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
                      No se encontraron siniestros con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filtradosPagina.map((item) => (
                    <tr
                      key={item._id ?? `${item.numeroSiniestro}-${item.consecutivo}`}
                      className="transition hover:bg-gray-50/80 dark:hover:bg-gray-900/30"
                    >
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-3 dark:bg-[#1A1A1A]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirModalEdicion(item)}
                            className={`${expressBtnPrimary} !px-3 !py-1.5 !text-xs`}
                          >
                            <FaTasks className="text-sm" />
                            Gestionar
                          </button>
                          <button
                            type="button"
                            onClick={() => solicitarEliminar(item)}
                            className={expressBtnDanger}
                            title="Eliminar caso"
                          >
                            <FaTrash className="text-sm" aria-hidden />
                            Eliminar
                          </button>
                        </div>
                      </td>
                      {columnasVisibles.map((col) => (
                        <td
                          key={col.clave}
                          className={`px-4 py-3 font-body text-sm text-gray-800 dark:text-gray-200 ${
                            col.clave === 'observacionesSeguimiento' ? 'max-w-xs' : 'whitespace-nowrap'
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
                Página {paginaActual} de {totalPaginas}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={expressBtnSecondary}
                  disabled={paginaActual <= 1}
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                >
                  Anterior
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
                        {showEllipsis && (
                          <span className="px-1 font-body text-sm text-gray-400">…</span>
                        )}
                        <button
                          type="button"
                          className={
                            n === paginaActual
                              ? expressBtnPrimary
                              : `${expressBtnSecondary} !min-w-[2.25rem]`
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
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ExpressModal
        open={modalColumnasOpen}
        onClose={() => setModalColumnasOpen(false)}
        title="Personalizar columnas"
      >
        <div className="p-4 sm:p-6">
          <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
            Arrastra para ordenar. Marca o desmarca para mostrar u ocultar columnas. La configuración se guarda en este
            navegador.
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
              Cancelar
            </button>
            <button type="button" className={expressBtnPrimary} onClick={guardarColumnasPersonalizadas}>
              Guardar
            </button>
          </div>
        </div>
      </ExpressModal>

      <ExpressModal
        open={modalAbierto}
        onClose={cerrarModalEdicion}
        title="Gestionar proceso Express"
        wide
      >
        <div className="p-2 sm:p-4">
          <SubcomponenteExpress
            initialData={registroEditar}
            embed
            onClose={cerrarModalEdicion}
            onSaved={manejarExpressGuardado}
          />
        </div>
      </ExpressModal>

      <ExpressAvisoModal
        open={confirmEliminar.open}
        onClose={cerrarConfirmEliminar}
        titulo="Eliminar caso Express"
        tipo="warning"
        mensaje={
          confirmEliminar.registro
            ? `¿Confirma eliminar el caso ${
                confirmEliminar.registro.consecutivo ||
                confirmEliminar.registro.numeroSiniestro ||
                ''
              }? Esta acción no se puede deshacer.`
            : ''
        }
        onConfirm={confirmarEliminar}
        confirmTexto="Eliminar"
        cancelTexto="Cancelar"
        confirmando={eliminando}
      />

      <ExpressAvisoModal
        open={avisoEliminar.open}
        onClose={() => setAvisoEliminar((prev) => ({ ...prev, open: false }))}
        titulo={avisoEliminar.titulo}
        mensaje={avisoEliminar.mensaje}
        tipo={avisoEliminar.tipo}
      />
    </div>
  );
};

export default ReporteExpress;
