import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import api, { getErrorMessage, getFieldErrors } from '../services/api.js';
import { priorityLabels, taskStatusLabels, toDateInput, toOptions } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import { FormField, SelectInput } from '../components/FormField.jsx';
import { ErrorMessage, Loading } from '../components/Feedback.jsx';

const emptyForm = { title: '', description: '', assignedTo: '', priority: 'MEDIUM', status: 'TODO', dueDate: '' };

function validateTask(form) {
  const errors = {};
  if (form.title.trim().length < 3) errors.title = 'Title must be at least 3 characters';
  if (!form.assignedTo) errors.assignedTo = 'Choose an assignee';
  return errors;
}

export default function TaskFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const usersResponse = await api.get('/users/assignable');
        setAssignees(usersResponse.data.users.map((user) => ({ value: String(user.id), label: user.name })));

        if (isEditing) {
          const { data } = await api.get(`/tasks/${id}`);
          if (!data.permissions.canEdit) {
            setBlocked(true);
            return;
          }
          const { task } = data;
          setForm({
            title: task.title,
            description: task.description,
            assignedTo: String(task.assignedTo),
            priority: task.priority,
            status: task.status,
            dueDate: toDateInput(task.dueDate),
          });
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, isEditing]);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
    setFieldErrors({ ...fieldErrors, [event.target.name]: '' });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validateTask(form);
    setFieldErrors(errors);
    setError('');
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const payload = { ...form, assignedTo: Number(form.assignedTo) };
      const response = isEditing ? await api.patch(`/tasks/${id}`, payload) : await api.post('/tasks', payload);
      navigate(`/tasks/${response.data.task.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  if (blocked) return <ErrorMessage message="You do not have permission to edit this task." />;

  return (
    <>
      <PageHeader title={isEditing ? 'Edit task' : 'New task'} description="Assign work to yourself or a team member." />
      <form onSubmit={handleSubmit} noValidate className="card max-w-2xl space-y-5 p-6">
        <ErrorMessage message={error} />
        <FormField label="Title" htmlFor="title" error={fieldErrors.title} required>
          <input id="title" name="title" className={`input ${fieldErrors.title ? 'input-error' : ''}`} value={form.title} onChange={handleChange} maxLength={120} />
        </FormField>
        <FormField label="Description" htmlFor="description" error={fieldErrors.description}>
          <textarea id="description" name="description" rows={4} className="input" value={form.description} onChange={handleChange} maxLength={2000} />
        </FormField>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Assignee" htmlFor="assignedTo" error={fieldErrors.assignedTo} required>
            <SelectInput id="assignedTo" name="assignedTo" options={assignees} placeholder="Select a person" value={form.assignedTo} onChange={handleChange} error={fieldErrors.assignedTo} />
          </FormField>
          <FormField label="Due date" htmlFor="dueDate" error={fieldErrors.dueDate}>
            <input id="dueDate" name="dueDate" type="date" className={`input ${fieldErrors.dueDate ? 'input-error' : ''}`} value={form.dueDate} onChange={handleChange} />
          </FormField>
          <FormField label="Priority" htmlFor="priority" error={fieldErrors.priority}>
            <SelectInput id="priority" name="priority" options={toOptions(priorityLabels)} value={form.priority} onChange={handleChange} />
          </FormField>
          <FormField label="Status" htmlFor="status" error={fieldErrors.status}>
            <SelectInput id="status" name="status" options={toOptions(taskStatusLabels)} value={form.status} onChange={handleChange} />
          </FormField>
        </div>
        <div className="flex justify-end gap-2">
          <Link to={isEditing ? `/tasks/${id}` : '/tasks'} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
          <Button type="submit" loading={saving}>
            {isEditing ? 'Save changes' : 'Create task'}
          </Button>
        </div>
      </form>
    </>
  );
}
