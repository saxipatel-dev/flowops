import { Link } from 'react-router';
import {
  ArrowRightLeft,
  CheckCircle2,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Trash2,
  UserCog,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { formatDateTime, formatTime, groupByDay } from '../services/format.js';

// Each logged action gets an icon and color so the timeline can be scanned quickly.
const actionStyles = {
  'created task': [Plus, 'bg-accent-soft text-accent'],
  'assigned task': [UserPlus, 'bg-accent-soft text-accent'],
  'changed task status': [ArrowRightLeft, 'bg-info-soft text-info'],
  'updated task': [Pencil, 'bg-hover text-muted'],
  'deleted task': [Trash2, 'bg-bad-soft text-bad'],
  'commented on task': [MessageSquare, 'bg-info-soft text-info'],
  'commented on request': [MessageSquare, 'bg-info-soft text-info'],
  'submitted request': [Send, 'bg-warn-soft text-warn'],
  'approved request': [CheckCircle2, 'bg-ok-soft text-ok'],
  'rejected request': [XCircle, 'bg-bad-soft text-bad'],
  'created user': [UserPlus, 'bg-accent-soft text-accent'],
  'updated user': [UserCog, 'bg-hover text-muted'],
};

function entityLink(entry) {
  if (entry.action === 'deleted task') return null;
  if (entry.entityType === 'task') return `/tasks/${entry.entityId}`;
  if (entry.entityType === 'request') return `/requests/${entry.entityId}`;
  return null;
}

export default function ActivityTimeline({ activity }) {
  return (
    <div className="divide-y divide-line-soft">
      {groupByDay(activity).map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h2 className="sticky top-14 z-[1] bg-sunken/95 px-4 py-1.5 text-xs font-medium text-muted backdrop-blur">
            {group.label}
          </h2>
          <ol className="px-4 py-2">
            {group.items.map((entry, index) => {
              const [Icon, tone] = actionStyles[entry.action] || [Pencil, 'bg-hover text-muted'];
              const link = entityLink(entry);
              const isLast = index === group.items.length - 1;
              return (
                <li key={entry.id} className="relative flex gap-3 py-2">
                  {!isLast && <span className="absolute top-9 -bottom-2 left-[13px] w-px bg-line" aria-hidden="true" />}
                  <span className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone}`} aria-hidden="true">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <p className="min-w-0 flex-1 pt-1 text-sm leading-snug text-muted">
                    <span className="font-medium text-ink">{entry.user.name}</span> {entry.action}
                    {entry.details && (
                      <>
                        {': '}
                        {link ? (
                          <Link to={link} className="link">
                            {entry.details}
                          </Link>
                        ) : (
                          <span className="text-ink">{entry.details}</span>
                        )}
                      </>
                    )}
                  </p>
                  <time
                    dateTime={entry.createdAt}
                    title={formatDateTime(entry.createdAt)}
                    className="shrink-0 pt-1 text-xs whitespace-nowrap text-muted tabular-nums"
                  >
                    {formatTime(entry.createdAt)}
                  </time>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
