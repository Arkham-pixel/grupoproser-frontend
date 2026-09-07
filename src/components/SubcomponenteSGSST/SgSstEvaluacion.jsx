import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaCloudUploadAlt,
  FaDownload,
  FaInfoCircle,
  FaPlus,
  FaShieldAlt,
  FaSpinner,
  FaTrash,
  FaUsers,
} from 'react-icons/fa';
import {
  CLASES_RIESGO,
  CRITERIOS_EVALUACION,
  ESTADOS_ITEM,
  INSTRUCCIONES_SURA,
  PERFIL_META,
  calificacionDeItem,
  calcularPuntaje,
  calcularResumenPorGrupo,
  construirPaginasSura,
  construirRespuestasIniciales,
  formatearValorPct,
  itemsPorPerfil,
  resolverPerfil0312,
  sincronizarRespuestas,
} from '../../config/sgSst0312';
import BotonDescargaStorage from '../shared/BotonDescargaStorage.jsx';
import {
  actualizarCasoSgSst,
  crearCasoSgSst,
  descargarPaqueteSgSst,
  eliminarCasoSgSst,
  eliminarEvidenciaSgSst,
  listarCasosSgSst,
  obtenerCasoSgSst,
  subirEvidenciaSgSst,
} from '../../services/sgSstService';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  puertosBtnPrimary,
  puertosBtnSecondary,
  puertosCard,
  puertosFormRoot,
  puertosInput,
  puertosPageSubtitle,
  puertosPageTitle,
  puertosPageWrap,
  puertosScope,
} from '../PuertosActas/puertosFenixUi';
import SiluetaCumplimientoSgSst from './SiluetaCumplimientoSgSst';

function respuestasMapFromCaso(caso) {
  const map = {};
  for (const r of caso?.respuestas || []) {
    map[r.itemId] = {
      estado: r.estado || '',
      evidencias: r.evidencias || '',
      planAccion: r.planAccion || '',
      responsable: r.responsable || '',
      fechaPlazo: r.fechaPlazo || '',
      recursos: r.recursos || '',
      fundamentos: r.fundamentos || '',
    };
  }
  return map;
}

function archivosPorItem(caso) {
  const map = {};
  for (const a of caso?.archivos || []) {
    if (!map[a.itemId]) map[a.itemId] = [];
    map[a.itemId].push(a);
  }
  return map;
}

