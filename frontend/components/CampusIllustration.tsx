/** Line drawing of an institute building with two reported-issue markers.
 *  Strokes use currentColor / tokens, so it follows the light and dark theme. */

const WINDOW_COLS_LEFT = [78, 120, 162];
const WINDOW_COLS_RIGHT = [412, 454, 496];
const WINDOW_ROWS = [212, 270];

function Window({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="26" height="36" />
      <path d={`M${x + 13} ${y}v36M${x} ${y + 18}h26`} />
    </g>
  );
}

function Tree({ x }: { x: number }) {
  return (
    <g>
      <path d={`M${x} 340v-38`} />
      <circle cx={x} cy="284" r="20" />
      <path d={`M${x} 302l-8-10M${x} 296l7-8`} />
    </g>
  );
}

function Marker({ x, y, color, label, labelX, labelY }: {
  x: number; y: number; color: string; label: string; labelX: number; labelY: number;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r="9" fill="none" stroke={color} strokeOpacity="0.35" />
      <rect x={x - 4} y={y - 4} width="8" height="8" rx="1.5" fill={color} stroke="none" />
      <path d={`M${x} ${y}L${labelX} ${labelY + 4}`} stroke={color} strokeDasharray="2 3" />
      <text x={labelX + (labelX > x ? 4 : -4)} y={labelY + 8} textAnchor={labelX > x ? "start" : "end"}
        className="fill-[var(--mute)] font-mono" stroke="none" fontSize="11">{label}</text>
    </g>
  );
}

export default function CampusIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="4 52 592 312" role="img" aria-labelledby="campus-title" className={className}
      fill="none" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <title id="campus-title">Line drawing of a college building with two reported maintenance issues</title>

      {/* Light details: windows, trees, ground texture */}
      <g className="text-hairline-strong" stroke="currentColor">
        {WINDOW_COLS_LEFT.map((x) => WINDOW_ROWS.map((y) => <Window key={`l${x}${y}`} x={x} y={y} />))}
        {WINDOW_COLS_RIGHT.map((x) => WINDOW_ROWS.map((y) => <Window key={`r${x}${y}`} x={x} y={y} />))}
        <Tree x={28} />
        <Tree x={572} />
        <path d="M120 352h60M250 356h100M420 352h60" />
      </g>

      {/* Main structure */}
      <g className="text-ink" stroke="currentColor">
        <path d="M10 340h580" />
        {/* wings */}
        <path d="M60 340V194h150M540 340V194H390" />
        <path d="M54 194h156M390 194h156M54 194v-6h156M390 188h156v6" />
        {/* central block, entablature and pediment */}
        <path d="M210 340V166M390 340V166" />
        <rect x="200" y="152" width="200" height="14" />
        <path d="M196 152L300 98l104 54" />
        <circle cx="300" cy="130" r="11" />
        <path d="M300 130v-6M300 130l5 3" />
        {/* columns */}
        {[224, 254, 334, 364].map((x) => (
          <g key={x}>
            <rect x={x} y="166" width="12" height="152" />
            <path d={`M${x - 3} 170h18M${x - 3} 314h18`} />
          </g>
        ))}
        {/* door */}
        <path d="M278 318v-52a22 22 0 0 1 44 0v52M300 244v74" />
        {/* steps */}
        <path d="M196 318h208v8H196zM186 326h228v7H186zM176 333h248v7H176z" />
        {/* flag */}
        <path d="M300 98V62" />
        <path d="M300 62l26 7-26 7" />
      </g>

      {/* Reported issues */}
      <Marker x={509} y={230} color="var(--crit-fg)" label="CF-1004 wiring" labelX={490} labelY={112} />
      <Marker x={91} y={288} color="var(--high-fg)" label="CF-1001 leak" labelX={112} labelY={134} />
    </svg>
  );
}
