/** Robot desarmado — composición alineada sobre la superficie lunar */

function Cables({ x, y, spread = 1 }) {
  const s = spread;
  return (
    <g>
      <path d={`M ${x} ${y} C ${x - 18 * s} ${y + 8} ${x - 12 * s} ${y + 22} ${x - 6 * s} ${y + 30}`} fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
      <path d={`M ${x + 4} ${y} C ${x + 16 * s} ${y + 6} ${x + 14 * s} ${y + 20} ${x + 8 * s} ${y + 32}`} fill="none" stroke="#eab308" strokeWidth="2.2" strokeLinecap="round" />
      <path d={`M ${x + 8} ${y + 2} C ${x + 22 * s} ${y - 4} ${x + 20 * s} ${y + 14} ${x + 14 * s} ${y + 28}`} fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" />
      <path d={`M ${x - 4} ${y + 2} C ${x - 20 * s} ${y + 10} ${x - 16 * s} ${y + 24} ${x - 10 * s} ${y + 34}`} fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
    </g>
  );
}

function CabezaRobot({ x, y, rot, expresion, escala = 1 }) {
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rot}) scale(${escala})`}>
      <ellipse cx="0" cy="0" rx="38" ry="34" fill="url(#robotBlanco)" />
      <ellipse cx="0" cy="0" rx="38" ry="34" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
      <rect x="-28" y="-14" width="56" height="32" rx="16" fill="#0f172a" />
      <rect x="-26" y="-12" width="52" height="28" rx="14" fill="#1e293b" />
      {expresion === 'offline' ? (
        <>
          <line x1="-16" y1="-2" x2="-4" y2="8" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="4" y1="-2" x2="16" y2="8" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="-13" cy="0" r="11" fill="none" stroke="#38bdf8" strokeWidth="2.2" opacity="0.9" />
          <circle cx="-13" cy="0" r="5.5" fill="#22d3ee" />
          <circle cx="13" cy="0" r="11" fill="none" stroke="#38bdf8" strokeWidth="2.2" opacity="0.9" />
          <circle cx="13" cy="0" r="5.5" fill="#22d3ee" />
        </>
      )}
      <ellipse cx="-14" cy="-16" rx="10" ry="6" fill="#fff" opacity="0.2" />
      <Cables x={0} y={20} spread={0.85} />
    </g>
  );
}

function MiembroRobot({ x, y, rot, ancho = 20, alto = 42 }) {
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rot})`}>
      <rect x={-ancho / 2} y={0} width={ancho} height={alto} rx={ancho / 2} fill="url(#robotBlanco)" />
      <rect x={-(ancho - 4) / 2} y={alto - 14} width={ancho - 4} height={14} rx={7} fill="#cbd5e1" />
      <Cables x={0} y={-2} spread={0.55} />
    </g>
  );
}

/** Robot principal — alineado a la izquierda del 404 */
export function AstronautaPrincipal({ oops, expresion = 'normal' }) {
  const cx = 130;
  const suelo = 298;

  return (
    <g transform="translate(248, 0)">
      {/* Sombra unificada */}
      <ellipse cx={cx} cy={suelo + 6} rx={95} ry={13} fill="#09090b" opacity="0.32" />

      {/* Piernas en el suelo */}
      <MiembroRobot x={cx - 38} y={suelo - 38} rot={-8} ancho={22} alto={38} />
      <MiembroRobot x={cx + 22} y={suelo - 36} rot={10} ancho={22} alto={36} />

      {/* Brazos caídos a los lados */}
      <MiembroRobot x={cx - 72} y={suelo - 72} rot={-58} ancho={18} alto={44} />
      <MiembroRobot x={cx + 68} y={suelo - 68} rot={52} ancho={18} alto={42} />

      {/* Torso */}
      <rect x={cx - 48} y={suelo - 128} width={96} height={92} rx={28} fill="url(#robotBlanco)" />
      <rect x={cx - 44} y={suelo - 124} width={88} height={84} rx={24} fill="url(#robotSombra)" opacity="0.3" />

      {/* Núcleo AD */}
      <circle cx={cx} cy={suelo - 82} r={28} fill="url(#nucleoAzul)" filter="url(#brilloAzul)" />
      <circle cx={cx} cy={suelo - 82} r={28} fill="none" stroke="#67e8f9" strokeWidth="1.5" opacity="0.7" />
      <text
        x={cx}
        y={suelo - 74}
        textAnchor="middle"
        fontSize="19"
        fontWeight="800"
        fill="#fff"
        fontFamily="Montserrat, sans-serif"
        letterSpacing="2"
      >
        AD
      </text>

      {/* Cables del cuello */}
      <Cables x={cx} y={suelo - 132} spread={0.75} />

      {/* Cabeza flotante */}
      <CabezaRobot x={cx + 8} y={suelo - 168} rot={14} expresion={expresion} />

      {/* Globo ¡Ups!! — encima, sin recorte */}
      <text
        x={cx - 10}
        y={suelo - 198}
        textAnchor="middle"
        fontSize="30"
        fontWeight="800"
        fill="#ffffff"
        stroke="#0f172a"
        strokeWidth="4"
        paintOrder="stroke fill"
        fontFamily="Montserrat, sans-serif"
        transform={`rotate(-10, ${cx - 10}, ${suelo - 198})`}
      >
        {oops}
      </text>
    </g>
  );
}

/** Pieza suelta decorativa (mano/visor) a la derecha, sobre la luna */
export function AstronautaLejano() {
  return (
    <g transform="translate(1020, 248)">
      <ellipse cx={0} cy={52} rx={34} ry={8} fill="#09090b" opacity="0.2" />
      <ellipse cx={0} cy={18} rx={24} ry={20} fill="url(#robotBlanco)" />
      <rect x={-16} y={6} width={32} height={18} rx={9} fill="#1e293b" />
      <circle cx={-7} cy={14} r={4} fill="#22d3ee" opacity="0.85" />
      <circle cx={7} cy={14} r={4} fill="#22d3ee" opacity="0.85" />
      <Cables x={0} y={34} spread={0.6} />
    </g>
  );
}

export function CapsulaEspacial() {
  return (
    <g transform="translate(1160, 258)">
      <ellipse cx={28} cy={42} rx={24} ry={8} fill="#09090b" opacity="0.2" />
      <ellipse cx={28} cy={28} rx={20} ry={26} fill="#f8fafc" />
      <path d="M 16 14 Q 28 0 40 14 L 40 22 Q 28 10 16 22 Z" fill="#ef4444" />
      <rect x={22} y={22} width={12} height={5} rx={2} fill="#cbd5e1" />
    </g>
  );
}

export function DefsAstronauta() {
  return (
    <defs>
      <linearGradient id="robotBlanco" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <radialGradient id="robotSombra" cx="50%" cy="100%">
        <stop offset="0%" stopColor="#94a3b8" stopOpacity="0" />
        <stop offset="100%" stopColor="#64748b" stopOpacity="0.4" />
      </radialGradient>
      <radialGradient id="nucleoAzul" cx="45%" cy="40%">
        <stop offset="0%" stopColor="#67e8f9" />
        <stop offset="50%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#0369a1" />
      </radialGradient>
      <filter id="brilloAzul" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}
