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
  'created task': [Plus, 'bg-brand-soft text-brand'],
  'assigned task': [UserPlus, 'bg-violet-50 text-violet-600'],
  'changed task status': [ArrowRightLeft, 'bg-blue-50 text-blue-600'],
  'updated task': [Pencil, 'bg-slate-100 text-slate-600'],
  'deleted task': [Trash2, 'bg-red-50 text-red-600'],
  'commented on task': [MessageSquare, 'bg-sky-50 text-sky-600'],
  'commented on request': [MessageSquare, 'bg-sky-50 text-sky-600'],
  'submitted request': [Send, 'bg-amber-50 text-amber-600'],
  'approved request': [CheckCircle2, 'bg-emerald-50 text-emerald-600'],
  'rejected request': [XCircle, 'bg-red-50 text-red-600'],
  'created user': [UserPlus, 'bg-violet-50 text-violet-600'],
  'updated user': [UserCog, 'bg-slate-100 text-slate-600'],
};

function entityLink(entry) {
  if (entry.action === 'deleted task') return null;
  if (entry.entityType === 'task') return `/tasks/${entry.entityId}`;
  if (entry.entityType === 'request') return `/requests/${entry.entityId}`;
  return null;
}

export default function ActivityTimeline({ activity }) {
  return (
    <div className="divide-y divide-slate-100">
      {groupByDay(activity).map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h2 className="sticky top-14 z-[1] bg-surface-muted/95 px-4 py-1.5 text-xs font-medium text-slate-500 backdrop-blur">
            {group.label}
          </h2>
          <ol className="px-4 py-2">
            {group.items.map((entry, index) => {
              const [Icon, tone] = actionStyles[entry.action] || [Pencil, 'bg-slate-100 text-slate-600'];
              const link = entityLink(entry);
              const isLast = index === group.items.length - 1;
              return (
                <li key={entry.id} className="relative flex gap-3 py-2">
                  {!isLast && <span className="absolute top-9 -bottom-2 left-[13px] w-px bg-slate-200" aria-hidden="true" />}
                  <span className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone}`} aria-hidden="true">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <p className="min-w-0 flex-1 pt-1 text-sm leading-snug text-slate-600">
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
                    className="shrink-0 pt-1 text-xs whitespace-nowrap text-slate-500 tabular-nums"
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
