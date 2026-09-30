import { useCallback, useEffect, useRef, useState } from 'react';
import { livekitUsableEnEstaPagina } from '../components/SubcomponenteVideoperitaje/videoperitajeUi.js';
import {
  DisconnectReason,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  VideoQuality,
  createLocalVideoTrack,
} from 'livekit-client';

function esAndroid() {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');
}

/** Publicación HD: VP8 universal compatible con Android, iPhone y PC. */
const PUBLICACION_HD = {
  simulcast: true,
  videoCodec: 'vp8',
  videoSimulcastLayers: [VideoPresets.h1080, VideoPresets.h720, VideoPresets.h360],
  audioPreset: { maxBitrate: 64000 },
};

const PUBLICACION_ANDROID = {
  simulcast: true,
  videoCodec: 'vp8',
  videoSimulcastLayers: [VideoPresets.h720, VideoPresets.h360],
  audioPreset: { maxBitrate: 64000 },
};

function publicacionDe() {
  return esAndroid() ? PUBLICACION_ANDROID : PUBLICACION_HD;
}

/** Reintentos largos: un blip de red o un cambio de app no debe cerrar la sala. */
const RECONEXION_LIMITADA = {
  nextRetryDelayInMs: (ctx) => {
    if (!ctx || ctx.retryCount > 14) return null;
    return Math.min(1000 * 2 ** Math.min(ctx.retryCount, 3), 8000);
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

function attachRemoteAudio(track) {
  if (!track) return null;
  const el = track.attach();
  if (el) {
    el.autoplay = true;
    el.setAttribute('playsinline', '');
    el.play?.().catch(() => {});
  }
  return el;
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
  const [torchOn, setTorchOn] = useState(false);

  const facingRef = useRef(facingMode);
  const portraitRef = useRef(portrait);
  portraitRef.current = portrait;
  const [facing, setFacing] = useState(facingMode);
  const resolucionDe = () =>
    esAndroid()
      ? { width: 1280, height: 720, frameRate: 30 }
      : { width: 1920, height: 1080, frameRate: 30 };

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
      frameRate: { ideal: res.frameRate || 30 },
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
    const espejo = !portraitRef.current && facingRef.current !== 'environment';
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
          if (pub.track) attachRemoteAudio(pub.track);
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
    const esCliente = portraitRef.current;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      stopLocalTrackOnUnpublish: true,
      // En el celular, bloquear la pantalla o cambiar de app no es colgar.
      disconnectOnPageLeave: !esCliente,
      reconnectPolicy: RECONEXION_LIMITADA,
      videoCaptureDefaults: {
        facingMode,
        resolution: resolucionDe(),
      },
      publishDefaults: publicacionDe(),
    });
    roomRef.current = room;

    const onTrack = (track, pub, participant) => {
      if (participant?.isLocal) return;
      if (track.kind === Track.Kind.Audio) {
        attachRemoteAudio(track);
        room.startAudio?.().catch(() => {});
      }
      if (track.kind === Track.Kind.Video) {
        if (pub && typeof pub.setVideoQuality === 'function') {
          pub.setVideoQuality(VideoQuality.HIGH);
        }
        attachRemote(track);
      }
    };
    const onUnpublish = (_pub, participant) => {
      if (!participant?.isLocal) syncRemotes(room);
    };

    room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => onTrack(track, pub, participant));
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
      // Desbloquear audio remoto (Chrome/Safari bloquean autoplay sin gesto / startAudio).
      try {
        await room.startAudio();
      } catch {
        /* el usuario puede tocar la pantalla luego */
      }
      syncRemotes(room);

      // Micrófono independiente de la cámara: si apagan cámara, el cliente sigue oyendo.
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (micErr) {
        setError(
          micErr?.message ||
            'Permita el micrófono en el navegador; si no, el asegurado no lo escucha.'
        );
      }

      const preview = previewStreamRef.current || (await previewPromise);
      if (preview && room.state && room.localParticipant) {
        try {
          // No republicar audio del preview (ya va con setMicrophoneEnabled).
          for (const track of preview.getVideoTracks()) {
            await room.localParticipant.publishTrack(track, publicacionDe());
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

  // Rescate solo si aún no hay video remoto (evita trabajo extra en la llamada).
  useEffect(() => {
    if (!connected || remotePresent) return undefined;
    const tick = () => syncRemotes(roomRef.current);
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [connected, remotePresent, syncRemotes]);

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
    const trackActual = getLocalVideoTrack();
    if (trackActual) {
      try {
        await trackActual.applyConstraints({ advanced: [{ torch: false }] });
      } catch {
        /* el flash no estaba encendido */
      }
    }
    setTorchOn(false);
    const next = facingRef.current === 'environment' ? 'user' : 'environment';
    const anterior = facingRef.current;
    facingRef.current = next;
    try {
      const pubs = Array.from(room.localParticipant.videoTrackPublications.values());
      const current = pubs.find((p) => p.track)?.track;
      const res = resolucionDe();
      if (current && typeof current.restartTrack === 'function') {
        await current.restartTrack({
          facingMode: next,
          ...(res ? { resolution: res } : {}),
        });
      } else {
        if (current) {
          await room.localParticipant.unpublishTrack(current);
          current.stop();
        }
        const videoTrack = await createLocalVideoTrack({
          facingMode: next,
          ...(res ? { resolution: res } : {}),
        });
        await room.localParticipant.publishTrack(videoTrack, publicacionDe());
        if (localVideoRef.current) {
          videoTrack.attach(localVideoRef.current);
          facingRef.current = next;
          attachLocalPreview(localVideoRef.current);
        }
      }
      attachLocalPreview(localVideoRef.current);
      setFacing(next);
    } catch (err) {
      facingRef.current = anterior;
      setFacing(anterior);
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
      // Solo video: detener el audio del preview mataría el mic del asegurado.
      preview.getVideoTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          /* ignore */
        }
      });
      const audioVivos = preview.getAudioTracks().filter((t) => t.readyState === 'live');
      if (audioVivos.length) {
        previewStreamRef.current = new MediaStream(audioVivos);
      } else {
        previewStreamRef.current = null;
      }
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
            await room.localParticipant.setCameraEnabled(
              true,
              {
                resolution: resolucionDe(),
                facingMode: facingRef.current,
              },
              publicacionDe()
            );
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
              await room.localParticipant.publishTrack(track, publicacionDe());
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
        // Mantener mic activo: el asegurado debe seguir oyendo al ajustador.
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
        } catch {
          /* ignore */
        }
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

  const sendData = useCallback(async (msg) => {
    const room = roomRef.current;
    if (!room) return;
    const payload = new TextEncoder().encode(JSON.stringify(msg));
    await room.localParticipant.publishData(payload, { reliable: true });
  }, []);

  const sendCaptureCommand = useCallback(async () => {
    await sendData({ type: 'CAPTURE' });
  }, [sendData]);

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

  const reengancharCamaraLocal = useCallback(async () => {
    const room = roomRef.current;
    if (!room?.localParticipant) return;
    const pubs = Array.from(room.localParticipant.videoTrackPublications.values());
    const current = pubs.find((p) => p.track)?.track;
    const res = resolucionDe();
    if (current && typeof current.restartTrack === 'function') {
      await current.restartTrack({
        facingMode: facingRef.current,
        ...(res ? { resolution: res } : {}),
      });
    }
    if (current && localVideoRef.current) {
      current.attach(localVideoRef.current);
      localVideoRef.current.muted = true;
      attachLocalPreview(localVideoRef.current);
      localVideoRef.current.play?.().catch(() => {});
    }
  }, [attachLocalPreview]);

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

  const toggleTorch = useCallback(async () => {
    if (facingRef.current !== 'environment') {
      setError('El flash solo funciona con la cámara trasera.');
      return false;
    }
    const track = getLocalVideoTrack();
    if (!track) return false;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
      setError('');
      return next;
    } catch {
      setTorchOn(false);
      setError('Este celular no enciende el flash en la videollamada.');
      return false;
    }
  }, [torchOn, getLocalVideoTrack]);

  return {
    roomRef,
    localVideoRef,
    remoteVideoRef,
    connected,
    error,
    remotePresent,
    cameraOn,
    facing,
    torchOn,
    toggleCamera,
    switchCamera,
    toggleTorch,
    reengancharCamaraLocal,
    sendData,
    sendCaptureCommand,
    onData,
    getLocalVideoTrack,
    disconnect,
  };
}
