import { useMemo } from 'react';
import { Activity, CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useQueryParams } from '../hooks/useQueryParams.js';
import { localDayKey } from '../services/format.js';
import { addDaysToKey } from '../services/missionControl.js';
import PageHeader from '../components/PageHeader.jsx';
import ActivityTimeline from '../components/ActivityTimeline.jsx';
import HeatGrid, { HeatLegend, longDate } from '../components/HeatGrid.jsx';
import Pagination from '../components/Pagination.jsx';
import { buttonClasses } from '../components/Button.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';

const RIBBON_DAYS = 91;

const descriptions = {
  ADMIN: 'Everything recorded across FlowOps.',
  MANAGER: 'What you and your team have done.',
  EMPLOYEE: 'Your own actions and everything that happened to your tasks and requests.',
};

const typeFilters = [
  { value: '', label: 'Everything', dot: 'bg-faint' },
  { value: 'task', label: 'Tasks', dot: 'bg-info' },
  { value: 'request', label: 'Requests', dot: 'bg-warn' },
  { value: 'user', label: 'People', dot: 'bg-accent', roles: ['ADMIN'] },
];

// The 13-week pulse across the top of History. Picking a day filters the timeline to it.
function PulseRibbon({ utcOffset, date, onPick }) {
  const { data, error } = useApi('/activity/summary', { days: RIBBON_DAYS, utcOffset });
  if (error || !data) return null;
  const index = data.days.findIndex((day) => day.date === date);
  const activeDays = data.days.filter((day) => day.count > 0).length;
  const busiest = data.days.reduce((best, day) => (day.count > (best?.count || 0) ? day : best), null);
  return (
    <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
      <div>
        <HeatGrid days={data.days} selected={index >= 0 ? index : null} onPick={(next) => onPick(data.days[next].date)} label="Pick a day to see only its events. Use the arrow keys to move between days." />
        <div className="mt-2.5">
          <HeatLegend />
        </div>
      </div>
      <dl className="grid w-full grid-cols-3 gap-4 sm:w-auto sm:min-w-[320px] sm:flex-1">
        <div>
          <dt className="eyebrow">Events</dt>
          <dd className="mt-1 font-display text-2xl font-bold text-ink tabular-nums">{data.total}</dd>
          <dd className="text-xs text-faint">in 13 weeks</dd>
        </div>
        <div>
          <dt className="eyebrow">Active days</dt>
          <dd className="mt-1 font-display text-2xl font-bold text-ink tabular-nums">{activeDays}</dd>
          <dd className="text-xs text-faint">of {data.days.length}</dd>
        </div>
        {busiest && (
          <div>
            <dt className="eyebrow">Busiest day</dt>
            <dd className="mt-1">
              <button type="button" onClick={() => onPick(busiest.date)} className="link text-left font-mono text-sm">
                {longDate(busiest.date)}
              </button>
            </dd>
            <dd className="text-xs text-faint">{busiest.count} events</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

// History: everything the user is allowed to see, as a line through each day.
// Type, day and page all live in the URL, so a view can be shared or bookmarked.
export default function ActivityPage() {
  const { user } = useAuth();
  const utcOffset = useMemo(() => -new Date().getTimezoneOffset(), []);
  const today = localDayKey();
  const [query, setQuery] = useQueryParams({ type: '', page: '1' });
  const date = /^\d{4}-\d{2}-\d{2}$/.test(query.date || '') ? query.date : '';
  const params = { entityType: query.type || undefined, page: query.page };
  if (date) Object.assign(params, { date, utcOffset });
  const { data, loading, error, reload } = useApi('/activity', params);

  const filters = typeFilters.filter((filter) => !filter.roles || filter.roles.includes(user.role));

  function renderBody() {
    if (error) return <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>;
    if (!data) return <Loading />;
    if (data.activity.length === 0) {
      return (
        <EmptyState
          icon={Activity}
          title={date ? `Nothing recorded on ${longDate(date)}` : 'No activity yet'}
          message={date ? 'Pick another day on the pulse, or step through the days above.' : 'Actions on tasks and requests will appear here as they happen.'}
          action={
            date && (
              <button type="button" className={buttonClasses('secondary', 'sm')} onClick={() => setQuery({ date: '' })}>
                Show all days
              </button>
            )
          }
        />
      );
    }
    return (
      <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <ActivityTimeline activity={data.activity} partial={data.total > data.activity.length} />
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => setQuery({ page: String(page) })} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <PageHeader eyebrow="History" title="Activity" description={descriptions[user.role]} />

      <section className="card mb-4 p-4 sm:p-5" aria-label="Activity by day">
        <PulseRibbon utcOffset={utcOffset} date={date} onPick={(next) => setQuery({ date: next })} />
      </section>

      <div className="card overflow-clip">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kind of record">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setQuery({ type: filter.value })}
                aria-pressed={(query.type || '') === filter.value}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  (query.type || '') === filter.value ? 'border-accent-strong bg-hover text-ink' : 'border-line text-muted hover:text-ink'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${filter.dot}`} aria-hidden="true" />
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5" role="group" aria-label="Day">
            {date ? (
              <>
                <button type="button" className={buttonClasses('ghost', 'icon')} onClick={() => setQuery({ date: addDaysToKey(date, -1) })} aria-label="Previous day">
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="rounded-lg border border-accent-strong bg-accent-soft px-2.5 py-1 font-mono text-xs text-ink">{longDate(date)}</span>
                <button
                  type="button"
                  className={buttonClasses('ghost', 'icon')}
                  onClick={() => setQuery({ date: addDaysToKey(date, 1) })}
                  disabled={date >= today}
                  aria-label="Next day"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" className={buttonClasses('ghost', 'sm')} onClick={() => setQuery({ date: '' })}>
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  All days
                </button>
              </>
            ) : (
              <label className="flex items-center gap-2 text-xs text-muted">
                <CalendarDays className="h-4 w-4 text-faint" aria-hidden="true" />
                Jump to a day
                <input type="date" max={today} className="input h-8 w-auto py-0 text-xs" value="" onChange={(event) => event.target.value && setQuery({ date: event.target.value })} />
              </label>
            )}
          </div>
        </div>
        <p className="border-b border-line-soft px-4 py-2 text-xs text-faint sm:px-5" aria-live="polite">
          {data &&
            (date
              ? `${data.total} ${data.total === 1 ? 'event' : 'events'} on ${longDate(date)}`
              : `${data.total} ${data.total === 1 ? 'event' : 'events'} you can see, newest first`)}
        </p>
        {renderBody()}
      </div>
    </div>
  );
}
