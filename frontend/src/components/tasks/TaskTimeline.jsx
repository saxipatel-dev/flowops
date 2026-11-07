import { ChevronLeft, ChevronRight } from 'lucide-react';
import { daysBetween, keyOf } from '../../services/missionControl.js';
import { dueCue, placeOnTimeline, timelineRange } from '../../services/taskAtlas.js';
import Avatar from '../Avatar.jsx';
import { buttonClasses } from '../Button.jsx';

const barTones = {
  TODO: 'bg-info/30 border-info/70',
  IN_PROGRESS: 'bg-accent/30 border-accent/80',
  COMPLETED: 'bg-ok/20 border-ok/60',
  late: 'bg-bad/25 border-bad/80',
};
const stopTones = { TODO: 'border-info', IN_PROGRESS: 'border-accent', COMPLETED: 'border-ok bg-ok', late: 'border-bad' };

function dayLabel(key, options) {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', ...options });
}

function TitleLink({ task, onOpen, today }) {
  const cue = dueCue(task, today);
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={task.assignee.name} size="xs" />
      <a
        href={`/tasks/${task.id}`}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
          event.preventDefault();
          onOpen(task);
        }}
        className="min-w-0 flex-1 truncate text-[13px] text-ink hover:text-accent"
        title={task.title}
      >
        {task.title}
      </a>
      <span className={`shrink-0 font-mono text-[10px] ${cue.tone === 'bad' ? 'text-bad' : 'text-faint'}`}>{cue.text}</span>
    </span>
  );
}

// Timeline view: each task is a bar from the day it was created to its due date.
// Open work that was due before the range is pinned to a "Late" lane at the top.
export default function TaskTimeline({ tasks, today, anchor, range, onRangeChange, onShift, onOpen }) {
  const period = timelineRange(anchor, range);
  const { late, rows, undated } = placeOnTimeline(tasks, period, today);
  const todayIndex = daysBetween(period.start, today);
  const showsToday = todayIndex >= 0 && todayIndex < period.length;
  const share = (index) => `${(index / period.length) * 100}%`;
  const last = period.days[period.length - 1];

  return (
    <section aria-labelledby="timeline-title">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 id="timeline-title" className="text-sm font-semibold">
            {dayLabel(period.start, { day: 'numeric', month: 'short' })} – {dayLabel(last, { day: 'numeric', month: 'short', year: 'numeric' })}
          </h2>
          <p className="text-xs text-faint">Bars run from when a task was created to its due date.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-line bg-sunken p-0.5" role="group" aria-label="Range">
            {[
              ['week', 'Week'],
              ['month', '4 weeks'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onRangeChange(value)}
                aria-pressed={range === value}
                className={`rounded-md px-2.5 py-1 text-xs ${range === value ? 'bg-hover text-ink' : 'text-muted hover:text-ink'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => onShift(-1)} className={buttonClasses('ghost', 'icon')} aria-label={`Previous ${range === 'month' ? '4 weeks' : 'week'}`}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onShift(0)} className={buttonClasses('secondary', 'sm')} disabled={showsToday}>
            Today
          </button>
          <button type="button" onClick={() => onShift(1)} className={buttonClasses('ghost', 'icon')} aria-label={`Next ${range === 'month' ? '4 weeks' : 'week'}`}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="px-4 py-3">
        {/* Day scale. On a 4-week range only Mondays and today are labelled. */}
        <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] md:gap-4">
          <span className="hidden md:block" />
          <div className="relative h-5 font-mono text-[10px] text-faint" aria-hidden="true">
            {period.days.map((key, index) => {
              const isToday = index === todayIndex;
              const monday = index % 7 === 0;
              if (range === 'month' && !monday && !isToday) return null;
              // A Monday label right next to today's would overlap it; today wins.
              if (range === 'month' && !isToday && showsToday && Math.abs(index - todayIndex) < 4) return null;
              return (
                <span key={key} className={`absolute top-0 -translate-x-0 whitespace-nowrap ${isToday ? 'text-accent' : ''}`} style={{ left: share(index) }}>
                  {range === 'week' ? `${dayLabel(key, { weekday: 'short' }).toUpperCase()} ${dayLabel(key, { day: 'numeric' })}` : dayLabel(key, { day: 'numeric', month: 'short' })}
                </span>
              );
            })}
          </div>
        </div>

        <div className="relative">
          {/* Day grid and the today line sit behind the bars. */}
          <div className="pointer-events-none absolute inset-y-0 right-0 left-0 md:left-[256px]" aria-hidden="true">
            {period.days.map((key, index) => (
              <span
                key={key}
                className={`absolute inset-y-0 border-l ${index % 7 === 0 ? 'border-line' : 'border-line-soft border-dashed'} ${index % 7 >= 5 ? 'bg-white/[0.012]' : ''}`}
                style={{ left: share(index), width: share(1) }}
              />
            ))}
            {showsToday && (
              <span className="absolute inset-y-0 z-10 w-0.5 bg-accent shadow-[0_0_10px_var(--fo-accent)]" style={{ left: `calc(${share(todayIndex)} + ${100 / period.length / 2}%)` }} />
            )}
          </div>

          <ul className="relative" aria-label="Tasks by due date">
            {late.length > 0 && (
              <li className="py-2">
                <p className="mb-1.5 font-mono text-[10px] tracking-wider text-bad uppercase">Late, due before this range · {late.length}</p>
                <ul className="grid gap-1.5">
                  {late.map((task) => (
                    <li key={task.id} className="grid grid-cols-1 items-center gap-1.5 md:grid-cols-[240px_minmax(0,1fr)] md:gap-4">
                      <TitleLink task={task} onOpen={onOpen} today={today} />
                      <span className="relative h-3" aria-hidden="true">
                        <span className="absolute inset-y-0 left-0 w-16 rounded-r-full border border-l-0 border-bad/80 bg-gradient-to-r from-transparent to-bad/30" />
                        <span className="absolute top-1/2 left-[4.5rem] -translate-y-1/2 font-mono text-[10px] text-bad">due {dayLabel(keyOf(task.dueDate), { day: 'numeric', month: 'short' })}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            )}

            {rows.map(({ task, from, to, startsBefore, late: isLate }) => {
              const tone = isLate ? 'late' : task.status;
              return (
                <li key={task.id} className="grid grid-cols-1 items-center gap-1.5 border-t border-line-soft py-2 first:border-t-0 md:grid-cols-[240px_minmax(0,1fr)] md:gap-4">
                  <TitleLink task={task} onOpen={onOpen} today={today} />
                  <span className="relative h-3.5" aria-hidden="true">
                    <span
                      className={`absolute inset-y-0.5 origin-left animate-draw-x rounded-full border ${barTones[tone]} ${startsBefore ? 'rounded-l-none border-l-0' : ''}`}
                      style={{ left: share(from), width: `calc(${share(to - from + 1)} - ${100 / period.length / 2}%)` }}
                    />
                    <span
                      className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-canvas ${stopTones[tone]}`}
                      style={{ left: `calc(${share(to)} + ${100 / period.length / 2}%)` }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>

          {rows.length === 0 && late.length === 0 && <p className="py-10 text-center text-sm text-faint">No tasks are due in this range.</p>}
        </div>
        {undated > 0 && (
          <p className="mt-3 text-xs text-faint">
            {undated} {undated === 1 ? 'task has' : 'tasks have'} no due date and {undated === 1 ? "isn't" : "aren't"} shown here.
          </p>
        )}
      </div>
    </section>
  );
}
