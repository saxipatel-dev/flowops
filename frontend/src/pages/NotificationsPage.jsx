import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import api, { getErrorMessage } from '../services/api.js';
import { formatDateTime } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import Tabs from '../components/Tabs.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';

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

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Updates about your tasks and requests."
        actions={
          data?.unreadCount > 0 && (
            <Button variant="secondary" onClick={markAllRead} loading={markingAll}>
              Mark all as read
            </Button>
          )
        }
      />
      <ErrorMessage message={actionError} />

      <div className="card mt-2">
        <Tabs
          tabs={[
            { value: 'all', label: 'All' },
            { value: 'unread', label: `Unread${data ? ` (${data.unreadCount})` : ''}` },
          ]}
          active={filter}
          onChange={setFilter}
        />
        {loading && !data && <div className="px-4"><Loading /></div>}
        {error && <div className="p-4"><ErrorMessage message={error} onRetry={reload} /></div>}
        {data && !error && data.notifications.length === 0 && (
          <EmptyState title="No notifications" message={filter === 'unread' ? 'You have read everything.' : 'You have no notifications yet.'} />
        )}
        {data && !error && data.notifications.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {data.notifications.map((notification) => (
              <li key={notification.id} className={`flex items-start gap-3 px-4 py-3 ${notification.isRead ? '' : 'bg-blue-50/50'}`}>
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? 'bg-transparent' : 'bg-brand'}`}
                  aria-label={notification.isRead ? undefined : 'Unread'}
                />
                <div className="min-w-0 flex-1">
                  {notification.link ? (
                    <Link to={notification.link} onClick={() => markRead(notification)} className="text-sm text-slate-800 hover:text-brand hover:underline">
                      {notification.message}
                    </Link>
                  ) : (
                    <p className="text-sm text-slate-800">{notification.message}</p>
                  )}
                  <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(notification.createdAt)}</p>
                </div>
                {!notification.isRead && (
                  <button type="button" onClick={() => markRead(notification)} className="text-xs font-medium whitespace-nowrap text-brand hover:underline">
                    Mark as read
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
