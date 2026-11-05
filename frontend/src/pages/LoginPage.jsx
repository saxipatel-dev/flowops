import { useState } from 'react';
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-2xl font-bold tracking-wide text-navy">FLOWOPS</p>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage tasks and requests</p>
        </div>
        <form onSubmit={handleSubmit} noValidate className="card space-y-4 p-6">
          <ErrorMessage message={error} />
          <FormField label="Email" htmlFor="email" error={fieldErrors.email}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={`input ${fieldErrors.email ? 'input-error' : ''}`}
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
              className={`input ${fieldErrors.password ? 'input-error' : ''}`}
              value={form.password}
              onChange={handleChange}
            />
          </FormField>
          <Button type="submit" className="w-full" loading={submitting}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
