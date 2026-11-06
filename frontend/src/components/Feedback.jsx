import { AlertCircle, CheckCircle2, Inbox } from 'lucide-react';

export function Loading({ text = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-muted" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden="true" />
      {text}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-bad/30 bg-bad-soft px-3.5 py-2.5 text-sm text-bad" role="alert">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-hidden="true" />
      <p className="flex-1">
        {message}
        {onRetry && (
          <button type="button" onClick={onRetry} className="ml-2 font-medium underline underline-offset-2 hover:text-ink">
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
      className="flex items-start gap-2.5 rounded-lg border border-ok/30 bg-ok-soft px-3.5 py-2.5 text-sm text-ok"
      role="status"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
      <p className="flex-1">{message}</p>
    </div>
  );
}

export function EmptyState({ title, message, action, icon: Icon = Inbox, titleAs: Title = 'p' }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-hover text-muted" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <Title className="mt-3 text-sm font-medium text-ink">{title}</Title>
      {message && <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
