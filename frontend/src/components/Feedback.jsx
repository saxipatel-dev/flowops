import { AlertCircle, CheckCircle2, Inbox } from 'lucide-react';

export function Loading({ text = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-slate-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-hidden="true" />
      {text}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800" role="alert">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
      <p className="flex-1">
        {message}
        {onRetry && (
          <button type="button" onClick={onRetry} className="ml-2 font-medium underline underline-offset-2 hover:text-red-900">
            Try again
          </button>
        )}
      </p>
    </div>
  );
}

export function SuccessMessage({ message }) {
  if (!message) return null;
  return (
    <div
      className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800"
      role="status"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
      <p className="flex-1">{message}</p>
    </div>
  );
}

export function EmptyState({ title, message, action, icon: Icon = Inbox, titleAs: Title = 'p' }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <Title className="mt-3 text-sm font-medium text-slate-800">{title}</Title>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
