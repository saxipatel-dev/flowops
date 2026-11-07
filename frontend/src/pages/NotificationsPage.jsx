import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Bell, BellOff, Check, CheckCheck, FileText, ListChecks, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useQueryParams } from '../hooks/useQueryParams.js';
import api, { getErrorMessage } from '../services/api.js';
import { formatDateTime, formatTime, formatTimeAgo, groupByDay } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';

// What a notification is about, read from where it links to.
const kinds = {
  task: { label: 'Tasks', icon: ListChecks, ring: 'border-info text-info', dot: 'bg-info' },
  request: { label: 'Requests', icon: FileText, ring: 'border-warn text-warn', dot: 'bg-warn' },
  other: { label: 'Other', icon: Bell, ring: 'border-line-strong text-muted', dot: 'bg-faint' },
};

function kindOf(notification) {
  if (notification.link?.startsWith('/tasks')) return 'task';
  if (notification.link?.startsWith('/requests')) return 'request';
  return 'other';
}

function NotificationItem({ notification, onRead, emphasise }) {
  const kind = kinds[kindOf(notification)];
  const Icon = kind.icon;
  const unread = !notification.isRead;
  const text = notification.link ? (
    <Link
      to={notification.link}
      onClick={() => onRead(notification)}
      className={`text-sm hover:text-accent hover:underline ${unread ? 'font-medium text-ink' : 'text-ink-2'}`}
    >
      {notification.message}
    </Link>
  ) : (
    <p className={`text-sm ${unread ? 'font-medium text-ink' : 'text-ink-2'}`}>{notification.message}</p>
  );

  return (
    <li
      className={`group relative flex items-start gap-3 transition-colors ${
        emphasise ? 'rounded-xl border border-accent/30 bg-accent-soft/60 px-3.5 py-3' : 'px-4 py-3 hover:bg-sunken sm:px-5'
      }`}
    >
      <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-canvas ${kind.ring}`} aria-hidden="true">
        <Icon className="h-3.5 w-3.5" />
        {unread && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-surface" />}
      </span>
      <div className="min-w-0 flex-1">
        {unread && <span className="sr-only">Unread: </span>}
        {text}
        <p className="mt-0.5 flex items-center gap-2 text-xs text-faint">
          <span className="font-mono text-[10px] tracking-wider uppercase">{kind.label}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={notification.createdAt} title={formatDateTime(notification.createdAt)}>
            {formatTimeAgo(notification.createdAt)}
          </time>
        </p>
      </div>
      {unread && (
        <Button variant="ghost" size="sm" icon={Check} onClick={() => onRead(notification)} className="shrink-0">
          <span className="hidden sm:inline">Mark as read</span>
          <span className="sr-only sm:hidden">Mark as read</span>
        </Button>
      )}
    </li>
  );
}

// Inbox: unread updates first as a lane of their own, then everything else by day.
// FlowOps fetches notifications when you open a page; nothing is pushed live.
export default function NotificationsPage() {
  const { refreshUnreadCount } = useAuth();
  const [query, setQuery] = useQueryParams({ show: 'all' });
  const { data, loading, error, reload } = useApi('/notifications');
  const [checkedAt, setCheckedAt] = useState(() => new Date());
  const [actionError, setActionError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [readNow, setReadNow] = useState(() => new Set());

  // Marked-as-read items move out of the unread lane straight away.
  const notifications = useMemo(
    () => (data?.notifications || []).map((item) => (readNow.has(item.id) ? { ...item, isRead: true } : item)),
    [data, readNow],
  );
  const counts = {
    all: notifications.length,
    unread: notifications.filter((item) => !item.isRead).length,
    task: notifications.filter((item) => kindOf(item) === 'task').length,
    request: notifications.filter((item) => kindOf(item) === 'request').length,
    other: notifications.filter((item) => kindOf(item) === 'other').length,
  };
  const filters = [
    { value: 'all', label: 'Everything', dot: 'bg-ink-2' },
    { value: 'unread', label: 'Unread', dot: 'bg-accent' },
    { value: 'task', label: kinds.task.label, dot: kinds.task.dot },
    { value: 'request', label: kinds.request.label, dot: kinds.request.dot },
    { value: 'other', label: kinds.other.label, dot: kinds.other.dot },
  ];
  const show = filters.some((filter) => filter.value === query.show) ? query.show : 'all';
  const visible = notifications.filter((item) => show === 'all' || (show === 'unread' ? !item.isRead : kindOf(item) === show));
  const unread = visible.filter((item) => !item.isRead);
  const earlier = visible.filter((item) => item.isRead);

  async function markRead(notification) {
    if (notification.isRead) return;
    setReadNow((current) => new Set(current).add(notification.id));
    try {
      await api.patch(`/notifications/${notification.id}/read`);
      refreshUnreadCount();
    } catch (err) {
      setReadNow((current) => {
        const next = new Set(current);
        next.delete(notification.id);
        return next;
      });
      setActionError(getErrorMessage(err));
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await api.patch('/notifications/read-all');
      await reload();
      refreshUnreadCount();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  }

  async function refresh() {
    setReadNow(new Set());
    await reload();
    refreshUnreadCount();
    setCheckedAt(new Date());
  }

  function renderBody() {
    if (error) return <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>;
    if (!data) return <Loading />;
    if (visible.length === 0) {
      return show === 'unread' ? (
        <EmptyState icon={CheckCheck} title="You're all caught up" message="You have read every notification." />
      ) : (
        <EmptyState icon={BellOff} title="Nothing here yet" message="Updates about your tasks and requests will show up here." />
      );
    }
    return (
      <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
        {unread.length > 0 && (
          <section aria-labelledby="unread-title" className="border-b border-line p-3 sm:p-4">
            <h2 id="unread-title" className="mb-2.5 flex items-center gap-2 px-1 text-sm font-semibold">
              <span className="h-1 w-4 rounded-full bg-accent" aria-hidden="true" />
              Unread
              <span className="font-mono text-[11px] font-normal text-faint">{unread.length}</span>
            </h2>
            <ul className="grid gap-2">
              {unread.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} onRead={markRead} emphasise />
              ))}
            </ul>
          </section>
        )}
        {groupByDay(earlier).map((group) => (
          <section key={group.key} aria-label={group.label}>
            <h2 className="border-b border-line-soft bg-sunken px-4 py-1.5 text-xs font-medium text-muted sm:px-5">{group.label}</h2>
            <ul className="divide-y divide-line-soft">
              {group.items.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} onRead={markRead} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Updates about your tasks and requests, unread first."
        actions={
          counts.unread > 0 && (
            <Button variant="secondary" icon={CheckCheck} onClick={markAllRead} loading={markingAll}>
              Mark all as read
            </Button>
          )
        }
      />
      <ErrorMessage message={actionError} />

      <div className="mt-2 grid grid-cols-1 items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="card p-2" aria-label="Show">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col" role="group" aria-label="Show">
            {filters.map((filter) => (
              <li key={filter.value} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setQuery({ show: filter.value })}
                  aria-pressed={show === filter.value}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    show === filter.value ? 'bg-accent-soft text-ink' : 'text-muted hover:bg-hover hover:text-ink'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${filter.dot}`} aria-hidden="true" />
                  <span className="flex-1">{filter.label}</span>
                  <span className="font-mono text-[11px] text-faint">{counts[filter.value]}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 hidden border-t border-line-soft px-3 pt-3 pb-1 text-xs text-faint lg:block">
            <p>Checked at {formatTime(checkedAt)}. FlowOps looks for new notifications when you open a page; they are not pushed live.</p>
            <button type="button" onClick={refresh} className="link mt-2 inline-flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Check now
            </button>
          </div>
        </aside>

        <div className="card overflow-clip">
          <p className="flex items-center justify-between gap-2 border-b border-line-soft px-4 py-2 text-xs text-faint lg:hidden">
            <span>Checked at {formatTime(checkedAt)} · not live</span>
            <button type="button" onClick={refresh} className="link inline-flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Check now
            </button>
          </p>
          {renderBody()}
        </div>
      </div>
      <p className="mt-3 text-xs text-faint">Shows your latest 50 notifications.</p>
    </div>
  );
}
