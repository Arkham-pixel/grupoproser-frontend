import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaFileAlt,
  FaPaperclip,
  FaTasks,
} from 'react-icons/fa';
import {
  actualizarSubtarea,
  obtenerMisSubtareas,
  obtenerSubtareaPorId,
  subirArchivoSubtarea,
} from '../../services/complexSubtareasService.js';
import { getCasoComplex } from '../../services/complexService.js';
import { navegarAjusteDesdeCasoComplex } from '../../utils/navegarAjusteDesdeCasoComplex.js';
import {
  complexBtnFormAction,
  complexBtnFormActionSaveHover,
  complexCard,
  complexHint,
  complexLabel,
  complexPageSubtitle,
  complexPageTitle,
  complexSelect,
  complexTextarea,
} from './complexFenixUi.js';
import {
  ESTADO_LABELS,
  SEMAFORO_STYLES,
  formatearDuracionSubtarea,
  formatearFechaHoraSubtarea,
  formatearFechaSubtarea,
  urlArchivoSubtarea,
} from './subtareasComplexUtils.js';

function SemaforoCards({ conteo }) {
  const c = conteo || { verde: 0, amarillo: 0, rojo: 0, gris: 0 };
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {['verde', 'amarillo', 'rojo', 'gris'].map((key) => {
        const estilo = SEMAFORO_STYLES[key];
        return (
          <div key={key} className={`rounded-xl border px-3 py-3 ${estilo.badge}`}>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${estilo.dot}`} />
              <span className="font-body text-[10px] font-semibold uppercase tracking-wide">
                {estilo.label}
              </span>
            </div>
            <p className="mt-1 font-heading text-2xl font-bold">{c[key] || 0}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function MisSubtareasComplex() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ total: 0, conteo: {}, subtareas: [], completadas: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [trabajo, setTrabajo] = useState(null); // { subtarea, caso }
  const [cargandoTrabajo, setCargandoTrabajo] = useState(false);
  const [obs, setObs] = useState('');
  const [tipoArchivo, setTipoArchivo] = useState('documento');
  const [guardando, setGuardando] = useState(false);
  const [bandeja, setBandeja] = useState('pendientes'); // pendientes | completadas

  const abrirId = searchParams.get('abrir');

  const cargarLista = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await obtenerMisSubtareas();
      const pendientes = Array.isArray(res?.subtareas) ? res.subtareas : [];
      const completadas = Array.isArray(res?.completadas) ? res.completadas : [];
      setData({
        ...res,
        subtareas: pendientes,
        completadas,
        total: res?.total ?? pendientes.length,
        conteo: res?.conteo || {},
      });
      // Si no hay abiertas pero sí cerradas, mostrar Completadas (no parecer que “desapareció”)
      if (pendientes.length === 0 && completadas.length > 0) {
        setBandeja((prev) => (prev === 'pendientes' ? 'completadas' : prev));
      }
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las subtareas');
    } finally {
      setLoading(false);
    }
  }, []);

  const abrirSubtarea = useCallback(
    async (id, desdeLista = null) => {
      if (!id) return;
      setCargandoTrabajo(true);
      setError('');
      setAviso('');
      setSearchParams({ abrir: String(id) }, { replace: true });

      let subtareaActual = desdeLista || null;

      // 1) Abrir de inmediato con datos de la bandeja (no depende de GET /:id)
      if (desdeLista) {
        setTrabajo({
          subtarea: desdeLista,
          caso: {
            _id: desdeLista.casoId,
            nmroAjste: desdeLista.nmroAjste,
          },
        });
        setObs(desdeLista.observacionesAsignado || '');
      }

      // 2) Enriquecer si el backend ya expone GET /:id
      try {
        const res = await obtenerSubtareaPorId(id);
        setTrabajo(res);
        setObs(res.subtarea?.observacionesAsignado || '');
        subtareaActual = res.subtarea || subtareaActual;
      } catch {
        if (!desdeLista) {
          const local = [...(data.subtareas || []), ...(data.completadas || [])].find(
            (s) => String(s._id) === String(id)
          );
          if (local) {
            setTrabajo({
              subtarea: local,
              caso: { _id: local.casoId, nmroAjste: local.nmroAjste },
            });
            setObs(local.observacionesAsignado || '');
            subtareaActual = local;
          } else {
            setError('No se pudo abrir la subtarea. Recargue la lista e intente de nuevo.');
            setTrabajo(null);
          }
        }
      }

      const cerrada =
        subtareaActual?.estado === 'completada' || subtareaActual?.estado === 'cancelada';
      if (!cerrada) {
        try {
          const act = await actualizarSubtarea(id, { marcarLeida: true });
          if (act?._id || act?.estado) {
            setTrabajo((prev) =>
              prev ? { ...prev, subtarea: { ...(prev.subtarea || {}), ...act } } : prev
            );
          }
        } catch {
          /* ignore */
        }
      }
      setCargandoTrabajo(false);
    },
    [setSearchParams, data.subtareas, data.completadas]
  );

  useEffect(() => {
    cargarLista();
  }, [cargarLista]);

  useEffect(() => {
    if (!abrirId || trabajo?.subtarea || loading) return;
    const local = [...(data.subtareas || []), ...(data.completadas || [])].find(
      (s) => String(s._id) === String(abrirId)
    );
    if (local) {
      if (local.estado === 'completada' || local.estado === 'cancelada') {
        setBandeja('completadas');
      }
      abrirSubtarea(abrirId, local);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- abrir desde query (?abrir=) al cargar bandeja
  }, [abrirId, data.subtareas, data.completadas, loading]);

  const volverLista = () => {
    setTrabajo(null);
    setSearchParams({}, { replace: true });
    cargarLista();
  };

  const conteo = useMemo(() => {
    if (data.conteo) return data.conteo;
    const c = { verde: 0, amarillo: 0, rojo: 0, gris: 0, total: 0 };
    for (const s of data.subtareas || []) {
      c.total += 1;
      if (c[s.semaforo] !== undefined) c[s.semaforo] += 1;
    }
    return c;
  }, [data]);

  const guardarAvance = async (completar = false) => {
    if (!trabajo?.subtarea?._id) return;
    setGuardando(true);
    setError('');
    try {
      const payload = {
        observacionesAsignado: obs,
        estado: completar ? 'completada' : 'en_progreso',
      };
      const actualizada = await actualizarSubtarea(trabajo.subtarea._id, payload);
      setTrabajo((prev) => ({ ...prev, subtarea: actualizada }));
      if (completar) {
        setAviso(
          'Subtarea completada. Queda registrada en Completadas con el tiempo de ejecución.'
        );
        setBandeja('completadas');
        // Actualización optimista: que no “desaparezca” aunque /mias tarde o falle
        setData((prev) => {
          const id = String(actualizada._id || trabajo.subtarea._id);
          const restoPend = (prev.subtareas || []).filter((s) => String(s._id) !== id);
          const restoComp = (prev.completadas || []).filter((s) => String(s._id) !== id);
          return {
            ...prev,
            subtareas: restoPend,
            completadas: [actualizada, ...restoComp],
            total: restoPend.length,
            totalCompletadas: restoComp.length + 1,
          };
        });
        await cargarLista();
      } else {
        setAviso('Avance guardado.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const onSubir = async (file) => {
    if (!file || !trabajo?.subtarea?._id) return;
    setGuardando(true);
    setError('');
    try {
      const res = await subirArchivoSubtarea(trabajo.subtarea._id, file, { tipoArchivo });
      setTrabajo((prev) => ({ ...prev, subtarea: res.subtarea }));
      setAviso(
        tipoArchivo === 'formato'
          ? 'Formato cargado y guardado en el caso'
          : 'Documento cargado y guardado en el caso'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const irAFormularioAjuste = async () => {
    const s = trabajo?.subtarea;
    if (!s) return;
    setGuardando(true);
    setError('');
    try {
      let caso = trabajo.caso || {};
      const casoId = caso._id || s.casoId;
      if (casoId) {
        try {
          const full = await getCasoComplex(casoId);
          if (full) caso = full;
        } catch {
          /* usar datos parciales */
        }
      }
      await navegarAjusteDesdeCasoComplex(
        navigate,
        {
          ...caso,
          _id: caso._id || casoId,
          nmroAjste: caso.nmroAjste || s.nmroAjste,
        },
        {
          returnPath: `/complex/mis-subtareas?abrir=${s._id}`,
          origen: 'subtarea-formato',
        }
      );
    } catch (err) {
      setError(err.message || 'No se pudo abrir el formulario de ajuste');
    } finally {
      setGuardando(false);
    }
  };

  if (cargandoTrabajo) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6">
        <p className="text-sm text-gray-500">Abriendo subtarea…</p>
      </div>
    );
  }

  // Vista de trabajo directo en la subtarea asignada
  if (trabajo?.subtarea) {
    const s = trabajo.subtarea;
    const caso = trabajo.caso || {};
    const estilo = SEMAFORO_STYLES[s.semaforo] || SEMAFORO_STYLES.amarillo;
    const docs = (s.archivos || []).filter((a) => (a.tipoArchivo || 'documento') !== 'formato');
    const formatos = (s.archivos || []).filter((a) => a.tipoArchivo === 'formato');
    const cerrada = s.estado === 'completada' || s.estado === 'cancelada';

    return (
      <div className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-6">
        <button type="button" className={complexBtnFormAction} onClick={volverLista}>
          <FaArrowLeft className="mr-1.5" /> Volver a mis subtareas
        </button>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${estilo.dot}`} />
            <h1 className={complexPageTitle}>{s.titulo}</h1>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${estilo.badge}`}>
              {ESTADO_LABELS[s.estado] || s.estado}
            </span>
          </div>
          <p className={complexPageSubtitle}>
            Caso {caso.nmroAjste || s.nmroAjste || '—'}
            {caso.asgrBenfcro ? ` · ${caso.asgrBenfcro}` : ''}
            {' · '}Límite {formatearFechaSubtarea(s.fechaLimite)}
            {' · '}Asignó {s.creadoPorNombre || s.creadoPorLogin || '—'}
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {aviso && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {aviso}
          </p>
        )}

        <div className={`${complexCard} space-y-2`}>
          <p className="font-body text-xs font-semibold uppercase tracking-wide text-gray-500">
            Control de tiempo
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <p className="font-body text-sm text-gray-700 dark:text-gray-300">
              <strong>Asignada:</strong> {formatearFechaHoraSubtarea(s.createdAt)}
            </p>
            <p className="font-body text-sm text-gray-700 dark:text-gray-300">
              <strong>Inicio trabajo:</strong>{' '}
              {formatearFechaHoraSubtarea(s.fechaInicioTrabajo)}
            </p>
            <p className="font-body text-sm text-gray-700 dark:text-gray-300">
              <strong>Completada:</strong>{' '}
              {s.fechaCompletada ? formatearFechaHoraSubtarea(s.fechaCompletada) : '—'}
            </p>
            <p className="font-body text-sm text-gray-700 dark:text-gray-300">
              <strong>
                {cerrada ? 'Tiempo empleado' : 'Tiempo en curso'}:
              </strong>{' '}
              {formatearDuracionSubtarea(s) ||
                s.duracionAsignacionTexto ||
                '—'}
              {s.duracionAsignacionTexto &&
              formatearDuracionSubtarea(s) &&
              s.duracionAsignacionTexto !== formatearDuracionSubtarea(s)
                ? ` (ciclo total ${s.duracionAsignacionTexto})`
                : ''}
            </p>
          </div>
        </div>

        {s.motivoReapertura && !cerrada && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
              Subtarea reabierta{s.motivoReaperturaPor ? ` por ${s.motivoReaperturaPor}` : ''} — motivo
            </p>
            <p className="mt-1 whitespace-pre-wrap font-body text-sm text-amber-900 dark:text-amber-200">
              {s.motivoReapertura}
            </p>
          </div>
        )}

        <div className={complexCard + ' space-y-3'}>
          {s.etapaTrazabilidad && (
            <p className="font-body text-sm text-gray-600 dark:text-gray-300">
              <strong>Etapa:</strong> {s.etapaTrazabilidad}
            </p>
          )}
          {s.descripcion && (
            <p className="font-body text-sm text-gray-700 dark:text-gray-300">
              <strong>Descripción:</strong> {s.descripcion}
            </p>
          )}
          {s.instrucciones && (
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
              <p className="font-body text-xs font-semibold uppercase tracking-wide text-gray-500">
                Qué debe diligenciar
              </p>
              <p className="mt-1 whitespace-pre-wrap font-body text-sm text-gray-800 dark:text-gray-200">
                {s.instrucciones}
              </p>
            </div>
          )}
        </div>

        {!cerrada ? (
          <div className={`${complexCard} space-y-4`}>
            <div>
              <label className={complexLabel}>Su reporte / observaciones</label>
              <textarea
                className={complexTextarea}
                rows={4}
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Describa lo realizado, hallazgos, adjuntos…"
              />
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className={complexLabel}>Tipo de archivo</label>
                <select
                  className={complexSelect}
                  value={tipoArchivo}
                  onChange={(e) => setTipoArchivo(e.target.value)}
                >
                  <option value="documento">Documento</option>
                  <option value="formato">Formato (ajuste)</option>
                </select>
              </div>
              {tipoArchivo === 'formato' ? (
                <button
                  type="button"
                  disabled={guardando}
                  className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
                  onClick={irAFormularioAjuste}
                  title="Abre el formulario de ajuste igual que el botón Ajuste del reporte"
                >
                  Ir a formulario de ajuste
                </button>
              ) : (
                <label className="cursor-pointer">
                  <span className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}>
                    Subir archivo
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    disabled={guardando}
                    onChange={(e) => {
                      onSubir(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
            {tipoArchivo === 'formato' && (
              <p className={complexHint}>
                Los formatos se elaboran en el formulario de ajuste (acta / inspección), igual
                que desde el reporte Complex.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500">
                  <FaPaperclip /> Documentos
                </p>
                {docs.length === 0 ? (
                  <p className={complexHint}>Sin documentos aún.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {docs.map((a, i) => (
                      <li key={a._id || i}>
                        {urlArchivoSubtarea(a) ? (
                          <a href={urlArchivoSubtarea(a)} target="_blank" rel="noreferrer" className="font-semibold text-fenix-primario hover:underline">
                            {a.nombre}
                          </a>
                        ) : (
                          a.nombre
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500">
                  <FaFileAlt /> Formatos
                </p>
                {formatos.length === 0 ? (
                  <p className={complexHint}>Sin formatos aún.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {formatos.map((a, i) => (
                      <li key={a._id || i}>
                        {urlArchivoSubtarea(a) ? (
                          <a href={urlArchivoSubtarea(a)} target="_blank" rel="noreferrer" className="font-semibold text-fenix-primario hover:underline">
                            {a.nombre}
                          </a>
                        ) : (
                          a.nombre
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={guardando}
                className={complexBtnFormAction}
                onClick={() => guardarAvance(false)}
              >
                Guardar avance
              </button>
              <button
                type="button"
                disabled={guardando}
                className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
                onClick={() => guardarAvance(true)}
              >
                <FaCheckCircle className="mr-1.5 text-emerald-600" />
                Marcar completada
              </button>
            </div>
          </div>
        ) : (
          <div className={`${complexCard} space-y-2`}>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Estado: <strong>{ESTADO_LABELS[s.estado] || s.estado}</strong>. Queda
              registrada para evidencia, seguimiento y control de horas.
            </p>
            {(formatearDuracionSubtarea(s) || s.duracionAsignacionTexto) && (
              <p className="text-sm text-gray-700 dark:text-gray-200">
                Tiempo empleado: <strong>{formatearDuracionSubtarea(s) || '—'}</strong>
                {s.duracionAsignacionTexto
                  ? ` · Desde asignación: ${s.duracionAsignacionTexto}`
                  : ''}
              </p>
            )}
            {s.observacionesAsignado ? (
              <p className="text-sm text-gray-600">
                Observaciones: {s.observacionesAsignado}
              </p>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className={complexPageTitle}>
          <FaTasks className="mr-2 inline text-fenix-primario" />
          Mis subtareas Complex
        </h1>
        <p className={complexPageSubtitle}>
          Semáforo y bandeja de trabajo. Las completadas no se borran: cambian de
          estado y quedan en Completadas con el tiempo de ejecución.
        </p>
      </div>

      <SemaforoCards conteo={conteo} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={
            bandeja === 'pendientes'
              ? `${complexBtnFormAction} ${complexBtnFormActionSaveHover}`
              : complexBtnFormAction
          }
          onClick={() => setBandeja('pendientes')}
        >
          Pendientes ({(data.subtareas || []).length})
        </button>
        <button
          type="button"
          className={
            bandeja === 'completadas'
              ? `${complexBtnFormAction} ${complexBtnFormActionSaveHover}`
              : complexBtnFormAction
          }
          onClick={() => setBandeja('completadas')}
        >
          Completadas ({(data.completadas || []).length})
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : (
        (() => {
          const lista =
            bandeja === 'completadas' ? data.completadas || [] : data.subtareas || [];
          if (lista.length === 0) {
            return (
              <div className={complexCard}>
                <p className="text-sm text-gray-500">
                  {bandeja === 'completadas'
                    ? 'Aún no hay subtareas completadas registradas.'
                    : 'No tiene subtareas pendientes. Las que cierre pasan a Completadas (con tiempo de ejecución).'}
                </p>
              </div>
            );
          }
          return (
            <ul className="space-y-3">
              {lista.map((s) => {
                const estilo = SEMAFORO_STYLES[s.semaforo] || SEMAFORO_STYLES.amarillo;
                return (
                  <li key={s._id} className={complexCard}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`h-3 w-3 rounded-full ${estilo.dot}`} />
                          <span className="font-heading font-semibold text-gray-900 dark:text-white">
                            {s.titulo}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${estilo.badge}`}
                          >
                            {ESTADO_LABELS[s.estado]}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          Caso {s.nmroAjste || '—'} · Asignó{' '}
                          {s.creadoPorNombre || s.creadoPorLogin || '—'} · Límite{' '}
                          {formatearFechaSubtarea(s.fechaLimite)}
                          {(s.archivos || []).length > 0
                            ? ` · ${s.archivos.length} archivo(s)`
                            : ''}
                          {bandeja === 'completadas' &&
                          (formatearDuracionSubtarea(s) || s.duracionAsignacionTexto)
                            ? ` · Tiempo: ${formatearDuracionSubtarea(s) || s.duracionAsignacionTexto}`
                            : bandeja === 'pendientes' &&
                                (formatearDuracionSubtarea(s) || s.duracionAsignacionTexto)
                              ? ` · En curso: ${formatearDuracionSubtarea(s) || s.duracionAsignacionTexto}`
                              : ''}
                        </p>
                        {bandeja === 'completadas' && s.fechaCompletada && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            Cerrada {formatearFechaHoraSubtarea(s.fechaCompletada)}
                          </p>
                        )}
                        {bandeja === 'pendientes' && s.motivoReapertura && (
                          <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                            <strong>Reabierta:</strong> {s.motivoReapertura}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
                        onClick={() => abrirSubtarea(s._id, s)}
                      >
                        {bandeja === 'completadas' ? 'Ver registro' : 'Ir a subtarea'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          );
        })()
      )}
    </div>
  );
}
