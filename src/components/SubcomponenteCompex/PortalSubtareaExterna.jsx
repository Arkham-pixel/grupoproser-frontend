import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  actualizarSubtareaPublica,
  obtenerSubtareaPublica,
  subirArchivoSubtareaPublica,
} from '../../services/complexSubtareasService.js';
import {
  ESTADO_LABELS,
  SEMAFORO_STYLES,
  formatearFechaSubtarea,
  subtareaRequiereFormato,
  subtareaTieneFormato,
} from './subtareasComplexUtils.js';

export default function PortalSubtareaExterna() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);
  const [okMsg, setOkMsg] = useState('');
  const [tipoArchivo, setTipoArchivo] = useState('documento');

  const requiereFormato = subtareaRequiereFormato(data);
  const tieneFormato = subtareaTieneFormato(data);

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await obtenerSubtareaPublica(token);
      setData(res);
      setObs(res.observacionesAsignado || '');
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

  const guardar = async (completar = false) => {
    if (completar && requiereFormato && !tieneFormato) {
      setError(
        'Debe diligenciar y guardar el formulario de ajuste (informe) antes de marcar la tarea completada. Use el botón "Diligenciar formulario de ajuste".'
      );
      return;
    }
    setSaving(true);
    setOkMsg('');
    setError('');
    try {
      const payload = { observacionesAsignado: obs };
      if (completar) payload.estado = 'completada';
      else payload.estado = 'en_progreso';
      const res = await actualizarSubtareaPublica(token, payload);
      setData(res);
      setOkMsg(completar ? 'Subtarea marcada como completada. Gracias.' : 'Avance guardado.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (file) => {
    if (!file) return;
    setSaving(true);
    setError('');
    try {
      const res = await subirArchivoSubtareaPublica(token, file, { tipoArchivo });
      setData(res.subtarea);
      setOkMsg(
        tipoArchivo === 'formato'
          ? 'Informe cargado correctamente y guardado en el caso.'
          : 'Archivo cargado correctamente.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
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
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Sus observaciones / reporte
                    </label>
                    <textarea
                      className="min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20"
                      value={obs}
                      onChange={(e) => setObs(e.target.value)}
                      placeholder="Describa lo realizado, hallazgos, pendientes…"
                    />
                  </div>

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
                      <button
                        type="button"
                        onClick={() => navigate(`/complex/subtarea/${token}/ajuste`)}
                        className="rounded-lg bg-[#c8102e] px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        {tieneFormato
                          ? 'Abrir formulario de ajuste'
                          : 'Diligenciar formulario de ajuste (informe)'}
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        ¿Qué está adjuntando?
                      </label>
                      <select
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-600 focus:outline-none"
                        value={tipoArchivo}
                        onChange={(e) => setTipoArchivo(e.target.value)}
                      >
                        <option value="documento">Documento de soporte (fotos, actas, anexos)</option>
                        <option value="formato">Informe en archivo (Word / PDF)</option>
                      </select>
                    </div>
                    <div className="min-w-[220px] flex-1">
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Adjuntar archivo
                      </label>
                      <input
                        type="file"
                        disabled={saving}
                        onChange={(e) => {
                          onFile(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                        className="block w-full text-sm text-slate-600"
                      />
                    </div>
                  </div>

                  {(data.archivos || []).length > 0 && (
                    <ul className="space-y-1 text-sm text-slate-700">
                      {data.archivos.map((a, i) => (
                        <li key={`${a.nombre}-${i}`}>
                          <span
                            className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              a.tipoArchivo === 'formato'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {a.tipoArchivo === 'formato' ? 'Informe' : 'Doc'}
                          </span>
                          {a.url ? (
                            <a href={a.url} target="_blank" rel="noreferrer" className="font-semibold text-red-700 underline">
                              {a.nombre}
                            </a>
                          ) : (
                            a.nombre
                          )}
                          <span className="text-xs text-slate-400"> · {a.subidoPor}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => guardar(false)}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Guardar avance
                    </button>
                    <button
                      type="button"
                      disabled={saving || (requiereFormato && !tieneFormato)}
                      title={
                        requiereFormato && !tieneFormato
                          ? 'Diligencie y guarde primero el formulario de ajuste (informe)'
                          : undefined
                      }
                      onClick={() => guardar(true)}
                      className="rounded-lg bg-[#c8102e] px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Marcar completada
                    </button>
                  </div>
                </>
              ) : (
                <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  Esta subtarea ya no admite cambios ({ESTADO_LABELS[data.estado] || data.estado}).
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
