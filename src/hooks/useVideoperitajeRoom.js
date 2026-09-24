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

const SIN_RECONEXION = { nextRetryDelayInMs: () => null };

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
  const previewStreamRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [remotePresent, setRemotePresent] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  const facingRef = useRef(facingMode);
  const portraitRef = useRef(portrait);
  portraitRef.current = portrait;
  const [facing, setFacing] = useState(facingMode);
  // Escritorio: 720p ideal (muchas webcams fallan con min 1080).
  // Celular: pedir alta resolución para fotos (solo ideal, sin min duro).
  const resolucionDe = () =>
    portraitRef.current
      ? { width: 1080, height: 1920 }
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

  const aplicarVideoEl = (el, { espejo = false } = {}) => {
    if (!el) return;
    el.style.objectFit = 'cover';
    el.style.objectPosition = 'center';
    // Vista previa local: espejo (como un espejo). Remota: orientación real.
    const t = espejo ? 'scaleX(-1)' : 'none';
    el.style.transform = t;
    el.style.webkitTransform = t;
  };

  const forzarContain = (el) => aplicarVideoEl(el, { espejo: false });

  const attachRemote = useCallback((track) => {
    const el = remoteVideoRef.current;
    if (!el || !track) return;
    track.attach(el);
    aplicarVideoEl(el, { espejo: false });
    requestAnimationFrame(() => aplicarVideoEl(el, { espejo: false }));
  }, []);

  const attachLocalPreview = useCallback((el) => {
    // Frontal: espejo. Trasera: real (mapa / fachada).
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

  const connect = useCallback(async () => {
    await mostrarPreviewLocal();
    if (!token || !url) return;
    if (!livekitUsableEnEstaPagina(url)) return;
    setError('');
    const res = resolucionDe();
    const room = new Room({
      adaptiveStream: false,
      dynacast: true,
      stopLocalTrackOnUnpublish: true,
      disconnectOnPageLeave: true,
      reconnectPolicy: SIN_RECONEXION,
      videoCaptureDefaults: {
        facingMode,
        ...(res ? { resolution: res } : {}),
      },
      videoPublishDefaults: {
        videoEncoding: {
          maxBitrate: portraitRef.current ? 4_000_000 : 5_000_000,
          maxFramerate: portraitRef.current ? 24 : 30,
        },
      },
    });
    roomRef.current = room;

    const onTrack = (track, publication, participant) => {
      if (participant.isLocal) return;
      if (track.kind === Track.Kind.Audio) {
        track.attach();
      }
      if (track.kind === Track.Kind.Video) {
        setRemotePresent(true);
        attachRemote(track);
      }
    };
    const onUnpublish = (_pub, participant) => {
      if (!participant.isLocal) {
        const still = Array.from(room.remoteParticipants.values()).some((p) =>
          Array.from(p.videoTrackPublications.values()).some((pub) => pub.track)
        );
        setRemotePresent(still);
      }
    };

    room.on(RoomEvent.TrackSubscribed, onTrack);
    room.on(RoomEvent.TrackUnsubscribed, onUnpublish);
    room.on(RoomEvent.Disconnected, (reason) => {
      setConnected(false);
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
      const preview = previewStreamRef.current || (await mostrarPreviewLocal());
      if (preview) {
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
      room.remoteParticipants.forEach((p) => {
        p.videoTrackPublications.forEach((pub) => {
          if (pub.track) attachRemote(pub.track);
        });
        p.audioTrackPublications.forEach((pub) => {
          if (pub.track) pub.track.attach();
        });
      });
      setConnected(true);
    } catch (err) {
      const raw = String(err.message || '');
      if (/signal|timed out|websocket|failed to fetch|establish|content.security.policy|refused to connect/i.test(raw)) {
        setError('');
        return;
      }
      setError(raw || 'No se pudo conectar a la sala');
    }
  }, [token, url, publishAudio, publishVideo, attachRemote, mostrarPreviewLocal]);

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

  const toggleCamera = useCallback(async () => {
    const next = !cameraOn;
    const room = roomRef.current;
    try {
      if (room) {
        if (next) {
          // Liberar preview para que LiveKit pueda abrir la cámara sin "Device in use".
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
            if (localVideoRef.current?.srcObject === preview) {
              localVideoRef.current.srcObject = null;
            }
          }
          try {
            await room.localParticipant.setCameraEnabled(true, {
              resolution: VideoPresets.h720.resolution,
              facingMode: facingRef.current,
            });
          } catch {
            // Fallback: abrir cámara con constraints suaves y publicarla.
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
        } else {
          await room.localParticipant.setCameraEnabled(false);
        }
        setCameraOn(next);
        setError('');
        return;
      }
      const preview = previewStreamRef.current;
      if (preview) {
        preview.getVideoTracks().forEach((t) => {
          t.enabled = next;
        });
        setCameraOn(next);
        setError('');
      } else if (next) {
        await mostrarPreviewLocal();
      }
    } catch (err) {
      const raw = String(err?.message || err || '');
      if (/Could not start video source|NotReadableError|Device in use|NotAllowedError/i.test(raw)) {
        setError(
          'No se pudo usar la cámara del PC. Cierra Zoom/Teams/otra pestaña que la use, permite la cámara en Chrome y en Configuración → Privacidad → Cámara, luego pulsa Encender cámara.'
        );
      } else {
        setError(raw || 'No se pudo cambiar la cámara');
      }
      setCameraOn(false);
    }
  }, [cameraOn, attachLocalPreview, mostrarPreviewLocal]);

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
