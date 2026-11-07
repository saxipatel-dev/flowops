import { useMemo } from 'react';

const MAIN = 'M8 72H112C136 72 136 28 160 28H352';
const BRANCH = 'M160 28C184 28 184 80 208 80H264';

// The sign-in illustration: a request's line drawing itself in, its stops lighting up in
// order, and a train riding the approved route. Purely illustrative; it shows no data.
// With reduced motion the finished line is shown and nothing moves.
export default function LoginGraphic() {
  const reduceMotion = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const stops = [
    { x: 8, y: 72, color: '#45d6b0', label: 'Submitted' },
    { x: 112, y: 72, color: '#45d6b0', label: 'Reviewed' },
    { x: 248, y: 28, color: '#9d8cff', label: 'Follow-up' },
    { x: 352, y: 28, color: '#3a405a', label: 'Done' },
  ];

  return (
    <svg viewBox="0 0 360 110" fill="none" className="mb-8 w-full max-w-sm" aria-hidden="true">
      <path d={BRANCH} stroke="#2b3047" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 10" />
      <path d="M8 72H112C136 72 136 28 160 28H248" stroke="#45d6b0" strokeWidth="5" strokeLinecap="round" pathLength="1" className="login-draw" />
      <path d="M248 28H352" stroke="#9d8cff" strokeWidth="5" strokeLinecap="round" pathLength="1" className="login-draw" style={{ animationDelay: '500ms' }} />
      {stops.map((stop, index) => (
        <g key={stop.label} className="login-stop" style={{ animationDelay: `${250 + index * 220}ms` }}>
          <circle cx={stop.x} cy={stop.y} r={index === 2 ? 9 : 7} fill="#11141f" stroke={stop.color} strokeWidth="4" />
          {/* End labels hang inwards so they are never cut off at the edges. */}
          <text
            x={index === 0 ? stop.x - 6 : index === stops.length - 1 ? stop.x + 6 : stop.x}
            y={stop.y + (stop.y > 50 ? 26 : -16)}
            fill="#9097b3"
            fontFamily="IBM Plex Mono, monospace"
            fontSize="9"
            textAnchor={index === 0 ? 'start' : index === stops.length - 1 ? 'end' : 'middle'}
            letterSpacing="1"
          >
            {stop.label.toUpperCase()}
          </text>
        </g>
      ))}
      {!reduceMotion && (
        <circle r="4" fill="#e8eaf4">
          <animateMotion dur="5s" repeatCount="indefinite" path={MAIN} begin="1.2s" keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="5s" begin="1.2s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}
