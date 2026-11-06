import { Link } from 'react-router';
import Card, { CardHeader } from './Card.jsx';

// A ring chart drawn with SVG strokes. The circle's circumference is 100, so each
// segment's dash length is its percentage of the total.
const RADIUS = 15.9155;
const GAP = 1.2;

function Donut({ segments, total }) {
  let offset = 25; // start at 12 o'clock
  const visible = segments.filter((segment) => segment.value > 0);

  return (
    <svg viewBox="0 0 36 36" className="h-24 w-24 shrink-0 sm:h-28 sm:w-28" aria-hidden="true">
      <circle cx="18" cy="18" r={RADIUS} fill="none" strokeWidth="3.6" className="stroke-slate-100" />
      {visible.map((segment) => {
        const share = (segment.value / total) * 100;
        const length = visible.length > 1 ? Math.max(share - GAP, 0.5) : share;
        const circle = (
          <circle
            key={segment.key}
            cx="18"
            cy="18"
            r={RADIUS}
            fill="none"
            strokeWidth="3.6"
            strokeDasharray={`${length} ${100 - length}`}
            strokeDashoffset={offset}
            className={segment.stroke}
          />
        );
        offset -= share;
        return circle;
      })}
      <text x="18" y="18.5" textAnchor="middle" className="fill-navy text-[7px] font-semibold tabular-nums">
        {total}
      </text>
      <text x="18" y="23.5" textAnchor="middle" className="fill-slate-500 text-[3.2px]">
        total
      </text>
    </svg>
  );
}

// `segments` is a list of { key, label, value, stroke, dot, to }.
export default function StatusChart({ title, description, icon, segments, emptyMessage }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const summary = segments.map((segment) => `${segment.label}: ${segment.value}`).join(', ');

  return (
    <Card className="flex flex-col">
      <CardHeader title={title} description={description} icon={icon} />
      {total === 0 ? (
        <p className="flex flex-1 items-center justify-center px-4 py-10 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="flex flex-1 items-center justify-center gap-5 px-4 py-4 sm:gap-8 sm:px-5">
          <figure className="m-0" role="img" aria-label={`${title}: ${summary}`}>
            <Donut segments={segments} total={total} />
          </figure>
          <ul className="w-full max-w-64 min-w-0 space-y-0.5">
            {segments.map((segment) => (
              <li key={segment.key}>
                <Link
                  to={segment.to}
                  className="-mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-50"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${segment.dot}`} aria-hidden="true" />
                  <span className="flex-1 truncate text-slate-600">{segment.label}</span>
                  <span className="font-semibold text-navy tabular-nums">{segment.value}</span>
                  <span className="w-9 text-right text-xs text-slate-500 tabular-nums">
                    {Math.round((segment.value / total) * 100)}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
