import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCamera, FaCheck, FaCircle, FaDownload, FaStop, FaVideoSlash } from 'react-icons/fa';
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function SalaLivePerito({ sesion, onRefresh }) {
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

  const conectar = useCallback(async () => {
    setLkError('');
    try {
      const r = await tokenLivekitPerito(sesion._id);
      if (!livekitUsableEnEstaPagina(r?.url)) {
        setLk(null);
        return;
      }
      setLk(r);
    } catch (err) {
      setLkError(err.message);
    }
  }, [sesion._id]);

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

  const detenerGrabacion = useCallback(async () => {
    if (flushPromiseRef.current) return flushPromiseRef.current;
    const rec = grabacionRef.current;
    grabacionRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setGrabando(false);
    if (!rec) return null;
    const job = (async () => {
      setSubiendoVideo(true);
      try {
        const blob = await rec.stop();
        if (blob && blob.size > 4000) {
          await subirFotoPeritoVideoperitaje(sesion._id, blob, {
            descripcion: 'Grabación de la videollamada',
            tipo: 'video',
            filename: `grabacion-${Date.now()}.webm`,
          });
          await onRefresh?.();
        }
      } catch (err) {
        setLkError(err.message);
        throw err;
      } finally {
        setSubiendoVideo(false);
      }
    })();
    flushPromiseRef.current = job;
    try {
      await job;
    } finally {
      if (flushPromiseRef.current === job) flushPromiseRef.current = null;
    }
  }, [sesion._id, onRefresh]);

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
    return () => {
      if (window.__vpFlushGrabacion === detenerGrabacion) delete window.__vpFlushGrabacion;
    };
  }, [detenerGrabacion]);

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

  const capturar = async () => {
    setBusy(true);
    setLkError('');
    try {
      const antes = (sesion.medias || []).length;
      let llegó = false;
      if (room.connected) {
        await room.sendCaptureCommand();
        for (let i = 0; i < 8; i += 1) {
          await sleep(700);
          const r = await onRefresh?.();
          if ((r?.medias?.length || 0) > antes) {
            llegó = true;
            break;
          }
        }
      }
      if (!llegó) {
        const fuente = room.remoteVideoRef.current?.videoWidth
          ? room.remoteVideoRef.current
          : room.localVideoRef.current;
        const blob = await capturarFrameDeVideo(fuente);
        if (blob) {
          await subirFotoPeritoVideoperitaje(sesion._id, blob, {
            descripcion: 'Captura HD del ajustador',
          });
          await onRefresh?.();
        }
      }
    } catch (err) {
      setLkError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
        {t('videoperitaje.clientCamera')}
      </p>
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video
            ref={room.remoteVideoRef}
            autoPlay
            playsInline
            className={
              room.remotePresent
                ? 'aspect-video w-full bg-black object-contain'
                : 'pointer-events-none absolute h-px w-px opacity-0'
            }
          />
          <video
            ref={room.localVideoRef}
            muted
            autoPlay
            playsInline
            className={
              room.remotePresent
                ? 'absolute right-3 top-3 z-10 w-[28%] rounded-lg border-2 border-white bg-gray-900 object-cover shadow-lg'
                : 'aspect-video w-full bg-black object-contain'
            }
            style={room.remotePresent ? { aspectRatio: '4 / 3' } : undefined}
          />
          {grabando && (
            <p className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
              <FaCircle className="animate-pulse text-[8px]" />
              {t('videoperitaje.recording')} {Math.floor(segGrabacion / 60)}:
              {String(segGrabacion % 60).padStart(2, '0')}
            </p>
          )}
          {subiendoVideo && (
            <p className="absolute inset-x-3 bottom-3 z-10 rounded-lg bg-black/70 px-3 py-2 text-center text-xs font-semibold text-white">
              {t('videoperitaje.savingRecording')}
            </p>
          )}
          {!room.remotePresent && (
            <p className="pointer-events-none absolute inset-x-0 bottom-3 z-10 text-center text-sm text-white/80">
              {t('videoperitaje.waitingClient')}
            </p>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={vpBtnPrimary} onClick={capturar} disabled={busy}>
            <FaCamera /> {busy ? t('videoperitaje.capturing') : t('videoperitaje.capture')}
          </button>
          {grabando ? (
            <button type="button" className={vpBtnGhost} onClick={detenerGrabacion}>
              <FaStop /> {t('videoperitaje.stopRecording')}
            </button>
          ) : (
            <button type="button" className={vpBtnGhost} onClick={iniciarGrabacion}>
              <FaCircle className="text-red-600" /> {t('videoperitaje.recordCall')}
            </button>
          )}
          <button type="button" className={vpBtnGhost} onClick={room.toggleCamera}>
            {room.cameraOn ? t('videoperitaje.cameraOff') : t('videoperitaje.cameraOn')}
          </button>
        </div>
        {lkError && (
          <p className="mt-2 text-sm text-amber-700">
            {lkError}. {t('videoperitaje.livekitHint')}
          </p>
        )}
        {room.error && <p className="mt-2 text-sm text-red-600">{room.error}</p>}
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

  useEffect(() => {
    cargar();
    const timer = setInterval(cargar, 8000);
    return () => clearInterval(timer);
  }, [cargar]);

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

  return (
    <div className={vpPage}>
      <div className={vpWrap}>
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
                onClick={async () => {
                  if (cerrando) return;
                  setCerrando(true);
                  setAviso(t('videoperitaje.savingRecording'));
                  try {
                    if (typeof window.__vpFlushGrabacion === 'function') {
                      await window.__vpFlushGrabacion();
                    }
                    await finalizarSesionVideoperitaje(sesion._id);
                    setAviso('');
                    await cargar();
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setCerrando(false);
                  }
                }}
              >
                <FaCheck /> {cerrando ? t('videoperitaje.savingRecording') : t('videoperitaje.finish')}
              </button>
            )}
          </div>
        </div>
        {aviso && <p className="mb-3 break-all text-sm text-green-700">{aviso}</p>}

        <div className={vpCard}>
          {sesion.tipo === 'live' && (abierta || cerrando) ? (
            <SalaLivePerito sesion={sesion} onRefresh={cargar} />
          ) : sesion.tipo === 'live' && !abierta ? (
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
      </div>
    </div>
  );
}
