import { useState } from 'react';
import { Link } from 'react-router';
import { FileText } from 'lucide-react';
import { buildJourney, describeStage, journeySummary } from '../../services/requestJourney.js';
import { formatTimeAgo } from '../../services/format.js';

const dotStyles = {
  done: 'border-ok',
  current: 'border-warn shadow-[0_0_0_3px_var(--fo-warn-soft)]',
  pending: 'border-line-strong',
  rejected: 'border-bad bg-bad',
  skipped: 'border-line-strong border-dashed',
};

const dashed = 'bg-[repeating-linear-gradient(90deg,var(--fo-ok)_0_3px,transparent_3px_7px)]';

// Which colour the track takes between two stops.
function segmentClass(from, to) {
  if (to.state === 'rejected') return 'bg-bad';
  // Approved with no follow-up task: a dashed bridge over the stage that does not apply.
  if (from.state === 'skipped' && to.state === 'done') return dashed;
  if (to.state === 'skipped' && from.state === 'done' && to.key === 'follow-up') return dashed;
  if (to.state === 'skipped' || from.state === 'skipped' || from.state === 'rejected') return 'bg-transparent';
  if (to.state === 'pending') return 'bg-line';
  return 'bg-ok';
}

// The follow-up stage reads "current" in violet: work is underway on it.
function dotClass(stage) {
  if (stage.key === 'follow-up' && stage.state === 'current') return 'border-accent shadow-[0_0_0_3px_var(--fo-accent-soft)]';
  return dotStyles[stage.state];
}

function badgeFor(request) {
  if (request.status === 'PENDING') return { text: formatTimeAgo(request.createdAt).replace(' ago', ''), tone: 'bg-warn-soft text-warn' };
  if (request.status === 'REJECTED') return { text: 'Rejected', tone: 'bg-bad-soft text-bad' };
  if (request.task && request.task.status !== 'COMPLETED') return { text: 'Task', tone: 'bg-accent-soft text-accent' };
  return { text: 'Done', tone: 'bg-ok-soft text-ok' };
}

function RequestLine({ request, viewerId }) {
  const stages = buildJourney(request);
  const badge = badgeFor(request);
  // A tapped stop stays open; hover and focus show a stop only while they last.
  const [pinned, setPinned] = useState(null);
  const [peek, setPeek] = useState(null);
  const active = peek ?? pinned;
  const detail = active === null ? journeySummary(request, viewerId) : describeStage(stages[active], request, viewerId);

  return (
    <li className="rounded-lg px-2.5 py-2 transition-colors hover:bg-raised">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/requests/${request.id}`} className="line-clamp-2 text-[13px] leading-snug text-ink hover:text-accent">
          {request.title}
        </Link>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.tone}`}>{badge.text}</span>
      </div>
      <ol className="relative mt-1 grid grid-cols-5 items-center" aria-label={`Stages of ${request.title}`}>
        {stages.map((stage, index) => (
          <li key={stage.key} className="relative flex justify-center">
            {index > 0 && (
              <span className={`pointer-events-none absolute top-1/2 right-1/2 left-[-50%] h-[3px] -translate-y-1/2 ${segmentClass(stages[index - 1], stage)}`} aria-hidden="true" />
            )}
            <button
              type="button"
              aria-label={`${stage.label}: ${describeStage(stage, request, viewerId)}`}
              aria-pressed={pinned === index}
              onClick={() => setPinned((current) => (current === index ? null : index))}
              onMouseEnter={() => setPeek(index)}
              onMouseLeave={() => setPeek(null)}
              onFocus={() => setPeek(index)}
              onBlur={() => setPeek(null)}
              className="group relative z-10 flex h-6 w-6 items-center justify-center rounded-full"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full border-[2.5px] bg-canvas transition-transform duration-150 group-hover:scale-150 group-focus-visible:scale-150 ${dotClass(stage)} ${
                  active === index ? 'scale-150 ring-2 ring-accent/50 ring-offset-1 ring-offset-surface' : ''
                }`}
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ol>
      <p className={`mt-0.5 line-clamp-2 text-[11px] leading-snug ${active === null ? 'text-faint' : 'text-ink-2'}`} aria-live="polite">
        {active !== null && <span className="font-medium text-ink">{stages[active].label} · </span>}
        {detail}
      </p>
    </li>
  );
}

// Each open or recently decided request as a five-stop line, the same shape as its FlowMap.
// Every stop can be hovered, focused or tapped to read what happened there.
export default function RequestLines({ requests, viewerId }) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <FileText className="h-5 w-5 text-faint" aria-hidden="true" />
        <p className="text-sm text-muted">No open or recently decided requests.</p>
      </div>
    );
  }
  return (
    <ul className="grid gap-1 p-2">
      {requests.map((request) => (
        <RequestLine key={request.id} request={request} viewerId={viewerId} />
      ))}
    </ul>
  );
}
