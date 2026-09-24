import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { arnaldLogo, arnaldIcon } from '../../config/brandAssets.js';
import useVideoperitajeRoom from '../../hooks/useVideoperitajeRoom.js';
import {
  completarPasoPublicoVideoperitaje,
  joinSesionPublica,
  leerGeoNavegador,
  obtenerSesionPublica,
  subirFotoPublicaVideoperitaje,
} from '../../services/videoperitajeService.js';
import { capturarFotoHd, pistaVideoDeSala } from '../../utils/videoperitajeCapturaHd.js';

const btn =
  'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#c8102e] px-4 py-3 text-base font-semibold text-white disabled:opacity-50';
const card = 'rounded-2xl bg-white p-4 shadow-sm';

function sesionCerrada(sesion) {
  return sesion?.estado === 'finalizada' || sesion?.estado === 'cancelada';
}

function GraciasArnald({ cancelada }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center text-white">
      <style>{`
        @keyframes vpThanksPop { 0%{transform:scale(.35);opacity:0} 65%{transform:scale(1.1);opacity:1} 100%{transform:scale(1);opacity:1} }
        @keyframes vpThanksRing { 0%{transform:scale(.55);opacity:.5} 100%{transform:scale(1.85);opacity:0} }
        @keyframes vpThanksUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes vpThanksGlow { 0%,100%{filter:drop-shadow(0 0 8px rgba(200,16,46,.3))} 50%{filter:drop-shadow(0 0 22px rgba(200,16,46,.75))} }
      `}</style>
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 28%, #1a2744 0%, #0b1220 68%)' }}
      />
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-2 flex h-[132px] w-[132px] items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-[#c8102e]/45 [animation:vpThanksRing_2.2s_ease-out_infinite]" />
          <span className="absolute inset-0 rounded-full border-2 border-[#c8102e]/45 [animation:vpThanksRing_2.2s_ease-out_.75s_infinite]" />
          <img
            src={arnaldIcon}
            alt="Arnald"
            className="relative z-10 h-[86px] w-[86px] object-contain [animation:vpThanksPop_.75s_cubic-bezier(.2,1.35,.35,1)_both,vpThanksGlow_2.4s_ease-in-out_.8s_infinite]"
          />
        </div>
        <img
          src={arnaldLogo}
          alt="Arnald DataFlow"
          className="mb-2 w-[min(250px,74vw)] [animation:vpThanksUp_.7s_ease_.22s_both]"
        />
        <h2 className="mb-2 text-[34px] font-extrabold tracking-tight [animation:vpThanksUp_.7s_ease_.38s_both]">
          {cancelada ? 'Sesión cerrada' : '¡Gracias!'}
        </h2>
        <p className="max-w-sm text-[15px] leading-relaxed text-slate-300 [animation:vpThanksUp_.7s_ease_.52s_both]">
          {cancelada
            ? 'El ajustador cerró esta videollamada. Ya puede salir.'
            : 'Gracias por atender el videoperitaje con Arnald DataFlow. Las evidencias quedaron en el expediente. Ya puede cerrar esta ventana.'}
        </p>
      </div>
    </div>
  );
}

function LiveGuest({ livekit, token, onCallEnded }) {
  const room = useVideoperitajeRoom({
    token: livekit?.token,
    url: livekit?.url,
    facingMode: 'user',
    publishVideo: true,
    publishAudio: true,
    portrait: true,
    onDisconnected: onCallEnded,
  });
  const frontal = room.facing !== 'environment';
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!room.connected || !token) return undefined;
    return room.onData(async (msg) => {
      if (msg?.type !== 'CAPTURE') return;
      try {
        setFlash(true);
        const blob = await capturarFotoHd({
          videoEl: room.localVideoRef.current,
          mediaStreamTrack: room.getLocalVideoTrack() || pistaVideoDeSala(room.roomRef.current),
        });
        if (blob) {
          await subirFotoPublicaVideoperitaje(token, blob, {
            descripcion: 'Captura videoperitaje',
          });
        }
      } catch {
        /* el ajustador reintenta con fallback */
      } finally {
        setTimeout(() => setFlash(false), 180);
      }
    });
  }, [room.connected, token]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <video
        ref={room.localVideoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 h-full w-full bg-black object-cover [-webkit-transform:scaleX(-1)] [transform:scaleX(-1)]"
        style={{ objectFit: 'cover', objectPosition: 'center', transform: 'scaleX(-1)' }}
      />
      <video
        ref={room.remoteVideoRef}
        autoPlay
        playsInline
        className="absolute bottom-6 right-3 z-10 h-[150px] w-[112px] rounded-lg border-2 border-white bg-black object-cover shadow-lg [transform:none]"
        style={{ objectFit: 'cover', objectPosition: 'center', transform: 'none' }}
      />
      <p className="pointer-events-none absolute left-3 top-3 z-20 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/80">
        Grupo Proser · Videoperitaje
      </p>
      {flash && <div className="pointer-events-none absolute inset-0 z-40 bg-white/70" />}
      {!room.remotePresent && (
        <p className="absolute left-3 top-20 rounded-full bg-black/55 px-2 py-1 text-[11px] text-white/90">
          Esperando al ajustador…
        </p>
      )}
      {room.error && (
        <p className="absolute inset-x-3 top-28 rounded-lg bg-red-600/90 p-2 text-center text-xs text-white">
          {room.error}
        </p>
      )}
      <button
        type="button"
        onClick={room.switchCamera}
        className="absolute left-3 top-8 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg"
        aria-label={frontal ? 'Cambiar a cámara trasera' : 'Cambiar a cámara frontal'}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M16 4h2a2 2 0 0 1 2 2v2M8 20H6a2 2 0 0 1-2-2v-2M20 16v2a2 2 0 0 1-2 2h-2M4 8V6a2 2 0 0 1 2-2h2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      <p className="absolute left-16 top-[2.65rem] z-20 text-[10px] text-white/80">
        {frontal ? 'Cámara frontal' : 'Cámara trasera'}
      </p>
    </div>
  );
}

