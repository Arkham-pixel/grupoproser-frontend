import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [remotePresent, setRemotePresent] = useState(false);
  const [cameraOn, setCameraOn] = useState(publishVideo);

  const facingRef = useRef(facingMode);
  const portraitRef = useRef(portrait);
  portraitRef.current = portrait;
  const [facing, setFacing] = useState(facingMode);
  const resolucionDe = () =>
    portraitRef.current
      ? { width: 1080, height: 1920, frameRate: 30, aspectRatio: 9 / 16 }
      : VideoPresets.h1080.resolution;

  const attachRemote = useCallback((track) => {
    const el = remoteVideoRef.current;
    if (!el || !track) return;
    track.attach(el);
  }, []);

  const connect = useCallback(async () => {
    if (!token || !url) return;
    setError('');
    const room = new Room({
      adaptiveStream: false,
      dynacast: true,
      stopLocalTrackOnUnpublish: true,
      disconnectOnPageLeave: true,
      reconnectPolicy: SIN_RECONEXION,
      videoCaptureDefaults: {
        facingMode,
        resolution: resolucionDe(),
      },
      videoPublishDefaults: {
        videoEncoding: {
          maxBitrate: portraitRef.current ? 6_000_000 : 4_500_000,
          maxFramerate: 30,
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
    const cortarReintento = () => {
      soltarMediosLocales(room);
      try {
        room.disconnect();
      } catch {
        /* ignore */
      }
    };
    room.on(RoomEvent.Reconnecting, cortarReintento);
    if (RoomEvent.SignalReconnecting) {
      room.on(RoomEvent.SignalReconnecting, cortarReintento);
    }
    room.on(RoomEvent.Disconnected, (reason) => {
      soltarMediosLocales(room);
      setConnected(false);
      setRemotePresent(false);
      setCameraOn(false);
      if (reason === DisconnectReason.CLIENT_INITIATED) return;
      onDisconnectedRef.current?.();
    });

    try {
      await room.connect(url, token);
      const mediaOk =
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function';
      if (!mediaOk) {
        setError(
          'El iPhone bloquea la cámara en Gmail y en http://. Abra el enlace en Safari. Si ya está en Safari, use el enlace HTTPS de prueba.'
        );
      } else {
        if (publishAudio) {
          try {
            await room.localParticipant.setMicrophoneEnabled(true);
          } catch {
            /* el remoto igual se ve */
          }
        }
        if (publishVideo) {
          try {
            const videoTrack = await createLocalVideoTrack({
              facingMode: facingRef.current,
              resolution: resolucionDe(),
            });
            await room.localParticipant.publishTrack(videoTrack);
            if (localVideoRef.current) videoTrack.attach(localVideoRef.current);
            setCameraOn(true);
          } catch {
            setCameraOn(false);
          }
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
      setError(err.message || 'No se pudo conectar a la sala');
    }
  }, [token, url, publishAudio, publishVideo, attachRemote]);

  useEffect(() => {
    connect();
    return () => {
      const room = roomRef.current;
      if (room) {
        soltarMediosLocales(room);
        room.disconnect();
        roomRef.current = null;
      }
    };
  }, [connect]);

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
        await current.restartTrack({
          facingMode: next,
          resolution: resolucionDe(),
        });
      } else {
        if (current) {
          await room.localParticipant.unpublishTrack(current);
          current.stop();
        }
        const videoTrack = await createLocalVideoTrack({
          facingMode: next,
          resolution: resolucionDe(),
        });
        await room.localParticipant.publishTrack(videoTrack);
        if (localVideoRef.current) videoTrack.attach(localVideoRef.current);
      }
      facingRef.current = next;
      setFacing(next);
    } catch (err) {
      setError(err.message || 'No se pudo cambiar de cámara');
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !cameraOn;
    await room.localParticipant.setCameraEnabled(next);
    setCameraOn(next);
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
    if (!pubs) return null;
    for (const pub of pubs.values()) {
      const t = pub?.track?.mediaStreamTrack;
      if (t && t.kind === 'video' && t.readyState === 'live') return t;
    }
    return null;
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
