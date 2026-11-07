import { forwardRef } from 'react';
import { GripVertical } from 'lucide-react';
import { dueCue, timeUsed } from '../../services/taskAtlas.js';
import Avatar from '../Avatar.jsx';
import { PriorityBars } from '../Badge.jsx';
import MoveMenu from './MoveMenu.jsx';

const cueTones = {
  bad: 'bg-bad-soft text-bad',
  warn: 'bg-warn-soft text-warn',
  ok: 'bg-ok-soft text-ok',
  muted: 'bg-hover text-muted',
};

// The thin track from when the task was created to its due date; the tick is now.
function TimeTrack({ used, late }) {
  const tone = late ? 'bg-bad' : used > 0.85 ? 'bg-warn' : 'bg-info';
  return (
    <span className="relative mt-2.5 block h-1 rounded-full bg-hover" aria-hidden="true">
      <span className={`absolute inset-y-0 left-0 rounded-full ${tone}`} style={{ width: `${(late ? 1 : used) * 100}%` }} />
      {!late && <span className="absolute -top-[3px] h-2.5 w-0.5 rounded bg-ink" style={{ left: `calc(${used * 100}% - 1px)` }} />}
    </span>
  );
}

// One task on the board. `handle` makes the grip the keyboard drag handle; `grab`
// lets mouse and touch drag the whole card.
const TaskCard = forwardRef(function TaskCard({ task, today, now, onOpen, onMove, handle, grab, ghost = false, lifted = false, saving = false }, ref) {
  const cue = dueCue(task, today);
  const used = timeUsed(task, now);

  function open(event) {
    // Plain clicks open the slide-over; new-tab clicks still follow the link.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onOpen?.(task);
  }

  return (
    <article
      ref={ref}
      {...grab}
      className={`group relative rounded-xl border bg-raised p-3 transition-[border-color,box-shadow,opacity,transform] duration-150 ${
        ghost ? 'border-dashed border-line-strong opacity-35' : 'border-line hover:border-line-strong'
      } ${lifted ? 'rotate-[-1.5deg] cursor-grabbing border-accent shadow-overlay' : ''} ${saving ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start gap-1.5">
        {handle ? (
          <button
            type="button"
            {...handle}
            aria-label={`Drag “${task.title}”`}
            className="-ml-1.5 flex h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded text-faint transition-colors hover:text-ink active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <span className="w-1" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          {task.requestId && <p className="font-mono text-[10px] tracking-wider text-accent uppercase">From a request</p>}
          <a href={`/tasks/${task.id}`} onClick={open} className="line-clamp-3 text-[13px] leading-snug font-medium text-ink hover:text-accent">
            {task.title}
          </a>
        </div>
        {task.canUpdateStatus && onMove && <MoveMenu task={task} onMove={(status) => onMove(task, status)} disabled={saving} />}
      </div>

      {used !== null && <TimeTrack used={used} late={cue.tone === 'bad'} />}

      <div className="mt-2.5 flex items-center gap-2 text-[11px]">
        <span className={`rounded-full px-2 py-0.5 font-medium ${cueTones[cue.tone]}`}>{cue.text}</span>
        <PriorityBars value={task.priority} />
        <span className="sr-only">{task.priority.toLowerCase()} priority</span>
        <span className="ml-auto flex items-center gap-1.5 truncate text-faint" title={task.assignee.name}>
          <Avatar name={task.assignee.name} size="xs" />
          <span className="sr-only">Assigned to {task.assignee.name}</span>
        </span>
      </div>
    </article>
  );
});

export default TaskCard;
