import { Link } from 'react-router';
import { formatDateTime } from '../services/format.js';

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
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="text-slate-700">
                <span className="font-medium text-slate-900">{entry.user.name}</span> {entry.action}
                {entry.details && (
                  <>
                    {' — '}
                    {link ? (
                      <Link to={link} className="link">
                        {entry.details}
                      </Link>
                    ) : (
                      <span>{entry.details}</span>
                    )}
                  </>
                )}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(entry.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
