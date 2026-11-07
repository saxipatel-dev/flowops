import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { Check, CircleDashed, ClipboardList, Eye, Flag, Send, X } from 'lucide-react';
import { buildJourney, describeStage } from '../../services/requestJourney.js';
import { categoryLabels, formatCurrency, formatDateTime, formatDuration, taskStatusLabels } from '../../services/format.js';
import { UserLabel } from '../Avatar.jsx';
import Badge from '../Badge.jsx';

const icons = { submitted: Send, review: Eye, decision: Check, 'follow-up': ClipboardList, complete: Flag };

const stateText = {
  done: 'Done',
  current: 'Happening now',
  pending: 'Not reached yet',
  rejected: 'Rejected',
  skipped: 'Does not apply',
};

const ringStyles = {
  done: 'border-ok text-ok',
  current: 'border-warn text-warn shadow-[0_0_0_6px_var(--fo-warn-soft)]',
  pending: 'border-line-strong text-faint',
  rejected: 'border-bad bg-bad-soft text-bad',
  skipped: 'border-dashed border-line-strong text-faint',
};

const pillStyles = { done: 'bg-ok-soft text-ok', current: 'bg-warn-soft text-warn', pending: 'bg-hover text-muted', rejected: 'bg-bad-soft text-bad', skipped: 'bg-hover text-faint' };

// Work on the follow-up task reads in violet, like tasks in progress elsewhere.
function ringFor(stage) {
  if (stage.key === 'follow-up' && stage.state === 'current') return 'border-accent text-accent shadow-[0_0_0_6px_var(--fo-accent-soft)]';
  return ringStyles[stage.state];
}

function trackFor(from, to) {
  if (to.state === 'rejected') return 'bg-gradient-to-r from-ok to-bad';
  if ((from.state === 'skipped' && to.state === 'done') || (to.state === 'skipped' && from.state === 'done' && to.key === 'follow-up')) {
    return 'bg-[repeating-linear-gradient(90deg,var(--fo-ok)_0_5px,transparent_5px_11px)]';
  }
  if (to.state === 'skipped' || from.state === 'skipped' || from.state === 'rejected') {
    return 'bg-[repeating-linear-gradient(90deg,var(--fo-line-strong)_0_5px,transparent_5px_11px)]';
  }
  if (to.state === 'pending') return 'bg-line';
  return 'bg-ok';
}

// The same track for the vertical phone layout (class names written out so Tailwind finds them).
function verticalTrackFor(from, to) {
  if (to.state === 'rejected') return 'bg-gradient-to-b from-ok to-bad';
  if ((from.state === 'skipped' && to.state === 'done') || (to.state === 'skipped' && from.state === 'done' && to.key === 'follow-up')) {
    return 'bg-[repeating-linear-gradient(180deg,var(--fo-ok)_0_5px,transparent_5px_11px)]';
  }
  if (to.state === 'skipped' || from.state === 'skipped' || from.state === 'rejected') {
    return 'bg-[repeating-linear-gradient(180deg,var(--fo-line-strong)_0_5px,transparent_5px_11px)]';
  }
  if (to.state === 'pending') return 'bg-line';
  return 'bg-ok';
}

// The stage the map opens on: wherever the request is now.
function defaultStage(stages) {
  const now = stages.findIndex((stage) => stage.state === 'current' || stage.state === 'rejected');
  if (now >= 0) return now;
  return stages.map((stage) => stage.state).lastIndexOf('done');
}

function Fact({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow mb-1">{label}</dt>
      <dd className="text-sm text-ink-2">{children}</dd>
    </div>
  );
}

