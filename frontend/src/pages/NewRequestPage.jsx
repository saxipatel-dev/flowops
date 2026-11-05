import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import api, { getErrorMessage, getFieldErrors } from '../services/api.js';
import { categoryLabels, priorityLabels, toOptions } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import { FormField, SelectInput } from '../components/FormField.jsx';
import { ErrorMessage } from '../components/Feedback.jsx';

export function validateRequest(form) {
  const errors = {};
  if (!form.category) errors.category = 'Choose a category';
  if (form.title.trim().length < 3) errors.title = 'Title must be at least 3 characters';
  if (form.description.trim().length < 10) errors.description = 'Please describe the request in at least 10 characters';
  if (form.estimatedCost !== '') {
    const amount = Number(form.estimatedCost);
    if (Number.isNaN(amount) || amount < 0 || amount > 1000000) {
      errors.estimatedCost = 'Enter an amount between 0 and 1,000,000';
    }
  }
  return errors;
}

export default function NewRequestPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ category: '', title: '', description: '', priority: 'MEDIUM', estimatedCost: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
    setFieldErrors({ ...fieldErrors, [event.target.name]: '' });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validateRequest(form);
    setFieldErrors(errors);
    setError('');
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const response = await api.post('/requests', form);
      navigate(`/requests/${response.data.request.id}`, { state: { message: 'Request submitted. Your manager has been notified.' } });
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="New request" description="Your request will be sent to your department manager for review." />
      <form onSubmit={handleSubmit} noValidate className="card max-w-2xl space-y-5 p-6">
        <ErrorMessage message={error} />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Category" htmlFor="category" error={fieldErrors.category} required>
            <SelectInput id="category" name="category" options={toOptions(categoryLabels)} placeholder="Select a category" value={form.category} onChange={handleChange} error={fieldErrors.category} />
          </FormField>
          <FormField label="Priority" htmlFor="priority" error={fieldErrors.priority}>
            <SelectInput id="priority" name="priority" options={toOptions(priorityLabels)} value={form.priority} onChange={handleChange} />
          </FormField>
        </div>
        <FormField label="Title" htmlFor="title" error={fieldErrors.title} required>
          <input id="title" name="title" className={`input ${fieldErrors.title ? 'input-error' : ''}`} placeholder="e.g. Replacement laptop" value={form.title} onChange={handleChange} maxLength={120} />
        </FormField>
        <FormField label="Description" htmlFor="description" error={fieldErrors.description} hint="Explain what you need and why." required>
          <textarea id="description" name="description" rows={5} className={`input ${fieldErrors.description ? 'input-error' : ''}`} value={form.description} onChange={handleChange} maxLength={2000} />
        </FormField>
        <FormField label="Estimated cost (USD)" htmlFor="estimatedCost" error={fieldErrors.estimatedCost} hint="Optional. Leave blank if there is no cost.">
          <input id="estimatedCost" name="estimatedCost" type="number" min="0" step="0.01" className={`input sm:max-w-48 ${fieldErrors.estimatedCost ? 'input-error' : ''}`} value={form.estimatedCost} onChange={handleChange} />
        </FormField>
        <div className="flex justify-end gap-2">
          <Link to="/requests" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
          <Button type="submit" loading={saving}>
            Submit request
          </Button>
        </div>
      </form>
    </>
  );
}
