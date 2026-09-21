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
  const resolucionDe = () =>
    portraitRef.current ? undefined : VideoPresets.h1080.resolution;

  const forzarContain = (el) => {
    if (!el) return;
    el.style.objectFit = 'contain';
    el.style.objectPosition = 'center';
  };

  const attachRemote = useCallback((track) => {
    const el = remoteVideoRef.current;
    if (!el || !track) return;
    track.attach(el);
    forzarContain(el);
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
      return previewStreamRef.current;
    }
    try {
      const res = resolucionDe();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: publishVideo
          ? res
            ? {
                facingMode: facingRef.current,
                width: { ideal: res.width },
                height: { ideal: res.height },
                frameRate: { ideal: 30 },
              }
            : { facingMode: { ideal: facingRef.current } }
          : false,
        audio: publishAudio,
      });
      previewStreamRef.current = stream;
      const el = localVideoRef.current;
      if (el && publishVideo) {
        el.srcObject = stream;
        el.muted = true;
        el.setAttribute('playsinline', '');
        forzarContain(el);
        el.play?.().catch(() => {});
      }
      setCameraOn(Boolean(stream.getVideoTracks().find((t) => t.readyState === 'live')));
      return stream;
    } catch (err) {
      setError(err.message || 'No se pudo abrir la cámara. Permita el acceso en el navegador.');
      setCameraOn(false);
      return null;
    }
  }, [publishAudio, publishVideo]);

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
          maxBitrate: portraitRef.current ? 2_500_000 : 4_500_000,
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
            forzarContain(el);
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
  }, [connected, cameraOn]);

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
          forzarContain(localVideoRef.current);
        }
      }
      forzarContain(localVideoRef.current);
      facingRef.current = next;
      setFacing(next);
    } catch (err) {
      setError(err.message || 'No se pudo cambiar de cámara');
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    const next = !cameraOn;
    const room = roomRef.current;
    if (room) {
      await room.localParticipant.setCameraEnabled(next);
      setCameraOn(next);
      return;
    }
    const preview = previewStreamRef.current;
    if (preview) {
      preview.getVideoTracks().forEach((t) => {
        t.enabled = next;
      });
      setCameraOn(next);
    }
  }, [cameraOn]);

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
