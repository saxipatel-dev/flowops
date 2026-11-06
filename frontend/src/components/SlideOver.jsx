import { useId } from 'react';
import { X } from 'lucide-react';
import { useDialog } from '../hooks/useDialog.js';

// A panel that slides in from the right over the current page (full screen on phones).
// Escape, the close button and the backdrop all close it, and focus returns to
// whatever opened it.
export default function SlideOver({ open, onClose, title, eyebrow, children, footer }) {
  const titleId = useId();
  const panelRef = useDialog(open, onClose);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full animate-slide-in-right flex-col border-l border-line bg-raised shadow-overlay sm:max-w-md"
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            <h2 id={titleId} className="text-lg leading-snug font-semibold">
              {title}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink" aria-label="Close panel">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="border-t border-line px-5 py-3">{footer}</footer>}
      </section>
    </div>
  );
}
