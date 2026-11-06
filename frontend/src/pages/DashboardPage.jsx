import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { addDaysToKey, buildFocusItems, todayKey, weekStartKey } from '../services/missionControl.js';
import FocusTickets from '../components/mission/FocusTickets.jsx';
import WeekLineMap from '../components/mission/WeekLineMap.jsx';
import RequestLines from '../components/mission/RequestLines.jsx';
import PulseHeatmap from '../components/mission/PulseHeatmap.jsx';
import TeamLoad from '../components/mission/TeamLoad.jsx';
import { ErrorMessage, Loading } from '../components/Feedback.jsx';

function greeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// One line that says how the day looks, built from the same items as the tickets.
function ShiftLine({ items, approvals }) {
  const late = items.filter((item) => item.kind === 'late').length;
  const today = items.filter((item) => item.kind === 'today').length;
  const parts = [
    <span key="needs">
      <b className="font-semibold text-ink">{items.length}</b> {items.length === 1 ? 'thing needs' : 'things need'} you
    </span>,
  ];
  if (late) parts.push(<span key="late"><b className="font-semibold text-bad">{late}</b> late</span>);
  if (today) parts.push(<span key="today"><b className="font-semibold text-ink">{today}</b> due today</span>);
  if (approvals) parts.push(<span key="approvals"><b className="font-semibold text-warn">{approvals}</b> waiting on your decision</span>);
  return (
    <p className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1 text-sm text-muted">
      {parts.map((part, index) => (
        <span key={part.key} className="flex items-center gap-2.5">
          {index > 0 && <span className="text-faint" aria-hidden="true">·</span>}
          {part}
        </span>
      ))}
    </p>
  );
}

function PanelTitle({ title, hint, action }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {action || <span className="text-xs text-faint">{hint}</span>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const now = useMemo(() => new Date(), []);
  const today = todayKey(now);
  const [weekOffset, setWeekOffset] = useState(0);
  const startKey = addDaysToKey(weekStartKey(today), weekOffset * 7);

  const summary = useApi('/dashboard/summary');
  const timeline = useApi('/dashboard/timeline', { start: startKey });

  if (summary.error && !summary.data) return <ErrorMessage message={summary.error} onRetry={summary.reload} />;
  if (!summary.data) return <Loading text="Opening Mission Control…" />;

  const data = summary.data;
  const focusItems = buildFocusItems(data, { userId: user.id, now });
  const isTeamView = user.role !== 'EMPLOYEE';
  const dateLine = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  function refresh() {
    summary.reload();
    timeline.reload();
  }

  return (
    <>
      <header className="mb-6">
        <p className="eyebrow">
          {dateLine}
          {user.department && ` · ${user.department.name}`}
        </p>
        <h1 className="mt-1.5 text-[28px] leading-tight font-bold sm:text-[32px]">
          {greeting(now.getHours())}, {user.name.split(' ')[0]}
        </h1>
        <ShiftLine items={focusItems} approvals={data.approvalQueue?.length || 0} />
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-[248px_minmax(0,1fr)_272px]">
        <section className="order-1 min-w-0 lg:order-2 xl:order-1" aria-label="Needs you">
          <PanelTitle title="Needs you" hint="most urgent first" />
          <FocusTickets items={focusItems} />
        </section>

        <div className="order-2 min-w-0 lg:order-1 lg:col-span-2 xl:order-2 xl:col-span-1">
          <WeekLineMap
            startKey={startKey}
            today={today}
            now={now}
            timeline={timeline.data}
            error={timeline.error}
            onRetry={timeline.reload}
            onWeekChange={(delta) => setWeekOffset((offset) => (delta === 0 ? 0 : offset + delta))}
            approvalQueue={data.approvalQueue}
            userId={user.id}
            onChanged={refresh}
          />
        </div>

        <section className="order-3 min-w-0" aria-labelledby="request-lines-title">
          <div className="card">
            <div className="flex items-baseline justify-between gap-2 border-b border-line px-4 py-3.5">
              <h2 id="request-lines-title" className="text-base font-semibold">
                Request lines
              </h2>
              <Link to={isTeamView ? '/requests?scope=team' : '/requests'} className="link text-xs">
                All requests
              </Link>
            </div>
            <RequestLines requests={data.requestLines || []} viewerId={user.id} />
          </div>
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <PulseHeatmap />
        <TeamLoad taskStatusCounts={data.taskStatusCounts} requestStatusCounts={data.requestStatusCounts} role={user.role} />
      </div>
    </>
  );
}
