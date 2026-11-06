import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '../../hooks/useApi.js';
import { heatLevel } from '../../services/missionControl.js';
import ActivityList from '../ActivityList.jsx';
import { ErrorMessage, Loading } from '../Feedback.jsx';

const DAYS = 91;
const levelStyles = ['bg-hover', 'bg-accent/25', 'bg-accent/45', 'bg-accent/70', 'bg-accent'];
const weekdayLetters = ['M', '', 'W', '', 'F', '', 'S'];
const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function longDate(key) {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
}

function DayEvents({ date, utcOffset }) {
  const { data, error, reload } = useApi('/activity', { date, utcOffset });
  if (error) return <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>;
  if (!data) return <Loading text="Loading the day…" />;
  return (
    <>
      <ActivityList activity={data.activity} />
      {data.total > data.activity.length && (
        <p className="border-t border-line-soft px-4 py-2.5 text-xs text-faint">
          {data.total - data.activity.length} more on this day.{' '}
          <Link to="/activity" className="link">
            Open activity
          </Link>
        </p>
      )}
    </>
  );
}

// Operations Pulse: thirteen weeks of recorded events, one cell per day.
// Pick a day (click, or arrow keys) to read what happened.
export default function PulseHeatmap() {
  const utcOffset = useMemo(() => -new Date().getTimezoneOffset(), []);
  const { data, error, reload } = useApi('/activity/summary', { days: DAYS, utcOffset });
  const [picked, setPicked] = useState(null);
  const gridRef = useRef(null);

  const days = data?.days || [];
  const max = Math.max(0, ...days.map((day) => day.count));
  // Weeks run Monday to Sunday, so the first column may start part-way down.
  const padding = days.length ? (new Date(`${days[0].date}T00:00:00Z`).getUTCDay() + 6) % 7 : 0;
  const lastActive = days.findLastIndex((day) => day.count > 0);
  const selected = picked ?? (lastActive >= 0 ? lastActive : days.length - 1);
  const busiest = days.reduce((best, day) => (day.count > (best?.count || 0) ? day : best), null);
  const activeDays = days.filter((day) => day.count > 0).length;

  function pick(index) {
    const next = Math.max(0, Math.min(days.length - 1, index));
    setPicked(next);
    gridRef.current?.querySelector(`[data-index="${next}"]`)?.focus();
  }

  function handleKeyDown(event) {
    const moves = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7, Home: -days.length, End: days.length };
    if (moves[event.key] === undefined) return;
    event.preventDefault();
    pick(selected + moves[event.key]);
  }

  // Events per weekday across the whole range (Monday first): the team's weekly rhythm.
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  days.forEach((day) => {
    weekdayTotals[(new Date(`${day.date}T00:00:00Z`).getUTCDay() + 6) % 7] += day.count;
  });
  const weekdayMax = Math.max(...weekdayTotals);

  return (
    <section className="card overflow-hidden" aria-labelledby="pulse-title">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3 sm:px-5">
        <div>
          <h2 id="pulse-title" className="text-base font-semibold">
            Operations Pulse
          </h2>
          <p className="text-xs text-faint">Recorded events per day, last 13 weeks</p>
        </div>
        {data && (
          <dl className="flex items-baseline gap-4">
            <div className="flex items-baseline gap-1.5">
              <dd className="font-display text-lg font-bold text-ink tabular-nums">{data.total}</dd>
              <dt className="text-xs text-faint">events</dt>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dd className="font-display text-lg font-bold text-ink tabular-nums">{activeDays}</dd>
              <dt className="text-xs text-faint">active days</dt>
            </div>
            {busiest && (
              <div className="hidden items-baseline gap-1.5 sm:flex">
                <dt className="text-xs text-faint">busiest</dt>
                <dd className="font-mono text-sm text-ink">{longDate(busiest.date)}</dd>
              </div>
            )}
          </dl>
        )}
      </header>

      {error && <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>}
      {!data && !error && <Loading text="Reading the pulse…" />}

      {data && (
        <div className="grid items-start lg:grid-cols-[auto_minmax(0,1fr)] lg:divide-x lg:divide-line">
          <div className="flex flex-wrap gap-x-8 gap-y-4 px-4 py-4 sm:px-5 lg:flex-col">
            <div>
              <div className="flex gap-2">
                <div className="grid grid-rows-7 gap-[3px] font-mono text-[9px] leading-[13px] text-faint lg:leading-4" aria-hidden="true">
                  {weekdayLetters.map((letter, index) => (
                    <span key={index}>{letter}</span>
                  ))}
                </div>
                <div
                  ref={gridRef}
                  role="group"
                  aria-label="Events per day. Use the arrow keys to move between days."
                  onKeyDown={handleKeyDown}
                  className="grid grid-flow-col grid-rows-7 gap-[3px]"
                >
                  {Array.from({ length: padding }, (_, index) => (
                    <span key={`pad-${index}`} className="h-[13px] w-[13px] lg:h-4 lg:w-4" aria-hidden="true" />
                  ))}
                  {days.map((day, index) => {
                    const isSelected = index === selected;
                    return (
                      <button
                        key={day.date}
                        type="button"
                        data-index={index}
                        tabIndex={isSelected ? 0 : -1}
                        onClick={() => pick(index)}
                        aria-pressed={isSelected}
                        aria-label={`${longDate(day.date)}: ${day.count} ${day.count === 1 ? 'event' : 'events'}`}
                        className={`h-[13px] w-[13px] rounded-[3px] transition-transform duration-100 hover:scale-125 lg:h-4 lg:w-4 ${levelStyles[heatLevel(day.count, max)]} ${
                          isSelected ? 'outline-2 outline-offset-1 outline-ink' : ''
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-faint" aria-hidden="true">
                Less
                {levelStyles.map((style) => (
                  <span key={style} className={`h-[11px] w-[11px] rounded-[3px] ${style}`} />
                ))}
                More
              </div>
            </div>

            <figure className="min-w-[150px]">
              <figcaption className="eyebrow mb-2">Weekly rhythm</figcaption>
              <ol className="flex h-14 items-end gap-1.5" aria-label="Events by weekday">
                {weekdayTotals.map((total, index) => (
                  <li key={index} className="flex flex-1 flex-col items-center gap-1" aria-label={`${weekdayNames[index]}: ${total} events`}>
                    <span
                      className={`w-full origin-bottom animate-grow-y rounded-sm ${total === weekdayMax && total > 0 ? 'bg-accent' : 'bg-accent/35'}`}
                      style={{ height: `${weekdayMax ? Math.max(3, (total / weekdayMax) * 40) : 3}px` }}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-[9px] text-faint" aria-hidden="true">
                      {weekdayNames[index][0]}
                    </span>
                  </li>
                ))}
              </ol>
            </figure>
          </div>

          <div className="min-w-0">
            {days[selected] && (
              <>
                <p className="flex items-baseline justify-between px-4 pt-3.5 pb-1 sm:px-5" aria-live="polite">
                  <span className="font-display text-[15px] font-semibold text-ink">{longDate(days[selected].date)}</span>
                  <span className="text-xs text-faint">
                    {days[selected].count} {days[selected].count === 1 ? 'event' : 'events'}
                  </span>
                </p>
                {days[selected].count === 0 ? (
                  <p className="px-4 py-6 text-sm text-faint sm:px-5">Nothing was recorded on this day.</p>
                ) : (
                  // On wide screens the list scrolls inside the panel, so it never towers over the heatmap.
                  <div key={days[selected].date} className="animate-fade-up lg:max-h-[268px] lg:overflow-y-auto">
                    <DayEvents date={days[selected].date} utcOffset={utcOffset} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
