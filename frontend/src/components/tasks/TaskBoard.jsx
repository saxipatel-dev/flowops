import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { taskStatusLabels } from '../../services/format.js';
import { STATUSES, groupByStatus } from '../../services/taskAtlas.js';
import TaskCard from './TaskCard.jsx';

const lines = { TODO: 'bg-info', IN_PROGRESS: 'bg-accent', COMPLETED: 'bg-ok' };

// Arrow keys jump a picked-up card straight to the next column instead of nudging it.
function columnJump(event, { context: { droppableRects, collisionRect } }) {
  if (!collisionRect || !['ArrowLeft', 'ArrowRight'].includes(event.code)) return undefined;
  event.preventDefault();
  const columns = [...droppableRects.values()].sort((a, b) => a.left - b.left);
  const centre = collisionRect.left + collisionRect.width / 2;
  let index = columns.findIndex((rect) => centre >= rect.left && centre <= rect.left + rect.width);
  if (index === -1) index = 0;
  const target = columns[Math.max(0, Math.min(columns.length - 1, index + (event.code === 'ArrowRight' ? 1 : -1)))];
  return { x: target.left + target.width / 2 - collisionRect.width / 2, y: target.top + 48 };
}

// Use the column under the pointer; fall back to overlap for keyboard moves.
function collisions(args) {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
}

function DraggableCard({ task, ...props }) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: !task.canUpdateStatus,
  });
  const handle = task.canUpdateStatus ? { ref: setActivatorNodeRef, ...attributes, onKeyDown: listeners?.onKeyDown } : null;
  const grab = task.canUpdateStatus ? { onMouseDown: listeners?.onMouseDown, onTouchStart: listeners?.onTouchStart } : {};
  return <TaskCard ref={setNodeRef} task={task} handle={handle} grab={grab} ghost={isDragging} {...props} />;
}

function Column({ status, tasks, activeTask, phoneVisible, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const incoming = isOver && activeTask && activeTask.status !== status;
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`column-${status}`}
      className={`min-w-0 flex-col gap-2.5 rounded-2xl border p-2.5 transition-colors duration-150 md:flex ${phoneVisible ? 'flex' : 'hidden'} ${
        incoming ? 'border-accent bg-accent-soft/60' : 'border-line-soft bg-sunken/70'
      }`}
    >
      <h3 id={`column-${status}`} className="sr-only items-center gap-2 px-1 pt-0.5 text-[13px] font-semibold md:not-sr-only md:flex">
        <span className={`h-1 w-4 rounded-full ${lines[status]}`} aria-hidden="true" />
        {taskStatusLabels[status]}
        <span className="ml-auto font-mono text-[11px] font-normal text-faint">{tasks.length}</span>
      </h3>
      {children}
      {tasks.length === 0 && (
        <p className={`rounded-xl border border-dashed px-3 py-6 text-center text-xs ${incoming ? 'border-accent text-accent' : 'border-line text-faint'}`}>
          {incoming ? `Drop to move to ${taskStatusLabels[status]}` : 'Nothing here'}
        </p>
      )}
    </section>
  );
}

// Board view: To do, In progress and Completed columns. Cards the user may move can be
// dragged (mouse, touch or keyboard) or moved with the "Move to" menu.
export default function TaskBoard({ tasks, today, now, onOpen, onMove, savingId }) {
  const [activeTask, setActiveTask] = useState(null);
  const [phoneColumn, setPhoneColumn] = useState('TODO');
  const columns = useMemo(() => groupByStatus(tasks), [tasks]);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnJump }),
  );

  const announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${active.data.current.task.title}. Use the left and right arrow keys to choose a column, Space to drop it, or Escape to cancel.`,
    onDragOver: ({ over }) => (over ? `Over ${taskStatusLabels[over.id]}.` : 'Not over a column.'),
    onDragEnd: ({ active, over }) =>
      over ? `Moved ${active.data.current.task.title} to ${taskStatusLabels[over.id]}.` : `${active.data.current.task.title} was not moved.`,
    onDragCancel: ({ active }) => `Cancelled. ${active.data.current.task.title} was not moved.`,
  };

  function handleDragEnd({ active, over }) {
    setActiveTask(null);
    if (over) onMove(active.data.current.task, over.id);
  }

  const cardProps = { today, now, onOpen, onMove };

  return (
    <div>
      {/* Phones show one column at a time. */}
      <div className="mb-3 flex gap-1.5 md:hidden" role="group" aria-label="Column">
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setPhoneColumn(status)}
            aria-pressed={phoneColumn === status}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-2 py-1.5 text-xs ${
              phoneColumn === status ? 'border-accent-strong bg-hover text-ink' : 'border-line text-muted'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${lines[status]}`} aria-hidden="true" />
            {taskStatusLabels[status]}
            <span className="font-mono text-faint">{columns[status].length}</span>
          </button>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisions}
        accessibility={{ announcements }}
        onDragStart={({ active }) => setActiveTask(active.data.current.task)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-3">
          {STATUSES.map((status) => (
            <Column key={status} status={status} tasks={columns[status]} activeTask={activeTask} phoneVisible={phoneColumn === status}>
              {columns[status].map((task) => (
                <DraggableCard key={task.id} task={task} saving={savingId === task.id} {...cardProps} />
              ))}
            </Column>
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
          {activeTask && <TaskCard task={activeTask} lifted {...cardProps} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
