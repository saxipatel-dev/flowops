import { Link } from 'react-router';
import { formatDateTime, formatTimeAgo } from '../services/format.js';
import Avatar from './Avatar.jsx';

function entityLink(entry) {
  if (entry.action === 'deleted task') return null;
  if (entry.entityType === 'task') return `/tasks/${entry.entityId}`;
  if (entry.entityType === 'request') return `/requests/${entry.entityId}`;
  return null;
}

export default function ActivityList({ activity, showLinks = true }) {
  if (activity.length === 0) {
    return <p className="px-4 py-6 text-sm text-slate-500">No activity yet.</p>;
  }

  return (
    <ol className="divide-y divide-slate-100">
      {activity.map((entry) => {
        const link = showLinks ? entityLink(entry) : null;
        return (
          <li key={entry.id} className="flex gap-3 px-4 py-3">
            <Avatar name={entry.user.name} size="sm" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="leading-snug text-slate-600">
                <span className="font-medium text-navy">{entry.user.name}</span> {entry.action}
                {entry.details && (
                  <>
                    {': '}
                    {link ? (
                      <Link to={link} className="link">
                        {entry.details}
                      </Link>
                    ) : (
                      <span className="text-slate-800">{entry.details}</span>
                    )}
                  </>
                )}
              </p>
              <time
                dateTime={entry.createdAt}
                title={formatDateTime(entry.createdAt)}
                className="mt-0.5 block text-xs text-slate-500"
              >
                {formatTimeAgo(entry.createdAt)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
