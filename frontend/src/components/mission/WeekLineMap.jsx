import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatCurrency, formatDueLabel, localDayKey, taskStatusLabels } from '../../services/format.js';
import {
  DAY_WEIGHTS,
  WEEK_DAYS,
  addDaysToKey,
  buildLines,
  daysBetween,
  keyOf,
  stationState,
  weekPosition,
} from '../../services/missionControl.js';
import Avatar, { avatarColor } from '../Avatar.jsx';
import Badge from '../Badge.jsx';
import { buttonClasses } from '../Button.jsx';
import { ErrorMessage } from '../Feedback.jsx';

const LABEL_WIDTH = 128;
const STACK_GAP = 54;
const columns = `${LABEL_WIDTH}px ${DAY_WEIGHTS.map((weight) => `${weight}fr`).join(' ')}`;
// Places something at a 0–1 position across the week track (right of the name column).
const across = (position) => `calc(${LABEL_WIDTH}px + (100% - ${LABEL_WIDTH}px) * ${position})`;

const ringStyles = {
  todo: 'border-info bg-canvas',
  progress: 'border-accent bg-canvas',
  done: 'border-ok bg-ok',
  late: 'border-bad bg-canvas shadow-[0_0_0_4px_var(--fo-bad-soft)]',
};

const stateText = { todo: 'To do', progress: 'In progress', done: 'Completed', late: 'Late' };

// What the one-tap action next to a task does.
const nextStep = {
  TODO: { status: 'IN_PROGRESS', label: 'Start' },
  IN_PROGRESS: { status: 'COMPLETED', label: 'Mark complete' },
  COMPLETED: { status: 'IN_PROGRESS', label: 'Reopen' },
};

function dayLabel(key, options) {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', ...options });
}

function rangeLabel(startKey) {
  const endKey = addDaysToKey(startKey, WEEK_DAYS - 1);
  return `${dayLabel(startKey, { day: 'numeric', month: 'short' })} – ${dayLabel(endKey, { day: 'numeric', month: 'short' })}`;
}

// The short state under a stop. It is also part of the stop's accessible name.
function stopMeta(task, state) {
  if (state === 'late') return formatDueLabel(task.dueDate).replace('Overdue by ', '').replace(' days', 'd').replace(' day', 'd') + ' late';
  return stateText[state];
}

function Station({ stop, selected, pulsing, onSelect, line }) {
  const { task, dayIndex, state, stack } = stop;
  const alignEnd = dayIndex >= 5;
  return (
    <button
      type="button"
      onClick={() => onSelect(task.id)}
      aria-pressed={selected}
      className={`group absolute z-30 flex flex-col gap-1.5 rounded-lg text-left ${alignEnd ? 'items-end text-right' : 'items-start'}`}
      style={{
        left: across(weekPosition(dayIndex)),
        top: 9 + stack * STACK_GAP,
        transform: alignEnd ? 'translateX(calc(-100% + 11px))' : 'translateX(-11px)',
      }}
    >
      <span
        className={`block h-[22px] w-[22px] rounded-full border-4 transition-[transform,box-shadow] duration-150 group-hover:scale-110 ${ringStyles[state]} ${
          selected ? 'scale-[1.18] shadow-glow' : ''
        } ${pulsing ? 'animate-pulse-ring' : ''}`}
        aria-hidden="true"
      />
      {/* The visible title and state name the stop; who and when are added for screen readers. */}
      <span className="max-w-[84px] rounded bg-surface/85 pr-1 text-[11px] leading-tight">
        <span className={`line-clamp-2 font-medium ${selected ? 'text-ink' : 'text-ink-2'}`}>{task.title}</span>
        <span className="sr-only">, {line.isMe ? 'you' : line.user.name}, </span>
        <span className={state === 'late' ? 'text-bad' : 'text-faint'}>{stopMeta(task, state)}</span>
        <span className="sr-only">, {formatDueLabel(task.dueDate)}</span>
      </span>
    </button>
  );
}

