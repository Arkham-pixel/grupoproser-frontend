import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaFileAlt,
  FaLink,
  FaPaperclip,
  FaPlus,
  FaTimes,
} from 'react-icons/fa';
import { obtenerProtocoloSiniestros } from '../../services/protocoloService.js';
import {
  actualizarSubtarea,
  crearSubtareaCaso,
  obtenerResumenSubtareasCaso,
  reasignarSubtarea,
  reenviarSubtarea,
  subirArchivoSubtarea,
} from '../../services/complexSubtareasService.js';
import {
  complexBtnFormAction,
  complexBtnFormActionSaveHover,
  complexHint,
  complexInput,
  complexLabel,
  complexModalOverlay,
  complexSelect,
  complexTextarea,
} from './complexFenixUi.js';
import {
  ESTADO_LABELS,
  SEMAFORO_STYLES,
  formatearDuracionSubtarea,
  formatearFechaHoraSubtarea,
  formatearFechaSubtarea,
  etiquetaFaseFlujoVisita,
  etiquetaPoliticaEntregaFlujoVisita,
  puedeGestionarSubtareasFrontend,
  urlArchivoSubtarea,
} from './subtareasComplexUtils.js';
import {
  calcularFechaLimiteTrazabilidad,
  listarTareasTrazabilidad,
  resolverCasoId,
} from './subtareaProtocoloUtils.js';

const FORM_INICIAL = {
  etapaTrazabilidad: 'contactoInicial',
  titulo: '',
  descripcion: '',
  instrucciones: '',
  tipoAsignado: 'interno',
  codiAsignado: '',
  nombreExterno: '',
  emailExterno: '',
  fechaLimite: '',
  etapaProtocoloId: '',
  flujoVisitaEntrega: 'asignado_decide',
};

function SemaforoDot({ color }) {
  const estilo = SEMAFORO_STYLES[color] || SEMAFORO_STYLES.gris;
  return (
    <span className={`inline-block h-2.5 w-2.5 rounded-full ${estilo.dot}`} title={estilo.label} />
  );
}

