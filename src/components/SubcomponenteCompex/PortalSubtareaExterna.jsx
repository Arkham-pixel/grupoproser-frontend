import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  actualizarSubtareaPublica,
  obtenerSubtareaPublica,
  subirArchivoSubtareaPublica,
} from '../../services/complexSubtareasService.js';
import { esRolExterno } from '../../config/roles.js';
import { limpiarSesionLocal } from '../../utils/limpiarSesionLocal.js';
import FlujoVisitaCoordinacionPanel from './FlujoVisitaCoordinacionPanel.jsx';
import {
  ESTADO_LABELS,
  SEMAFORO_STYLES,
  camposProtocoloDeEtapa,
  esFlujoVisitaCoordinacion,
  faltanFechasFlujoVisitaParaCerrar,
  faltanFechasProtocoloRequeridas,
  formatearFechaSubtarea,
  inicializarFechasProtocoloDesdeSubtarea,
  subtareaEsSoloFecha,
  subtareaRequiereFormato,
  subtareaTieneFechaProtocolo,
  subtareaTieneFormato,
} from './subtareasComplexUtils.js';

export default function PortalSubtareaExterna() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [obs, setObs] = useState('');
  const [fechasProtocolo, setFechasProtocolo] = useState({});
  const [saving, setSaving] = useState(false);
  const [okMsg, setOkMsg] = useState('');
  const [tipoArchivo, setTipoArchivo] = useState('documento');

  const requiereFormato = subtareaRequiereFormato(data);
  const tieneFormato = subtareaTieneFormato(data);
  const soloFecha = subtareaEsSoloFecha(data);
  const pideFechas = subtareaTieneFechaProtocolo(data?.etapaTrazabilidad);

  const salirALogin = () => {
    limpiarSesionLocal();
    navigate('/login', { replace: true });
  };

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await obtenerSubtareaPublica(token);
      setData(res);
      setObs(res.observacionesAsignado || '');
      setFechasProtocolo(inicializarFechasProtocoloDesdeSubtarea(res));
      if (subtareaRequiereFormato(res)) setTipoArchivo('formato');
    } catch (err) {
      setError(err.message || 'No se pudo abrir el enlace');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const guardar = async (completar = false, extras = {}) => {
    if (completar && requiereFormato && !tieneFormato) {
      setError(
        'Debe diligenciar y guardar el formulario de ajuste (informe) antes de marcar la tarea completada. Use el botón "Diligenciar formulario de ajuste".'
      );
      return;
    }
    if (completar && esFlujoVisitaCoordinacion(data)) {
      const faltantes = faltanFechasFlujoVisitaParaCerrar(fechasProtocolo);
      if (faltantes.length) {
        setError(`Indique las fechas: ${faltantes.join(', ')}.`);
        return;
      }
      if (!(data.archivos || []).length) {
        setError('Antes de cerrar suba el acta y/o las fotos y datos de la visita.');
        return;
      }
    } else if (completar && pideFechas) {
      const faltantes = faltanFechasProtocoloRequeridas(
        data?.etapaTrazabilidad,
        fechasProtocolo
      );
      if (faltantes.length) {
        setError(
          `Indique las fechas de la etapa (como en trazabilidad): ${faltantes.join(', ')}.`
        );
        return;
      }
    }
    setSaving(true);
    setOkMsg('');
    setError('');
    try {
      const payload = {
        observacionesAsignado: obs,
        fechasProtocolo,
        ...extras,
      };
      const primerCampo = camposProtocoloDeEtapa(data?.etapaTrazabilidad)[0];
      if (primerCampo?.campo && fechasProtocolo[primerCampo.campo]) {
        payload.fechaProtocolo = fechasProtocolo[primerCampo.campo];
      }
      if (completar) payload.estado = 'completada';
      else payload.estado = 'en_progreso';
      const res = await actualizarSubtareaPublica(token, payload);
      setData(res);
      setFechasProtocolo(inicializarFechasProtocoloDesdeSubtarea(res));
      const hayFechas = Object.values(fechasProtocolo || {}).some(Boolean);
      setOkMsg(
        completar
          ? 'Subtarea marcada como completada. Las fechas quedaron en la trazabilidad del caso. Gracias.'
          : hayFechas
            ? 'Avance guardado. Las fechas se sincronizaron con la trazabilidad del caso.'
            : 'Avance guardado.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (file, tipoForzado) => {
    if (!file) return;
    setSaving(true);
    setError('');
    try {
      const tipo = tipoForzado || tipoArchivo;
      const res = await subirArchivoSubtareaPublica(token, file, { tipoArchivo: tipo });
      setData(res.subtarea);
      setOkMsg(
        tipo === 'formato'
          ? 'Informe cargado correctamente y guardado en el caso.'
          : 'Archivo cargado correctamente.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const avanzarFaseFlujo = async (faseNueva, erroresValidacion) => {
    if (erroresValidacion?.length) {
      setError(erroresValidacion.join('. '));
      return;
    }
    if (!faseNueva) return;
    await guardar(false, { flujoVisitaFase: faseNueva });
  };

  const completarFlujoVisita = async (ok, erroresValidacion) => {
    if (erroresValidacion?.length) {
      setError(erroresValidacion.join('. '));
      return;
    }
    if (!ok) return;
    await guardar(true);
  };

  const sem = SEMAFORO_STYLES[data?.semaforo] || SEMAFORO_STYLES.amarillo;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 px-4 py-10 font-sans text-slate-900">
      <div className="mx-auto max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="bg-[#111827] px-6 py-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
            Grupo Proser
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Apoyo en caso Complex</h1>
          <p className="mt-1 text-sm text-slate-300">
            Formulario externo — no requiere usuario de la plataforma
          </p>
        </div>

        <div className="space-y-5 px-6 py-6">
          {loading && <p className="text-sm text-slate-500">Cargando…</p>}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {okMsg && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {okMsg}
            </div>
          )}

          {data && !loading && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${sem.badge}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${sem.dot}`} />
                  {ESTADO_LABELS[data.estado] || data.estado}
                </span>
                <span className="text-xs text-slate-500">
                  Caso {data.nmroAjste || '—'} · Límite {formatearFechaSubtarea(data.fechaLimite)}
                </span>
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">{data.titulo}</h2>
                {data.creadoPorNombre && (
                  <p className="mt-1 text-sm text-slate-500">
                    Solicitado por {data.creadoPorNombre}
                    {data.ciudadSiniestro ? ` · ${data.ciudadSiniestro}` : ''}
                  </p>
                )}
                {data.etapaTrazabilidad && (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Etapa: {data.etapaTrazabilidad}
                    {soloFecha ? ' · solo fechas (sin documento)' : ''}
                  </p>
                )}
              </div>

              {data.descripcion && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Descripción</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{data.descripcion}</p>
                </div>
              )}
              {data.instrucciones && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Qué debe diligenciar
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{data.instrucciones}</p>
                </div>
              )}

              {data.estado !== 'completada' && data.estado !== 'cancelada' ? (
                esFlujoVisitaCoordinacion(data) ? (
                  <FlujoVisitaCoordinacionPanel
                    subtarea={data}
                    obs={obs}
                    setObs={setObs}
                    fechasProtocolo={fechasProtocolo}
                    setFechasProtocolo={setFechasProtocolo}
                    guardando={saving}
                    modoExterno
                    onGuardarAvance={() => guardar(false)}
                    onAvanzarFase={avanzarFaseFlujo}
                    onCompletar={completarFlujoVisita}
                    onSubirArchivo={onFile}
                    onAbrirActa={() =>
                      navigate(`/complex/subtarea/${token}/ajuste?estado=actaInspeccion`)
                    }
                    onAbrirPreliminar={() =>
                      navigate(`/complex/subtarea/${token}/ajuste?estado=inicial`)
                    }
                  />
                ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {soloFecha ? 'Observaciones de la etapa' : 'Sus observaciones / reporte'}
                    </label>
                    <textarea
                      className="min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20"
                      value={obs}
                      onChange={(e) => setObs(e.target.value)}
                      placeholder={
                        soloFecha
                          ? 'Observaciones (igual que en trazabilidad)…'
                          : 'Describa lo realizado, hallazgos, pendientes…'
                      }
                    />
                  </div>

                  {pideFechas && (
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Fechas de protocolo (trazabilidad)
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {camposProtocoloDeEtapa(data.etapaTrazabilidad).map((c) => (
                          <div key={c.campo}>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                              {c.label}
                              {c.requerido ? ' *' : ''}
                            </label>
                            <input
                              type="date"
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20"
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
                      <p className="text-xs text-slate-500">
                        Estas fechas se envían a la trazabilidad del caso y alimentan los
                        tiempos del protocolo.
                      </p>
                    </div>
                  )}

                  {soloFecha ? (
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                      Esta etapa no requiere documento ni informe: solo fechas y
                      observaciones, igual que en la bandeja de trazabilidad.
                    </div>
                  ) : (
                    <>
                      {requiereFormato && (
                        <div
                          className={`space-y-3 rounded-xl border p-4 ${
                            tieneFormato
                              ? 'border-emerald-200 bg-emerald-50'
                              : 'border-amber-300 bg-amber-50'
                          }`}
                        >
                          {tieneFormato ? (
                            <p className="text-sm text-emerald-800">
                              <span className="font-semibold">Informe generado y guardado en el caso.</span>{' '}
                              Puede volver a abrir el formulario si necesita corregirlo, o marcar
                              la tarea como completada.
                            </p>
                          ) : (
                            <p className="text-sm text-amber-900">
                              <span className="font-semibold">
                                El entregable de esta tarea es el informe estandarizado.
                              </span>{' '}
                              Diligencie el formulario de ajuste de la plataforma; al guardarlo,
                              el informe queda adjunto automáticamente al caso y a esta tarea.
                            </p>
                          )}
                          <Link
                            to={`/complex/subtarea/${token}/ajuste`}
                            className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                          >
                            Diligenciar formulario de ajuste (informe)
                          </Link>
                        </div>
                      )}

                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Adjuntar archivo
                        </label>
                        <select
                          className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          value={tipoArchivo}
                          onChange={(e) => setTipoArchivo(e.target.value)}
                        >
                          <option value="documento">Documento</option>
                          <option value="formato">Formato / informe</option>
                        </select>
                        <input
                          type="file"
                          className="block w-full text-sm text-slate-600"
                          disabled={saving}
                          onChange={(e) => {
                            onFile(e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </div>
                    </>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => guardar(false)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Guardar avance
                    </button>
                    <button
                      type="button"
                      disabled={saving || (requiereFormato && !tieneFormato)}
                      onClick={() => guardar(true)}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Marcar completada
                    </button>
                  </div>
                </>
                )
              ) : (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  Esta subtarea ya está {ESTADO_LABELS[data.estado] || data.estado}.
                  {camposProtocoloDeEtapa(data.etapaTrazabilidad).map((c) => {
                    const valor =
                      data.fechasProtocolo?.[c.campo] ||
                      (c.campo === camposProtocoloDeEtapa(data.etapaTrazabilidad)[0]?.campo
                        ? data.fechaProtocolo
                        : null);
                    if (!valor) return null;
                    return (
                      <p key={c.campo} className="mt-1">
                        {c.label}: <strong>{formatearFechaSubtarea(valor)}</strong>
                      </p>
                    );
                  })}
                </div>
              )}

              {esRolExterno() && (
                <button
                  type="button"
                  onClick={salirALogin}
                  className="text-xs font-semibold text-slate-500 underline hover:text-slate-800"
                >
                  Cerrar sesión externa
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
