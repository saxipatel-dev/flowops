import { useState } from 'react';
import { Activity, ClipboardCheck, ListChecks } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../services/api.js';
import Button from '../components/Button.jsx';
import LogoMark from '../components/shell/LogoMark.jsx';
import { FormField } from '../components/FormField.jsx';
import { ErrorMessage } from '../components/Feedback.jsx';

export function validateLogin({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Email is required';
  else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Password is required';
  return errors;
}

const highlights = [
  [ListChecks, 'Tasks and deadlines', 'Assign work, track progress, and see what is due next.'],
  [ClipboardCheck, 'Request approvals', 'Submit equipment, purchase, and IT requests for manager review.'],
  [Activity, 'A clear audit trail', 'Every change is recorded in a shared activity history.'],
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark className="h-9 w-9" />
      <span className="font-display text-lg font-bold tracking-tight text-ink">FlowOps</span>
    </div>
  );
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
    setFieldErrors({ ...fieldErrors, [event.target.name]: '' });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validateLogin(form);
    setFieldErrors(errors);
    setError('');
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r border-line bg-surface p-12 text-ink lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_20%_10%,rgb(157_140_255/0.16),transparent_55%)]"
          aria-hidden="true"
        />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative max-w-md">
          <svg viewBox="0 0 360 96" fill="none" className="mb-8 w-full max-w-sm" aria-hidden="true">
            <path d="M8 72H112C136 72 136 28 160 28H248" stroke="#45d6b0" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M248 28H352" stroke="#9d8cff" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M160 28C184 28 184 80 208 80H264" stroke="#2b3047" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 10" fill="none" />
            <circle cx="8" cy="72" r="7" fill="#11141f" stroke="#45d6b0" strokeWidth="4" />
            <circle cx="112" cy="72" r="7" fill="#11141f" stroke="#45d6b0" strokeWidth="4" />
            <circle cx="248" cy="28" r="9" fill="#11141f" stroke="#9d8cff" strokeWidth="4" />
            <circle cx="352" cy="28" r="7" fill="#11141f" stroke="#2b3047" strokeWidth="4" />
          </svg>
          <h2 className="text-4xl leading-[1.05] font-extrabold tracking-tight">Everyday operations, in one place.</h2>
          <p className="mt-4 text-muted">FlowOps brings tasks, requests, and approvals together so teams spend less time chasing updates.</p>
          <ul className="mt-8 space-y-5">
            {highlights.map(([Icon, title, text]) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent" aria-hidden="true">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="font-medium text-ink">{title}</p>
                  <p className="text-sm text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative eyebrow">Internal workspace · Authorized staff only</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-3xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Welcome back. Use your work email to continue.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <ErrorMessage message={error} />
            <FormField label="Email" htmlFor="email" error={fieldErrors.email}>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className={`input h-10 ${fieldErrors.email ? 'input-error' : ''}`}
                value={form.email}
                onChange={handleChange}
              />
            </FormField>
            <FormField label="Password" htmlFor="password" error={fieldErrors.password}>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className={`input h-10 ${fieldErrors.password ? 'input-error' : ''}`}
                value={form.password}
                onChange={handleChange}
              />
            </FormField>
            <Button type="submit" className="h-10 w-full" loading={submitting}>
              Sign in
            </Button>
          </form>
          <p className="mt-6 text-xs text-muted">Can't sign in? Contact your FlowOps administrator.</p>
        </div>
      </main>
    </div>
  );
}