function PersonLine({ line, travelled, selectedId, pulsingId, onSelect }) {
  const height = 88 + (line.depth - 1) * STACK_GAP;
  const tint = avatarColor(line.user.name);
  return (
    <li className="relative border-t border-line-soft first:border-t-0" style={{ height }}>
      <div className="absolute top-3.5 left-0 flex items-center gap-2" style={{ width: LABEL_WIDTH - 12 }}>
        <Avatar name={line.user.name} size="sm" />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-xs font-medium text-ink">{line.isMe ? 'You' : line.user.name.split(' ')[0]}</span>
          <span className="block text-[11px] text-faint">
            {line.stops.length} {line.stops.length === 1 ? 'stop' : 'stops'}
          </span>
        </span>
      </div>
      {/* Track ahead (dashed) and the part of the week already travelled (solid, in the person's colour). */}
      <span
        className="absolute top-[19px] right-0 h-1 rounded-full bg-[repeating-linear-gradient(90deg,var(--fo-line)_0_4px,transparent_4px_10px)]"
        style={{ left: LABEL_WIDTH }}
        aria-hidden="true"
      />
      {travelled > 0 && (
        <span
          className="absolute top-[19px] h-1 origin-left animate-draw-x rounded-full opacity-80"
          style={{ left: LABEL_WIDTH, width: `calc((100% - ${LABEL_WIDTH}px) * ${travelled})`, backgroundColor: tint }}
          aria-hidden="true"
        />
      )}
      {line.stops.map((stop) => (
        <Station
          key={stop.task.id}
          stop={stop}
          line={line}
          selected={selectedId === stop.task.id}
          pulsing={pulsingId === stop.task.id}
          onSelect={onSelect}
        />
      ))}
    </li>
  );
}

// Requests waiting on this manager grow as amber bars from submission towards NOW.
function ApprovalDesk({ requests, startKey, nowPosition, selectedId, onSelect }) {
  const visible = requests.slice(0, 4);
  const height = 34 + visible.length * 30;
  return (
    <li className="relative" style={{ height }}>
      <div className="absolute top-3 left-0 leading-tight" style={{ width: LABEL_WIDTH - 12 }}>
        <span className="block text-xs font-medium text-ink">Your desk</span>
        <span className="block text-[11px] text-faint">approvals waiting</span>
      </div>
      {visible.map((request, index) => {
        const submitted = new Date(request.createdAt);
        // Submission time on the viewer's local clock, like the NOW line.
        const dayIndex = daysBetween(startKey, localDayKey(submitted));
        const startPosition = dayIndex < 0 ? 0 : weekPosition(dayIndex, (submitted.getHours() * 60 + submitted.getMinutes()) / 1440);
        const id = `request-${request.id}`;
        const selected = selectedId === id;
        return (
          <button
            key={request.id}
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={selected}
            className={`absolute z-30 h-3 rounded-full border bg-gradient-to-r from-warn/15 to-warn/60 transition-shadow ${
              selected ? 'border-accent shadow-glow' : 'border-warn/60 hover:border-warn'
            }`}
            style={{
              top: 14 + index * 30,
              left: across(startPosition),
              width: `max(10px, calc((100% - ${LABEL_WIDTH}px) * ${Math.max(0, nowPosition - startPosition)}))`,
            }}
          >
            {/* Bars that start late in the week label leftwards from NOW, so the text stays inside the map. */}
            <span
              className={`absolute top-3.5 flex max-w-[220px] rounded bg-surface/90 px-1 text-[11px] whitespace-nowrap text-muted ${
                startPosition > 0.55 ? 'right-0' : '-left-1'
              }`}
            >
              <span className="truncate text-warn">{request.title}</span>
              {dayIndex < 0 && <span className="shrink-0">&nbsp;· since last week</span>}
              <span className="sr-only">, waiting for your decision since {submitted.toLocaleDateString()}</span>
            </span>
          </button>
        );
      })}
    </li>
  );
}

