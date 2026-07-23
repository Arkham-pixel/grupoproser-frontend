import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaCheckCircle,
  FaLink,
  FaPaperclip,
  FaPlus,
  FaRedo,
  FaTimes,
  FaUserClock,
} from 'react-icons/fa';
import {
  cancelarSubtarea,
  crearSubtareaCaso,
  obtenerResumenSubtareasCaso,
  reenviarSubtarea,
  subirArchivoSubtarea,
  actualizarSubtarea,
} from '../../services/complexSubtareasService.js';
import {
  complexBtnFormAction,
  complexBtnFormActionSaveHover,
  complexHint,
  complexInput,
  complexLabel,
  complexSelect,
  complexTextarea,
} from './complexFenixUi.js';
import {
  ESTADO_LABELS,
  SEMAFORO_STYLES,
  camposProtocoloDeEtapa,
  formatearFechaSubtarea,
  puedeGestionarSubtareasFrontend,
  subtareaEsSoloFecha,
  subtareaTieneFechaProtocolo,
} from './subtareasComplexUtils.js';

function SemaforoDot({ color }) {
  const estilo = SEMAFORO_STYLES[color] || SEMAFORO_STYLES.gris;
  return (
    <span
      className={`inline-block h-3 w-3 rounded-full ${estilo.dot}`}
      title={estilo.label}
      aria-label={estilo.label}
    />
  );
}

const FORM_INICIAL = {
  titulo: '',
  descripcion: '',
  instrucciones: '',
  tipoAsignado: 'interno',
  codiAsignado: '',
  nombreExterno: '',
  emailExterno: '',
  fechaLimite: '',
};