// What the panel says about each stage. Everything comes from recorded fields.
function StageDetails({ stage, request, permissions, viewerId }) {
  const facts = [];
  if (stage.key === 'submitted') {
    facts.push(
      <Fact key="by" label="Requested by"><UserLabel name={request.requester.name} size="xs" /></Fact>,
      <Fact key="when" label="Submitted"><span className="font-mono text-[13px]">{formatDateTime(request.createdAt)}</span></Fact>,
      <Fact key="what" label="Category">{categoryLabels[request.category]}</Fact>,
      <Fact key="cost" label="Estimate"><span className="font-mono text-[13px]">{formatCurrency(request.estimatedCost)}</span></Fact>,
    );
  } else if (stage.key === 'review') {
    facts.push(<Fact key="who" label="Reviewer"><UserLabel name={request.reviewer.name} size="xs" /></Fact>);
    facts.push(
      <Fact key="wait" label={stage.state === 'current' ? 'Waiting so far' : 'Time to decision'}>
        {formatDuration(request.createdAt, stage.state === 'current' ? new Date() : request.reviewedAt)}
      </Fact>,
    );
  } else if (stage.key === 'decision' && stage.state !== 'pending') {
    facts.push(
      <Fact key="who" label="Decided by"><UserLabel name={stage.actor || request.reviewer.name} size="xs" /></Fact>,
      <Fact key="when" label="When"><span className="font-mono text-[13px]">{formatDateTime(stage.at)}</span></Fact>,
    );
  } else if (stage.key === 'follow-up' && stage.task) {
    facts.push(
      <Fact key="task" label="Task">
        {permissions.canViewFollowUpTask ? (
          <Link to={`/tasks/${stage.task.id}`} className="link">
            {stage.task.title}
          </Link>
        ) : (
          stage.task.title
        )}
      </Fact>,
      <Fact key="who" label="Assignee"><UserLabel name={stage.task.assignee?.name || 'Unassigned'} size="xs" /></Fact>,
      <Fact key="status" label="Status"><Badge value={stage.task.status} /></Fact>,
    );
  } else if (stage.key === 'complete' && stage.state === 'done') {
    facts.push(
      <Fact key="when" label="Finished">
        {stage.at ? <span className="font-mono text-[13px]">{formatDateTime(stage.at)}</span> : <span className="text-faint">Time not recorded</span>}
      </Fact>,
    );
  }

  return (
    <div className="space-y-3">
      {/* The sentence summarises stages that have no facts of their own; otherwise the facts say it. */}
      {facts.length === 0 && <p className="text-sm text-ink">{describeStage(stage, request, viewerId)}</p>}
      {stage.key === 'review' && stage.state === 'current' && (
        <p className="text-xs text-faint">The reviewer is assigned when the request is submitted; FlowOps does not record a separate “review started” time.</p>
      )}
      {stage.key === 'decision' && stage.note && (
        <blockquote className="border-l-2 border-accent bg-sunken px-3 py-2 text-sm text-ink-2 italic">“{stage.note}”</blockquote>
      )}
      {stage.key === 'decision' && stage.state === 'pending' && permissions.canDecide && (
        <a href="#decision" className="link text-sm">
          Your decision is needed. Go to the decision form
        </a>
      )}
      {stage.key === 'follow-up' && stage.task && !permissions.canViewFollowUpTask && (
        <p className="text-xs text-faint">The task belongs to {stage.task.assignee?.name}; you can follow its progress here.</p>
      )}
      {facts.length > 0 && <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">{facts}</dl>}
    </div>
  );
}

// FlowMap: a request's journey from submission to completion as a transit line.
// Every stop is a button; arrow keys move between them and the panel explains the chosen one.
export default function FlowMap({ request, permissions, viewerId, compact = false }) {
  const stages = buildJourney(request);
  const [selected, setSelected] = useState(() => defaultStage(stages));
  const listRef = useRef(null);
  const stage = stages[selected];

  function focusStage(index) {
    const next = (index + stages.length) % stages.length;
    setSelected(next);
    listRef.current?.querySelector(`[data-stage="${next}"]`)?.focus();
  }

  function handleKeyDown(event) {
    const moves = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (moves[event.key]) {
      event.preventDefault();
      focusStage(selected + moves[event.key]);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusStage(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusStage(stages.length - 1);
    }
  }

  const panel = (
    <div key={stage.key} className="animate-fade-up rounded-xl border border-line bg-sunken p-4" aria-live="polite">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold">{stage.label}</h3>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${pillStyles[stage.state]}`}>{stateText[stage.state]}</span>
      </div>
      <StageDetails stage={stage} request={request} permissions={permissions} viewerId={viewerId} />
    </div>
  );

  return (
    <div>
      <ol
        ref={listRef}
        onKeyDown={handleKeyDown}
        aria-label="Request journey. Use the arrow keys to move between stages."
        className="grid grid-cols-1 gap-0 sm:grid-cols-5"
      >
        {stages.map((item, index) => {
          const Icon = item.state === 'rejected' ? X : item.state === 'skipped' ? CircleDashed : icons[item.key];
          const active = index === selected;
          return (
            <li key={item.key} className="relative">
              {index > 0 && (
                // Wide screens: horizontal track in from the previous stop.
                <span
                  className={`absolute top-[22px] right-1/2 left-[-50%] hidden h-1 origin-left animate-draw-x rounded-full sm:block ${trackFor(stages[index - 1], item)}`}
                  style={{ animationDelay: `${index * 90}ms` }}
                  aria-hidden="true"
                />
              )}
              {index < stages.length - 1 && (
                // Phones: vertical track down to the next stop. It runs from the bottom of this
                // stop's circle to the bottom of the row, so it stretches past an open panel.
                <span
                  className={`absolute top-[50px] -bottom-1.5 left-5 w-1 rounded-full sm:hidden ${verticalTrackFor(item, stages[index + 1])}`}
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                data-stage={index}
                tabIndex={active ? 0 : -1}
                aria-pressed={active}
                aria-label={`${item.label}: ${stateText[item.state]}. ${describeStage(item, request, viewerId)}`}
                onClick={() => setSelected(index)}
                className={`group relative z-10 flex w-full items-center gap-3 rounded-xl py-1.5 text-left sm:flex-col sm:gap-2 sm:text-center ${compact ? '' : 'sm:pb-2'}`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] bg-canvas transition-transform duration-200 group-hover:scale-105 ${ringFor(item)} ${
                    active ? 'scale-110 ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''
                  }`}
                  aria-hidden="true"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className={`block font-display text-sm font-semibold ${active ? 'text-ink' : 'text-ink-2'}`}>{item.label}</span>
                  <span className="block truncate font-mono text-[11px] text-faint">
                    {item.at ? formatDateTime(item.at) : item.key === 'follow-up' && item.task ? taskStatusLabels[item.task.status] : stateText[item.state]}
                  </span>
                </span>
              </button>
              {/* Phones: the chosen stop opens its details right under it. */}
              {active && <div className="mt-2 mb-3 ml-14 sm:hidden">{panel}</div>}
            </li>
          );
        })}
      </ol>
      <div className="mt-4 hidden sm:block">{panel}</div>
    </div>
  );
}
