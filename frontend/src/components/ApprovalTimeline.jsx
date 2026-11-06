import { Link } from 'react-router';
import { Check, CircleDot, ListChecks, Send, X } from 'lucide-react';
import { formatDateTime } from '../services/format.js';
import Badge from './Badge.jsx';

const FOLLOW_UP_CATEGORIES = ['EQUIPMENT', 'PURCHASE'];

const markers = {
  done: { icon: Check, className: 'bg-ok text-white' },
  submitted: { icon: Send, className: 'bg-accent-strong text-white' },
  current: { icon: CircleDot, className: 'bg-warn-soft text-warn ring-4 ring-warn-soft' },
  rejected: { icon: X, className: 'bg-bad text-white' },
  upcoming: { icon: null, className: 'border-2 border-dashed border-line-strong bg-surface' },
  task: { icon: ListChecks, className: 'bg-info text-white' },
};

// Builds the steps from the request's own fields: when it was submitted, who reviews it,
// the decision (with its comment), and the follow-up task for approved purchases.
export function getTimelineSteps(request) {
  const steps = [
    {
      key: 'submitted',
      state: 'submitted',
      title: 'Submitted',
      detail: `by ${request.requester.name}`,
      time: request.createdAt,
    },
  ];

  if (request.status === 'PENDING') {
    steps.push({ key: 'review', state: 'current', title: 'Awaiting review', detail: `Assigned to ${request.reviewer.name}` });
    steps.push({ key: 'decision', state: 'upcoming', title: 'Decision' });
    if (FOLLOW_UP_CATEGORIES.includes(request.category)) {
      steps.push({ key: 'task', state: 'upcoming', title: 'Follow-up task', detail: 'Created if approved' });
    }
    return steps;
  }

  const approved = request.status === 'APPROVED';
  steps.push({
    key: 'decision',
    state: approved ? 'done' : 'rejected',
    title: approved ? 'Approved' : 'Rejected',
    detail: `by ${request.decidedBy?.name || request.reviewer.name}`,
    time: request.reviewedAt,
    comment: request.reviewComment,
    commentLabel: approved ? 'Comment' : 'Reason',
  });

  if (request.task) {
    const completed = request.task.status === 'COMPLETED';
    steps.push({
      key: 'task',
      state: completed ? 'done' : 'task',
      title: completed ? 'Fulfilled' : 'Follow-up in progress',
      task: request.task,
    });
  }
  return steps;
}

export default function ApprovalTimeline({ request }) {
  const steps = getTimelineSteps(request);

  return (
    <ol className="px-4 py-4">
      {steps.map((step, index) => {
        const marker = markers[step.state];
        const Icon = marker.icon;
        const isLast = index === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && <span className="absolute top-7 bottom-1 left-[11px] w-px bg-line" aria-hidden="true" />}
            <span className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${marker.className}`} aria-hidden="true">
              {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={`text-sm font-medium ${step.state === 'upcoming' ? 'text-muted' : 'text-ink'}`}>
                {step.title}
                {step.state === 'current' && <span className="sr-only"> (current step)</span>}
              </p>
              {step.detail && <p className="text-xs text-muted">{step.detail}</p>}
              {step.time && (
                <time dateTime={step.time} className="text-xs text-muted">
                  {formatDateTime(step.time)}
                </time>
              )}
              {step.comment && (
                <p className="mt-2 rounded-lg bg-sunken px-3 py-2 text-sm text-ink-2">
                  <span className="font-medium">{step.commentLabel}: </span>
                  {step.comment}
                </p>
              )}
              {step.task && (
                <div className="mt-1.5 space-y-1.5">
                  <Link to={`/tasks/${step.task.id}`} className="link block text-sm">
                    {step.task.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <Badge value={step.task.status} />
                    <span>Assigned to {step.task.assignee.name}</span>
                  </div>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
