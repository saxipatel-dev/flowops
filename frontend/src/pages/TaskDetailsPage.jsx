import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { FileText, History, Info, Pencil, Trash2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { formatDate, formatDateTime, formatDueLabel, isOverdue, requestCode, taskStatusLabels, toOptions } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import Button, { buttonClasses } from '../components/Button.jsx';
import Card, { CardHeader } from '../components/Card.jsx';
import DetailList, { DetailItem } from '../components/DetailList.jsx';
import { UserLabel } from '../components/Avatar.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import CommentSection from '../components/CommentSection.jsx';
import ActivityList from '../components/ActivityList.jsx';
import { SelectInput } from '../components/FormField.jsx';
import { ErrorMessage, Loading, SuccessMessage } from '../components/Feedback.jsx';

export default function TaskDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(`/tasks/${id}`);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (data) setStatus(data.task.status);
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const { task, activity, permissions } = data;
  const overdue = isOverdue(task);

  async function handleStatusSave() {
    setSaving(true);
    setMessage('');
    setActionError('');
    try {
      await api.patch(`/tasks/${task.id}`, { status });
      setMessage(`Status updated to ${taskStatusLabels[status]}.`);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/tasks/${task.id}`);
      navigate('/tasks');
    } catch (err) {
      setActionError(getErrorMessage(err));
      setConfirmDelete(false);
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title={task.title}
        description={
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <Badge value={task.status} />
            <Badge value={task.priority} />
            <span>
              Created by {task.creator.name} on {formatDateTime(task.createdAt)}
            </span>
          </span>
        }
        actions={
          <>
            {permissions.canEdit && (
              <Link to={`/tasks/${task.id}/edit`} className={buttonClasses('secondary')}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Link>
            )}
            {permissions.canDelete && (
              <Button variant="dangerOutline" icon={Trash2} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-3">
        <SuccessMessage message={message} />
        <ErrorMessage message={actionError} />
      </div>

      {/* On phones the details and status control come first; on desktop they head the side column. */}
      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:grid-rows-[auto_1fr]">
        <Card className="lg:col-start-3 lg:row-start-1">
          <CardHeader title="Details" icon={Info} />
          <DetailList>
            <DetailItem label="Assignee">
              <UserLabel name={task.assignee.name} size="xs" />
            </DetailItem>
            <DetailItem label="Due date">
              {task.dueDate ? (
                <>
                  <span className={overdue ? 'font-medium text-red-700' : ''}>{formatDate(task.dueDate)}</span>
                  {task.status !== 'COMPLETED' && (
                    <span className={`block text-xs ${overdue ? 'text-red-700' : 'text-slate-500'}`}>{formatDueLabel(task.dueDate)}</span>
                  )}
                </>
              ) : (
                <span className="text-slate-400">No due date</span>
              )}
            </DetailItem>
            <DetailItem label="Created by">
              <UserLabel name={task.creator.name} size="xs" />
            </DetailItem>
            {task.request && (
              <DetailItem label="From request">
                <Link to={`/requests/${task.request.id}`} className="link">
                  {requestCode(task.request.id)}
                </Link>
                <span className="block truncate text-xs text-slate-500">{task.request.title}</span>
              </DetailItem>
            )}
          </DetailList>

          {permissions.canUpdateStatus && (
            <div className="border-t border-slate-200 bg-surface-muted px-4 py-3">
              <label htmlFor="task-status" className="mb-1.5 block text-sm font-medium text-slate-800">
                Update status
              </label>
              <div className="flex gap-2">
                <SelectInput id="task-status" options={toOptions(taskStatusLabels)} value={status} onChange={(event) => setStatus(event.target.value)} />
                <Button onClick={handleStatusSave} loading={saving} disabled={status === task.status}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-4 lg:col-span-2 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Card>
            <CardHeader title="Description" icon={FileText} />
            <p className="px-4 py-3.5 text-sm leading-relaxed whitespace-pre-line text-slate-700">
              {task.description || <span className="text-slate-400">No description provided.</span>}
            </p>
          </Card>
          <CommentSection comments={task.comments} target={{ taskId: task.id }} onAdded={reload} />
        </div>

        <Card className="lg:col-start-3 lg:row-start-2">
          <CardHeader title="History" icon={History} />
          <ActivityList activity={activity} showLinks={false} />
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete task?"
        message={`"${task.title}" and its comments will be permanently removed.`}
        confirmLabel="Delete task"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