function SelectionStrip({ selection, saving, onStatusChange }) {
  if (!selection) {
    return <p className="text-sm text-faint">Choose a stop on the map to see the task and act on it here.</p>;
  }
  if (selection.request) {
    const request = selection.request;
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] font-semibold text-ink">{request.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <Badge value="PENDING" />
            <span>From {request.requester?.name}</span>
            {request.estimatedCost && <span className="font-mono">{formatCurrency(request.estimatedCost)}</span>}
          </div>
        </div>
        <Link to={`/requests/${request.id}`} className={buttonClasses('primary', 'sm')}>
          Review request
        </Link>
      </div>
    );
  }
  const task = selection.task;
  const step = nextStep[task.status];
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[15px] font-semibold text-ink">{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
          <Badge value={task.status} />
          <Badge value={task.priority} />
          <span className={stationState(task, selection.today) === 'late' ? 'text-bad' : ''}>
            {task.status === 'COMPLETED' ? 'Completed' : formatDueLabel(task.dueDate)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={task.assignee.name} size="xs" />
            {task.assignee.name}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link to={`/tasks/${task.id}`} className={buttonClasses('secondary', 'sm')}>
          Open task
        </Link>
        {task.canUpdateStatus && (
          <button type="button" className={buttonClasses('primary', 'sm')} disabled={saving} onClick={() => onStatusChange(task, step.status)}>
            {saving ? 'Saving…' : step.label}
          </button>
        )}
      </div>
    </div>
  );
}

