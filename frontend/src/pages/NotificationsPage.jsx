import { useState } from 'react';
import { Link } from 'react-router';
import { Bell, BellOff, Check, CheckCheck, FileText, ListChecks } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import api, { getErrorMessage } from '../services/api.js';
import { formatDateTime, formatTimeAgo, groupByDay } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import Tabs from '../components/Tabs.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';

function iconFor(notification) {
  if (notification.link?.startsWith('/tasks')) return ListChecks;
  if (notification.link?.startsWith('/requests')) return FileText;
  return Bell;
}

function NotificationItem({ notification, onRead }) {
  const Icon = iconFor(notification);
  const unread = !notification.isRead;

  return (
    <li className={`group relative flex items-start gap-3 px-4 py-3 transition-colors ${unread ? 'bg-brand-soft/40' : 'hover:bg-slate-50/80'}`}>
      {unread && <span className="absolute inset-y-0 left-0 w-0.5 bg-brand" aria-hidden="true" />}
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${unread ? 'bg-white text-brand ring-1 ring-brand/20' : 'bg-slate-100 text-slate-500'}`}
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        {unread && <span className="sr-only">Unread: </span>}
        {notification.link ? (
          <Link
            to={notification.link}
            onClick={() => onRead(notification)}
            className={`text-sm hover:text-brand hover:underline ${unread ? 'font-medium text-navy' : 'text-slate-700'}`}
          >
            {notification.message}
          </Link>
        ) : (
          <p className={`text-sm ${unread ? 'font-medium text-navy' : 'text-slate-700'}`}>{notification.message}</p>
        )}
        <time dateTime={notification.createdAt} title={formatDateTime(notification.createdAt)} className="mt-0.5 block text-xs text-slate-500">
          {formatTimeAgo(notification.createdAt)}
        </time>
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

export default function NotificationsPage() {
  const { refreshUnreadCount } = useAuth();
  const [filter, setFilter] = useState('all');
  const { data, loading, error, reload } = useApi('/notifications', filter === 'unread' ? { unread: true } : {});
  const [actionError, setActionError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  async function markRead(notification) {
    if (notification.isRead) return;
    try {
      await api.patch(`/notifications/${notification.id}/read`);
      reload();
      refreshUnreadCount();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await api.patch('/notifications/read-all');
      reload();
      refreshUnreadCount();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  }

  function renderBody() {
    if (error) return <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>;
    if (!data) return <Loading />;
    if (data.notifications.length === 0) {
      return filter === 'unread' ? (
        <EmptyState icon={CheckCheck} title="You're all caught up" message="You have read every notification." />
      ) : (
        <EmptyState icon={BellOff} title="No notifications yet" message="Updates about your tasks and requests will show up here." />
      );
    }
    return (
      <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
        {groupByDay(data.notifications).map((group) => (
          <section key={group.key} aria-label={group.label}>
            <h2 className="border-b border-slate-100 bg-surface-muted px-4 py-1.5 text-xs font-medium text-slate-500">{group.label}</h2>
            <ul className="divide-y divide-slate-100">
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
    <div className="max-w-4xl">
      <PageHeader
        title="Notifications"
        description="Updates about your tasks and requests."
        actions={
          data?.unreadCount > 0 && (
            <Button variant="secondary" icon={CheckCheck} onClick={markAllRead} loading={markingAll}>
              Mark all as read
            </Button>
          )
        }
      />
      <ErrorMessage message={actionError} />

      <div className="card mt-2 overflow-hidden">
        <Tabs
          tabs={[
            { value: 'all', label: 'All' },
            { value: 'unread', label: `Unread${data ? ` (${data.unreadCount})` : ''}` },
          ]}
          active={filter}
          onChange={setFilter}
        />
        {renderBody()}
      </div>
    </div>
  );
}
