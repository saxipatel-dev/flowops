import { Link } from 'react-router';
import { requestStatusLabels, taskStatusLabels } from '../../services/format.js';
import { toSegments } from '../../services/missionControl.js';

const taskColors = { TODO: 'bg-info', IN_PROGRESS: 'bg-accent', COMPLETED: 'bg-ok' };
const requestColors = { PENDING: 'bg-warn', APPROVED: 'bg-ok', REJECTED: 'bg-bad' };

function Meter({ title, counts, order, colors, labels, linkFor }) {
  const { total, segments } = toSegments(counts, order);
  return (
    <div>
      <p className="flex items-baseline justify-between">
        <span className="text-sm text-muted">{title}</span>
        <span className="font-display text-2xl font-bold text-ink tabular-nums">{total}</span>
      </p>
      <div className="mt-2 flex h-2 gap-[3px] overflow-hidden rounded-full bg-hover" aria-hidden="true">
        {segments
          .filter((segment) => segment.count > 0)
          .map((segment) => (
            <span key={segment.key} className={`h-full origin-left animate-draw-x ${colors[segment.key]}`} style={{ width: `${segment.share * 100}%` }} />
          ))}
      </div>
      <ul className="mt-2.5 grid grid-cols-3 gap-2">
        {segments.map((segment) => (
          <li key={segment.key}>
            <Link to={linkFor(segment.key)} className="group block rounded-md py-1 text-xs" aria-label={`${labels[segment.key]}: ${segment.count}. Show them.`}>
              <span className="flex items-center gap-1.5 text-faint group-hover:text-ink">
                <span className={`h-2 w-2 rounded-full ${colors[segment.key]}`} aria-hidden="true" />
                {labels[segment.key]}
              </span>
              <span className="mt-0.5 block font-mono text-sm text-ink tabular-nums">
                {segment.count}
                <span className="ml-1 text-[11px] text-faint">{Math.round(segment.share * 100)}%</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Workload split by status, from the same counts the Tasks and Requests pages use.
export default function TeamLoad({ taskStatusCounts, requestStatusCounts, role }) {
  const team = role !== 'EMPLOYEE';
  const scope = team ? 'scope=team&' : '';
  return (
    <section className="card p-4 sm:p-5" aria-labelledby="load-title">
      <h2 id="load-title" className="text-base font-semibold">
        {team ? (role === 'ADMIN' ? 'Organisation load' : 'Team load') : 'Your load'}
      </h2>
      <p className="mt-0.5 text-xs text-faint">All {team ? 'visible' : 'of your'} tasks and requests by status</p>
      <div className="mt-4 grid gap-5">
        <Meter
          title="Tasks"
          counts={taskStatusCounts}
          order={['TODO', 'IN_PROGRESS', 'COMPLETED']}
          colors={taskColors}
          labels={taskStatusLabels}
          linkFor={(status) => `/tasks?${team ? 'scope=all&' : ''}status=${status}`}
        />
        <Meter
          title="Requests"
          counts={requestStatusCounts}
          order={['PENDING', 'APPROVED', 'REJECTED']}
          colors={requestColors}
          labels={requestStatusLabels}
          linkFor={(status) => `/requests?${scope}status=${status}`}
        />
      </div>
    </section>
  );
}