export default function SgSstEvaluacion() {
  const { t } = useTranslation();
  const [vista, setVista] = useState('listado'); // listado | nuevo | caso
  const [casos, setCasos] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [errorLista, setErrorLista] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [numTrabajadores, setNumTrabajadores] = useState('');
  const [numTrabajadoresIndirectos, setNumTrabajadoresIndirectos] = useState('0');
  const [claseRiesgo, setClaseRiesgo] = useState('');
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [nit, setNit] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [sectorEconomico, setSectorEconomico] = useState('');
  const [realizadoPor, setRealizadoPor] = useState('');
  const [cargoRealizadoPor, setCargoRealizadoPor] = useState('');
  const [errorPerfil, setErrorPerfil] = useState('');
  const [creando, setCreando] = useState(false);

  const [caso, setCaso] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [subiendoItemId, setSubiendoItemId] = useState(null);
  const [descargando, setDescargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [filtroItems, setFiltroItems] = useState('todos'); // todos | aplicables
  const [paginaIdx, setPaginaIdx] = useState(0);
  const [itemExpandidoId, setItemExpandidoId] = useState(null);

  const items = useMemo(() => itemsPorPerfil(caso?.perfilId), [caso?.perfilId]);
  const itemsVisibles = useMemo(
    () => (filtroItems === 'todos' ? items : items.filter((it) => it.aplica)),
    [items, filtroItems]
  );

  /** Páginas formato SURA: secciones (Recursos, Capacitación, …) + tabla de valores. */
  const paginas = useMemo(() => construirPaginasSura(itemsVisibles), [itemsVisibles]);

  const paginaActual = paginas[paginaIdx] || paginas[0] || {
    tipo: 'seccion',
    ciclo: '',
    titulo: '',
    items: [],
    aplicables: 0,
  };
  const itemsPagina = paginaActual.items || [];
  const esResumen = paginaActual.tipo === 'resumen';
  const esInstrucciones = paginaActual.tipo === 'instrucciones';
  const esGraficos = paginaActual.tipo === 'graficos';
  const esCriterios = paginaActual.tipo === 'criterios';

  const resumenGrupos = useMemo(
    () => calcularResumenPorGrupo(caso?.perfilId, respuestas),
    [caso?.perfilId, respuestas]
  );

  useEffect(() => {
    setPaginaIdx(0);
    setItemExpandidoId(null);
  }, [filtroItems, caso?._id]);

  useEffect(() => {
    setItemExpandidoId(null);
  }, [paginaIdx]);

  useEffect(() => {
    if (paginaIdx > 0 && paginaIdx >= paginas.length) {
      setPaginaIdx(Math.max(0, paginas.length - 1));
    }
  }, [paginas.length, paginaIdx]);

  const meta = caso?.perfilId ? PERFIL_META[caso.perfilId] : null;
  const archivosMap = useMemo(() => archivosPorItem(caso), [caso]);

  const progreso = useMemo(
    () => calcularPuntaje(caso?.perfilId, respuestas),
    [caso?.perfilId, respuestas]
  );

  const irPagina = (idx) => {
    setPaginaIdx(idx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cargarLista = useCallback(async () => {
    setCargandoLista(true);
    setErrorLista('');
    try {
      const list = await listarCasosSgSst(busqueda.trim() ? { q: busqueda.trim() } : {});
      setCasos(list);
    } catch (err) {
      setErrorLista(err?.response?.data?.message || err.message || t('sgsst.ui.errors.loadCasesError'));
    } finally {
      setCargandoLista(false);
    }
  }, [busqueda, t]);

  useEffect(() => {
    if (vista === 'listado') cargarLista();
  }, [vista, cargarLista]);

  const abrirCaso = async (id) => {
    setMensaje('');
    try {
      const c = await obtenerCasoSgSst(id);
      const sync = sincronizarRespuestas(c.perfilId, respuestasMapFromCaso(c));
      setCaso(c);
      setRespuestas(sync);
      setFiltroItems('todos');
      setPaginaIdx(0);
      setVista('caso');
    } catch (err) {
      setErrorLista(err?.response?.data?.message || t('sgsst.ui.errors.openCaseError'));
    }
  };

  const iniciarCaso = async (e) => {
    e.preventDefault();
    const n = Number(numTrabajadores);
    if (!nombreEmpresa.trim()) {
      setErrorPerfil(t('sgsst.ui.errors.companyNameRequired'));
      return;
    }
    if (!nit.trim()) {
      setErrorPerfil(t('sgsst.ui.errors.nitRequired'));
      return;
    }
    if (!Number.isFinite(n) || n < 1) {
      setErrorPerfil(t('sgsst.ui.errors.employeesInvalid'));
      return;
    }
    if (!claseRiesgo) {
      setErrorPerfil(t('sgsst.ui.errors.riskClassRequired'));
      return;
    }
    const perfil = resolverPerfil0312(n, claseRiesgo);
    if (!perfil) {
      setErrorPerfil(t('sgsst.ui.errors.chapterUndetermined'));
      return;
    }

    setCreando(true);
    setErrorPerfil('');
    try {
      const c = await crearCasoSgSst({
        nombreEmpresa: nombreEmpresa.trim(),
        nit: nit.trim(),
        numTrabajadores: n,
        numTrabajadoresIndirectos: Number(numTrabajadoresIndirectos) || 0,
        claseRiesgo,
        perfilId: perfil,
        ciudad: ciudad.trim(),
        departamento: departamento.trim(),
        sectorEconomico: sectorEconomico.trim(),
        realizadoPor: realizadoPor.trim(),
        cargoRealizadoPor: cargoRealizadoPor.trim(),
        anioAutoevaluacion: new Date().getFullYear(),
        respuestas: construirRespuestasIniciales(perfil),
      });
      setCaso(c);
      setRespuestas(sincronizarRespuestas(c.perfilId, respuestasMapFromCaso(c)));
      setFiltroItems('todos');
      setPaginaIdx(0);
      setVista('caso');
      setNumTrabajadores('');
      setNumTrabajadoresIndirectos('0');
      setClaseRiesgo('');
      setNombreEmpresa('');
      setNit('');
      setCiudad('');
      setDepartamento('');
      setSectorEconomico('');
      setRealizadoPor('');
      setCargoRealizadoPor('');
    } catch (err) {
      setErrorPerfil(err?.response?.data?.message || err.message || t('sgsst.ui.errors.createCaseError'));
    } finally {
      setCreando(false);
    }
  };

  const actualizarItem = (itemId, patch, aplica = true) => {
    if (!aplica) return;
    setRespuestas((prev) => ({
      ...prev,
      [itemId]: {
        evidencias: '',
        planAccion: '',
        ...prev[itemId],
        ...patch,
      },
    }));
  };

  const guardarRespuestas = async () => {
    if (!caso?._id) return;
    setGuardando(true);
    setMensaje('');
    try {
      const payload = {
        respuestas: items.map((it) => ({
          itemId: it.id,
          codigo: it.codigo,
          estado: respuestas[it.id]?.estado || '',
          evidencias: respuestas[it.id]?.evidencias || '',
          planAccion: respuestas[it.id]?.planAccion || '',
          responsable: respuestas[it.id]?.responsable || '',
          fechaPlazo: respuestas[it.id]?.fechaPlazo || '',
          recursos: respuestas[it.id]?.recursos || '',
          fundamentos: respuestas[it.id]?.fundamentos || '',
        })),
      };
      const actualizado = await actualizarCasoSgSst(caso._id, payload);
      setCaso(actualizado);
      setMensaje(t('sgsst.ui.messages.saved'));
    } catch (err) {
      setMensaje(err?.response?.data?.message || t('sgsst.ui.errors.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  const onUpload = async (itemId, fileList) => {
    const file = fileList?.[0];
    if (!file || !caso?._id) return;
    setSubiendoItemId(itemId);
    setMensaje('');
    try {
      await guardarRespuestasSilent();
      const data = await subirEvidenciaSgSst(caso._id, itemId, file);
      const fresco = await obtenerCasoSgSst(caso._id);
      setCaso(fresco);
      setMensaje(t('sgsst.ui.messages.fileUploaded', { name: data?.archivo?.nombreOriginal || file.name }));
    } catch (err) {
      setMensaje(err?.response?.data?.message || err.message || t('sgsst.ui.errors.uploadError'));
    } finally {
      setSubiendoItemId(null);
    }
  };

  const guardarRespuestasSilent = async () => {
    if (!caso?._id) return;
    const payload = {
      respuestas: items.map((it) => ({
        itemId: it.id,
        codigo: it.codigo,
        estado: respuestas[it.id]?.estado || '',
        evidencias: respuestas[it.id]?.evidencias || '',
        planAccion: respuestas[it.id]?.planAccion || '',
        responsable: respuestas[it.id]?.responsable || '',
        fechaPlazo: respuestas[it.id]?.fechaPlazo || '',
        recursos: respuestas[it.id]?.recursos || '',
        fundamentos: respuestas[it.id]?.fundamentos || '',
      })),
    };
    const actualizado = await actualizarCasoSgSst(caso._id, payload);
    setCaso(actualizado);
  };

  const onEliminarArchivo = async (archivoId) => {
    if (!caso?._id || !archivoId) return;
    if (!window.confirm(t('sgsst.ui.confirmDeleteFile'))) return;
    try {
      await eliminarEvidenciaSgSst(caso._id, archivoId);
      const fresco = await obtenerCasoSgSst(caso._id);
      setCaso(fresco);
    } catch (err) {
      setMensaje(err?.response?.data?.message || t('sgsst.ui.errors.deleteFileError'));
    }
  };

  const onDescargarPaquete = async () => {
    if (!caso?._id) return;
    setDescargando(true);
    setMensaje('');
    try {
      await guardarRespuestasSilent();
      await descargarPaqueteSgSst(caso._id, caso.numeroCaso, {
        caso,
        respuestasMap: respuestas,
      });
      setMensaje(t('sgsst.ui.messages.packageDownloadedDetailed'));
    } catch (err) {
      setMensaje(err.message || t('sgsst.ui.errors.downloadError'));
    } finally {
      setDescargando(false);
    }
  };

  const onEliminarCaso = async (id) => {
    if (!window.confirm(t('sgsst.ui.confirmDeleteCase'))) return;
    try {
      await eliminarCasoSgSst(id);
      if (caso?._id === id) {
        setCaso(null);
        setVista('listado');
      }
      await cargarLista();
    } catch (err) {
      setErrorLista(err?.response?.data?.message || t('sgsst.ui.errors.deleteCaseError'));
    }
  };

  // ——— LISTADO ———
  if (vista === 'listado') {
    const totalArchivos = casos.reduce((s, c) => s + (c.archivos?.length || 0), 0);
    const porCap = {
      CAP1: casos.filter((c) => c.perfilId === 'CAP1').length,
      CAP2: casos.filter((c) => c.perfilId === 'CAP2').length,
      CAP3: casos.filter((c) => c.perfilId === 'CAP3').length,
    };

    return (
      <div className={`${puertosFormRoot} ${puertosScope}`}>
        <div className={puertosPageWrap}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-fenix-primario">
                {t('sgsst.ui.evaluation.resolution')}
              </p>
              <h1 className={puertosPageTitle}>{t('sgsst.ui.title')}</h1>
              <p className={puertosPageSubtitle}>
                {t('sgsst.ui.evaluation.listSubtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setErrorPerfil('');
                setVista('nuevo');
              }}
              className={puertosBtnPrimary}
            >
              <FaPlus /> {t('sgsst.ui.newCase')}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: t('sgsst.ui.evaluation.statistics.cases'), value: casos.length, hint: t('sgsst.ui.evaluation.statistics.openEvaluations') },
              { label: t('sgsst.ui.evaluation.statistics.chapterOne'), value: porCap.CAP1, hint: t('sgsst.ui.evaluation.statistics.chapterOneHint') },
              { label: t('sgsst.ui.evaluation.statistics.chaptersTwoThree'), value: porCap.CAP2 + porCap.CAP3, hint: t('sgsst.ui.evaluation.statistics.chaptersTwoThreeHint') },
              { label: t('sgsst.ui.table.files'), value: totalArchivos, hint: t('sgsst.ui.evaluation.statistics.uploadedEvidence') },
            ].map((k) => (
              <div key={k.label} className={`${puertosCard} px-4 py-3`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {k.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{k.value}</p>
                <p className="text-xs text-gray-500">{k.hint}</p>
              </div>
            ))}
          </div>

          <div className={`${puertosCard} p-4 sm:p-5`}>
            <div className="mb-4 flex flex-wrap gap-2">
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && cargarLista()}
                placeholder={t('sgsst.ui.searchPlaceholder')}
                className={`${puertosInput} max-w-xl flex-1`}
              />
              <button type="button" onClick={cargarLista} className={puertosBtnSecondary}>
                {t('sgsst.ui.search')}
              </button>
            </div>

            {errorLista && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                {errorLista}
              </p>
            )}

            {cargandoLista ? (
              <div className="flex items-center gap-2 py-10 text-sm text-gray-500">
                <FaSpinner className="animate-spin text-fenix-primario" /> {t('sgsst.ui.loadingCases')}
              </div>
            ) : casos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-6 py-12 text-center dark:border-gray-700">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-fenix-primario dark:bg-red-950/40">
                  <FaShieldAlt className="text-xl" />
                </div>
                <p className="font-medium text-gray-900 dark:text-white">{t('sgsst.ui.evaluation.emptyState.title')}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {t('sgsst.ui.evaluation.emptyState.description')}
                </p>
                <button
                  type="button"
                  onClick={() => setVista('nuevo')}
                  className={`${puertosBtnPrimary} mt-4`}
                >
                  <FaPlus /> {t('sgsst.ui.evaluation.emptyState.create')}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {casos.map((c) => {
                  const metaCap = PERFIL_META[c.perfilId];
                  const nArchivos = c.archivos?.length || 0;
                  return (
                    <div
                      key={c._id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 transition hover:border-fenix-primario/30 hover:bg-white dark:border-gray-800 dark:bg-gray-950/40 dark:hover:bg-[#1A1A1A]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-fenix-primario text-white">
                        <FaShieldAlt />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-xs font-bold text-fenix-primario">
                            {c.numeroCaso}
                          </p>
                          <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700">
                            {c.perfilId}
                          </span>
                        </div>
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {c.empresa?.nombre || t('sgsst.ui.evaluation.unnamed')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t('sgsst.ui.evaluation.caseInfo', {
                            nit: c.empresa?.nit || '—',
                            employees: c.empresa?.numTrabajadores ?? '—',
                            risk: c.empresa?.claseRiesgo || '—',
                          })}
                          {metaCap ? ` · ${metaCap.titulo.split('—')[0].trim()}` : ''}
                        </p>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">
                          {t('sgsst.ui.evaluation.fileCount', { count: nArchivos })}
                        </p>
                        <p>{c.estadoCaso || 'en_proceso'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirCaso(c._id)}
                          className={puertosBtnPrimary}
                        >
                          {t('sgsst.ui.open')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onEliminarCaso(c._id)}
                          className="rounded-lg border border-gray-200 p-2.5 text-gray-400 transition hover:border-red-300 hover:text-red-600 dark:border-gray-700"
                          title={t('sgsst.ui.delete')}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ——— NUEVO CASO ———
  if (vista === 'nuevo') {
    return (
      <div className={`${puertosFormRoot} ${puertosScope}`}>
        <div className="mx-auto w-full max-w-3xl space-y-5">
        <button
          type="button"
          onClick={() => setVista('listado')}
          className="mb-1 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-fenix-primario dark:text-gray-300"
        >
          <FaArrowLeft /> {t('sgsst.ui.backToList')}
        </button>
        <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">
          {t('sgsst.ui.evaluation.coverTitle')}
        </h1>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
          {t('sgsst.ui.evaluation.coverDescription')}
        </p>

        <form
          onSubmit={iniciarCaso}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('sgsst.ui.companyName')}
            </span>
            <input
              value={nombreEmpresa}
              onChange={(e) => setNombreEmpresa(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              required
            />
          </label>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('sgsst.ui.nit')}
            </span>
            <input
              value={nit}
              onChange={(e) => setNit(e.target.value)}
              placeholder={t('sgsst.ui.nitPlaceholder')}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              required
            />
          </label>
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                <FaUsers className="text-red-600" /> {t('sgsst.ui.evaluation.directEmployees')}
              </span>
              <input
                type="number"
                min={1}
                value={numTrabajadores}
                onChange={(e) => setNumTrabajadores(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('sgsst.ui.evaluation.indirectEmployees')}
              </span>
              <input
                type="number"
                min={0}
                value={numTrabajadoresIndirectos}
                onChange={(e) => setNumTrabajadoresIndirectos(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </label>
          </div>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('sgsst.ui.riskClass')}
            </span>
            <select
              value={claseRiesgo}
              onChange={(e) => setClaseRiesgo(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              required
            >
              <option value="">{t('sgsst.ui.selectPlaceholder')}</option>
              {CLASES_RIESGO.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">{t('sgsst.ui.evaluation.city')}</span>
              <input
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('sgsst.ui.evaluation.department')}
              </span>
              <input
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </label>
          </div>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('sgsst.ui.evaluation.economicSector')}
            </span>
            <input
              value={sectorEconomico}
              onChange={(e) => setSectorEconomico(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </label>
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('sgsst.ui.evaluation.performedBy')}
              </span>
              <input
                value={realizadoPor}
                onChange={(e) => setRealizadoPor(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">{t('sgsst.ui.evaluation.position')}</span>
              <input
                value={cargoRealizadoPor}
                onChange={(e) => setCargoRealizadoPor(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </label>
          </div>

          {errorPerfil && (
            <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {errorPerfil}
            </p>
          )}

          <button
            type="submit"
            disabled={creando}
            className={`${puertosBtnPrimary} w-full disabled:opacity-60`}
          >
            {creando ? <FaSpinner className="animate-spin" /> : null}
            {t('sgsst.ui.evaluation.continue')}
          </button>
        </form>
        </div>
      </div>
    );
  }

  // ——— CASO / CHECKLIST ———
  if (!caso) return null;

  const nivelLabel =
    progreso.nivel === 'ACEPTABLE'
      ? t('sgsst.ui.evaluation.levels.acceptable')
      : progreso.nivel === 'MODERADO'
        ? t('sgsst.ui.evaluation.levels.moderatelyAcceptable')
        : t('sgsst.ui.evaluation.levels.critical');

  // Métricas de UX derivadas del puntaje oficial (sin alterar la fórmula 0312).
  const totalEstandares = progreso.totalItems;
  const exigibles = progreso.totalAplicables;
  const noAplicaPerfil = Math.max(0, totalEstandares - exigibles);
  const respondidosExigibles = progreso.respondidosAplicables;
  const pendientesExigibles = progreso.pendientesAplicables;
  const pctDiligenciamiento =
    exigibles > 0 ? Math.round((respondidosExigibles / exigibles) * 1000) / 10 : 100;
  const hayPendientesExigibles = pendientesExigibles > 0;

  return (
    <div className={`${puertosFormRoot} ${puertosScope}`}>
      <div className={`${puertosPageWrap} max-w-6xl`}>
      {/* Barra superior compacta */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={() => setVista('listado')}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 dark:text-gray-400"
            >
              <FaArrowLeft /> {t('sgsst.ui.list')}
            </button>
            <span className="font-mono text-xs font-semibold text-red-700 dark:text-red-300">
              {caso.numeroCaso}
            </span>
            <h1 className="truncate text-base font-semibold text-gray-900 dark:text-white">
              {meta?.titulo}
            </h1>
          </div>
          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
            {t('sgsst.ui.evaluation.caseInfo', {
              nit: caso.empresa?.nit,
              employees: caso.empresa?.numTrabajadores,
              risk: caso.empresa?.claseRiesgo,
            })} · {t('sgsst.ui.evaluation.caseHeader.evaluateItems', {
              count: exigibles,
              notApplicable: noAplicaPerfil,
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-right dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {progreso.pct}% · {nivelLabel}
            </p>
            <p className="text-[10px] text-gray-500">
              {t('sgsst.ui.evaluation.caseHeader.officialRating', { count: caso.archivos?.length || 0 })}
            </p>
          </div>
          <button
            type="button"
            onClick={guardarRespuestas}
            disabled={guardando}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:text-gray-200"
          >
            {guardando ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
            {t('sgsst.ui.save')}
          </button>
          <button
            type="button"
            onClick={onDescargarPaquete}
            disabled={descargando}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white"
          >
            {descargando ? <FaSpinner className="animate-spin" /> : <FaDownload />}
            {t('sgsst.ui.evaluation.caseHeader.package')}
          </button>
        </div>
      </div>

      {mensaje && (
        <p className="mb-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {mensaje}
        </p>
      )}

      {/* Resumen de evaluación + diligenciamiento (solo UX; no altera el cálculo) */}
      <div className="mb-3 space-y-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {t('sgsst.ui.evaluation.summary.title')}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: t('sgsst.ui.evaluation.summary.totalStandards'), value: totalEstandares, hint: t('sgsst.ui.evaluation.summary.article27Form') },
              { label: t('sgsst.ui.evaluation.summary.required'), value: exigibles, hint: t('sgsst.ui.evaluation.summary.forThisCompany') },
              { label: t('sgsst.ui.evaluation.summary.notApplicable'), value: noAplicaPerfil, hint: t('sgsst.ui.evaluation.summary.bySizeRisk') },
              { label: t('sgsst.ui.evaluation.summary.answered'), value: respondidosExigibles, hint: t('sgsst.ui.evaluation.summary.requiredCompleted') },
              { label: t('sgsst.ui.evaluation.summary.pending'), value: pendientesExigibles, hint: t('sgsst.ui.evaluation.summary.requiredUnanswered') },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-950/40"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  {k.label}
                </p>
                <p className="mt-0.5 text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                  {k.value}
                </p>
                <p className="text-[11px] text-gray-500">{k.hint}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2.5 rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2.5 dark:border-sky-900 dark:bg-sky-950/30">
            <FaInfoCircle className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
            <p className="text-xs leading-relaxed text-sky-900 dark:text-sky-100">
              {t('sgsst.ui.evaluation.summary.resolutionNotice')}
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {t('sgsst.ui.evaluation.summary.officialRating')}
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
              {formatearValorPct(progreso.pct)}
            </p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{nivelLabel}</p>
            <p className="mt-1 text-[11px] text-gray-500">
              {t('sgsst.ui.evaluation.summary.officialCalculation')}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {t('sgsst.ui.evaluation.summary.completionProgress')}
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
              {pctDiligenciamiento}%
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              {t('sgsst.ui.evaluation.summary.completedStandards', {
                done: respondidosExigibles,
                total: exigibles,
              })}
            </p>
            <div
              className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
              role="progressbar"
              aria-valuenow={pctDiligenciamiento}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('sgsst.ui.evaluation.summary.progressAria')}
            >
              <div
                className="h-full rounded-full bg-slate-600 transition-all dark:bg-slate-400"
                style={{ width: `${Math.min(100, pctDiligenciamiento)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-gray-500">
              {t('sgsst.ui.evaluation.summary.completionDetail', {
                done: respondidosExigibles,
                total: exigibles,
              })}
            </p>
          </div>
        </div>

        {hayPendientesExigibles && (
          <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-900/60 dark:bg-amber-950/30">
            <FaInfoCircle className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <div className="text-xs leading-relaxed text-amber-950 dark:text-amber-100">
              <p className="font-semibold">
                {t('sgsst.ui.evaluation.summary.pendingTitle')}
              </p>
              <p className="mt-1">
                {t('sgsst.ui.evaluation.summary.pendingDescription')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filtro + barra de diligenciamiento (independiente del % oficial) */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFiltroItems('todos')}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
            filtroItems === 'todos'
              ? 'bg-red-600 text-white'
              : 'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-200'
          }`}
        >
          {t('sgsst.ui.evaluation.filters.completeFormat')}
        </button>
        <button
          type="button"
          onClick={() => setFiltroItems('aplicables')}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
            filtroItems === 'aplicables'
              ? 'bg-red-600 text-white'
              : 'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-200'
          }`}
        >
          {t('sgsst.ui.evaluation.filters.onlyEvaluate', { count: exigibles })}
        </button>
        <div className="h-1.5 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-slate-600 transition-all dark:bg-slate-400"
            style={{ width: `${Math.min(100, pctDiligenciamiento)}%` }}
          />
        </div>
        <span className="text-[11px] text-gray-500">
          {t('sgsst.ui.evaluation.filters.completion', {
            done: respondidosExigibles,
            total: exigibles,
            pct: progreso.pct,
          })}
        </span>
      </div>

      {/* Navegación horizontal compacta (tipo pestañas Excel) */}
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          disabled={paginaIdx <= 0}
          onClick={() => irPagina(paginaIdx - 1)}
          className="shrink-0 rounded-md border border-gray-300 p-1.5 text-gray-600 disabled:opacity-30 dark:border-gray-600"
          aria-label={t('sgsst.ui.evaluation.navigation.previous')}
        >
          <FaChevronLeft className="h-3 w-3" />
        </button>
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1">
          {paginas.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              title={`${p.ciclo}: ${p.titulo}`}
              onClick={() => irPagina(idx)}
              className={`shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap transition ${
                idx === paginaIdx
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {p.tipo === 'seccion'
                ? p.titulo.replace(/\s*\(\d+%\)\s*$/, '')
                : p.titulo.split(' ').slice(0, 3).join(' ')}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={paginaIdx >= paginas.length - 1}
          onClick={() => irPagina(paginaIdx + 1)}
          className="shrink-0 rounded-md border border-gray-300 p-1.5 text-gray-600 disabled:opacity-30 dark:border-gray-600"
          aria-label={t('sgsst.ui.evaluation.navigation.next')}
        >
          <FaChevronRight className="h-3 w-3" />
        </button>
      </div>

      <p className="mb-2 text-[11px] text-gray-500 dark:text-gray-400">
        {paginaIdx + 1}/{paginas.length} — {paginaActual.ciclo}
        {paginaActual.titulo ? `: ${paginaActual.titulo}` : ''}
        {!esInstrucciones &&
          !esResumen &&
          !esGraficos &&
          !esCriterios &&
          ` · ${t('sgsst.ui.evaluation.navigation.itemCount', { count: itemsPagina.length })}`}
      </p>

      {esInstrucciones ? (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {t('sgsst.ui.evaluation.instructions.title')}
          </h2>
          <ol className="list-decimal space-y-3 pl-5 text-sm text-gray-700 dark:text-gray-200">
            {INSTRUCCIONES_SURA.map((texto) => (
              <li key={texto}>{texto}</li>
            ))}
          </ol>
          <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {t('sgsst.ui.evaluation.instructions.flow')}
          </p>
        </div>
      ) : esResumen ? (
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {t('sgsst.ui.evaluation.table.title')}
            </h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p>
                {t('sgsst.ui.evaluation.table.officialCompliance')}{' '}
                <strong className="text-gray-900 dark:text-white">
                  {formatearValorPct(progreso.pct)} · {nivelLabel}
                </strong>{' '}
                <span className="text-xs text-gray-400">
                  ({progreso.obtenido}/{progreso.posible})
                </span>
              </p>
              <p>
                {t('sgsst.ui.evaluation.table.completion')}{' '}
                <strong className="text-gray-900 dark:text-white">
                  {respondidosExigibles}/{exigibles}
                </strong>{' '}
                <span className="text-xs text-gray-400">({pctDiligenciamiento}%)</span>
              </p>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {t('sgsst.ui.evaluation.table.notApplicableNotice')}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2">{t('sgsst.ui.evaluation.table.code')}</th>
                  <th className="px-3 py-2">{t('sgsst.ui.evaluation.table.item')}</th>
                  <th className="px-3 py-2">{t('sgsst.ui.evaluation.table.value')}</th>
                  <th className="px-3 py-2">{t('sgsst.ui.evaluation.table.status')}</th>
                  <th className="px-3 py-2">{t('sgsst.ui.evaluation.table.points')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const est = respuestas[it.id]?.estado || '';
                  const pts = calificacionDeItem(it.valor, est);
                  return (
                    <tr
                      key={it.id}
                      className={`border-t border-gray-100 dark:border-gray-800 ${
                        it.aplica ? '' : 'bg-slate-50 dark:bg-slate-900/40'
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-xs">{it.codigo}</td>
                      <td className="px-3 py-2">
                        {it.item}
                        {!it.aplica && (
                          <span className="ml-2 text-xs text-slate-500">{t('sgsst.ui.evaluation.table.autoNotApplicable')}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">{formatearValorPct(it.valor)}</td>
                      <td className="px-3 py-2">
                        {est === ESTADOS_ITEM.CUMPLE
                          ? t('sgsst.ui.status.compliant')
                          : est === ESTADOS_ITEM.NO_CUMPLE
                            ? t('sgsst.ui.status.nonCompliant')
                            : est === ESTADOS_ITEM.NO_APLICA
                              ? t('sgsst.ui.status.notApplicable')
                              : t('sgsst.ui.evaluation.table.pending')}
                      </td>
                      <td className="px-3 py-2 font-semibold">{formatearValorPct(pts)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 border-t border-gray-100 px-4 py-3 text-sm dark:border-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {t('sgsst.ui.evaluation.table.actionByLevel')}
            </p>
            {progreso.nivel === 'CRITICO' && (
              <p>{t('sgsst.ui.evaluation.table.criticalAction')}</p>
            )}
            {progreso.nivel === 'MODERADO' && (
              <p>
                {t('sgsst.ui.evaluation.table.moderateAction')}
              </p>
            )}
            {progreso.nivel === 'ACEPTABLE' && (
              <p>
                {t('sgsst.ui.evaluation.table.acceptableAction')}
              </p>
            )}
            {hayPendientesExigibles && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                {t('sgsst.ui.evaluation.table.pendingNotice', { count: pendientesExigibles })}
              </p>
            )}
          </div>
        </div>
      ) : esGraficos ? (
        <div className="mb-6 space-y-4">
          {(() => {
            const colorNivel =
              progreso.nivel === 'ACEPTABLE'
                ? '#059669'
                : progreso.nivel === 'MODERADO'
                  ? '#d97706'
                  : '#dc2626';
            const gaugeData = [
              { name: 'obtenido', value: Math.min(100, progreso.pct) },
              { name: 'resto', value: Math.max(0, 100 - progreso.pct) },
            ];
            const labelCiclo = (ciclo) =>
              String(ciclo || '')
                .replace(/^IV\.\s*/i, '')
                .replace(/^III\.\s*/i, '')
                .replace(/^II\.\s*/i, '')
                .replace(/^I\.\s*/i, '');
            const nivelOficial =
              progreso.nivel === 'ACEPTABLE'
                ? t('sgsst.ui.evaluation.levels.acceptableUpper')
                : progreso.nivel === 'MODERADO'
                  ? t('sgsst.ui.evaluation.levels.moderatelyAcceptableUpper')
                  : t('sgsst.ui.evaluation.levels.criticalUpper');

            return (
              <>
                {/* Dual: Cumplimiento oficial (35%) + Diligenciamiento silueta (65%) */}
                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)]">
                  {/* GRÁFICA 1 — Oficial 0312 */}
                  <section className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-600 dark:text-red-400">
                      Resolución 0312
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                      {t('sgsst.ui.evaluation.charts.officialCompliance')}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      {t('sgsst.ui.evaluation.charts.officialResult')}
                    </p>

                    <div className="relative mx-auto mt-4 h-48 w-full max-w-[220px] sm:h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={gaugeData}
                            dataKey="value"
                            startAngle={210}
                            endAngle={-30}
                            innerRadius="70%"
                            outerRadius="96%"
                            stroke="none"
                            paddingAngle={0}
                            isAnimationActive
                            animationDuration={900}
                          >
                            <Cell fill={colorNivel} />
                            <Cell fill="#e5e7eb" />
                          </Pie>
                          <Tooltip
                            formatter={(v, n) => [
                              `${v}%`,
                              n === 'obtenido'
                                ? t('sgsst.ui.evaluation.charts.obtained')
                                : t('sgsst.ui.evaluation.charts.remaining'),
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-3">
                        <span className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white sm:text-4xl">
                          {formatearValorPct(progreso.pct)}
                        </span>
                        <span
                          className="mt-0.5 text-[11px] font-bold tracking-wide"
                          style={{ color: colorNivel }}
                        >
                          {nivelOficial}
                        </span>
                        <span className="mt-0.5 text-[10px] text-gray-400">
                          {progreso.obtenido} / {progreso.posible}
                        </span>
                      </div>
                    </div>

                    <dl className="mt-auto space-y-2 border-t border-gray-100 pt-4 text-xs dark:border-gray-800">
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-500">{t('sgsst.ui.evaluation.charts.companyEvaluated')}</dt>
                        <dd className="max-w-[60%] truncate text-right font-medium text-gray-900 dark:text-white">
                          {caso.empresa?.nombre || '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-500">{t('sgsst.ui.riskClass')}</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">
                          {caso.empresa?.claseRiesgo || '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-500">{t('sgsst.ui.numEmployees')}</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">
                          {caso.empresa?.numTrabajadores ?? '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-500">{t('sgsst.ui.evaluation.charts.applicableStandards')}</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">{exigibles}</dd>
                      </div>
                    </dl>
                  </section>

                  {/* GRÁFICA 2 — Diligenciamiento (silueta) */}
                  <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm dark:border-sky-900/40 dark:bg-gray-900 sm:p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600 dark:text-sky-400">
                      {t('sgsst.ui.evaluation.charts.formProgress')}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                      {t('sgsst.ui.evaluation.charts.completionProgress')}
                    </h2>
                    <p className="mt-1 max-w-xl text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      {t('sgsst.ui.evaluation.charts.silhouetteDescription')}
                    </p>
                    <div className="mt-4">
                      <SiluetaCumplimientoSgSst
                        porcentaje={pctDiligenciamiento}
                        respondidos={respondidosExigibles}
                        aplicables={exigibles}
                        pendientes={pendientesExigibles}
                      />
                    </div>
                  </section>
                </div>

                {/* Indicadores */}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    {
                      label: t('sgsst.ui.evaluation.summary.totalStandards'),
                      value: totalEstandares,
                      hint: t('sgsst.ui.evaluation.summary.article27Form'),
                    },
                    {
                      label: t('sgsst.ui.evaluation.summary.notApplicable'),
                      value: noAplicaPerfil,
                      hint: t('sgsst.ui.evaluation.summary.bySizeRisk'),
                    },
                    {
                      label: t('sgsst.ui.evaluation.charts.indicators.applicable'),
                      value: exigibles,
                      hint: t('sgsst.ui.evaluation.charts.indicators.requiredForCompany'),
                    },
                    {
                      label: t('sgsst.ui.evaluation.summary.answered'),
                      value: respondidosExigibles,
                      hint: t('sgsst.ui.evaluation.charts.indicators.compliantOrNonCompliant'),
                    },
                    {
                      label: t('sgsst.ui.evaluation.summary.pending'),
                      value: pendientesExigibles,
                      hint: t('sgsst.ui.evaluation.charts.indicators.notCompleted'),
                    },
                  ].map((k) => (
                    <div
                      key={k.label}
                      className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 dark:border-gray-700 dark:bg-gray-900"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        {k.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                        {k.value}
                      </p>
                      <p className="text-[11px] text-gray-500">{k.hint}</p>
                    </div>
                  ))}
                </div>

                {/* Texto explicativo */}
                <div className="flex gap-3 rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-4 dark:border-sky-900/50 dark:bg-sky-950/30 sm:px-5">
                  <FaInfoCircle
                    className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400"
                    aria-hidden
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-sky-950 dark:text-sky-100">
                      {t('sgsst.ui.evaluation.charts.interpretTitle')}
                    </h3>
                    <div className="mt-2 space-y-2 text-xs leading-relaxed text-sky-900/90 dark:text-sky-100/90 sm:text-sm">
                      <p>
                        {t('sgsst.ui.evaluation.charts.interpretOfficial')}
                      </p>
                      <p>
                        {t('sgsst.ui.evaluation.charts.interpretProgress')}
                      </p>
                      <p>
                        {t('sgsst.ui.evaluation.charts.interpretConclusion')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Desglose oficial secundario (misma lógica 0312, solo visualización) */}
                <div className="grid gap-4 lg:grid-cols-5">
                  <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 lg:col-span-2">
                    <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                      {t('sgsst.ui.evaluation.charts.officialCycle')}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      {resumenGrupos.porCiclo.map((c) => (
                        <div
                          key={c.ciclo}
                          className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 dark:border-gray-800 dark:bg-gray-950/40"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {labelCiclo(c.ciclo)}
                            </p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                              {c.pct}%
                            </p>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${Math.min(100, c.pct)}%`,
                                backgroundColor: colorNivel,
                              }}
                            />
                          </div>
                          <p className="mt-1.5 text-[11px] text-gray-400">
                            {c.obtenido}/{c.posible} pts · peso {c.peso}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 lg:col-span-3 sm:p-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {t('sgsst.ui.evaluation.charts.standardPerformance')}
                    </h3>
                    <p className="mb-3 text-xs text-gray-500">
                      {t('sgsst.ui.evaluation.charts.standardPerformanceDescription')}
                    </p>
                    <div className="space-y-3">
                      {resumenGrupos.porGrupo.map((g) => (
                        <div key={g.id}>
                          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                {g.nombreCorto}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {g.ciclo} · peso {g.peso}% · {g.obtenido}/{g.posible}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {g.pct}%
                            </span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${Math.min(100, g.pct)}%`,
                                backgroundColor:
                                  g.pct > 85 ? '#059669' : g.pct >= 60 ? '#d97706' : '#dc2626',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      ) : esCriterios ? (
        <div className="mb-6 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('sgsst.ui.evaluation.criteria.title')}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {t('sgsst.ui.evaluation.criteria.description')}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-950/40">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {t('sgsst.ui.evaluation.criteria.officialCompliance')}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                  {formatearValorPct(progreso.pct)}
                </p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{nivelLabel}</p>
                <p className="mt-1 text-[11px] text-gray-500">
                  {t('sgsst.ui.evaluation.criteria.automaticNotApplicable', {
                    obtained: progreso.obtenido,
                    possible: progreso.posible,
                  })}
                </p>
              </div>
              <div className="rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3 dark:border-sky-900/40 dark:bg-sky-950/30">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                  Avance de diligenciamiento
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-sky-800 dark:text-sky-200">
                  {pctDiligenciamiento}%
                </p>
                <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">
                  {respondidosExigibles} de {exigibles} estándares
                </p>
                <p className="mt-1 text-[11px] text-sky-700/80 dark:text-sky-300/80">
                  {t('sgsst.ui.evaluation.criteria.completionOnlyRequired')}
                </p>
              </div>
            </div>

            {hayPendientesExigibles && (
              <div className="mt-3 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-900/60 dark:bg-amber-950/30">
                <FaInfoCircle
                  className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
                  aria-hidden
                />
                <p className="text-xs leading-relaxed text-amber-950 dark:text-amber-100">
                  {t('sgsst.ui.evaluation.criteria.pendingDescription', {
                    pending: pendientesExigibles,
                    level: nivelLabel,
                    notApplicable: noAplicaPerfil,
                  })}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {t('sgsst.ui.evaluation.criteria.levels')}
            </p>
            <div className="space-y-3">
              {CRITERIOS_EVALUACION.map((c) => {
                const activo = progreso.nivel === c.nivel;
                return (
                  <div
                    key={c.nivel}
                    className={`rounded-xl border px-4 py-3 ${
                      activo
                        ? 'border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/40'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {c.titulo}
                        {activo ? t('sgsst.ui.evaluation.criteria.activeLevel') : ''}
                      </p>
                      <p className="text-sm text-gray-500">{c.rango}</p>
                    </div>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{c.accion}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-4 dark:border-sky-900/50 dark:bg-sky-950/30 sm:px-5">
            <FaInfoCircle
              className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400"
              aria-hidden
            />
            <div className="text-xs leading-relaxed text-sky-900 dark:text-sky-100 sm:text-sm">
              <p className="font-semibold">{t('sgsst.ui.evaluation.criteria.interpretTitle')}</p>
              <p className="mt-1.5">
                {t('sgsst.ui.evaluation.criteria.interpretDescription')}
              </p>
              <p className="mt-1.5">
                {t('sgsst.ui.evaluation.criteria.interpretCompletion', {
                  done: respondidosExigibles,
                  total: exigibles,
                })}
              </p>
            </div>
          </div>
        </div>
      ) : (
      <div className="mb-4 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="border-b border-sky-200 bg-sky-100 px-3 py-2 dark:border-sky-900 dark:bg-sky-950/50">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-900 dark:text-sky-200">
            {t('sgsst.ui.evaluation.detail.minimumStandards')}
          </p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {paginaActual.ciclo} · {paginaActual.titulo}
          </p>
          <p className="text-[11px] text-gray-600 dark:text-gray-300">
            {t('sgsst.ui.evaluation.detail.instruction')}
          </p>
        </div>

        <div className="max-h-none space-y-2 overflow-visible p-3 sm:p-4">
          {itemsPagina.map((it) => {
            const resp = respuestas[it.id] || {};
            const archivos = archivosMap[it.id] || [];
            const bloqueado = !it.aplica;
            const cal = calificacionDeItem(it.valor, resp.estado);
            const valorLabel = formatearValorPct(it.valor);
            const expandido = itemExpandidoId === it.id;

            const btnEstado = (estado, label, activoColor) => {
              const activo = resp.estado === estado;
              return (
                <button
                  type="button"
                  disabled={bloqueado && estado !== ESTADOS_ITEM.NO_APLICA}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (bloqueado) return;
                    actualizarItem(it.id, { estado }, true);
                  }}
                  className={`min-w-[4.5rem] rounded-md border px-2 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    activo
                      ? activoColor
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                >
                  {label}
                </button>
              );
            };

            return (
              <article
                key={it.id}
                className={`rounded-xl border ${
                  bloqueado
                    ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                }`}
              >
                <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => setItemExpandidoId(expandido ? null : it.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="shrink-0 font-mono text-xs font-bold text-red-700 dark:text-red-300">
                      {it.codigo}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">
                      {it.item}
                    </span>
                    {bloqueado && (
                      <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                        {t('sgsst.ui.evaluation.detail.autoNotApplicable')}
                      </span>
                    )}
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 hidden text-[10px] uppercase text-gray-400 sm:inline">
                      {t('sgsst.ui.evaluation.detail.compliant')}
                    </span>
                    {btnEstado(
                      ESTADOS_ITEM.CUMPLE,
                      valorLabel,
                      'border-emerald-600 bg-emerald-600 text-white'
                    )}
                    {btnEstado(
                      ESTADOS_ITEM.NO_CUMPLE,
                      '0,0%',
                      'border-red-600 bg-red-600 text-white'
                    )}
                    {btnEstado(
                      ESTADOS_ITEM.NO_APLICA,
                      valorLabel,
                      'border-slate-500 bg-slate-500 text-white'
                    )}
                    <span className="ml-1 rounded-md bg-sky-50 px-2 py-1 text-sm font-bold text-sky-900 dark:bg-sky-950/50 dark:text-sky-100">
                      {formatearValorPct(cal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setItemExpandidoId(expandido ? null : it.id)}
                      className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-600 dark:border-gray-600 dark:text-gray-300"
                    >
                      {expandido
                        ? t('sgsst.ui.evaluation.detail.close')
                        : t('sgsst.ui.evaluation.detail.details')}
                    </button>
                  </div>
                </div>

                {expandido && (
                  <div className="space-y-3 border-t border-gray-100 px-3 py-3 dark:border-gray-800">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase text-gray-500">
                          {t('sgsst.ui.evaluation.detail.criteria')}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-200">{it.criterio}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase text-gray-500">
                          {t('sgsst.ui.evaluation.detail.verificationMethod')}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-200">
                          {it.modoVerificacion}
                        </p>
                      </div>
                    </div>

                    {bloqueado ? (
                      <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {t('sgsst.ui.evaluation.detail.autoNotApplicableNotice', {
                          value: valorLabel,
                        })}
                      </p>
                    ) : (
                      <>
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="block text-sm">
                            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
                              {t('sgsst.ui.item.evidenceLabel')}
                            </span>
                            <textarea
                              rows={3}
                              value={resp.evidencias || ''}
                              onChange={(e) =>
                                actualizarItem(it.id, { evidencias: e.target.value }, true)
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            />
                          </label>
                          <label className="block text-sm">
                            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
                              {t('sgsst.ui.item.actionPlanLabel')}
                            </span>
                            <textarea
                              rows={3}
                              value={resp.planAccion || ''}
                              onChange={(e) =>
                                actualizarItem(it.id, { planAccion: e.target.value }, true)
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            />
                          </label>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <label className="block text-sm">
                            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
                              {t('sgsst.ui.evaluation.detail.responsible')}
                            </span>
                            <input
                              value={resp.responsable || ''}
                              onChange={(e) =>
                                actualizarItem(it.id, { responsable: e.target.value }, true)
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            />
                          </label>
                          <label className="block text-sm">
                            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
                              {t('sgsst.ui.evaluation.detail.dueDate')}
                            </span>
                            <input
                              type="date"
                              value={resp.fechaPlazo || ''}
                              onChange={(e) =>
                                actualizarItem(it.id, { fechaPlazo: e.target.value }, true)
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            />
                          </label>
                          <label className="block text-sm">
                            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
                              {t('sgsst.ui.evaluation.detail.resources')}
                            </span>
                            <input
                              value={resp.recursos || ''}
                              onChange={(e) =>
                                actualizarItem(it.id, { recursos: e.target.value }, true)
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            />
                          </label>
                          <label className="block text-sm">
                            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
                              {t('sgsst.ui.evaluation.detail.foundations')}
                            </span>
                            <input
                              value={resp.fundamentos || ''}
                              onChange={(e) =>
                                actualizarItem(it.id, { fundamentos: e.target.value }, true)
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            />
                          </label>
                        </div>

                        <div className="rounded-lg border border-dashed border-red-200 bg-red-50/50 p-3 dark:border-red-900 dark:bg-red-950/20">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-2 text-sm font-medium text-red-800 dark:text-red-200">
                              <FaCloudUploadAlt /> {t('sgsst.ui.evaluation.detail.documents')}
                            </span>
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                              {subiendoItemId === it.id ? (
                                <FaSpinner className="animate-spin" />
                              ) : (
                                <FaPlus />
                              )}
                              {t('sgsst.ui.evaluation.detail.attach')}
                              <input
                                type="file"
                                className="hidden"
                                disabled={subiendoItemId === it.id}
                                onChange={(e) => {
                                  onUpload(it.id, e.target.files);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                          {archivos.length === 0 ? (
                            <p className="text-xs text-gray-500">{t('sgsst.ui.noFilesYet')}</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {archivos.map((a) => (
                                  <li
                                    key={a._id}
                                    className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1.5 text-sm dark:bg-gray-900"
                                  >
                                    <span className="truncate text-gray-800 dark:text-gray-100">
                                      {a.nombreOriginal}
                                    </span>
                                    <span className="flex shrink-0 items-center gap-2">
                                      {a.ruta && (
                                        <BotonDescargaStorage
                                          ruta={a.ruta}
                                          nombre={a.nombreOriginal}
                                          className="text-xs text-red-600 hover:underline bg-transparent border-0 p-0 inline-flex items-center gap-1"
                                          title={t('sgsst.ui.view')}
                                        >
                                          {t('sgsst.ui.view')}
                                        </BotonDescargaStorage>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => onEliminarArchivo(a._id)}
                                        className="text-gray-400 hover:text-red-600"
                                      >
                                        <FaTrash />
                                      </button>
                                    </span>
                                  </li>
                                ))}
                            </ul>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
      )}
      </div>
    </div>
  );
}
