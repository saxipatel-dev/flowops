import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api, { getErrorMessage, getFieldErrors } from '../services/api.js';
import { roleLabels } from '../services/format.js';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import { FormField } from '../components/FormField.jsx';
import { ErrorMessage, SuccessMessage } from '../components/Feedback.jsx';

function ProfileForm() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, jobTitle: user.jobTitle || '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState({ error: '', success: '' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      setFieldErrors({ name: 'Name must be at least 2 characters' });
      return;
    }
    setSaving(true);
    setFieldErrors({});
    setStatus({ error: '', success: '' });
    try {
      const response = await api.patch('/auth/me', form);
      setUser(response.data.user);
      setStatus({ error: '', success: 'Profile updated.' });
    } catch (err) {
      setStatus({ error: getErrorMessage(err), success: '' });
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card space-y-4 p-6">
      <h2 className="font-semibold text-navy">Profile details</h2>
      <SuccessMessage message={status.success} />
      <ErrorMessage message={status.error} />
      <FormField label="Full name" htmlFor="name" error={fieldErrors.name} required>
        <input id="name" className={`input ${fieldErrors.name ? 'input-error' : ''}`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={80} />
      </FormField>
      <FormField label="Job title" htmlFor="jobTitle" error={fieldErrors.jobTitle}>
        <input id="jobTitle" className="input" value={form.jobTitle} onChange={(event) => setForm({ ...form, jobTitle: event.target.value })} maxLength={80} />
      </FormField>
      <dl className="grid grid-cols-2 gap-4 rounded-md bg-slate-50 p-4 text-sm">
        <div>
          <dt className="text-slate-500">Email</dt>
          <dd className="font-medium">{user.email}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Role</dt>
          <dd className="font-medium">{roleLabels[user.role]}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Department</dt>
          <dd className="font-medium">{user.department?.name || '—'}</dd>
        </div>
      </dl>
      <p className="text-xs text-slate-500">Contact an administrator to change your email, role, or department.</p>
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          Save profile
        </Button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const emptyForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState({ error: '', success: '' });
  const [saving, setSaving] = useState(false);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = {};
    if (!form.currentPassword) errors.currentPassword = 'Current password is required';
    if (form.newPassword.length < 8) errors.newPassword = 'New password must be at least 8 characters';
    if (form.confirmPassword !== form.newPassword) errors.confirmPassword = 'Passwords do not match';
    setFieldErrors(errors);
    setStatus({ error: '', success: '' });
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm(emptyForm);
      setStatus({ error: '', success: 'Password changed.' });
    } catch (err) {
      setStatus({ error: getErrorMessage(err), success: '' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card space-y-4 p-6">
      <h2 className="font-semibold text-navy">Change password</h2>
      <SuccessMessage message={status.success} />
      <ErrorMessage message={status.error} />
      <FormField label="Current password" htmlFor="currentPassword" error={fieldErrors.currentPassword}>
        <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" className="input" value={form.currentPassword} onChange={handleChange} />
      </FormField>
      <FormField label="New password" htmlFor="newPassword" error={fieldErrors.newPassword} hint="At least 8 characters.">
        <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" className="input" value={form.newPassword} onChange={handleChange} />
      </FormField>
      <FormField label="Confirm new password" htmlFor="confirmPassword" error={fieldErrors.confirmPassword}>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" className="input" value={form.confirmPassword} onChange={handleChange} />
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          Change password
        </Button>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" description="Manage your personal details and password." />
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileForm />
        <PasswordForm />
      </div>
    </>
  );
}
