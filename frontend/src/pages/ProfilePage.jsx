import { useState } from 'react';
import { Building2, CalendarDays, Check, KeyRound, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api, { getErrorMessage, getFieldErrors } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import Card, { CardHeader } from '../components/Card.jsx';
import Avatar from '../components/Avatar.jsx';
import { FormField } from '../components/FormField.jsx';
import { ErrorMessage, SuccessMessage } from '../components/Feedback.jsx';

const MIN_PASSWORD_LENGTH = 8;

function FormFooter({ children, note }) {
  return (
    <div className="flex flex-col-reverse gap-3 rounded-b-xl border-t border-line bg-sunken px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted">{note}</p>
      <div className="flex justify-end">{children}</div>
    </div>
  );
}

function IdentityCard() {
  const { user } = useAuth();
  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const rows = [
    [Mail, 'Email', user.email],
    [Building2, 'Department', user.department?.name || 'No department'],
    [CalendarDays, 'Member since', `Joined ${memberSince}`],
  ];

  return (
    <Card className="overflow-hidden">
      <div className="h-16 bg-gradient-to-r from-accent-strong/90 to-accent" aria-hidden="true" />
      <div className="-mt-8 px-4 pb-4">
        <span className="inline-block rounded-full ring-4 ring-surface">
          <Avatar name={user.name} size="lg" />
        </span>
        <h2 className="mt-2 text-base font-semibold">{user.name}</h2>
        <p className="text-sm text-muted">{user.jobTitle || 'No job title'}</p>
        <div className="mt-2">
          <Badge value={user.role} />
        </div>
      </div>
      <dl className="divide-y divide-line-soft border-t border-line">
        {rows.map(([Icon, label, value]) => (
          <div key={label} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <Icon className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
            <dt className="sr-only">{label}</dt>
            <dd className="min-w-0 truncate text-ink-2">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function ProfileForm() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, jobTitle: user.jobTitle || '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState({ error: '', success: '' });
  const [saving, setSaving] = useState(false);
  const unchanged = form.name === user.name && form.jobTitle === (user.jobTitle || '');

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
    setFieldErrors({ ...fieldErrors, [event.target.name]: '' });
    setStatus({ error: '', success: '' });
  }

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
      setForm({ name: response.data.user.name, jobTitle: response.data.user.jobTitle || '' });
      setStatus({ error: '', success: 'Profile updated.' });
    } catch (err) {
      setStatus({ error: getErrorMessage(err), success: '' });
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card as="form" onSubmit={handleSubmit} noValidate>
      <CardHeader title="Profile details" description="How your name appears to your team." icon={UserRound} />
      <div className="space-y-4 p-4">
        <SuccessMessage message={status.success} />
        <ErrorMessage message={status.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full name" htmlFor="name" error={fieldErrors.name} required>
            <input id="name" name="name" className={`input ${fieldErrors.name ? 'input-error' : ''}`} value={form.name} onChange={handleChange} maxLength={80} />
          </FormField>
          <FormField label="Job title" htmlFor="jobTitle" error={fieldErrors.jobTitle}>
            <input id="jobTitle" name="jobTitle" className="input" value={form.jobTitle} onChange={handleChange} maxLength={80} />
          </FormField>
        </div>
      </div>
      <FormFooter note="Contact an administrator to change your email, role, or department.">
        <Button type="submit" loading={saving} disabled={unchanged}>
          Save profile
        </Button>
      </FormFooter>
    </Card>
  );
}

function PasswordRule({ met, children }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs ${met ? 'text-ok' : 'text-muted'}`}>
      <Check className={`h-3.5 w-3.5 ${met ? '' : 'opacity-30'}`} aria-hidden="true" />
      {children}
      <span className="sr-only">{met ? '(done)' : '(not yet)'}</span>
    </li>
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
    setFieldErrors({ ...fieldErrors, [event.target.name]: '' });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = {};
    if (!form.currentPassword) errors.currentPassword = 'Current password is required';
    if (form.newPassword.length < MIN_PASSWORD_LENGTH) errors.newPassword = 'New password must be at least 8 characters';
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
    <Card as="form" onSubmit={handleSubmit} noValidate>
      <CardHeader title="Change password" description="Use a password you don't use anywhere else." icon={KeyRound} />
      <div className="space-y-4 p-4">
        <SuccessMessage message={status.success} />
        <ErrorMessage message={status.error} />
        <FormField label="Current password" htmlFor="currentPassword" error={fieldErrors.currentPassword}>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            className={`input sm:max-w-sm ${fieldErrors.currentPassword ? 'input-error' : ''}`}
            value={form.currentPassword}
            onChange={handleChange}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="New password" htmlFor="newPassword" error={fieldErrors.newPassword}>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              aria-describedby="password-rules"
              className={`input ${fieldErrors.newPassword ? 'input-error' : ''}`}
              value={form.newPassword}
              onChange={handleChange}
            />
          </FormField>
          <FormField label="Confirm new password" htmlFor="confirmPassword" error={fieldErrors.confirmPassword}>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              className={`input ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
              value={form.confirmPassword}
              onChange={handleChange}
            />
          </FormField>
        </div>
        <ul id="password-rules" className="space-y-1">
          <PasswordRule met={form.newPassword.length >= MIN_PASSWORD_LENGTH}>At least 8 characters</PasswordRule>
          <PasswordRule met={form.newPassword.length > 0 && form.newPassword === form.confirmPassword}>Both new passwords match</PasswordRule>
        </ul>
      </div>
      <FormFooter note="You'll stay signed in here. Other devices will be signed out.">
        <Button type="submit" loading={saving}>
          Change password
        </Button>
      </FormFooter>
    </Card>
  );
}

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" description="Manage your personal details and password." />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <IdentityCard />
        <div className="space-y-4 lg:col-span-2">
          <ProfileForm />
          <PasswordForm />
        </div>
      </div>
    </>
  );
}