// Phones: the same week as a vertical line, one row per day.
function VerticalWeek({ tasks, startKey, today, userId }) {
  const todayIndex = daysBetween(startKey, today);
  const inWeek = tasks.filter((task) => {
    const index = daysBetween(startKey, keyOf(task.dueDate));
    return index >= 0 && index < WEEK_DAYS;
  });
  if (inWeek.length === 0) return <p className="pb-2 text-sm text-faint">No tasks are due this week.</p>;
  return (
    <ol className="md:hidden" aria-label="Tasks by day">
      {Array.from({ length: WEEK_DAYS }, (_, dayIndex) => {
        const key = addDaysToKey(startKey, dayIndex);
        const dayTasks = tasks.filter((task) => keyOf(task.dueDate) === key);
        // Only days with stops, plus today so NOW always has a place.
        if (dayTasks.length === 0 && dayIndex !== todayIndex) return null;
        const past = dayIndex < todayIndex;
        return (
          <li key={key}>
            {dayIndex === todayIndex && (
              <p className="mb-1.5 ml-[58px] flex items-center gap-2 font-mono text-[10px] tracking-wider text-accent" aria-hidden="true">
                NOW <span className="h-0.5 flex-1 rounded bg-accent shadow-[0_0_8px_var(--fo-accent)]" />
              </p>
            )}
            <div className="grid grid-cols-[46px_20px_minmax(0,1fr)] gap-2">
              <span className={`pt-1 font-mono text-[11px] ${dayIndex === todayIndex ? 'text-accent' : 'text-faint'}`}>
                {dayLabel(key, { weekday: 'short' }).toUpperCase()} {dayLabel(key, { day: 'numeric' })}
              </span>
              <span className="relative flex justify-center" aria-hidden="true">
                <span
                  className={`absolute inset-y-0 w-1 rounded-full ${
                    past ? 'bg-line-strong' : 'bg-[repeating-linear-gradient(180deg,var(--fo-line)_0_4px,transparent_4px_9px)]'
                  }`}
                />
                <span className={`relative mt-1.5 h-3 w-3 rounded-full border-[3px] bg-canvas ${dayTasks.length ? 'border-accent' : 'border-line'}`} />
              </span>
              <div className="grid gap-1.5 pb-3">
                {dayTasks.length === 0 && <span className="pt-1 text-xs text-faint">Nothing due</span>}
                {dayTasks.map((task) => {
                  const state = stationState(task, today);
                  return (
                    <Link
                      key={task.id}
                      to={`/tasks/${task.id}`}
                      className="flex items-center gap-2.5 rounded-lg border border-line bg-raised px-3 py-2 transition-colors hover:bg-hover"
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 ${ringStyles[state]}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-ink">{task.title}</span>
                        <span className={`block text-[11px] ${state === 'late' ? 'text-bad' : 'text-faint'}`}>
                          {stateText[state]}
                          {task.assignedTo !== userId && ` · ${task.assignee.name}`}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function WeekLineMap({ startKey, today, timeline, error, onRetry, onWeekChange, approvalQueue = [], userId, onChanged, now = new Date() }) {
  const toast = useToast();
  const [selectedId, setSelectedId] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [pulsingId, setPulsingId] = useState(null);

  // Optimistic status changes are applied on top of the loaded tasks.
  const tasks = useMemo(
    () => (timeline?.tasks || []).map((task) => (overrides[task.id] ? { ...task, ...overrides[task.id] } : task)),
    [timeline, overrides],
  );
  const { lines, hiddenPeople } = useMemo(() => buildLines(tasks, { startKey, today, userId }), [tasks, startKey, today, userId]);

  const todayIndex = daysBetween(startKey, today);
  const isCurrentWeek = todayIndex >= 0 && todayIndex < WEEK_DAYS;
  const nowPosition = isCurrentWeek ? weekPosition(todayIndex, (now.getHours() * 60 + now.getMinutes()) / 1440) : todayIndex >= WEEK_DAYS ? 1 : 0;
  const earlier = timeline?.earlierOverdue || [];
  const showDesk = isCurrentWeek && approvalQueue.length > 0;

  // Default to the most urgent stop so the strip is never empty when there is work.
  const fallback = tasks.find((task) => stationState(task, today) === 'late') || tasks[0] || earlier[0];
  const activeId = selectedId ?? fallback?.id ?? null;
  const selectedTask = [...tasks, ...earlier].find((task) => task.id === activeId);
  const selectedRequest = typeof activeId === 'string' ? approvalQueue.find((request) => `request-${request.id}` === activeId) : null;
  const selection = selectedRequest ? { request: selectedRequest } : selectedTask ? { task: selectedTask, today } : null;

  async function changeStatus(task, status) {
    const previous = overrides[task.id];
    setOverrides((current) => ({ ...current, [task.id]: { status } }));
    setPulsingId(null);
    setSavingId(task.id);
    try {
      await api.patch(`/tasks/${task.id}`, { status });
      setPulsingId(task.id);
      toast.show(`Moved “${task.title}” to ${taskStatusLabels[status]}.`);
      onChanged?.();
    } catch (err) {
      setOverrides((current) => {
        const next = { ...current };
        if (previous) next[task.id] = previous;
        else delete next[task.id];
        return next;
      });
      toast.show(getErrorMessage(err), { tone: 'error' });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="card overflow-hidden" aria-labelledby="week-map-title">
      <header className="flex flex-wrap items-end justify-between gap-3 px-4 pt-4 sm:px-5">
        <div>
          <h2 id="week-map-title" className="text-base font-semibold">
            {isCurrentWeek ? 'This week on the line' : 'Week on the line'}
          </h2>
          <p className="mt-0.5 text-xs text-faint">
            <span className="font-mono text-muted">{rangeLabel(startKey)}</span> · one line per person · stops are due dates
          </p>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Choose week">
          <button type="button" onClick={() => onWeekChange(-1)} className={buttonClasses('ghost', 'icon')} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onWeekChange(0)} className={buttonClasses('secondary', 'sm')} disabled={isCurrentWeek}>
            This week
          </button>
          <button type="button" onClick={() => onWeekChange(1)} className={buttonClasses('ghost', 'icon')} aria-label="Next week">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {error && (
        <div className="p-4">
          <ErrorMessage message={error} onRetry={onRetry} />
        </div>
      )}

      {earlier.length > 0 && (
        <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-bad/30 bg-bad-soft px-3 py-2 sm:mx-5">
          <span className="text-xs font-medium text-bad">
            {earlier.length} late from before this week
          </span>
          {earlier.slice(0, 4).map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => setSelectedId(task.id)}
              aria-pressed={activeId === task.id}
              className="max-w-[180px] truncate rounded-full border border-bad/40 px-2 py-0.5 text-[11px] text-ink-2 hover:border-bad aria-pressed:border-accent"
            >
              {task.title}
            </button>
          ))}
          {earlier.length > 4 && <span className="text-[11px] text-faint">+{earlier.length - 4} more</span>}
        </div>
      )}

      <div className="hidden px-4 pt-4 md:block sm:px-5">
        <div className="grid font-mono text-[10px] tracking-wider text-faint" style={{ gridTemplateColumns: columns }} aria-hidden="true">
          <span />
          {DAY_WEIGHTS.map((_, dayIndex) => {
            const key = addDaysToKey(startKey, dayIndex);
            return (
              <span key={key} className={`truncate pl-1.5 ${dayIndex === todayIndex ? 'text-accent' : ''}`}>
                {dayLabel(key, { weekday: 'short' }).toUpperCase()}
                {dayIndex < 5 && ` ${dayLabel(key, { day: 'numeric' })}`}
              </span>
            );
          })}
        </div>

        <div className="relative mt-1.5">
          {/* Day columns, with narrower weekends. */}
          <div className="pointer-events-none absolute inset-y-0 right-0 grid" style={{ left: LABEL_WIDTH, gridTemplateColumns: DAY_WEIGHTS.map((w) => `${w}fr`).join(' ') }} aria-hidden="true">
            {DAY_WEIGHTS.map((_, dayIndex) => (
              <span key={dayIndex} className={`border-l border-dashed border-line-soft ${dayIndex >= 5 ? 'bg-white/[0.015]' : ''}`} />
            ))}
          </div>
          {isCurrentWeek && (
            <div className="pointer-events-none absolute -top-1 bottom-0 z-20 w-0.5 bg-accent shadow-[0_0_10px_var(--fo-accent)]" style={{ left: across(nowPosition) }} aria-hidden="true">
              <span className="absolute -bottom-4 -translate-x-1/2 rounded bg-surface px-1 font-mono text-[9px] tracking-wider whitespace-nowrap text-accent">
                NOW {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          <ul className="relative pb-6" aria-label="Tasks by person">
            {showDesk && (
              <ApprovalDesk requests={approvalQueue} startKey={startKey} nowPosition={nowPosition} selectedId={activeId} onSelect={setSelectedId} />
            )}
            {lines.map((line) => (
              <PersonLine key={line.user.id} line={line} travelled={nowPosition} selectedId={activeId} pulsingId={pulsingId} onSelect={setSelectedId} />
            ))}
          </ul>
          {timeline && lines.length === 0 && !showDesk && (
            <p className="pb-8 text-center text-sm text-faint">No tasks are due this week.</p>
          )}
          {hiddenPeople > 0 && (
            <p className="pb-3 text-xs text-faint">
              {hiddenPeople} more {hiddenPeople === 1 ? 'person has' : 'people have'} work due this week.{' '}
              <Link to="/tasks?scope=all" className="link">
                See all tasks
              </Link>
            </p>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 md:hidden">
        {timeline && <VerticalWeek tasks={tasks} startKey={startKey} today={today} userId={userId} />}
      </div>

      <div className="m-4 mt-2 animate-fade-up rounded-xl border border-line bg-sunken px-4 py-3 sm:mx-5 sm:mb-5" aria-live="polite" key={activeId ?? 'none'}>
        <SelectionStrip selection={selection} saving={selectedTask && savingId === selectedTask.id} onStatusChange={changeStatus} />
      </div>
    </section>
  );
}
