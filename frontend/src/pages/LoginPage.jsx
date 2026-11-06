import { useState } from 'react';
import { Activity, ClipboardCheck, ListChecks, Workflow } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../services/api.js';
import Button from '../components/Button.jsx';
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

function Logo({ inverted = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${inverted ? 'bg-white/15 text-white ring-1 ring-white/25' : 'bg-brand text-white shadow-xs'}`}
        aria-hidden="true"
      >
        <Workflow className="h-5 w-5" />
      </span>
      <span className={`text-lg font-semibold tracking-tight ${inverted ? 'text-white' : 'text-navy'}`}>FlowOps</span>
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
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-700 via-brand to-indigo-500 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:32px_32px]"
          aria-hidden="true"
        />
        <div className="relative">
          <Logo inverted />
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight text-white">Everyday operations, in one place.</h2>
          <p className="mt-3 text-indigo-100">FlowOps brings tasks, requests, and approvals together so teams spend less time chasing updates.</p>
          <ul className="mt-8 space-y-5">
            {highlights.map(([Icon, title, text]) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20" aria-hidden="true">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-indigo-100">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-indigo-200">Internal workspace · Authorized staff only</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back. Use your work email to continue.</p>

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
          <p className="mt-6 text-xs text-slate-500">Can't sign in? Contact your FlowOps administrator.</p>
        </div>
      </main>
    </div>
  );
}
