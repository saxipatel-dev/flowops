import { useEffect, useRef, useState } from 'react';
import { Check, MoveRight } from 'lucide-react';
import { taskStatusLabels } from '../../services/format.js';
import { STATUSES } from '../../services/taskAtlas.js';

const dots = { TODO: 'bg-info', IN_PROGRESS: 'bg-accent', COMPLETED: 'bg-ok' };

// "Move to…": the keyboard- and touch-friendly way to change a card's column.
export default function MoveMenu({ task, onMove, disabled }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector('[role="menuitemradio"]:not([aria-checked="true"])')?.focus();
    function close(event) {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  function handleKeyDown(event) {
    const items = [...menuRef.current.querySelectorAll('[role="menuitemradio"]:not(:disabled)')];
    const index = items.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
    }
  }

  function choose(status) {
    setOpen(false);
    buttonRef.current?.focus();
    onMove(status);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Move “${task.title}” to another column`}
        className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-hover hover:text-ink disabled:opacity-40"
      >
        <MoveRight className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Move to"
          onKeyDown={handleKeyDown}
          className="absolute top-8 right-0 z-40 w-44 animate-scale-in rounded-xl border border-line bg-raised p-1 shadow-overlay"
        >
          <p className="eyebrow px-2.5 pt-1.5 pb-1">Move to</p>
          {STATUSES.map((status) => {
            const current = task.status === status;
            return (
              <button
                key={status}
                type="button"
                role="menuitemradio"
                aria-checked={current}
                disabled={current}
                onClick={() => choose(status)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink-2 hover:bg-hover focus-visible:bg-hover disabled:cursor-default disabled:text-faint disabled:hover:bg-transparent"
              >
                <span className={`h-2 w-2 rounded-full ${dots[status]}`} aria-hidden="true" />
                <span className="flex-1">{taskStatusLabels[status]}</span>
                {current && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