export default function AsignarSubtareaModal({ open, caso, responsables = [], onClose, onCreada }) {
  const [vista, setVista] = useState('seguimiento');
  const [protocolo, setProtocolo] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [enlace, setEnlace] = useState('');
  const [aviso, setAviso] = useState('');
  const [detalleId, setDetalleId] = useState(null);
  const [tipoUpload, setTipoUpload] = useState({});
  const [plazoLabel, setPlazoLabel] = useState('');
  const [reabriendoId, setReabriendoId] = useState(null);
  const [motivoReapertura, setMotivoReapertura] = useState('');
  const [editando, setEditando] = useState(null);
  const [motivoEdicion, setMotivoEdicion] = useState('');
  const [notificarEdicion, setNotificarEdicion] = useState(true);

  const casoId = resolverCasoId(caso);
  const nmroAjste = caso?.nmroAjste || caso?.numero_ajuste || '';
  const puedeGestionar = useMemo(
    () => puedeGestionarSubtareasFrontend(caso?.codiRespnsble),
    [caso?.codiRespnsble]
  );

  const aplicarPlazoEtapa = useCallback(
    (tipoEtapa, protocoloActivo, prevForm = FORM_INICIAL) => {
      const plazo = calcularFechaLimiteTrazabilidad(caso, tipoEtapa, protocoloActivo);
      const tituloEtapa =
        listarTareasTrazabilidad(caso, protocoloActivo).find((t) => t.tipo === tipoEtapa)?.titulo ||
        prevForm.titulo;
      setPlazoLabel(plazo.etiquetaPlazo || '');
      return {
        ...prevForm,
        etapaTrazabilidad: tipoEtapa,
        titulo: prevForm.titulo?.trim() ? prevForm.titulo : tituloEtapa,
        fechaLimite: plazo.fechaLimiteInput || '',
        etapaProtocoloId: plazo.etapaProtocoloId || '',
      };
    },
    [caso]
  );

  const cargar = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError('');
    try {
      const proto = await obtenerProtocoloSiniestros();
      setProtocolo(proto);
      setForm((prev) => aplicarPlazoEtapa(prev.etapaTrazabilidad || 'contactoInicial', proto, prev));

      if (casoId) {
        try {
          const data = await obtenerResumenSubtareasCaso(casoId);
          setResumen(data);
        } catch (errApi) {
          console.warn('Subtareas API no disponible:', errApi?.message || errApi);
          setResumen({ subtareas: [], conteo: { verde: 0, amarillo: 0, rojo: 0, gris: 0, total: 0 } });
          // No bloquear la UI: la trazabilidad del protocolo sigue disponible offline del API
        }
      }
    } catch (err) {
      setError(err.message || 'No se pudo cargar el seguimiento');
    } finally {
      setLoading(false);
    }
  }, [open, casoId, aplicarPlazoEtapa]);

  useEffect(() => {
    if (!open) return;
    setVista('seguimiento');
    setForm(FORM_INICIAL);
    setEnlace('');
    setAviso('');
    setError('');
    setDetalleId(null);
    setEditando(null);
    setMotivoEdicion('');
    cargar();
  }, [open, casoId, cargar]);

  const tareasTrazabilidad = useMemo(
    () => listarTareasTrazabilidad(caso, protocolo, resumen?.subtareas || []),
    [caso, protocolo, resumen?.subtareas]
  );

  if (!open || !caso) return null;

  const subtareas = resumen?.subtareas || [];

  const cerrar = () => {
    setForm(FORM_INICIAL);
    setError('');
    setEnlace('');
    setAviso('');
    setVista('seguimiento');
    onClose?.();
  };

  const onChangeEtapa = (tipo) => {
    setForm((prev) => aplicarPlazoEtapa(tipo, protocolo, { ...prev, titulo: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!casoId) {
      setError('El caso no tiene identificador válido.');
      return;
    }
    setGuardando(true);
    setError('');
    setAviso('');
    setEnlace('');
    try {
      // Recalcular plazo al crear por si el protocolo o fechas del caso cambian
      const plazo = calcularFechaLimiteTrazabilidad(caso, form.etapaTrazabilidad, protocolo);
      const payload = {
        titulo: form.titulo || plazo.etapaProtocolo?.nombre || form.etapaTrazabilidad,
        descripcion: form.descripcion,
        instrucciones: form.instrucciones,
        fechaLimite: form.fechaLimite || plazo.fechaLimiteInput || undefined,
        flujoVisitaEntrega: form.flujoVisitaEntrega,
      };
      if (form.tipoAsignado === 'interno') {
        const resp = responsables.find(
          (r) => String(r.codiRespnsble || r.value) === String(form.codiAsignado)
        );
        payload.codiAsignado = form.codiAsignado;
        payload.nombreAsignado = resp?.nmbrRespnsble || resp?.label || '';
        payload.emailAsignado = resp?.email || '';
      } else {
        payload.nombreExterno = form.nombreExterno;
        payload.emailExterno = form.emailExterno;
      }

      if (editando) {
        const cambioAsignado =
          form.tipoAsignado !== editando.tipoAsignado ||
          (form.tipoAsignado === 'interno' &&
            String(form.codiAsignado) !== String(editando.codiAsignado || '')) ||
          (form.tipoAsignado === 'externo' &&
            String(form.emailExterno).trim().toLowerCase() !==
              String(editando.emailExterno || '').trim().toLowerCase());
        const cambioFlujo =
          form.etapaTrazabilidad === 'coordinacionInspeccion' &&
          form.flujoVisitaEntrega !==
            (editando.flujoVisitaEntrega || 'asignado_decide');
        if ((cambioFlujo || cambioAsignado) && !motivoEdicion.trim()) {
          throw new Error('Indique el motivo de la reasignación o del cambio de entrega.');
        }
        await actualizarSubtarea(editando._id, {
          ...payload,
          ...(cambioFlujo ? { motivoCambioFlujo: motivoEdicion.trim() } : {}),
        });
        let result = null;
        if (cambioAsignado) {
          result = await reasignarSubtarea(editando._id, {
            tipoAsignado: form.tipoAsignado,
            codiAsignado: form.codiAsignado,
            nombreAsignado: payload.nombreAsignado,
            emailAsignado: payload.emailAsignado,
            nombreExterno: form.nombreExterno,
            emailExterno: form.emailExterno,
            motivoReasignacion: motivoEdicion.trim(),
            notificar: notificarEdicion,
          });
        } else if (notificarEdicion) {
          result = await reenviarSubtarea(editando._id);
        }
        if (result?.subtarea?.tokenUnaVez) {
          setEnlace(`${window.location.origin}/complex/subtarea/${result.subtarea.tokenUnaVez}`);
        }
        setAviso(
          cambioAsignado
            ? 'Subtarea reasignada y cambios guardados.'
            : notificarEdicion
              ? 'Cambios guardados y notificación reenviada.'
              : 'Cambios guardados.'
        );
        setVista('seguimiento');
        setEditando(null);
        setMotivoEdicion('');
        await cargar();
        return;
      }
      const result = await crearSubtareaCaso(casoId, {
        ...payload,
        tipoAsignado: form.tipoAsignado,
        etapaTrazabilidad: form.etapaTrazabilidad,
        etapaProtocoloId: form.etapaProtocoloId || plazo.etapaProtocoloId,
      });
      if (result.subtarea?.tokenUnaVez) {
        setEnlace(`${window.location.origin}/complex/subtarea/${result.subtarea.tokenUnaVez}`);
      }
      setAviso(
        result.notificacion?.success === false
          ? `Subtarea creada. Correo: ${result.notificacion?.message || result.notificacion?.error || 'no enviado'}`
          : 'Subtarea asignada y notificación enviada'
      );
      setForm((prev) => aplicarPlazoEtapa(prev.etapaTrazabilidad, protocolo, FORM_INICIAL));
      onCreada?.(result.subtarea);
      await cargar();
      setVista('seguimiento');
      if (result.subtarea?._id) setDetalleId(result.subtarea._id);
    } catch (err) {
      setError(err.message || 'No se pudo crear la subtarea');
    } finally {
      setGuardando(false);
    }
  };

  const onSubir = async (subtareaId, file) => {
    if (!file) return;
    try {
      const tipoArchivo = tipoUpload[subtareaId] || 'documento';
      await subirArchivoSubtarea(subtareaId, file, { tipoArchivo });
      setAviso(
        tipoArchivo === 'formato'
          ? 'Formato cargado y guardado en el caso'
          : 'Documento cargado y guardado en el caso'
      );
      await cargar();
    } catch (err) {
      setError(err.message || 'Error al subir archivo');
    }
  };

  const confirmarReapertura = async (subtareaId) => {
    const motivo = motivoReapertura.trim();
    if (!motivo) {
      setError('Escriba el motivo de la reapertura: el asignado recibirá ese mensaje.');
      return;
    }
    try {
      setGuardando(true);
      setError('');
      const res = await actualizarSubtarea(subtareaId, {
        estado: 'pendiente',
        motivoReapertura: motivo,
      });
      const notif = res?.notificacionReapertura;
      setAviso(
        notif?.success === false
          ? `Subtarea reabierta, pero el correo al asignado falló: ${notif.message || notif.error || 'sin detalle'}`
          : 'Subtarea reabierta. El asignado fue notificado con su motivo y la verá en Mis Subtareas.'
      );
      setReabriendoId(null);
      setMotivoReapertura('');
      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudo reabrir la subtarea');
    } finally {
      setGuardando(false);
    }
  };

  const asignarDesdeEtapa = (tarea) => {
    setForm((prev) =>
      aplicarPlazoEtapa(tarea.tipo, protocolo, {
        ...FORM_INICIAL,
        titulo: tarea.titulo,
      })
    );
    setVista('nueva');
  };

  const editarSubtarea = (subtarea) => {
    setEditando(subtarea);
    setMotivoEdicion('');
    setNotificarEdicion(true);
    setForm({
      etapaTrazabilidad: subtarea.etapaTrazabilidad || '',
      titulo: subtarea.titulo || '',
      descripcion: subtarea.descripcion || '',
      instrucciones: subtarea.instrucciones || '',
      tipoAsignado: subtarea.tipoAsignado || 'interno',
      codiAsignado: subtarea.codiAsignado || '',
      nombreExterno: subtarea.nombreExterno || '',
      emailExterno: subtarea.emailExterno || '',
      fechaLimite: subtarea.fechaLimite ? String(subtarea.fechaLimite).slice(0, 10) : '',
      etapaProtocoloId: subtarea.etapaProtocoloId || '',
      flujoVisitaEntrega: subtarea.flujoVisitaEntrega || 'asignado_decide',
    });
    setVista('editar');
  };

  return (
    <div className={`${complexModalOverlay} z-[70]`} role="presentation" onClick={cerrar}>
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-[#1A1A1A]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="asignar-subtarea-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <h2
              id="asignar-subtarea-titulo"
              className="font-heading text-lg font-bold text-gray-900 dark:text-white"
            >
              Subtareas y seguimiento
            </h2>
            <p className="mt-0.5 font-body text-sm text-gray-500">
              Caso {nmroAjste || '—'} · etapas de trazabilidad y protocolo de tiempos
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
            onClick={cerrar}
            aria-label="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-gray-100 px-5 pt-2 dark:border-gray-800">
          <button
            type="button"
            className={`border-b-2 px-3 py-2 font-body text-sm font-semibold transition ${
              vista === 'seguimiento'
                ? 'border-fenix-primario text-fenix-primario'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
            onClick={() => setVista('seguimiento')}
          >
            Trazabilidad
          </button>
          {puedeGestionar && (
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 font-body text-sm font-semibold transition ${
                vista === 'nueva'
                  ? 'border-fenix-primario text-fenix-primario'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
              onClick={() => setVista('nueva')}
            >
              <FaPlus className="text-[10px]" /> Nueva asignación
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-body text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              {error}
            </p>
          )}
          {aviso && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-body text-sm text-emerald-800">
              {aviso}
            </p>
          )}
          {enlace && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
              <p className="mb-1 flex items-center gap-2 font-body text-xs font-semibold">
                <FaLink /> Enlace para el externo
              </p>
              <code className="block break-all font-body text-xs">{enlace}</code>
            </div>
          )}

          {vista === 'seguimiento' && (
            <>
              {loading ? (
                <p className={complexHint}>Cargando trazabilidad y protocolo…</p>
              ) : (
                <ul className="space-y-2">
                  {tareasTrazabilidad.map((tarea) => {
                    const estilo = SEMAFORO_STYLES[tarea.semaforo] || SEMAFORO_STYLES.amarillo;
                    const abierta = detalleId === `etapa-${tarea.tipo}`;
                    return (
                      <li
                        key={tarea.tipo}
                        className="rounded-xl border border-gray-200 dark:border-gray-700"
                      >
                        <button
                          type="button"
                          className="flex w-full flex-wrap items-start justify-between gap-2 px-4 py-3 text-left"
                          onClick={() =>
                            setDetalleId(abierta ? null : `etapa-${tarea.tipo}`)
                          }
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <SemaforoDot color={tarea.semaforo} />
                              <span className="font-heading font-semibold text-gray-900 dark:text-white">
                                {tarea.titulo}
                              </span>
                              <span
                                className={`rounded-full border px-2 py-0.5 font-body text-[11px] font-semibold ${estilo.badge}`}
                              >
                                {tarea.completa ? 'Completada en caso' : 'Etapa caso pendiente'}
                              </span>
                              {(() => {
                                const abiertas = (tarea.subtareas || []).filter((s) =>
                                  ['pendiente', 'en_progreso'].includes(s.estado)
                                );
                                const hechas = (tarea.subtareas || []).filter(
                                  (s) => s.estado === 'completada'
                                );
                                if (hechas.length > 0 && abiertas.length === 0) {
                                  return (
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-body text-[11px] font-semibold text-emerald-800">
                                      Subtarea(s) cerrada(s)
                                    </span>
                                  );
                                }
                                if (abiertas.length > 0) {
                                  return (
                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-body text-[11px] font-semibold text-amber-900">
                                      {abiertas.length} subtarea(s) abierta(s)
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            <p className="mt-1 font-body text-xs text-gray-500">
                              Plazo protocolo:{' '}
                              <strong>{tarea.etiquetaPlazo || '—'}</strong>
                              {' · '}Vence:{' '}
                              <strong>
                                {tarea.fechaLimiteInput
                                  ? formatearFechaSubtarea(tarea.fechaLimite)
                                  : 'sin fecha base'}
                              </strong>
                              {' · '}
                              {tarea.subtareas.length} subtarea(s)
                            </p>
                          </div>
                          {(() => {
                            const asignacionesActivas = (tarea.subtareas || []).filter(
                              (s) => s.estado !== 'cancelada'
                            );
                            if (asignacionesActivas.length > 0) {
                              return (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  className={complexBtnFormAction}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetalleId(`etapa-${tarea.tipo}`);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.stopPropagation();
                                      setDetalleId(`etapa-${tarea.tipo}`);
                                    }
                                  }}
                                >
                                  Ver progreso
                                </span>
                              );
                            }
                            if (puedeGestionar && !tarea.completa) {
                              return (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  className={complexBtnFormAction}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    asignarDesdeEtapa(tarea);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.stopPropagation();
                                      asignarDesdeEtapa(tarea);
                                    }
                                  }}
                                >
                                  Asignar
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </button>

                        {abierta && (
                          <div className="space-y-2 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
                            {tarea.subtareas.length === 0 ? (
                              <p className={complexHint}>
                                Sin subtareas asignadas en esta etapa. Use Asignar para delegar a
                                otro ajustador.
                              </p>
                            ) : (
                              tarea.subtareas.map((s) => {
                                const docs = (s.archivos || []).filter(
                                  (a) => (a.tipoArchivo || 'documento') !== 'formato'
                                );
                                const formatos = (s.archivos || []).filter(
                                  (a) => a.tipoArchivo === 'formato'
                                );
                                const asignado =
                                  s.tipoAsignado === 'externo'
                                    ? `${s.nombreExterno || 'Externo'} (${s.emailExterno || ''})`
                                    : s.nombreAsignado || s.codiAsignado;
                                return (
                                  <div
                                    key={s._id}
                                    className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/40"
                                  >
                                    <div className="flex flex-wrap items-center gap-2">
                                      <SemaforoDot color={s.semaforo} />
                                      <span className="font-body text-sm font-semibold">
                                        {s.titulo}
                                      </span>
                                      <span
                                        className={`rounded-full border px-2 py-0.5 font-body text-[11px] font-semibold ${
                                          s.estado === 'completada'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                            : s.estado === 'cancelada'
                                              ? 'border-gray-200 bg-gray-100 text-gray-700'
                                              : 'border-amber-200 bg-amber-50 text-amber-900'
                                        }`}
                                      >
                                        {ESTADO_LABELS[s.estado] || s.estado}
                                      </span>
                                      <span className="font-body text-[11px] text-gray-500">
                                        {asignado}
                                      </span>
                                      {puedeGestionar &&
                                        s.estado !== 'completada' &&
                                        s.estado !== 'cancelada' && (
                                          <button
                                            type="button"
                                            className={`ml-auto ${complexBtnFormAction}`}
                                            onClick={() => editarSubtarea(s)}
                                          >
                                            Editar sub-tarea
                                          </button>
                                        )}
                                    </div>
                                    <p className="mt-1 font-body text-xs text-gray-500">
                                      Límite {formatearFechaSubtarea(s.fechaLimite)} · {docs.length}{' '}
                                      doc. · {formatos.length} formato(s)
                                      {formatearDuracionSubtarea(s) || s.duracionAsignacionTexto
                                        ? ` · Tiempo: ${formatearDuracionSubtarea(s) || s.duracionAsignacionTexto}`
                                        : ''}
                                    </p>
                                    {s.etapaTrazabilidad === 'coordinacionInspeccion' && (
                                      <p className="mt-1 font-body text-xs text-violet-700">
                                        {etiquetaFaseFlujoVisita(s.flujoVisitaFase)} ·{' '}
                                        {etiquetaPoliticaEntregaFlujoVisita(s.flujoVisitaEntrega)}
                                      </p>
                                    )}
                                    {s.estado === 'completada' && (
                                      <p className="mt-1 font-body text-xs text-gray-500">
                                        Completada {formatearFechaHoraSubtarea(s.fechaCompletada)}
                                        {s.duracionAsignacionTexto
                                          ? ` · Ciclo total ${s.duracionAsignacionTexto}`
                                          : ''}
                                      </p>
                                    )}
                                    {(s.archivos || []).length > 0 && (
                                      <ul className="mt-2 space-y-1">
                                        {s.archivos.map((a, idx) => (
                                          <li
                                            key={a._id || idx}
                                            className="flex items-center gap-1.5 font-body text-xs text-gray-700"
                                          >
                                            {a.tipoArchivo === 'formato' ? (
                                              <FaFileAlt className="text-gray-400" />
                                            ) : (
                                              <FaPaperclip className="text-gray-400" />
                                            )}
                                            {urlArchivoSubtarea(a) ? (
                                              <a
                                                href={urlArchivoSubtarea(a)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-semibold text-fenix-primario hover:underline"
                                              >
                                                {a.nombre}
                                              </a>
                                            ) : (
                                              a.nombre
                                            )}
                                            <span className="text-gray-500">
                                              · {a.subidoPor}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                    {s.estado === 'completada' && puedeGestionar && (
                                      <div className="mt-2 space-y-2">
                                        {reabriendoId === s._id ? (
                                          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                                            <label className={complexLabel}>
                                              Motivo de la reapertura * (se le enviará al asignado)
                                            </label>
                                            <textarea
                                              className={complexTextarea}
                                              rows={3}
                                              value={motivoReapertura}
                                              onChange={(e) => setMotivoReapertura(e.target.value)}
                                              placeholder="Ej.: falta adjuntar el acta firmada; favor completar y volver a cerrar."
                                            />
                                            <div className="flex flex-wrap gap-2">
                                              <button
                                                type="button"
                                                disabled={guardando || !motivoReapertura.trim()}
                                                className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
                                                onClick={() => confirmarReapertura(s._id)}
                                              >
                                                Reabrir y notificar
                                              </button>
                                              <button
                                                type="button"
                                                disabled={guardando}
                                                className={complexBtnFormAction}
                                                onClick={() => {
                                                  setReabriendoId(null);
                                                  setMotivoReapertura('');
                                                }}
                                              >
                                                Cancelar
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <p className={complexHint}>
                                              Completada por el asignado. Si fue un cierre por error,
                                              puede reabrirla indicando el motivo.
                                            </p>
                                            <button
                                              type="button"
                                              disabled={guardando}
                                              className={complexBtnFormAction}
                                              onClick={() => {
                                                setReabriendoId(s._id);
                                                setMotivoReapertura('');
                                                setError('');
                                              }}
                                            >
                                              Reabrir
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {s.estado !== 'completada' && s.estado !== 'cancelada' && (
                                      <div className="mt-2 space-y-2">
                                        <p className={complexHint}>
                                          Solo el asignado puede cerrar la subtarea desde{' '}
                                          Mis Subtareas → Marcar completada.
                                        </p>
                                        <div className="flex flex-wrap items-end gap-2">
                                          {puedeGestionar && (
                                            <>
                                              <button
                                                type="button"
                                                disabled={guardando}
                                                className={complexBtnFormAction}
                                                onClick={async () => {
                                                  try {
                                                    setGuardando(true);
                                                    setError('');
                                                    const result = await reenviarSubtarea(s._id);
                                                    if (result?.subtarea?.tokenUnaVez) {
                                                      setEnlace(
                                                        `${window.location.origin}/complex/subtarea/${result.subtarea.tokenUnaVez}`
                                                      );
                                                    }
                                                    setAviso('Notificación reenviada.');
                                                    await cargar();
                                                  } catch (err) {
                                                    setError(err.message || 'No se pudo reenviar la notificación');
                                                  } finally {
                                                    setGuardando(false);
                                                  }
                                                }}
                                              >
                                                Reenviar notificación
                                              </button>
                                            </>
                                          )}
                                          <select
                                            className={complexSelect}
                                            value={tipoUpload[s._id] || 'documento'}
                                            onChange={(e) =>
                                              setTipoUpload((p) => ({
                                                ...p,
                                                [s._id]: e.target.value,
                                              }))
                                            }
                                          >
                                            <option value="documento">Documento</option>
                                            <option value="formato">Formato</option>
                                          </select>
                                          <label className="cursor-pointer">
                                            <span className={complexBtnFormAction}>Subir</span>
                                            <input
                                              type="file"
                                              className="hidden"
                                              onChange={(e) => {
                                                onSubir(s._id, e.target.files?.[0]);
                                                e.target.value = '';
                                              }}
                                            />
                                          </label>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {subtareas.length > 0 && (
                <p className={complexHint}>
                  Total subtareas asignadas en el caso: {subtareas.length}
                </p>
              )}
            </>
          )}

          {(vista === 'nueva' || vista === 'editar') && puedeGestionar && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className={complexLabel}>Etapa de trazabilidad *</label>
                <select
                  className={complexSelect}
                  value={form.etapaTrazabilidad}
                  onChange={(e) => onChangeEtapa(e.target.value)}
                  disabled={vista === 'editar'}
                  required
                >
                  {tareasTrazabilidad.map((t) => (
                    <option key={t.tipo} value={t.tipo}>
                      {t.titulo}
                      {t.completa ? ' (ya completada en el caso)' : ''}
                    </option>
                  ))}
                </select>
                <p className={complexHint}>
                  {vista === 'editar'
                    ? 'La etapa no se puede cambiar después de asignar para conservar la trazabilidad.'
                    : 'La fecha límite se calcula con el protocolo de tiempos vigente.'}
                  {form.etapaTrazabilidad === 'coordinacionInspeccion'
                    ? ' Esta asignación incluye el flujo completo: coordinación → inspección/acta → opcionalmente informe preliminar o cierre para el ajustador.'
                    : ''}
                </p>
              </div>

              <div>
                <label className={complexLabel}>Título *</label>
                <input
                  className={complexInput}
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={complexLabel}>Tipo</label>
                  <select
                    className={complexSelect}
                    value={form.tipoAsignado}
                    onChange={(e) => setForm((f) => ({ ...f, tipoAsignado: e.target.value }))}
                  >
                    <option value="interno">Ajustador interno</option>
                    <option value="externo">Ajustador externo (enlace)</option>
                  </select>
                </div>
                <div>
                  <label className={complexLabel}>Fecha límite (protocolo)</label>
                  <input
                    type="date"
                    className={`${complexInput} bg-gray-50 dark:bg-gray-900/40`}
                    value={form.fechaLimite}
                    readOnly={vista !== 'editar'}
                    title={
                      vista === 'editar'
                        ? 'Puede ajustar la fecha límite.'
                        : 'Calculada automáticamente según el protocolo'
                    }
                  />
                  <p className={complexHint}>
                    Plazo:{' '}
                    <strong>
                      {plazoLabel && !String(plazoLabel).includes('undefined')
                        ? plazoLabel
                        : 'según protocolo'}
                    </strong>
                    {form.fechaLimite
                      ? ` · vence ${form.fechaLimite}`
                      : ' — falta fecha de referencia en el caso (p. ej. asignación).'}
                  </p>
                </div>
              </div>

              {form.tipoAsignado === 'interno' ? (
                <div>
                  <label className={complexLabel}>Ajustador *</label>
                  <select
                    className={complexSelect}
                    value={form.codiAsignado}
                    onChange={(e) => setForm((f) => ({ ...f, codiAsignado: e.target.value }))}
                    required
                  >
                    <option value="">Seleccione…</option>
                    {responsables.map((r) => {
                      const value = r.codiRespnsble || r.value;
                      const label = r.nmbrRespnsble || r.label || value;
                      return (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={complexLabel}>Nombre externo</label>
                    <input
                      className={complexInput}
                      value={form.nombreExterno}
                      onChange={(e) => setForm((f) => ({ ...f, nombreExterno: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={complexLabel}>Email externo *</label>
                    <input
                      type="email"
                      className={complexInput}
                      value={form.emailExterno}
                      onChange={(e) => setForm((f) => ({ ...f, emailExterno: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              )}

              {form.etapaTrazabilidad === 'coordinacionInspeccion' && (
                <div>
                  <label className={complexLabel}>Después del acta</label>
                  <select
                    className={complexSelect}
                    value={form.flujoVisitaEntrega}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, flujoVisitaEntrega: e.target.value }))
                    }
                  >
                    <option value="asignado_decide">El asignado decide</option>
                    <option value="exige_preliminar">Exigir informe preliminar</option>
                    <option value="solo_acta">Solo acta y entrega al ajustador</option>
                  </select>
                  <p className={complexHint}>
                    Define si el informe preliminar será opcional, obligatorio o no estará
                    disponible para esta sub-tarea.
                  </p>
                </div>
              )}

              <div>
                <label className={complexLabel}>Descripción</label>
                <textarea
                  className={complexTextarea}
                  rows={2}
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                />
              </div>
              <div>
                <label className={complexLabel}>Instrucciones</label>
                <textarea
                  className={complexTextarea}
                  rows={3}
                  value={form.instrucciones}
                  onChange={(e) => setForm((f) => ({ ...f, instrucciones: e.target.value }))}
                  placeholder="Qué debe diligenciar o adjuntar"
                />
              </div>

              {vista === 'editar' && (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <label className={complexLabel}>
                    Motivo de reasignación o cambio de entrega
                  </label>
                  <textarea
                    className={complexTextarea}
                    rows={2}
                    value={motivoEdicion}
                    onChange={(e) => setMotivoEdicion(e.target.value)}
                    placeholder="Obligatorio al reasignar o cambiar el flujo post-acta."
                  />
                  <label className="flex items-center gap-2 font-body text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={notificarEdicion}
                      onChange={(e) => setNotificarEdicion(e.target.checked)}
                    />
                    Notificar al asignado sobre los cambios
                  </label>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button
                  type="button"
                  className={complexBtnFormAction}
                  onClick={() => setVista('seguimiento')}
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
                >
                  {guardando
                    ? vista === 'editar'
                      ? 'Guardando…'
                      : 'Asignando…'
                    : vista === 'editar'
                      ? 'Guardar cambios'
                      : 'Asignar y notificar'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="flex shrink-0 justify-end border-t border-gray-100 px-5 py-3 dark:border-gray-800">
          <button type="button" className={complexBtnFormAction} onClick={cerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
