function mimeGrabacion() {
  const opts = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  return opts.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) || '';
}

function drawContain(ctx, video, x, y, w, h) {
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  const scale = Math.min(w / vw, h / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  ctx.drawImage(video, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function medidasLienzo(video) {
  const vw = video?.videoWidth || 0;
  const vh = video?.videoHeight || 0;
  if (vw && vh && vw > vh) return { width: 1920, height: 1080 };
  return { width: 1080, height: 1920 };
}

function pistasDeSala(room) {
  const videos = { remotes: [], locals: [] };
  const audios = [];
  const takeVideo = (pub, bucket) => {
    const t = pub?.track?.mediaStreamTrack;
    if (t && t.kind === 'video' && t.readyState === 'live') bucket.push(t);
  };
  const takeAudio = (pub) => {
    const t = pub?.track?.mediaStreamTrack;
    if (t && t.kind === 'audio' && t.readyState !== 'ended') {
      try {
        audios.push(t.clone());
      } catch {
        audios.push(t);
      }
    }
  };
  room?.localParticipant?.videoTrackPublications?.forEach((pub) => takeVideo(pub, videos.locals));
  room?.localParticipant?.audioTrackPublications?.forEach(takeAudio);
  room?.remoteParticipants?.forEach((p) => {
    p.videoTrackPublications?.forEach((pub) => takeVideo(pub, videos.remotes));
    p.audioTrackPublications?.forEach(takeAudio);
  });
  return { videos, audios };
}

function videoOcultoDePista(track) {
  const el = document.createElement('video');
  el.muted = true;
  el.autoplay = true;
  el.playsInline = true;
  el.setAttribute('playsinline', '');
  el.setAttribute('webkit-playsinline', '');
  el.srcObject = new MediaStream([typeof track.clone === 'function' ? track.clone() : track]);
  el.style.cssText =
    'position:fixed;left:0;top:0;width:4px;height:4px;opacity:0.02;pointer-events:none;z-index:-1';
  document.body.appendChild(el);
  el.play().catch(() => {});
  return el;
}

function canvasTieneImagen(ctx, canvas) {
  try {
    const w = canvas.width;
    const h = canvas.height;
    const sample = ctx.getImageData(Math.floor(w / 2), Math.floor(h / 2), 8, 8).data;
    for (let i = 0; i < sample.length; i += 4) {
      if (sample[i] > 18 || sample[i + 1] > 18 || sample[i + 2] > 18) return true;
    }
  } catch {
    return false;
  }
  return false;
}

function mezclarAudio(audios) {
  if (!audios.length) return { track: null, close: () => {} };
  try {
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    audios.forEach((t) => {
      const src = audioCtx.createMediaStreamSource(new MediaStream([t]));
      src.connect(dest);
    });
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return {
      track: dest.stream.getAudioTracks()[0] || null,
      close: () => {
        try {
          audioCtx.close();
        } catch {
          /* ignore */
        }
      },
    };
  } catch {
    return { track: audios[0] || null, close: () => {} };
  }
}

function crearRecorder(stream, mime) {
  const rec = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 8_000_000,
    audioBitsPerSecond: 160_000,
  });
  const chunks = [];
  rec.ondataavailable = (ev) => {
    if (ev.data && ev.data.size) chunks.push(ev.data);
  };
  rec.start(1000);
  return { rec, chunks };
}

/**
 * Graba la cámara del asegurado (pista LiveKit real). Intenta PiP del ajustador;
 * si el lienzo sale negro, graba la pista cruda para no perder la evidencia.
 */
export function iniciarGrabacionLlamada({ localVideo, remoteVideo, room }) {
  const mime = mimeGrabacion();
  if (!mime) {
    const err = new Error('Este navegador no puede grabar la videollamada');
    err.code = 'RECORDER_UNSUPPORTED';
    throw err;
  }

  const { videos, audios } = pistasDeSala(room);
  const pistaMain = videos.remotes[0] || videos.locals[0] || null;
  const pistaPip = videos.remotes[0] && videos.locals[0] ? videos.locals[0] : null;
  if (!pistaMain && !remoteVideo?.srcObject && !localVideo?.srcObject) {
    const err = new Error('No hay cámara para grabar. Espere a que el asegurado entre.');
    err.code = 'NO_VIDEO_TRACK';
    throw err;
  }

  const ocultos = [];
  const mainEl = pistaMain ? videoOcultoDePista(pistaMain) : remoteVideo || localVideo;
  const pipEl = pistaPip ? videoOcultoDePista(pistaPip) : null;
  if (pistaMain) ocultos.push(mainEl);
  if (pipEl) ocultos.push(pipEl);

  const audioMix = mezclarAudio(audios);
  const canvas = document.createElement('canvas');
  const probe = mainEl?.videoWidth ? mainEl : remoteVideo?.videoWidth ? remoteVideo : localVideo;
  const size = medidasLienzo(probe);
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  let running = true;
  let recWrap = null;
  let usandoPistaCruda = false;

  const pintar = () => {
    if (!running || usandoPistaCruda) return;
    ctx.fillStyle = '#0b0b0b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const main = mainEl?.videoWidth ? mainEl : remoteVideo?.videoWidth ? remoteVideo : localVideo;
    const pip = pipEl?.videoWidth ? pipEl : main === remoteVideo ? localVideo : remoteVideo;
    if (main?.videoWidth) drawContain(ctx, main, 0, 0, canvas.width, canvas.height);
    if (pip?.videoWidth && pip !== main) {
      const w = Math.round(Math.min(canvas.width, canvas.height) * 0.22);
      const h = Math.round(w * (pip.videoHeight / pip.videoWidth || 0.75));
      const x = canvas.width - w - 20;
      const y = 20;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
      drawContain(ctx, pip, x, y, w, h);
      ctx.restore();
    }
    if (typeof main?.requestVideoFrameCallback === 'function') {
      main.requestVideoFrameCallback(() => pintar());
    } else {
      requestAnimationFrame(pintar);
    }
  };
  pintar();

  const streamCanvas = canvas.captureStream(30);
  const tracksCanvas = [...streamCanvas.getVideoTracks()];
  if (audioMix.track) tracksCanvas.push(audioMix.track);
  recWrap = crearRecorder(new MediaStream(tracksCanvas), mime);

  const cambiarAPistaCruda = () => {
    if (!running || usandoPistaCruda || !pistaMain) return;
    usandoPistaCruda = true;
    try {
      recWrap.rec.ondataavailable = null;
      recWrap.rec.onstop = () => {};
      if (recWrap.rec.state !== 'inactive') recWrap.rec.stop();
    } catch {
      /* ignore */
    }
    const crudos = [pistaMain];
    if (audioMix.track) crudos.push(audioMix.track);
    recWrap = crearRecorder(new MediaStream(crudos), mime);
  };

  const watchdog = setTimeout(() => {
    if (!running || usandoPistaCruda) return;
    if (!canvasTieneImagen(ctx, canvas) && pistaMain) cambiarAPistaCruda();
  }, 1200);

  return {
    mime,
    stop() {
      running = false;
      clearTimeout(watchdog);
      return new Promise((resolve, reject) => {
        const finish = () => {
          audioMix.close();
          streamCanvas.getTracks().forEach((t) => t.stop());
          ocultos.forEach((el) => {
            try {
              el.pause();
              el.srcObject = null;
              el.remove();
            } catch {
              /* ignore */
            }
          });
          resolve(new Blob(recWrap.chunks, { type: mime.split(';')[0] }));
        };
        const rec = recWrap.rec;
        rec.onerror = () => reject(new Error('Falló la grabación'));
        if (rec.state === 'inactive') finish();
        else {
          rec.onstop = finish;
          rec.stop();
        }
      });
    },
  };
}
