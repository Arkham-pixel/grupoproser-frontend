let audioCtx = null;

function obtenerContexto() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}

function tono(ctx, { frecuencia, inicio, duracion, volumen }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frecuencia, inicio);
  gain.gain.setValueAtTime(0.0001, inicio);
  gain.gain.exponentialRampToValueAtTime(volumen, inicio + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(inicio);
  osc.stop(inicio + duracion + 0.02);
}

/** Timbre corto (do–sol agudos), suave. */
export function reproducirTimbreNotificacion() {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = obtenerContexto();
  if (!ctx) return;
  const start = () => {
    const t = ctx.currentTime;
    tono(ctx, { frecuencia: 1046.5, inicio: t, duracion: 0.16, volumen: 0.07 });
    tono(ctx, { frecuencia: 1568, inicio: t + 0.14, duracion: 0.22, volumen: 0.055 });
  };
  if (ctx.state === 'suspended') {
    ctx.resume().then(start).catch(() => {});
    return;
  }
  start();
}

export function habilitarAudioNotificaciones() {
  const ctx = obtenerContexto();
  if (!ctx || ctx.state !== 'suspended') return;
  ctx.resume().catch(() => {});
}
