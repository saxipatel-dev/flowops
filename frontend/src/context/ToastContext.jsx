import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

const ToastContext = createContext(null);
const DISMISS_AFTER_MS = 4500;

// Short confirmations ("Moved to In progress") and failures, announced to screen readers.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const show = useCallback(
    (message, { tone = 'success' } = {}) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, message, tone }]);
      setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
        role="status"
        aria-live="polite"
      >
        {toasts.map(({ id, message, tone }) => {
          const Icon = tone === 'error' ? AlertCircle : CheckCircle2;
          return (
            <div
              key={id}
              className="pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-2.5 rounded-xl border border-line bg-raised px-3.5 py-2.5 text-sm text-ink shadow-overlay"
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone === 'error' ? 'text-bad' : 'text-ok'}`} aria-hidden="true" />
              <p className="flex-1">{message}</p>
              <button type="button" onClick={() => dismiss(id)} className="-mr-1 rounded p-0.5 text-faint hover:text-ink" aria-label="Dismiss">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
