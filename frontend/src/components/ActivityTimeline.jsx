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

// Each record type has a line colour, as on the rest of the transit map.
const recordLines = {
  task: { label: 'Task', ring: 'border-info', text: 'text-info' },
  request: { label: 'Request', ring: 'border-warn', text: 'text-warn' },
  user: { label: 'User', ring: 'border-accent', text: 'text-accent' },
};

// History as a line through each day: every event is a stop, coloured by the kind of
// record it touched, with the action's icon inside and a link to the record.
// `partial` means the list is one page of more, so day counts describe this page only.
export default function ActivityTimeline({ activity, partial = false }) {
  return (
    <div>
      {groupByDay(activity).map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h2 className="sticky top-14 z-[1] flex items-baseline justify-between border-y border-line-soft bg-surface/95 px-4 py-2 backdrop-blur sm:px-5">
            <span className="font-display text-sm font-semibold text-ink">{group.label}</span>
            <span className="font-mono text-[11px] text-faint">
              {group.items.length} {partial ? 'on this page' : group.items.length === 1 ? 'event' : 'events'}
            </span>
          </h2>
          <ol className="px-4 py-3 sm:px-5">
            {group.items.map((entry, index) => {
              const [Icon, tone] = actionStyles[entry.action] || [Pencil, 'bg-hover text-muted'];
              const link = entityLink(entry);
              const line = recordLines[entry.entityType] || recordLines.task;
              const isLast = index === group.items.length - 1;
              return (
                <li key={entry.id} className="relative grid grid-cols-[52px_32px_minmax(0,1fr)] gap-x-2 pb-4 last:pb-1">
                  <time
                    dateTime={entry.createdAt}
                    title={formatDateTime(entry.createdAt)}
                    className="pt-1.5 font-mono text-[11px] whitespace-nowrap text-faint"
                  >
                    {formatTime(entry.createdAt)}
                  </time>
                  <span className="relative flex justify-center" aria-hidden="true">
                    {!isLast && <span className="absolute top-8 -bottom-4 w-0.5 rounded-full bg-line" />}
                    <span className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 ${line.ring} ${tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className="text-sm leading-snug text-muted">
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
                    <p className={`mt-0.5 font-mono text-[10px] tracking-wider uppercase ${line.text}`}>
                      {line.label} #{entry.entityId}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
