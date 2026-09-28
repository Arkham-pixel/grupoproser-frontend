import { useCallback, useEffect, useRef, useState } from 'react';
import { livekitUsableEnEstaPagina } from '../components/SubcomponenteVideoperitaje/videoperitajeUi.js';
import {
  DisconnectReason,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  createLocalVideoTrack,
} from 'livekit-client';

/** Reintentos cortos: sin esto, un blip de red deja al asegurado fuera y el ajustador sin video. */
const RECONEXION_LIMITADA = {
  nextRetryDelayInMs: (ctx) => {
    if (!ctx || ctx.retryCount > 8) return null;
    return Math.min(800 * 2 ** ctx.retryCount, 8000);
  },
};

function soltarMediosLocales(room) {
  const p = room?.localParticipant;
  if (!p) return;
  const pubs = [
    ...(p.videoTrackPublications?.values?.() || []),
    ...(p.audioTrackPublications?.values?.() || []),
  ];
  pubs.forEach((pub) => {
    try {
      pub.track?.stop();
      pub.track?.mediaStreamTrack?.stop();
    } catch {
      /* ignore */
    }
  });
  try {
    p.setCameraEnabled(false);
  } catch {
    /* ignore */
  }
  try {
    p.setMicrophoneEnabled(false);
  } catch {
    /* ignore */
  }
}