function GuidedGuest({ token, sesion, onRefresh }) {
  const pasos = sesion.pasos || [];
  const cumplidos = new Set(sesion.pasosCumplidos || []);
  const actual = pasos.find((p) => !cumplidos.has(p.id)) || pasos[pasos.length - 1];
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const inputRef = useRef(null);

  if (!actual) {
    return (
      <div className={card}>
        <h2 className="text-lg font-bold">Inspección completa</h2>
        <p className="text-sm text-gray-600">Ya enviamos las fotos al expediente. Puede cerrar esta ventana.</p>
      </div>
    );
  }

  const fotosPaso = (sesion.medias || []).filter((m) => m.pasoId === actual.id).length;

  const enviarArchivo = async (file) => {
    if (!file) return;
    setBusy(true);
    setMsg('');
    try {
      await subirFotoPublicaVideoperitaje(token, file, {
        pasoId: actual.id,
        descripcion: actual.titulo,
      });
      await onRefresh();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${card} space-y-3`}>
      <p className="text-xs font-semibold uppercase text-[#c8102e]">
        Paso {pasos.indexOf(actual) + 1} de {pasos.length}
      </p>
      <h2 className="text-lg font-bold">{actual.titulo}</h2>
      <p className="text-sm text-gray-600">{actual.instruccion}</p>
      <p className="text-xs text-gray-500">
        Fotos {fotosPaso}/{actual.maxFotos} (mínimo {actual.minFotos})
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => enviarArchivo(e.target.files?.[0])}
      />
      <button type="button" className={btn} disabled={busy} onClick={() => inputRef.current?.click()}>
        <FaCamera /> {busy ? 'Enviando…' : 'Tomar o subir foto'}
      </button>
      {fotosPaso >= (actual.minFotos || 0) && (
        <button
          type="button"
          className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 px-4 py-3 font-semibold"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await completarPasoPublicoVideoperitaje(token, actual.id);
              await onRefresh();
            } catch (err) {
              setMsg(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Continuar
        </button>
      )}
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}

export default function PortalVideoperitajeUnirse() {
  const { token } = useParams();
  const [sesion, setSesion] = useState(null);
  const [livekit, setLivekit] = useState(null);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const [callEnded, setCallEnded] = useState(false);

  const cargar = useCallback(async () => {
    const r = await obtenerSesionPublica(token);
    setSesion(r.data);
  }, [token]);

  useEffect(() => {
    cargar().catch((err) => setError(err.message));
  }, [cargar]);

  useEffect(() => {
    if (!joined || sesionCerrada(sesion) || callEnded) return undefined;
    const id = setInterval(() => {
      cargar().catch(() => {});
    }, 2500);
    return () => clearInterval(id);
  }, [joined, sesion?.estado, callEnded, cargar]);

  const entrar = async () => {
    setError('');
    try {
      const geo = await leerGeoNavegador();
      const r = await joinSesionPublica(token, geo);
      setSesion(r.data);
      setLivekit(r.livekit && r.livekit.token ? r.livekit : null);
      setJoined(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const cerrada = sesionCerrada(sesion) || callEnded;
  const enLlamada = joined && sesion?.tipo === 'live' && !cerrada;

  return (
    <div className={enLlamada ? 'min-h-screen bg-black' : 'min-h-screen bg-[#f4f4f5] px-4 py-6'}>
      <div className={enLlamada ? '' : 'mx-auto max-w-md space-y-4'}>
        {!enLlamada && !cerrada && (
          <header className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#c8102e]">Grupo Proser</p>
            <h1 className="text-lg font-bold text-gray-900">Videoperitaje</h1>
          </header>
        )}
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!sesion && !error && <p className="text-center text-sm text-gray-500">Cargando…</p>}
        {cerrada && <GraciasArnald cancelada={sesion?.estado === 'cancelada'} />}
        {sesion && !cerrada && !joined && (
          <div className={`${card} space-y-3`}>
            <p className="text-sm text-gray-700">
              Hola{sesion.aseguradoNombre ? ` ${sesion.aseguradoNombre}` : ''}. Un ajustador de Grupo Proser lo espera
              {sesion.expediente ? ` para el expediente ${sesion.expediente}` : ''}.
            </p>
            <p className="text-xs text-gray-500">
              Es una videollamada. Permita cámara y micrófono. El ajustador tomará las fotos.
            </p>
            <button type="button" className={btn} onClick={entrar}>
              Entrar a la videollamada
            </button>
          </div>
        )}
        {joined && sesion?.tipo === 'live' && !cerrada && (
          <LiveGuest
            livekit={livekit}
            token={token}
            onCallEnded={() => {
              setCallEnded(true);
              cargar().catch(() => {});
            }}
          />
        )}
        {joined && sesion?.tipo === 'guided' && !cerrada && (
          <GuidedGuest token={token} sesion={sesion} onRefresh={cargar} />
        )}
      </div>
    </div>
  );
}
