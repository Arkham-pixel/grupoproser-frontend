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
import {
  estadoAjusteDesdeEtapaSubtarea,
  navegarAjusteDesdeCasoComplex,
} from '../../utils/navegarAjusteDesdeCasoComplex.js';
import {
  complexBtnFormAction,
  complexBtnFormActionSaveHover,
  complexCard,
  complexHint,
  complexInput,
  complexLabel,
  complexPageSubtitle,
  complexPageTitle,
  complexSelect,
  complexTextarea,
} from './complexFenixUi.js';
import FlujoVisitaCoordinacionPanel from './FlujoVisitaCoordinacionPanel.jsx';
import {
  ESTADO_LABELS,
  SEMAFORO_STYLES,
  camposProtocoloDeEtapa,
  esFlujoVisitaCoordinacion,
  faltanFechasProtocoloRequeridas,
  faltanFechasFlujoVisitaParaCerrar,
  formatearDuracionSubtarea,
  formatearFechaHoraSubtarea,
  formatearFechaSubtarea,
  inicializarFechasProtocoloDesdeSubtarea,
  subtareaEsSoloFecha,
  subtareaRequiereDocumento,
  subtareaRequiereFormato,
  subtareaTieneDocumento,
  subtareaTieneFechaProtocolo,
  subtareaTieneFormato,
  etiquetaAdjuntoEtapa,
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
  const [fechasProtocolo, setFechasProtocolo] = useState({});
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
        setFechasProtocolo(inicializarFechasProtocoloDesdeSubtarea(desdeLista));
      }

      // 2) Enriquecer si el backend ya expone GET /:id
      try {
        const res = await obtenerSubtareaPorId(id);
        setTrabajo(res);
        setObs(res.subtarea?.observacionesAsignado || '');
        setFechasProtocolo(inicializarFechasProtocoloDesdeSubtarea(res.subtarea));
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
            setFechasProtocolo(inicializarFechasProtocoloDesdeSubtarea(local));
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

  // Etapas de informe: preseleccionar tipo "formato" al abrir la subtarea
  useEffect(() => {
    if (trabajo?.subtarea && subtareaRequiereFormato(trabajo.subtarea)) {
      setTipoArchivo('formato');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trabajo?.subtarea?._id]);

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
    if (
      completar &&
      subtareaRequiereFormato(trabajo.subtarea) &&
      !subtareaTieneFormato(trabajo.subtarea)
    ) {
      setError(
        'Esta etapa exige adjuntar el formato (informe) antes de completarla. Genérelo desde "Ir a formulario de ajuste" o súbalo como tipo "Formato".'
      );
      return;
    }
    if (
      completar &&
      subtareaRequiereDocumento(trabajo.subtarea) &&
      !subtareaTieneDocumento(trabajo.subtarea)
    ) {
      setError(
        `Adjunte el documento de la etapa (${etiquetaAdjuntoEtapa(trabajo.subtarea.etapaTrazabilidad)}) antes de completar. Se enviará a la trazabilidad del caso.`
      );
      return;
    }
    if (
      completar &&
      subtareaTieneFechaProtocolo(trabajo.subtarea.etapaTrazabilidad)
    ) {
      const faltantes = esFlujoVisitaCoordinacion(trabajo.subtarea)
        ? faltanFechasFlujoVisitaParaCerrar(fechasProtocolo)
        : faltanFechasProtocoloRequeridas(
            trabajo.subtarea.etapaTrazabilidad,
            fechasProtocolo
          );
      if (faltantes.length) {
        setError(
          `Indique las fechas de la etapa (como en trazabilidad): ${faltantes.join(', ')}.`
        );
        return;
      }
    }
    if (
      completar &&
      esFlujoVisitaCoordinacion(trabajo.subtarea) &&
      !(trabajo.subtarea.archivos || []).length
    ) {
      setError(
        'Antes de cerrar suba el acta y/o las fotos y datos de la visita.'
      );
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const payload = {
        observacionesAsignado: obs,
        estado: completar ? 'completada' : 'en_progreso',
        fechasProtocolo,
      };
      if (esFlujoVisitaCoordinacion(trabajo.subtarea) && completar) {
        payload.flujoVisitaFase =
          trabajo.subtarea.flujoVisitaFase || 'decidir';
      }
      const primerCampo = camposProtocoloDeEtapa(trabajo.subtarea.etapaTrazabilidad)[0];
      if (primerCampo?.campo && fechasProtocolo[primerCampo.campo]) {
        payload.fechaProtocolo = fechasProtocolo[primerCampo.campo];
      }
      const actualizada = await actualizarSubtarea(trabajo.subtarea._id, payload);
      setTrabajo((prev) => ({ ...prev, subtarea: actualizada }));
      setFechasProtocolo(inicializarFechasProtocoloDesdeSubtarea(actualizada));
      if (completar) {
        setAviso(
          'Subtarea completada. Las fechas quedaron en la trazabilidad del caso y el tiempo de ejecución quedó registrado.'
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
        const hayFechas = Object.values(fechasProtocolo || {}).some(Boolean);
        setAviso(
          hayFechas
            ? 'Avance guardado. Las fechas se sincronizaron con la trazabilidad del caso.'
            : 'Avance guardado.'
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const onSubir = async (file, tipoForzado) => {
    if (!file || !trabajo?.subtarea?._id) return;
    setGuardando(true);
    setError('');
    try {
      const tipo = tipoForzado || tipoArchivo;
      const res = await subirArchivoSubtarea(trabajo.subtarea._id, file, {
        tipoArchivo: tipo,
      });
      setTrabajo((prev) => ({ ...prev, subtarea: res.subtarea }));
      setAviso(
        tipo === 'formato'
          ? 'Formato cargado y guardado en el caso'
          : 'Documento cargado y guardado en el caso'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const irAFormularioAjuste = async (estadoInicialForzado) => {
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
          estadoInicial:
            estadoInicialForzado ||
            estadoAjusteDesdeEtapaSubtarea(s.etapaTrazabilidad),
        }
      );
    } catch (err) {
      setError(err.message || 'No se pudo abrir el formulario de ajuste');
    } finally {
      setGuardando(false);
    }
  };

  const avanzarFaseFlujo = async (faseNueva, erroresValidacion) => {
    if (erroresValidacion?.length) {
      setError(erroresValidacion.join('. '));
      return;
    }
    if (!faseNueva || !trabajo?.subtarea?._id) return;
    setGuardando(true);
    setError('');
    try {
      const actualizada = await actualizarSubtarea(trabajo.subtarea._id, {
        observacionesAsignado: obs,
        fechasProtocolo,
        flujoVisitaFase: faseNueva,
        estado: 'en_progreso',
      });
      setTrabajo((prev) => ({ ...prev, subtarea: actualizada }));
      setFechasProtocolo(inicializarFechasProtocoloDesdeSubtarea(actualizada));
      setAviso(
        faseNueva === 'inspeccion'
          ? 'Coordinación guardada. Continúe con la inspección y el acta.'
          : faseNueva === 'decidir'
            ? 'Acta lista. Elija continuar con preliminar o cerrar para el ajustador.'
            : faseNueva === 'preliminar'
              ? 'Puede elaborar el informe preliminar o cerrar cuando termine.'
              : 'Fase actualizada.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const completarFlujoVisita = async (ok, erroresValidacion) => {
    if (erroresValidacion?.length) {
      setError(erroresValidacion.join('. '));
      return;
    }
    if (!ok) return;
    await guardarAvance(true);
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
    const requiereFormato = subtareaRequiereFormato(s);
    const tieneFormato = subtareaTieneFormato(s);
    const requiereDocumento = subtareaRequiereDocumento(s);
    const tieneDocumento = subtareaTieneDocumento(s);
    const soloFecha = subtareaEsSoloFecha(s);

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
          esFlujoVisitaCoordinacion(s) ? (
            <div className={`${complexCard} space-y-4`}>
              <FlujoVisitaCoordinacionPanel
                subtarea={s}
                obs={obs}
                setObs={setObs}
                fechasProtocolo={fechasProtocolo}
                setFechasProtocolo={setFechasProtocolo}
                guardando={guardando}
                onGuardarAvance={() => guardarAvance(false)}
                onAvanzarFase={avanzarFaseFlujo}
                onCompletar={completarFlujoVisita}
                onSubirArchivo={onSubir}
                onAbrirActa={() => irAFormularioAjuste('actaInspeccion')}
                onAbrirPreliminar={() => irAFormularioAjuste('inicial')}
              />
            </div>
          ) : (
          <div className={`${complexCard} space-y-4`}>
            {requiereFormato && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  tieneFormato
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-amber-300 bg-amber-50 text-amber-900'
                }`}
              >
                {tieneFormato
                  ? 'Formato adjunto. Ya puede marcar la subtarea como completada.'
                  : 'Esta etapa exige el formato (informe) como entregable obligatorio: genérelo en el formulario de ajuste y adjúntelo como tipo "Formato" antes de completar.'}
              </div>
            )}
            {requiereDocumento && !requiereFormato && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  tieneDocumento
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-amber-300 bg-amber-50 text-amber-900'
                }`}
              >
                {tieneDocumento
                  ? `${etiquetaAdjuntoEtapa(s.etapaTrazabilidad)} cargado. Quedará en la trazabilidad del caso.`
                  : `Esta etapa exige adjuntar: ${etiquetaAdjuntoEtapa(s.etapaTrazabilidad)} (igual que en trazabilidad). Al guardarlo se envía a la bandeja del caso.`}
              </div>
            )}
            <div>
              <label className={complexLabel}>
                {subtareaEsSoloFecha(s)
                  ? 'Observaciones de la etapa'
                  : 'Su reporte / observaciones'}
              </label>
              <textarea
                className={complexTextarea}
                rows={4}
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder={
                  subtareaEsSoloFecha(s)
                    ? 'Observaciones (igual que en trazabilidad)…'
                    : 'Describa lo realizado, hallazgos, adjuntos…'
                }
              />
            </div>

            {subtareaTieneFechaProtocolo(s.etapaTrazabilidad) && (
              <div className="space-y-3">
                <p className="font-body text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Fechas de protocolo (trazabilidad)
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {camposProtocoloDeEtapa(s.etapaTrazabilidad).map((c) => (
                    <div key={c.campo}>
                      <label className={complexLabel}>
                        {c.label}
                        {c.requerido ? ' *' : ''}
                      </label>
                      <input
                        type="date"
                        className={complexInput}
                        value={fechasProtocolo[c.campo] || ''}
                        onChange={(e) =>
                          setFechasProtocolo((prev) => ({
                            ...prev,
                            [c.campo]: e.target.value,
                          }))
                        }
                        required={Boolean(c.requerido)}
                      />
                    </div>
                  ))}
                </div>
                <p className={complexHint}>
                  Estas fechas se envían a la trazabilidad del caso (quien asignó la
                  subtarea) y alimentan los tiempos del protocolo, igual que si se
                  diligenciaran en la bandeja de trazabilidad.
                </p>
              </div>
            )}

            {subtareaEsSoloFecha(s) ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                Esta etapa no requiere documento ni formato: solo fechas y
                observaciones, como en trazabilidad.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className={complexLabel}>
                      {requiereDocumento
                        ? etiquetaAdjuntoEtapa(s.etapaTrazabilidad)
                        : 'Tipo de archivo'}
                    </label>
                    {!requiereDocumento || requiereFormato ? (
                      <select
                        className={complexSelect}
                        value={tipoArchivo}
                        onChange={(e) => setTipoArchivo(e.target.value)}
                      >
                        <option value="documento">Documento</option>
                        <option value="formato">Formato (ajuste)</option>
                      </select>
                    ) : (
                      <p className={complexHint}>
                        Se guarda en la bandeja de trazabilidad del caso (quien asignó).
                      </p>
                    )}
                  </div>
                  {tipoArchivo === 'formato' && (
                    <button
                      type="button"
                      disabled={guardando}
                      className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
                      onClick={irAFormularioAjuste}
                      title="Abre el formulario de ajuste igual que el botón Ajuste del reporte"
                    >
                      Ir a formulario de ajuste
                    </button>
                  )}
                  <label className="cursor-pointer">
                    <span className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}>
                      {requiereDocumento && !requiereFormato
                        ? `Subir ${etiquetaAdjuntoEtapa(s.etapaTrazabilidad).toLowerCase()}`
                        : tipoArchivo === 'formato'
                          ? 'Subir formato'
                          : 'Subir archivo'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      disabled={guardando}
                      onChange={(e) => {
                        if (requiereDocumento && !requiereFormato) setTipoArchivo('documento');
                        onSubir(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                {tipoArchivo === 'formato' && (
                  <p className={complexHint}>
                    Los formatos se elaboran en el formulario de ajuste (acta / inspección), igual
                    que desde el reporte Complex; luego adjunte aquí el archivo generado.
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
              </>
            )}

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
                disabled={
                  guardando ||
                  (requiereFormato && !tieneFormato) ||
                  (requiereDocumento && !tieneDocumento)
                }
                title={
                  requiereFormato && !tieneFormato
                    ? 'Adjunte primero el formato (informe)'
                    : requiereDocumento && !tieneDocumento
                      ? `Adjunte: ${etiquetaAdjuntoEtapa(s.etapaTrazabilidad)}`
                      : undefined
                }
                className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
                onClick={() => guardarAvance(true)}
              >
                <FaCheckCircle className="mr-1.5 text-emerald-600" />
                Marcar completada
              </button>
            </div>
          </div>
          )
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
            {camposProtocoloDeEtapa(s.etapaTrazabilidad).map((c) => {
              const valor =
                s.fechasProtocolo?.[c.campo] ||
                (c.campo === camposProtocoloDeEtapa(s.etapaTrazabilidad)[0]?.campo
                  ? s.fechaProtocolo
                  : null);
              if (!valor) return null;
              return (
                <p key={c.campo} className="text-sm text-gray-600">
                  {c.label}: <strong>{formatearFechaSubtarea(valor)}</strong>
                  {' '}(enviada a trazabilidad)
                </p>
              );
            })}
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
