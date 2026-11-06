import { useState } from 'react';
import api, { getErrorMessage, getFieldErrors } from '../services/api.js';
import { roleLabels, toOptions } from '../services/format.js';
import { UserCog, UserPlus } from 'lucide-react';
import Button from './Button.jsx';
import Card, { CardHeader } from './Card.jsx';
import { FormField, SelectInput } from './FormField.jsx';
import { ErrorMessage } from './Feedback.jsx';

// Used for both creating a user (no `user` prop) and editing an existing one.
export default function UserForm({ user, departments, onSaved, onCancel }) {
  const isEditing = Boolean(user);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    jobTitle: user?.jobTitle || '',
    role: user?.role || 'EMPLOYEE',
    departmentId: user?.departmentId ? String(user.departmentId) : '',
    isActive: user ? user.isActive : true,
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleChange(event) {
    const { name, type, value, checked } = event.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    setFieldErrors({ ...fieldErrors, [name]: '' });
  }

  function validate() {
    const errors = {};
    if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address';
    if (!isEditing && form.password.length < 8) errors.password = 'Password must be at least 8 characters';
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    setError('');
    if (Object.keys(errors).length > 0) return;

    const payload = {
      name: form.name,
      email: form.email,
      jobTitle: form.jobTitle,
      role: form.role,
      departmentId: form.departmentId ? Number(form.departmentId) : null,
    };
    setSaving(true);
    try {
      if (isEditing) {
        await api.patch(`/users/${user.id}`, { ...payload, isActive: form.isActive });
      } else {
        await api.post('/users', { ...payload, password: form.password });
      }
      onSaved(isEditing ? `${form.name} was updated.` : `${form.name} was added.`);
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
      setSaving(false);
    }
  }

  const departmentOptions = departments.map((department) => ({ value: String(department.id), label: department.name }));

  return (
    <Card as="form" onSubmit={handleSubmit} noValidate className="ring-2 ring-brand/15">
      <CardHeader
        title={isEditing ? `Edit ${user.name}` : 'Add a new user'}
        description={isEditing ? 'Changes take effect the next time they load a page.' : 'They can sign in with the temporary password and change it from their profile.'}
        icon={isEditing ? UserCog : UserPlus}
      />
      <div className="space-y-4 p-4">
        <ErrorMessage message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full name" htmlFor="user-name" error={fieldErrors.name} required>
            <input id="user-name" name="name" className={`input ${fieldErrors.name ? 'input-error' : ''}`} value={form.name} onChange={handleChange} />
          </FormField>
          <FormField label="Email" htmlFor="user-email" error={fieldErrors.email} required>
            <input id="user-email" name="email" type="email" className={`input ${fieldErrors.email ? 'input-error' : ''}`} value={form.email} onChange={handleChange} />
          </FormField>
          <FormField label="Job title" htmlFor="user-jobTitle">
            <input id="user-jobTitle" name="jobTitle" className="input" value={form.jobTitle} onChange={handleChange} />
          </FormField>
          <FormField label="Department" htmlFor="user-department" error={fieldErrors.departmentId}>
            <SelectInput id="user-department" name="departmentId" options={departmentOptions} placeholder="No department" value={form.departmentId} onChange={handleChange} />
          </FormField>
          <FormField label="Role" htmlFor="user-role" error={fieldErrors.role}>
            <SelectInput id="user-role" name="role" options={toOptions(roleLabels)} value={form.role} onChange={handleChange} />
          </FormField>
          {isEditing ? (
            <div className="flex items-end">
              <label className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-surface-muted px-3 text-sm text-slate-700">
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="h-4 w-4 rounded border-slate-300 accent-brand" />
                Account is active
              </label>
            </div>
          ) : (
            <FormField label="Temporary password" htmlFor="user-password" error={fieldErrors.password} hint="At least 8 characters." required>
              <input id="user-password" name="password" type="password" autoComplete="new-password" className={`input ${fieldErrors.password ? 'input-error' : ''}`} value={form.password} onChange={handleChange} />
            </FormField>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2 rounded-b-xl border-t border-slate-200 bg-surface-muted px-4 py-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {isEditing ? 'Save changes' : 'Create user'}
        </Button>
      </div>
    </Card>
  );
}