export default function SubtareasComplexPanel({
  casoId,
  nmroAjste,
  codiRespnsble,
  responsables = [],
}) {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [detalleId, setDetalleId] = useState(null);
  const [enlaceGenerado, setEnlaceGenerado] = useState('');
  const [aviso, setAviso] = useState('');

  const puedeGestionar = useMemo(
    () => puedeGestionarSubtareasFrontend(codiRespnsble),
    [codiRespnsble]
  );

  const cargar = useCallback(async () => {
    if (!casoId) return;
    setLoading(true);
    setError('');
    try {
      const data = await obtenerResumenSubtareasCaso(casoId);
      setResumen(data);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las subtareas');
    } finally {
      setLoading(false);
    }
  }, [casoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const subtareas = resumen?.subtareas || [];
  const conteo = resumen?.conteo || { verde: 0, amarillo: 0, rojo: 0, gris: 0, total: 0 };

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!casoId) return;
    setGuardando(true);
    setAviso('');
    setEnlaceGenerado('');
    try {
      const payload = {
        titulo: form.titulo,
        descripcion: form.descripcion,
        instrucciones: form.instrucciones,
        tipoAsignado: form.tipoAsignado,
        fechaLimite: form.fechaLimite || undefined,
      };
      if (form.tipoAsignado === 'interno') {
        const resp = responsables.find(
          (r) => String(r.value || r.codiRespnsble) === String(form.codiAsignado)
        );
        payload.codiAsignado = form.codiAsignado;
        payload.nombreAsignado = resp?.label || resp?.nmbrRespnsble || '';
        payload.emailAsignado = resp?.email || '';
      } else {
        payload.nombreExterno = form.nombreExterno;
        payload.emailExterno = form.emailExterno;
      }
      const result = await crearSubtareaCaso(casoId, payload);
      if (result.subtarea?.tokenUnaVez) {
        const origin = window.location.origin;
        setEnlaceGenerado(`${origin}/complex/subtarea/${result.subtarea.tokenUnaVez}`);
      }
      setAviso(
        result.notificacion?.success === false
          ? `Subtarea creada. Aviso: ${result.notificacion?.message || result.notificacion?.error || 'no se pudo enviar el correo'}`
          : 'Subtarea creada y notificación enviada'
      );
      setForm(FORM_INICIAL);
      setMostrarForm(false);
      await cargar();
    } catch (err) {
      setError(err.message || 'Error al crear subtarea');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await actualizarSubtarea(id, { estado });
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const onCancelar = async (id) => {
    try {
      await cancelarSubtarea(id);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const onReenviar = async (id) => {
    try {
      const result = await reenviarSubtarea(id);
      if (result.subtarea?.tokenUnaVez) {
        setEnlaceGenerado(
          `${window.location.origin}/complex/subtarea/${result.subtarea.tokenUnaVez}`
        );
      }
      setAviso(
        result.notificacion?.success === false
          ? `Reenviado con advertencia: ${result.notificacion?.error || result.notificacion?.message || ''}`
          : 'Notificación reenviada'
      );
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const onSubir = async (id, file) => {
    if (!file) return;
    try {
      await subirArchivoSubtarea(id, file);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!casoId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
        <p className="font-body text-sm text-amber-900 dark:text-amber-200">
          Guarde el caso primero para poder crear y gestionar subtareas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
            Subtareas del caso
          </h2>
          <p className="mt-1 font-body text-sm text-gray-500 dark:text-gray-400">
            {nmroAjste ? `Caso ${nmroAjste}` : 'Coordinación con ajustadores internos o externos'}
          </p>
        </div>
        {puedeGestionar && (
          <button
            type="button"
            className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
            onClick={() => setMostrarForm((v) => !v)}
          >
            <FaPlus className="mr-1.5" /> Nueva subtarea
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['verde', conteo.verde],
          ['amarillo', conteo.amarillo],
          ['rojo', conteo.rojo],
          ['gris', conteo.gris],
        ].map(([key, n]) => {
          const estilo = SEMAFORO_STYLES[key];
          return (
            <div
              key={key}
              className={`rounded-xl border px-3 py-3 ${estilo.badge}`}
            >
              <div className="flex items-center gap-2">
                <SemaforoDot color={key} />
                <span className="font-body text-xs font-semibold uppercase tracking-wide">
                  {estilo.label}
                </span>
              </div>
              <p className="mt-2 font-heading text-2xl font-bold">{n || 0}</p>
            </div>
          );
        })}
      </div>

      {aviso && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-body text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          {aviso}
        </p>
      )}
      {enlaceGenerado && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
          <p className="mb-1 flex items-center gap-2 font-body text-xs font-semibold text-gray-700 dark:text-gray-200">
            <FaLink /> Enlace para externo (cópielo si necesita)
          </p>
          <code className="block break-all font-body text-xs text-gray-800 dark:text-gray-200">
            {enlaceGenerado}
          </code>
        </div>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-body text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      {mostrarForm && puedeGestionar && (
        <form
          onSubmit={handleCrear}
          className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#1A1A1A]"
        >
          <div>
            <label className={complexLabel}>Título *</label>
            <input
              className={complexInput}
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              required
              placeholder="Ej. Inspección en sitio, fotos, inventario"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={complexLabel}>Tipo de asignado</label>
              <select
                className={complexSelect}
                value={form.tipoAsignado}
                onChange={(e) => setForm((f) => ({ ...f, tipoAsignado: e.target.value }))}
              >
                <option value="interno">Ajustador interno (usuario)</option>
                <option value="externo">Ajustador externo (enlace)</option>
              </select>
            </div>
            <div>
              <label className={complexLabel}>Fecha límite</label>
              <input
                type="date"
                className={complexInput}
                value={form.fechaLimite}
                onChange={(e) => setForm((f) => ({ ...f, fechaLimite: e.target.value }))}
              />
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
                <option value="">Seleccione...</option>
                {responsables.map((r) => {
                  const value = r.value || r.codiRespnsble;
                  const label = r.label || r.nmbrRespnsble || value;
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

          <div>
            <label className={complexLabel}>Descripción</label>
            <textarea
              className={complexTextarea}
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              rows={2}
            />
          </div>
          <div>
            <label className={complexLabel}>Instrucciones / qué diligenciar</label>
            <textarea
              className={complexTextarea}
              value={form.instrucciones}
              onChange={(e) => setForm((f) => ({ ...f, instrucciones: e.target.value }))}
              rows={3}
              placeholder="Detalle lo que debe cargar o reportar el asignado"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={guardando}
              className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
            >
              {guardando ? 'Guardando…' : 'Crear y notificar'}
            </button>
            <button
              type="button"
              className={complexBtnFormAction}
              onClick={() => setMostrarForm(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className={complexHint}>Cargando subtareas…</p>
      ) : subtareas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
          <FaUserClock className="mx-auto mb-2 text-2xl text-gray-400" />
          <p className="font-body text-sm text-gray-500">Aún no hay subtareas en este caso.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {subtareas.map((s) => {
            const estilo = SEMAFORO_STYLES[s.semaforo] || SEMAFORO_STYLES.gris;
            const abierta = detalleId === s._id;
            const asignadoLabel =
              s.tipoAsignado === 'externo'
                ? `${s.nombreExterno || 'Externo'} (${s.emailExterno || 'sin email'})`
                : s.nombreAsignado || s.codiAsignado || 'Interno';

            return (
              <li
                key={s._id}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#1A1A1A]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setDetalleId(abierta ? null : s._id)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <SemaforoDot color={s.semaforo} />
                      <span className="font-heading font-semibold text-gray-900 dark:text-white">
                        {s.titulo}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 font-body text-[11px] font-semibold ${estilo.badge}`}
                      >
                        {ESTADO_LABELS[s.estado] || s.estado}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 font-body text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {s.tipoAsignado === 'externo' ? 'Externo' : 'Interno'}
                      </span>
                    </div>
                    <p className="mt-1 font-body text-xs text-gray-500">
                      {asignadoLabel} · Límite: {formatearFechaSubtarea(s.fechaLimite)} ·{' '}
                      {(s.archivos || []).length} archivo(s)
                      {subtareaEsSoloFecha(s) ? ' · Solo fechas' : ''}
                      {camposProtocoloDeEtapa(s.etapaTrazabilidad)
                        .map((c) => {
                          const valor =
                            s.fechasProtocolo?.[c.campo] ||
                            (c.campo === camposProtocoloDeEtapa(s.etapaTrazabilidad)[0]?.campo
                              ? s.fechaProtocolo
                              : null);
                          return valor
                            ? ` · ${c.label}: ${formatearFechaSubtarea(valor)}`
                            : '';
                        })
                        .join('')}
                      {!s.fechaProtocolo &&
                      !Object.keys(s.fechasProtocolo || {}).length &&
                      subtareaTieneFechaProtocolo(s.etapaTrazabilidad)
                        ? ' · Sin fecha de protocolo'
                        : ''}
                    </p>
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {s.estado !== 'completada' && s.estado !== 'cancelada' && (
                      <button
                        type="button"
                        className={complexBtnFormAction}
                        title="Marcar completada"
                        onClick={() => cambiarEstado(s._id, 'completada')}
                      >
                        <FaCheckCircle />
                      </button>
                    )}
                    {puedeGestionar && s.estado !== 'cancelada' && (
                      <>
                        <button
                          type="button"
                          className={complexBtnFormAction}
                          title="Reenviar notificación"
                          onClick={() => onReenviar(s._id)}
                        >
                          <FaRedo />
                        </button>
                        <button
                          type="button"
                          className={complexBtnFormAction}
                          title="Cancelar"
                          onClick={() => onCancelar(s._id)}
                        >
                          <FaTimes />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {abierta && (
                  <div className="mt-4 space-y-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                    {s.descripcion && (
                      <p className="font-body text-sm text-gray-700 dark:text-gray-300">
                        <strong>Descripción:</strong> {s.descripcion}
                      </p>
                    )}
                    {s.instrucciones && (
                      <p className="font-body text-sm text-gray-700 dark:text-gray-300">
                        <strong>Instrucciones:</strong> {s.instrucciones}
                      </p>
                    )}
                    {s.observacionesAsignado && (
                      <p className="font-body text-sm text-gray-700 dark:text-gray-300">
                        <strong>Observaciones del asignado:</strong> {s.observacionesAsignado}
                      </p>
                    )}

                    <div>
                      <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Archivos
                      </p>
                      {(s.archivos || []).length === 0 ? (
                        <p className={complexHint}>Sin archivos aún.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {s.archivos.map((a, idx) => (
                            <li
                              key={a._id || `${a.nombre}-${idx}`}
                              className="flex flex-wrap items-center gap-2 font-body text-sm text-gray-700 dark:text-gray-300"
                            >
                              <FaPaperclip className="text-gray-400" />
                              {a.url ? (
                                <a
                                  href={a.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-fenix-primario hover:underline"
                                >
                                  {a.nombre || 'Archivo'}
                                </a>
                              ) : (
                                <span>{a.nombre || 'Archivo'}</span>
                              )}
                              <span className="text-xs text-gray-500">
                                · {a.subidoPor || '—'} ({a.subidoPorTipo || '—'}) ·{' '}
                                {formatearFechaSubtarea(a.fechaSubida)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {s.estado !== 'cancelada' && s.estado !== 'completada' && (
                        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 font-body text-xs font-semibold text-gray-700 dark:text-gray-200">
                          <span className={complexBtnFormAction}>Subir archivo</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => onSubir(s._id, e.target.files?.[0])}
                          />
                        </label>
                      )}
                    </div>

                    {(s.historialEstados || []).length > 0 && (
                      <div>
                        <p className="mb-1 font-body text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Historial
                        </p>
                        <ul className="space-y-1">
                          {s.historialEstados.map((h, i) => (
                            <li key={`${h.estado}-${i}`} className="font-body text-xs text-gray-500">
                              {formatearFechaSubtarea(h.fecha)} · {ESTADO_LABELS[h.estado] || h.estado} ·{' '}
                              {h.por}
                              {h.nota ? ` — ${h.nota}` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
