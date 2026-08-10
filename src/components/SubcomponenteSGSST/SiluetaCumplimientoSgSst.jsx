import { useId, useMemo } from 'react';
import siluetaPath from '../../assets/sg-sst/silueta-path.json';

const ESCALA = [100, 75, 50, 25, 0];

function normalizarPct(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n * 10) / 10;
}

function fmtPct(n) {
  return `${String(n).replace('.', ',')}%`;
}

/** Paleta fija azul/verde — NO usa el nivel ARL (eso es el gauge oficial). */
const PALETA_DILIGENCIA = {
  color: '#0284c7',
  liquid: '#0ea5e9',
  soft: '#7dd3fc',
  deep: '#0369a1',
};

/**
 * Silueta humana: avance de diligenciamiento (respondidos / aplicables).
 * NO representa el cumplimiento oficial 0312.
 */
export default function SiluetaCumplimientoSgSst({
  porcentaje = 0,
  respondidos = 0,
  aplicables = 0,
  pendientes = 0,
  className = '',
  compact = false,
}) {
  const uid = useId().replace(/:/g, '');
  const pct = useMemo(() => normalizarPct(porcentaje), [porcentaje]);
  const paleta = PALETA_DILIGENCIA;

  const ariaLabel = `Avance del diligenciamiento: ${respondidos} de ${aplicables} estándares (${fmtPct(pct)})`;

  const vb = String(siluetaPath.viewBox || '0 0 161 385').split(/\s+/).map(Number);
  const [, , vbW = 161, vbH = 385] = vb;
  const fillTop = ((100 - pct) / 100) * vbH;
  const fillHeight = (pct / 100) * vbH;

  const clipId = `sg-dil-clip-${uid}`;
  const bodyClipId = `sg-dil-body-${uid}`;
  const gradId = `sg-dil-grad-${uid}`;
  const filterId = `sg-dil-soft-${uid}`;
  const waveId = `sg-dil-wave-${uid}`;

  return (
    <div className={`flex h-full flex-col ${className}`} aria-label={ariaLabel}>
      <div
        className={`relative mx-auto w-full ${compact ? 'max-w-[220px]' : 'max-w-[280px]'} flex-1`}
      >
        <div
          className={`relative w-full ${compact ? 'h-[320px]' : 'h-[400px] sm:h-[440px]'}`}
          role="img"
          aria-label={ariaLabel}
        >
          <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
            {ESCALA.map((m) => (
              <div
                key={m}
                className="absolute left-0 right-0 flex items-center"
                style={{ top: `${100 - m}%`, transform: 'translateY(-50%)' }}
              >
                <span className="w-8 shrink-0 text-right font-mono text-[10px] font-semibold tabular-nums text-gray-400">
                  {m}%
                </span>
                <div className="ml-2 h-px flex-1 border-t border-dashed border-sky-100 dark:border-sky-900/50" />
              </div>
            ))}
          </div>

          <div className="absolute inset-y-2 left-10 right-0">
            <svg
              viewBox={`0 0 ${vbW} ${vbH}`}
              className="h-full w-full"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              preserveAspectRatio="xMidYMax meet"
            >
              <defs>
                <filter id={filterId} x="-8%" y="-4%" width="116%" height="112%">
                  <feDropShadow
                    dx="0"
                    dy="4"
                    stdDeviation="5"
                    floodColor="#0c4a6e"
                    floodOpacity="0.14"
                  />
                </filter>
                <clipPath id={bodyClipId} clipPathUnits="userSpaceOnUse">
                  <path d={siluetaPath.d} />
                </clipPath>
                <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                  <rect
                    x={-2}
                    y={fillTop}
                    width={vbW + 4}
                    height={Math.max(fillHeight, 0)}
                    style={{
                      transition:
                        'y 1s cubic-bezier(.22,1,.36,1), height 1s cubic-bezier(.22,1,.36,1)',
                    }}
                  />
                </clipPath>
                <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor={paleta.deep} />
                  <stop offset="55%" stopColor={paleta.liquid} />
                  <stop offset="100%" stopColor={paleta.soft} />
                </linearGradient>
                <linearGradient id={waveId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>

              <g filter={`url(#${filterId})`}>
                <path d={siluetaPath.d} className="fill-sky-50 dark:fill-slate-700" />
                <path
                  d={siluetaPath.d}
                  fill="none"
                  stroke="#7dd3fc"
                  className="dark:stroke-sky-700"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity="0.7"
                />
                <g clipPath={`url(#${bodyClipId})`}>
                  <g clipPath={`url(#${clipId})`}>
                    <rect x={-2} y={0} width={vbW + 4} height={vbH} fill={`url(#${gradId})`}>
                      <animate
                        attributeName="opacity"
                        values="0.92;1;0.92"
                        dur="3.2s"
                        repeatCount="indefinite"
                      />
                    </rect>
                    <rect
                      x={-2}
                      y={fillTop}
                      width={vbW + 4}
                      height={12}
                      fill={`url(#${waveId})`}
                      style={{
                        transition: 'y 1s cubic-bezier(.22,1,.36,1)',
                      }}
                    >
                      <animate
                        attributeName="opacity"
                        values="0.35;0.7;0.35"
                        dur="2.4s"
                        repeatCount="indefinite"
                      />
                    </rect>
                  </g>
                </g>
              </g>
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-2 text-center">
        <p
          className="text-4xl font-bold tracking-tight tabular-nums sm:text-5xl"
          style={{ color: paleta.color }}
        >
          {fmtPct(pct)}
        </p>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {respondidos} de {aplicables} estándares
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {pendientes} pendientes por diligenciar · No es el % de cumplimiento
        </p>
        <div className="mx-auto mt-2 h-2 max-w-xs overflow-hidden rounded-full bg-sky-100 dark:bg-sky-950/60">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${Math.min(100, pct)}%`,
              background: `linear-gradient(90deg, ${paleta.deep}, ${paleta.liquid})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