export default function useVideoperitajeRoom({
  token,
  url,
  facingMode = 'user',
  publishVideo = true,
  publishAudio = true,
  portrait = false,
  onDisconnected,
}) {
  const onDisconnectedRef = useRef(onDisconnected);
  onDisconnectedRef.current = onDisconnected;
  const roomRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteTrackRef = useRef(null);
  const previewStreamRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [remotePresent, setRemotePresent] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  const facingRef = useRef(facingMode);
  const portraitRef = useRef(portrait);
  portraitRef.current = portrait;
  const [facing, setFacing] = useState(facingMode);
  // Escritorio: 720p. Celular: 720×1280 (FOV amplio).
  // Pedir 1080×1920 / 4K hace que muchos teléfonos recorten el sensor (cara gigante).
  const resolucionDe = () =>
    portraitRef.current
      ? { width: 720, height: 1280 }
      : VideoPresets.h720.resolution;

  const constraintsVideo = (nivel = 'alta') => {
    const facing = facingRef.current;
    if (nivel === 'basica') {
      return { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } };
    }
    if (nivel === 'media') {
      return {
        facingMode: { ideal: facing },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 24 },
      };
    }
    const res = resolucionDe();
    return {
      facingMode: { ideal: facing },
      width: { ideal: res.width },
      height: { ideal: res.height },
      frameRate: { ideal: 24 },
    };
  };

  const aplicarVideoEl = (el, { espejo = false, fit = 'cover' } = {}) => {
    if (!el) return;
    el.removeAttribute('width');
    el.removeAttribute('height');
    el.style.objectFit = fit;
    el.style.objectPosition = 'center';
    const t = espejo ? 'scaleX(-1)' : 'none';
    el.style.transform = t;
    el.style.webkitTransform = t;
  };

  const attachRemote = useCallback((track) => {
    if (!track || track.kind !== Track.Kind.Video) return;
    remoteTrackRef.current = track;
    setRemotePresent(true);
    const el = remoteVideoRef.current;
    if (!el) return;
    track.attach(el);
    // contain = encuadre completo del celular (sin zoom/recorte en pantalla).
    el.removeAttribute('width');
    el.removeAttribute('height');
    el.muted = true;
    el.playsInline = true;
    el.style.objectFit = 'contain';
    el.style.objectPosition = 'center';
    el.style.transform = 'none';
    el.style.webkitTransform = 'none';
    const play = () => el.play?.().catch(() => {});
    if (el.readyState >= 2) play();
    else el.onloadedmetadata = play;
    requestAnimationFrame(() => {
      if (!remoteVideoRef.current) return;
      remoteVideoRef.current.style.transform = 'none';
      remoteVideoRef.current.style.webkitTransform = 'none';
      remoteVideoRef.current.style.objectFit = 'contain';
      play();
    });
  }, []);

  const attachLocalPreview = useCallback((el) => {
    // Frontal: espejo. Trasera: real.
    const espejo = facingRef.current !== 'environment';
    aplicarVideoEl(el, { espejo });
    requestAnimationFrame(() => aplicarVideoEl(el, { espejo }));
  }, []);

  const mediaDisponible = () =>
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function';

  const mostrarPreviewLocal = useCallback(async () => {
    if (!publishVideo && !publishAudio) return null;
    if (!mediaDisponible()) {
      setError(
        'El navegador bloquea la cámara. Use Chrome o Safari en https:// (no Gmail).'
      );
      return null;
    }
    if (previewStreamRef.current) {
      const el = localVideoRef.current;
      if (el && !el.srcObject) {
        el.srcObject = previewStreamRef.current;
        el.muted = true;
        el.play?.().catch(() => {});
      }
      if (el) attachLocalPreview(el);
      return previewStreamRef.current;
    }
    let lastErr = null;
    const intentos = publishVideo
      ? [
          { video: constraintsVideo('alta'), audio: publishAudio },
          { video: constraintsVideo('media'), audio: publishAudio },
          { video: constraintsVideo('basica'), audio: publishAudio },
          { video: true, audio: publishAudio },
        ]
      : [{ video: false, audio: publishAudio }];

    for (const constraints of intentos) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        previewStreamRef.current = stream;
        const el = localVideoRef.current;
        if (el && publishVideo) {
          el.srcObject = stream;
          el.muted = true;
          el.setAttribute('playsinline', '');
          attachLocalPreview(el);
          el.play?.().catch(() => {});
        }
        setCameraOn(Boolean(stream.getVideoTracks().find((t) => t.readyState === 'live')));
        setError('');
        return stream;
      } catch (err) {
        lastErr = err;
      }
    }

    const raw = String(lastErr?.message || lastErr || '');
    if (/Could not start video source|NotReadableError|Device in use/i.test(raw)) {
      setError(
        'La cámara del PC está ocupada o bloqueada. Cierra Zoom/Teams/otra pestaña, permite la cámara en Chrome y pulsa Encender cámara.'
      );
    } else if (/NotAllowedError|Permission/i.test(raw)) {
      setError('Permita el acceso a la cámara en el navegador y pulse Encender cámara.');
    } else {
      setError(raw || 'No se pudo abrir la cámara.');
    }
    setCameraOn(false);
    return null;
  }, [publishAudio, publishVideo, attachLocalPreview]);

  const syncRemotes = useCallback(
    (room) => {
      if (!room) return;
      let hasVideo = false;
      room.remoteParticipants.forEach((p) => {
        p.videoTrackPublications.forEach((pub) => {
          if (pub.kind === Track.Kind.Video && pub.setSubscribed && !pub.isSubscribed) {
            try {
              pub.setSubscribed(true);
            } catch {
              /* ignore */
            }
          }
          if (pub.track) {
            hasVideo = true;
            attachRemote(pub.track);
          }
        });
        p.audioTrackPublications.forEach((pub) => {
          if (pub.track) pub.track.attach();
        });
      });
      if (hasVideo) setRemotePresent(true);
      else if (room.remoteParticipants.size === 0) {
        remoteTrackRef.current = null;
        setRemotePresent(false);
      }
    },
    [attachRemote]
  );

  const connect = useCallback(async () => {
    if (!token || !url) return;
    if (!livekitUsableEnEstaPagina(url)) {
      setError('URL de video no usable desde esta página.');
      return;
    }
    setError('');
    // Cámara en paralelo: no bloquear la entrada a LiveKit (si no, se pierde el track del asegurado).
    const previewPromise = mostrarPreviewLocal();
    const res = resolucionDe();
    const room = new Room({
      adaptiveStream: false,
      dynacast: true,
      stopLocalTrackOnUnpublish: true,
      disconnectOnPageLeave: true,
      reconnectPolicy: RECONEXION_LIMITADA,
      videoCaptureDefaults: {
        facingMode,
        ...(res ? { resolution: res } : {}),
      },
      videoPublishDefaults: {
        videoEncoding: {
          maxBitrate: portraitRef.current ? 2500000 : 3500000,
          maxFramerate: portraitRef.current ? 24 : 30,
        },
      },
    });
    roomRef.current = room;

    const onTrack = (track, participant) => {
      if (participant?.isLocal) return;
      if (track.kind === Track.Kind.Audio) {
        track.attach();
      }
      if (track.kind === Track.Kind.Video) {
        attachRemote(track);
      }
    };
    const onUnpublish = (_pub, participant) => {
      if (!participant?.isLocal) syncRemotes(room);
    };

    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => onTrack(track, participant));
    room.on(RoomEvent.TrackUnsubscribed, onUnpublish);
    room.on(RoomEvent.TrackPublished, (_pub, participant) => {
      if (!participant?.isLocal) syncRemotes(room);
    });
    room.on(RoomEvent.ParticipantConnected, () => syncRemotes(room));
    room.on(RoomEvent.ParticipantDisconnected, () => syncRemotes(room));
    room.on(RoomEvent.Reconnected, () => syncRemotes(room));
    room.on(RoomEvent.Disconnected, (reason) => {
      setConnected(false);
      remoteTrackRef.current = null;
      setRemotePresent(false);
      const preview = previewStreamRef.current;
      const el = localVideoRef.current;
      if (preview && el) {
        el.srcObject = preview;
        el.muted = true;
        el.play?.().catch(() => {});
        setCameraOn(Boolean(preview.getVideoTracks().find((t) => t.readyState === 'live')));
      }
      if (reason === DisconnectReason.CLIENT_INITIATED) return;
      onDisconnectedRef.current?.();
    });

    try {
      await room.connect(url, token);
      setConnected(true);
      syncRemotes(room);
      const preview = previewStreamRef.current || (await previewPromise);
      if (preview && room.state && room.localParticipant) {
        try {
          for (const track of preview.getAudioTracks()) {
            await room.localParticipant.publishTrack(track);
          }
          for (const track of preview.getVideoTracks()) {
            await room.localParticipant.publishTrack(track);
          }
          const el = localVideoRef.current;
          if (el) {
            if (!el.srcObject) {
              el.srcObject = preview;
              el.muted = true;
              el.play?.().catch(() => {});
            }
            attachLocalPreview(el);
          }
          setCameraOn(Boolean(preview.getVideoTracks().find((t) => t.readyState === 'live')));
        } catch (pubErr) {
          setError(pubErr.message || 'No se pudo publicar la cámara');
        }
      }
      syncRemotes(room);
    } catch (err) {
      const raw = String(err.message || err || '');
      setError(
        /signal|timed out|websocket|failed to fetch|establish|content.security.policy|refused to connect/i.test(
          raw
        )
          ? 'No se pudo conectar al servidor de video. Recargue la sala o verifique LiveKit.'
          : raw || 'No se pudo conectar a la sala'
      );
    }
  }, [
    token,
    url,
    facingMode,
    publishAudio,
    publishVideo,
    attachRemote,
    attachLocalPreview,
    mostrarPreviewLocal,
    syncRemotes,
  ]);

  useEffect(() => {
    connect();
    return () => {
      const room = roomRef.current;
      if (room) {
        try {
          room.disconnect();
        } catch {
          /* ignore */
        }
        roomRef.current = null;
      }
    };
  }, [connect]);

  // Re-enganchar video remoto si el <video> cambió de tamaño/clase (antes era 1×1 px y Chrome no decodifica).
  useEffect(() => {
    if (!remotePresent || !remoteTrackRef.current) return;
    attachRemote(remoteTrackRef.current);
  }, [remotePresent, attachRemote]);

  // Rescate: si el asegurado ya publica y el evento se perdió, re-sincronizar.
  useEffect(() => {
    if (!connected) return undefined;
    const tick = () => syncRemotes(roomRef.current);
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [connected, syncRemotes]);

  useEffect(() => {
    if (connected) return;
    const el = localVideoRef.current;
    const stream = previewStreamRef.current;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
      el.muted = true;
      el.play?.().catch(() => {});
    }
    if (el && stream) attachLocalPreview(el);
  }, [connected, cameraOn, attachLocalPreview]);

  useEffect(
    () => () => {
      previewStreamRef.current?.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          /* ignore */
        }
      });
      previewStreamRef.current = null;
    },
    []
  );

  const disconnect = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    soltarMediosLocales(room);
    room.disconnect();
    roomRef.current = null;
    remoteTrackRef.current = null;
    setConnected(false);
    setRemotePresent(false);
  }, []);

  const switchCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = facingRef.current === 'environment' ? 'user' : 'environment';
    try {
      const pubs = Array.from(room.localParticipant.videoTrackPublications.values());
      const current = pubs.find((p) => p.track)?.track;
      if (current && typeof current.restartTrack === 'function') {
        const res = resolucionDe();
        await current.restartTrack({
          facingMode: next,
          ...(res ? { resolution: res } : {}),
        });
      } else {
        if (current) {
          await room.localParticipant.unpublishTrack(current);
          current.stop();
        }
        const res = resolucionDe();
        const videoTrack = await createLocalVideoTrack({
          facingMode: next,
          ...(res ? { resolution: res } : {}),
        });
        await room.localParticipant.publishTrack(videoTrack);
        if (localVideoRef.current) {
          videoTrack.attach(localVideoRef.current);
          facingRef.current = next;
          attachLocalPreview(localVideoRef.current);
        }
      }
      facingRef.current = next;
      attachLocalPreview(localVideoRef.current);
      setFacing(next);
    } catch (err) {
      setError(err.message || 'No se pudo cambiar de cámara');
    }
  }, [attachLocalPreview]);

  const apagarCamaraLocal = useCallback(() => {
    const el = localVideoRef.current;
    if (el) {
      try {
        el.pause?.();
      } catch {
        /* ignore */
      }
      el.srcObject = null;
    }
    const preview = previewStreamRef.current;
    if (preview) {
      preview.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          /* ignore */
        }
      });
      previewStreamRef.current = null;
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    const next = !cameraOn;
    const room = roomRef.current;
    try {
      if (room) {
        if (next) {
          // Liberar preview previo y encender de nuevo.
          apagarCamaraLocal();
          try {
            await room.localParticipant.setCameraEnabled(true, {
              resolution: VideoPresets.h720.resolution,
              facingMode: facingRef.current,
            });
            // Mostrar en el PIP lo que LiveKit publicó.
            const pubs = Array.from(room.localParticipant.videoTrackPublications.values());
            const pub = pubs.find((p) => p.track);
            if (pub?.track && localVideoRef.current) {
              pub.track.attach(localVideoRef.current);
              localVideoRef.current.muted = true;
              attachLocalPreview(localVideoRef.current);
              localVideoRef.current.play?.().catch(() => {});
            }
          } catch {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: constraintsVideo('media'),
              audio: false,
            });
            previewStreamRef.current = stream;
            const track = stream.getVideoTracks()[0];
            if (track) {
              await room.localParticipant.publishTrack(track);
              const el = localVideoRef.current;
              if (el) {
                el.srcObject = stream;
                el.muted = true;
                attachLocalPreview(el);
                el.play?.().catch(() => {});
              }
            }
          }
          setCameraOn(true);
          setError('');
          return;
        }

        // Apagar: quitar publicación LiveKit + detener preview (si no, sigue viéndose).
        try {
          await room.localParticipant.setCameraEnabled(false);
        } catch {
          /* ignore */
        }
        const pubs = Array.from(room.localParticipant.videoTrackPublications.values());
        for (const pub of pubs) {
          try {
            if (pub.track) {
              await room.localParticipant.unpublishTrack(pub.track);
              pub.track.stop();
            }
          } catch {
            /* ignore */
          }
        }
        apagarCamaraLocal();
        setCameraOn(false);
        setError('');
        return;
      }

      if (next) {
        await mostrarPreviewLocal();
        setCameraOn(true);
        setError('');
        return;
      }
      apagarCamaraLocal();
      setCameraOn(false);
      setError('');
    } catch (err) {
      const raw = String(err?.message || err || '');
      if (/Could not start video source|NotReadableError|Device in use|NotAllowedError/i.test(raw)) {
        setError(
          'No se pudo usar la cámara del PC. Cierra Zoom/Teams/otra pestaña que la use, permite la cámara en Chrome y en Configuración → Privacidad → Cámara, luego pulsa Encender cámara.'
        );
      } else {
        setError(raw || 'No se pudo cambiar la cámara');
      }
      apagarCamaraLocal();
      setCameraOn(false);
    }
  }, [cameraOn, attachLocalPreview, mostrarPreviewLocal, apagarCamaraLocal]);

  const sendCaptureCommand = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const payload = new TextEncoder().encode(JSON.stringify({ type: 'CAPTURE' }));
    await room.localParticipant.publishData(payload, { reliable: true });
  }, []);

  const onData = useCallback((handler) => {
    const room = roomRef.current;
    if (!room) return () => {};
    const listener = (payload, participant) => {
      if (participant?.isLocal) return;
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        handler(msg);
      } catch {
        /* ignore */
      }
    };
    room.on(RoomEvent.DataReceived, listener);
    return () => room.off(RoomEvent.DataReceived, listener);
  }, []);

  const getLocalVideoTrack = useCallback(() => {
    const room = roomRef.current;
    const pubs = room?.localParticipant?.videoTrackPublications;
    if (pubs) {
      for (const pub of pubs.values()) {
        const t = pub?.track?.mediaStreamTrack;
        if (t && t.kind === 'video' && t.readyState === 'live') return t;
      }
    }
    return previewStreamRef.current?.getVideoTracks().find((t) => t.readyState === 'live') || null;
  }, []);

  return {
    roomRef,
    localVideoRef,
    remoteVideoRef,
    connected,
    error,
    remotePresent,
    cameraOn,
    facing,
    toggleCamera,
    switchCamera,
    sendCaptureCommand,
    onData,
    getLocalVideoTrack,
    disconnect,
  };
}
