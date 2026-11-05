import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import api, { getErrorMessage } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { formatDate, formatDateTime, isOverdue, requestCode, taskStatusLabels, toOptions } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import CommentSection from '../components/CommentSection.jsx';
import ActivityList from '../components/ActivityList.jsx';
import { SelectInput } from '../components/FormField.jsx';
import { ErrorMessage, Loading, SuccessMessage } from '../components/Feedback.jsx';

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

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
      <Link to="/tasks" className="link mb-3 inline-block text-sm">
        ← Back to tasks
      </Link>
      <PageHeader
        title={task.title}
        description={`Created by ${task.creator.name} on ${formatDateTime(task.createdAt)}`}
        actions={
          <>
            {permissions.canEdit && (
              <Link to={`/tasks/${task.id}/edit`} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Edit
              </Link>
            )}
            {permissions.canDelete && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-4">
        <SuccessMessage message={message} />
        <ErrorMessage message={actionError} />
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="font-semibold text-navy">Description</h2>
            <p className="mt-2 text-sm whitespace-pre-line text-slate-700">{task.description || 'No description provided.'}</p>
          </section>
          <CommentSection comments={task.comments} target={{ taskId: task.id }} onAdded={reload} />
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <dl className="space-y-4">
              <Detail label="Status">
                <Badge value={task.status} />
              </Detail>
              <Detail label="Priority">
                <Badge value={task.priority} />
              </Detail>
              <Detail label="Assignee">{task.assignee.name}</Detail>
              <Detail label="Due date">
                <span className={isOverdue(task) ? 'font-medium text-red-600' : ''}>
                  {formatDate(task.dueDate)}
                  {isOverdue(task) && ' (overdue)'}
                </span>
              </Detail>
              {task.request && (
                <Detail label="Related request">
                  <Link to={`/requests/${task.request.id}`} className="link">
                    {requestCode(task.request.id)} · {task.request.title}
                  </Link>
                </Detail>
              )}
            </dl>

            {permissions.canUpdateStatus && (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <label htmlFor="task-status" className="mb-1 block text-sm font-medium text-slate-700">
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
          </section>

          <section className="card">
            <h2 className="border-b border-slate-200 px-4 py-3 font-semibold text-navy">History</h2>
            <ActivityList activity={activity} showLinks={false} />
          </section>
        </div>
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
