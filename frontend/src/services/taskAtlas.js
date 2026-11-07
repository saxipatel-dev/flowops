// Task Atlas helpers: board columns, due-date cues and timeline geometry. Pure, so they are unit tested.
import { localDayKey } from './format.js';
import { addDaysToKey, daysBetween, keyOf, weekStartKey } from './missionControl.js';

export const STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
export const VIEWS = ['board', 'list', 'timeline'];

export function groupByStatus(tasks) {
  const columns = Object.fromEntries(STATUSES.map((status) => [status, []]));
  for (const task of tasks) columns[task.status]?.push(task);
  return columns;
}

// The short due-date cue on a card: how late, today, tomorrow, or the date.
export function dueCue(task, today) {
  if (!task.dueDate) return { text: 'No due date', tone: 'muted' };
  const days = daysBetween(today, keyOf(task.dueDate));
  if (task.status === 'COMPLETED') return { text: 'Done', tone: 'ok' };
  if (days < 0) return { text: `${-days}d late`, tone: 'bad' };
  if (days === 0) return { text: 'Today', tone: 'warn' };
  if (days === 1) return { text: 'Tomorrow', tone: 'warn' };
  const date = new Date(`${keyOf(task.dueDate)}T00:00:00Z`);
  return { text: date.toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric' }), tone: 'muted' };
}

// How much of the time between creating the task and its due date has passed (0–1),
// or null when it has no due date or is done. Drawn as the thin track on each card.
export function timeUsed(task, now = new Date()) {
  if (!task.dueDate || task.status === 'COMPLETED') return null;
  const created = Date.parse(`${localDayKey(new Date(task.createdAt))}T00:00:00Z`);
  const due = Date.parse(`${keyOf(task.dueDate)}T00:00:00Z`) + 24 * 60 * 60 * 1000; // end of the due day
  const today = Date.parse(`${localDayKey(now)}T00:00:00Z`) + (now.getHours() * 60 + now.getMinutes()) * 60 * 1000;
  if (due <= created) return 1;
  return Math.max(0, Math.min(1, (today - created) / (due - created)));
}

// The days shown by the timeline: a Monday-to-Sunday week, or four weeks from a Monday.
export function timelineRange(anchorKey, range) {
  const start = weekStartKey(anchorKey);
  const length = range === 'month' ? 28 : 7;
  return { start, length, days: Array.from({ length }, (_, index) => addDaysToKey(start, index)) };
}

export function shiftRange(anchorKey, range, direction) {
  return addDaysToKey(weekStartKey(anchorKey), direction * (range === 'month' ? 28 : 7));
}

// Splits tasks for the timeline: open work due before the range ("late"), work due inside
// it (drawn as bars from creation to due date), and tasks with no due date.
export function placeOnTimeline(tasks, { start, length }, today) {
  const late = [];
  const rows = [];
  let undated = 0;
  for (const task of tasks) {
    if (!task.dueDate) {
      undated += 1;
      continue;
    }
    const dueIndex = daysBetween(start, keyOf(task.dueDate));
    if (dueIndex < 0) {
      if (task.status !== 'COMPLETED' && keyOf(task.dueDate) < today) late.push(task);
      continue;
    }
    if (dueIndex >= length) continue;
    const createdIndex = daysBetween(start, localDayKey(new Date(task.createdAt)));
    rows.push({
      task,
      from: Math.max(0, Math.min(createdIndex, dueIndex)),
      to: dueIndex,
      startsBefore: createdIndex < 0,
      late: task.status !== 'COMPLETED' && keyOf(task.dueDate) < today,
    });
  }
  rows.sort((a, b) => a.to - b.to || a.task.id - b.task.id);
  late.sort((a, b) => keyOf(a.dueDate).localeCompare(keyOf(b.dueDate)));
  return { late, rows, undated };
}
