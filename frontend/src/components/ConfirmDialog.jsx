import { useEffect, useId, useRef } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import Button from './Button.jsx';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', variant = 'danger', loading, onConfirm, onCancel }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const isDanger = variant === 'danger';
  const Icon = isDanger ? AlertTriangle : CheckCircle2;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      aria-labelledby={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-200 p-0 shadow-overlay backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex gap-4 p-5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isDanger ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}
          aria-hidden="true"
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{message}</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 rounded-b-xl border-t border-slate-200 bg-surface-muted px-5 py-3">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
