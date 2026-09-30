import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCamera, FaCheck, FaCircle, FaDownload, FaLightbulb, FaStop, FaSyncAlt, FaVideoSlash } from 'react-icons/fa';
import useVideoperitajeRoom from '../../hooks/useVideoperitajeRoom.js';
import {
  capturarFrameDeVideo,
  finalizarSesionVideoperitaje,
  obtenerSesionVideoperitaje,
  reenviarInvitacionVideoperitaje,
  subirFotoPeritoVideoperitaje,
  tokenLivekitPerito,
} from '../../services/videoperitajeService.js';
import { iniciarGrabacionLlamada } from '../../utils/videoperitajeGrabacion.js';
import { descargarBloqueVideoperitaje } from '../../utils/videoperitajeDescargaBloque.js';
import VideoperitajeGaleria from './VideoperitajeGaleria.jsx';
import {
  etiquetaEstado,
  livekitUsableEnEstaPagina,
  urlPortalAsegurado,
  vpBtnGhost,
  vpBtnPrimary,
  vpCard,
  vpPage,
  vpWrap,
} from './videoperitajeUi.js';

function SalaLivePerito({ sesion, onRefresh, onFinalizar, cerrando }) {
  const { t } = useTranslation();
  const [lk, setLk] = useState(null);
  const [lkError, setLkError] = useState('');
  const [busy, setBusy] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [segGrabacion, setSegGrabacion] = useState(0);
  const grabacionRef = useRef(null);
  const timerRef = useRef(null);
  const flushPromiseRef = useRef(null);
  const [subiendoVideo, setSubiendoVideo] = useState(false);
  const [flashCliente, setFlashCliente] = useState(false);

  const conectar = useCallback(async () => {
    setLkError('');
    try {
      const r = await tokenLivekitPerito(sesion._id);
      if (!r?.token || !livekitUsableEnEstaPagina(r?.url)) {
        setLk(null);
        setLkError(
          r?.configured === false || !r?.token
            ? t('videoperitaje.livekitHint')
            : 'No se recibió URL de video válida. Verifique LIVEKIT_PUBLIC_URL.'
        );
        return;
      }
      setLk(r);
    } catch (err) {
      if (err.code === 'LIVEKIT_NOT_CONFIGURED' || err.status === 503) {
        setLk(null);
        setLkError(t('videoperitaje.livekitHint'));
        return;
      }
      setLkError(err.message);
    }
  }, [sesion._id, t]);

  useEffect(() => {
    conectar();
  }, [conectar]);

  const room = useVideoperitajeRoom({
    token: lk?.token,
    url: lk?.url,
    facingMode: 'user',
    publishVideo: true,
    publishAudio: true,
  });

  const aseguradoEnPortal =
    Boolean(sesion.aseguradoVistaAt) &&
    Date.now() - new Date(sesion.aseguradoVistaAt).getTime() < 30000;

  const detenerGrabacion = useCallback(async (opts = {}) => {
    const waitUpload = opts.waitUpload !== false;
    if (flushPromiseRef.current) {
      return waitUpload ? flushPromiseRef.current : null;
    }
    const rec = grabacionRef.current;
    grabacionRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setGrabando(false);
    if (!rec) return null;
    const nombreBase = `Videoperitaje_${sesion.expediente || sesion._id}`.replace(/[^\w.-]+/g, '_');
    const job = (async () => {
      setSubiendoVideo(true);
      try {
        const blob = await rec.stop();
        if (blob && blob.size > 4000) {
          const ext = String(blob.type || rec.mime || '').includes('mp4') ? 'mp4' : 'webm';
          const sello = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${nombreBase}_${sello}.${ext}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
      } catch (err) {
        if (waitUpload) {
          setLkError(err.message);
          throw err;
        }
        console.warn('[videoperitaje] descarga de grabación:', err?.message || err);
      } finally {
        setSubiendoVideo(false);
      }
    })();
    flushPromiseRef.current = job;
    job.finally(() => {
      if (flushPromiseRef.current === job) flushPromiseRef.current = null;
    });
    if (waitUpload) await job;
    return null;
  }, [sesion._id, sesion.expediente]);

  const iniciarGrabacion = async () => {
    setLkError('');
    if (!room.remotePresent && !room.roomRef.current?.remoteParticipants?.size) {
      setLkError(t('videoperitaje.waitToRecord'));
      return;
    }
    try {
      const rec = iniciarGrabacionLlamada({
        localVideo: room.localVideoRef.current,
        remoteVideo: room.remoteVideoRef.current,
        room: room.roomRef.current,
      });
      grabacionRef.current = rec;
      setGrabando(true);
      setSegGrabacion(0);
      timerRef.current = setInterval(() => setSegGrabacion((s) => s + 1), 1000);
    } catch (err) {
      setLkError(err.message);
    }
  };

  useEffect(() => {
    window.__vpFlushGrabacion = detenerGrabacion;
    window.__vpHangupLive = () => {
      try {
        room.disconnect?.();
      } catch {
        /* ignore */
      }
    };
    return () => {
      if (window.__vpFlushGrabacion === detenerGrabacion) delete window.__vpFlushGrabacion;
      delete window.__vpHangupLive;
    };
  }, [detenerGrabacion, room]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (grabacionRef.current) {
        grabacionRef.current.stop().catch(() => {});
        grabacionRef.current = null;
      }
    },
    []
  );

  const esperarAckCaptura = (ms) =>
    new Promise((resolve) => {
      let off = () => {};
      const timer = setTimeout(() => {
        off();
        resolve(false);
      }, ms);
      off = room.onData((msg) => {
        if (msg?.type !== 'CAPTURE_ACK') return;
        clearTimeout(timer);
        off();
        resolve(true);
      });
    });

  const refrescarGaleriaEnSegundoPlano = (antes) => {
    const limite = Date.now() + 30000;
    const tick = async () => {
      const r = await onRefresh?.();
      if ((r?.medias?.length || 0) > antes || Date.now() > limite) return;
      setTimeout(tick, 1500);
    };
    setTimeout(tick, 1200);
  };

  const capturar = async () => {
    setBusy(true);
    setLkError('');
    try {
      const antes = (sesion.medias || []).length;
      const fuente = room.remoteVideoRef.current?.videoWidth
        ? room.remoteVideoRef.current
        : room.localVideoRef.current;
      // El celular toma la foto HD y la sube directo a S3; aquí solo confirmamos que recibió la orden.
      let ack = false;
      if (room.connected && room.remotePresent) {
        const espera = esperarAckCaptura(2500);
        room.sendCaptureCommand().catch(() => {});
        ack = await espera;
      }
      if (ack) {
        refrescarGaleriaEnSegundoPlano(antes);
        return;
      }
      const blobLocal = await capturarFrameDeVideo(fuente);
      if (blobLocal) {
        subirFotoPeritoVideoperitaje(sesion._id, blobLocal, { descripcion: 'Captura videoperitaje' })
          .then(() => onRefresh?.())
          .catch((err) => setLkError(err.message));
      }
    } catch (err) {
      setLkError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:h-[min(82vh,860px)]">
          {/* Cámara del asegurado (Izquierda / Principal) */}
          <div className="relative flex min-h-[52vh] flex-1 items-center justify-center overflow-hidden rounded-xl bg-black lg:min-h-0">
            <video
              ref={room.remoteVideoRef}
              autoPlay
              playsInline
              muted
              className={
                room.remotePresent
                  ? 'h-full w-full object-contain [transform:none] [-webkit-transform:none]'
                  : 'pointer-events-none absolute inset-0 h-full w-full opacity-0'
              }
              style={
                room.remotePresent
                  ? {
                      objectFit: 'contain',
                      objectPosition: 'center',
                      transform: 'none',
                      WebkitTransform: 'none',
                    }
                  : undefined
              }
            />
            {grabando && (
              <p className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow">
                <FaCircle className="animate-pulse text-[8px]" />
                {t('videoperitaje.recording')} {Math.floor(segGrabacion / 60)}:
                {String(segGrabacion % 60).padStart(2, '0')}
              </p>
            )}
            {subiendoVideo && (
              <p className="absolute inset-x-3 bottom-3 z-10 rounded-lg bg-black/75 px-3 py-2 text-center text-xs font-semibold text-white">
                {t('videoperitaje.savingRecording')}
              </p>
            )}
            {!room.remotePresent && (
              <p className="pointer-events-none absolute inset-x-0 bottom-6 z-10 px-3 text-center text-sm font-medium text-white/90">
                {aseguradoEnPortal ? t('videoperitaje.clientNoVideo') : t('videoperitaje.waitingClient')}
              </p>
            )}
            {aseguradoEnPortal && !room.remotePresent && (
              <p className="absolute left-3 top-3 z-10 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow">
                {t('videoperitaje.clientOnLink')}
              </p>
            )}
          </div>

          {/* Columna Derecha: 4 Botones + Cámara del Ajustador debajo */}
          <div className="flex w-full flex-col gap-2.5 lg:w-[260px] lg:flex-shrink-0">
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#f04461] hover:bg-[#d6304d] px-3 text-sm font-bold text-white shadow-sm transition"
              onClick={grabando ? detenerGrabacion : iniciarGrabacion}
            >
              {grabando ? (
                <>
                  <FaStop className="text-xs" /> Detener grabación
                </>
              ) : (
                <>
                  <FaCircle className="text-[9px]" /> Iniciar grabación
                </>
              )}
            </button>

            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#c2185b] hover:bg-[#a0134a] px-3 text-sm font-bold text-white shadow-sm transition disabled:opacity-50"
              disabled={!room.remotePresent}
              onClick={() => room.sendData?.({ type: 'SWITCH_CAMERA' }).catch(() => {})}
            >
              <FaSyncAlt className="text-xs" /> Cambiar cámara
            </button>

            <button
              type="button"
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-md px-3 text-sm font-bold shadow-sm transition disabled:opacity-50 ${
                flashCliente
                  ? 'bg-[#ffeb3b] text-gray-900'
                  : 'bg-[#f5c518] hover:bg-[#e0b010] text-gray-900'
              }`}
              disabled={!room.remotePresent}
              onClick={() => {
                setFlashCliente((v) => !v);
                room.sendData?.({ type: 'TORCH' }).catch(() => setFlashCliente(false));
              }}
            >
              <FaLightbulb className="text-xs" /> {flashCliente ? 'Flash encendido' : 'Flash apagado'}
            </button>

            {/* Espacio central intermedio gris como en la competencia */}
            <div className="flex-1 min-h-[40px] rounded-lg bg-[#383838] dark:bg-gray-900/60" />

            {/* Bloque inferior: Botón Hacer foto + Cámara del Ajustador pequeña (aspect 4:3) */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button
                type="button"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#00a0e9] hover:bg-[#008ecb] px-3 text-sm font-bold text-white shadow-sm transition disabled:opacity-50"
                onClick={capturar}
                disabled={busy || !room.connected}
              >
                <FaCamera className="text-xs" /> {busy ? t('videoperitaje.capturing') : 'Hacer foto'}
              </button>

              <div className="relative aspect-[4/3] w-full max-h-[220px] overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-gray-800">
                <video
                  ref={room.localVideoRef}
                  muted
                  autoPlay
                  playsInline
                  className={`h-full w-full object-cover ${room.cameraOn ? '' : 'opacity-0'}`}
                  style={{ objectFit: 'cover', transform: 'scaleX(-1)' }}
                />
                {!room.cameraOn && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-xs font-semibold text-gray-400">
                    Cámara apagada
                  </div>
                )}
              </div>

              {onFinalizar && (
                <button
                  type="button"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#f04461] hover:bg-[#d6304d] px-3 text-sm font-bold text-white shadow-sm transition disabled:opacity-50"
                  disabled={cerrando}
                  onClick={onFinalizar}
                >
                  <FaCheck className="text-xs" /> Finalizar sesión
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Barra inferior: Botón Apagar/Encender cámara a la izq y Sincronizado a la der */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            onClick={room.toggleCamera}
          >
            {room.cameraOn ? 'Apagar cámara' : 'Encender cámara'}
          </button>
          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Sincronizado
          </span>
        </div>
      </div>

      {lkError && <p className="mt-2 text-sm text-amber-700">{lkError}</p>}
      {room.error && <p className="mt-2 text-sm text-red-600">{room.error}</p>}
      {lk && !room.connected && !room.error && (
        <p className="mt-2 text-sm text-gray-500">Conectando al servidor de video…</p>
      )}
      {lk && room.connected && !room.remotePresent && aseguradoEnPortal && (
        <p className="mt-2 text-sm text-amber-700">{t('videoperitaje.clientNoVideo')}</p>
      )}
    </div>
  );
}

export default function VideoperitajeSala() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [sesion, setSesion] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cerrando, setCerrando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const r = await obtenerSesionVideoperitaje(id);
      setSesion(r.data);
      return r.data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [id]);

  const finalizarSesion = useCallback(async () => {
    if (cerrando) return;
    setCerrando(true);
    setAviso('');
    try {
      if (typeof window.__vpFlushGrabacion === 'function') {
        window.__vpFlushGrabacion({ waitUpload: false });
      }
      if (typeof window.__vpHangupLive === 'function') {
        window.__vpHangupLive();
      }
      await finalizarSesionVideoperitaje(sesion?._id);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCerrando(false);
    }
  }, [cerrando, sesion?._id, cargar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Solo sondear en vivo (presencia del asegurado). En finalizada NO: hidratar 47 fotos
  // cada 3s saturaba S3/API y Arnald se “desincronizaba”.
  useEffect(() => {
    if (!sesion) return undefined;
    const viva = sesion.estado === 'pendiente' || sesion.estado === 'en_proceso';
    if (!viva) return undefined;
    const timer = setInterval(cargar, 5000);
    return () => clearInterval(timer);
  }, [cargar, sesion?.estado]);

  if (error && !sesion) {
    return (
      <div className={vpPage}>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }
  if (!sesion) {
    return (
      <div className={vpPage}>
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  const abierta = sesion.estado === 'pendiente' || sesion.estado === 'en_proceso';
  const esLiveActiva = sesion.tipo === 'live' && (abierta || cerrando);

  return (
    <div className={vpPage}>
      <div className={esLiveActiva ? 'mx-auto w-full max-w-[1600px] px-2 sm:px-4' : vpWrap}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link to="/videoperitaje" className="text-sm text-fenix-primario">
              ← {t('videoperitaje.title')}
            </Link>
            <h1 className="mt-1 font-display text-2xl font-bold text-gray-900 dark:text-white">
              {sesion.expediente || t('videoperitaje.session')}
            </h1>
            <p className="text-sm text-gray-500">
              {sesion.aseguradoNombre} · {etiquetaEstado(sesion.estado)}
              {sesion.geo?.lat
                ? ` · ${Number(sesion.geo.lat).toFixed(5)}, ${Number(sesion.geo.lng).toFixed(5)}`
                : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {abierta && (
              <button
                type="button"
                className={vpBtnGhost}
                onClick={async () => {
                  const r = await reenviarInvitacionVideoperitaje(sesion._id);
                  setAviso(urlPortalAsegurado(r.urlPublica) || t('videoperitaje.resent'));
                }}
              >
                {t('videoperitaje.resend')}
              </button>
            )}
            {abierta && (
              <button
                type="button"
                className={vpBtnPrimary}
                disabled={cerrando}
                onClick={finalizarSesion}
              >
                <FaCheck /> {t('videoperitaje.finish')}
              </button>
            )}
          </div>
        </div>
        {aviso && <p className="mb-3 break-all text-sm text-green-700">{aviso}</p>}

        {esLiveActiva ? (
          <div>
            <SalaLivePerito
              sesion={sesion}
              onRefresh={cargar}
              onFinalizar={finalizarSesion}
              cerrando={cerrando}
            />
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:p-6">
              <VideoperitajeGaleria
                medias={sesion.medias}
                tituloBloque={`Videoperitaje_${sesion.expediente || sesion._id}`}
              />
            </div>
          </div>
        ) : (
          <div className={vpCard}>
            {sesion.tipo === 'live' ? (
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <FaVideoSlash /> {t('videoperitaje.sessionClosed')}
              </p>
            ) : (
              <div>
                <h2 className="font-semibold text-gray-800 dark:text-gray-100">
                  {sesion.plantillaTitulo || t('videoperitaje.typeGuided')}
                </h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {(sesion.pasos || []).map((p) => {
                    const delPaso = (sesion.medias || []).filter((m) => m.pasoId === p.id);
                    const n = delPaso.length;
                    const ok = (sesion.pasosCumplidos || []).includes(p.id);
                    return (
                      <li key={p.id} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">{p.titulo}</span>
                          <span className={ok ? 'text-green-600' : 'text-gray-500'}>
                            {n}/{p.maxFotos} {ok ? '✓' : ''}
                          </span>
                        </div>
                        <p className="text-gray-500">{p.instruccion}</p>
                        {n > 0 && (
                          <button
                            type="button"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-700"
                            onClick={() =>
                              descargarBloqueVideoperitaje(delPaso, {
                                nombre: `${sesion.expediente || 'Videoperitaje'}_${p.titulo}`,
                              }).catch((err) => window.alert(err.message))
                            }
                          >
                            <FaDownload /> {t('videoperitaje.downloadBlock')}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <VideoperitajeGaleria
              medias={sesion.medias}
              tituloBloque={`Videoperitaje_${sesion.expediente || sesion._id}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
