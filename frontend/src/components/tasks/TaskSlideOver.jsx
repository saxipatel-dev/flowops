import { Link } from 'react-router';
import { Pencil } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';
import { formatDate, formatDateTime, formatDueLabel, formatTimeAgo, isOverdue, requestCode, taskStatusLabels } from '../../services/format.js';
import { STATUSES } from '../../services/taskAtlas.js';
import SlideOver from '../SlideOver.jsx';
import Badge from '../Badge.jsx';
import { UserLabel } from '../Avatar.jsx';
import { buttonClasses } from '../Button.jsx';
import { ErrorMessage, Loading } from '../Feedback.jsx';

const segment = { TODO: 'bg-info', IN_PROGRESS: 'bg-accent', COMPLETED: 'bg-ok' };

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-3 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-ink-2">{children}</dd>
    </div>
  );
}

function Details({ data, onMove, saving }) {
  const { task, activity, permissions } = data;
  const overdue = isOverdue(task);
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow mb-2">Status</p>
        {permissions.canUpdateStatus ? (
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-sunken p-1" role="group" aria-label="Status">
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                disabled={saving}
                onClick={() => onMove(task, status)}
                aria-pressed={task.status === status}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                  task.status === status ? 'bg-raised text-ink shadow-raised' : 'text-muted hover:text-ink'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${segment[status]}`} aria-hidden="true" />
                {taskStatusLabels[status]}
              </button>
            ))}
          </div>
        ) : (
          <Badge value={task.status} />
        )}
      </div>

      <dl className="divide-y divide-line-soft">
        <Row label="Assignee">
          <UserLabel name={task.assignee.name} size="xs" />
        </Row>
        <Row label="Due">
          {task.dueDate ? (
            <>
              <span className={overdue ? 'text-bad' : ''}>{formatDate(task.dueDate)}</span>
              {task.status !== 'COMPLETED' && <span className={`block text-xs ${overdue ? 'text-bad' : 'text-muted'}`}>{formatDueLabel(task.dueDate)}</span>}
            </>
          ) : (
            <span className="text-faint">No due date</span>
          )}
        </Row>
        <Row label="Priority">
          <Badge value={task.priority} />
        </Row>
        {task.status === 'COMPLETED' && (
          <Row label="Completed">{task.completedAt ? formatDateTime(task.completedAt) : <span className="text-faint">Time not recorded</span>}</Row>
        )}
        <Row label="Created by">
          <UserLabel name={task.creator.name} size="xs" />
        </Row>
        {task.request && (
          <Row label="From request">
            <Link to={`/requests/${task.request.id}`} className="link font-mono text-xs">
              {requestCode(task.request.id)}
            </Link>
            <span className="block truncate text-xs text-muted">{task.request.title}</span>
          </Row>
        )}
      </dl>

      {task.description && (
        <div>
          <p className="eyebrow mb-1.5">Description</p>
          <p className="text-sm leading-relaxed whitespace-pre-line text-ink-2">{task.description}</p>
        </div>
      )}

      <div>
        <p className="eyebrow mb-2">Journey</p>
        <ol className="relative space-y-3 border-l-2 border-line pl-4">
          {activity.slice(0, 6).map((entry) => (
            <li key={entry.id} className="relative text-[13px]">
              <span className="absolute top-1 -left-[23px] h-3 w-3 rounded-full border-2 border-ok bg-raised" aria-hidden="true" />
              <span className="text-ink">{entry.user.name}</span> <span className="text-muted">{entry.action}</span>
              <time dateTime={entry.createdAt} className="block font-mono text-[11px] text-faint">
                {formatTimeAgo(entry.createdAt)}
              </time>
            </li>
          ))}
        </ol>
        {task.comments.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            {task.comments.length} {task.comments.length === 1 ? 'comment' : 'comments'} on the full page.
          </p>
        )}
      </div>
    </div>
  );
}

// The task details panel opened from the board or timeline. Its URL (?task=ID) can be
// shared, and Back or Escape closes it.
export default function TaskSlideOver({ taskId, onClose, onMove, savingId }) {
  const { data, error, reload } = useApi(`/tasks/${taskId}`);
  const task = data?.task;

  async function move(target, status) {
    if (await onMove(target, status)) reload();
  }

  return (
    <SlideOver
      open
      onClose={onClose}
      eyebrow={`Task #${taskId}`}
      title={task?.title || 'Loading task…'}
      footer={
        <div className="flex gap-2">
          <Link to={`/tasks/${taskId}`} className={buttonClasses('primary', 'sm')}>
            Open full page
          </Link>
          {data?.permissions.canEdit && (
            <Link to={`/tasks/${taskId}/edit`} className={buttonClasses('secondary', 'sm')}>
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </Link>
          )}
        </div>
      }
    >
      {error && <ErrorMessage message={error} onRetry={reload} />}
      {!data && !error && <Loading text="Loading task…" />}
      {data && <Details data={data} onMove={move} saving={savingId === task.id} />}
    </SlideOver>
  );
}
