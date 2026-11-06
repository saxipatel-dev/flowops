// Turns dashboard API data into what Mission Control draws. Pure functions, so they are unit tested.
// Due dates are calendar days; "today" is the user's own calendar day, as everywhere in the app.
import { localDayKey } from './format.js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_DAYS = 7;
// Weekend columns are drawn narrower than weekdays.
export const DAY_WEIGHTS = [1, 1, 1, 1, 1, 0.5, 0.5];
const MAX_LINES = 7;

export const todayKey = (now = new Date()) => localDayKey(now);
export const keyOf = (value) => String(value).slice(0, 10);
export const addDaysToKey = (key, days) => new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
export const daysBetween = (fromKey, toKey) => Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / DAY_MS);

// Monday of the week containing the given day.
export function weekStartKey(key) {
  const weekday = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDaysToKey(key, weekday === 0 ? -6 : 1 - weekday);
}

// Horizontal position (0–1) of a point inside the week, given a day index and a fraction of that day.
export function weekPosition(dayIndex, fraction = 0.5) {
  const total = DAY_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
  const before = DAY_WEIGHTS.slice(0, dayIndex).reduce((sum, weight) => sum + weight, 0);
  return (before + DAY_WEIGHTS[dayIndex] * fraction) / total;
}

export function stationState(task, today) {
  if (task.status === 'COMPLETED') return 'done';
  if (keyOf(task.dueDate) < today) return 'late';
  return task.status === 'IN_PROGRESS' ? 'progress' : 'todo';
}

// How much of the week a stop's label needs: a little under one weekday (labels are capped at 84px).
const LABEL_SPAN = 0.85 / DAY_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
const RING_SPAN = 0.02;

// The stretch of the week a stop and its label cover. Weekend labels are right-aligned
// (they would run off the end of the week otherwise), so they extend to the left.
function labelExtent(dayIndex) {
  const position = weekPosition(dayIndex);
  return dayIndex >= 5 ? [position - LABEL_SPAN, position + RING_SPAN] : [position - RING_SPAN, position + LABEL_SPAN];
}

// Groups the week's tasks into one line per person. The signed-in user comes first,
// then whoever has the most stops this week. Stops that would overlap stack up.
export function buildLines(tasks, { startKey, today, userId }) {
  const byPerson = new Map();
  for (const task of tasks) {
    const dayIndex = daysBetween(startKey, keyOf(task.dueDate));
    if (dayIndex < 0 || dayIndex >= WEEK_DAYS) continue;
    if (!byPerson.has(task.assignedTo)) byPerson.set(task.assignedTo, { user: task.assignee, isMe: task.assignedTo === userId, stops: [] });
    byPerson.get(task.assignedTo).stops.push({ task, dayIndex, state: stationState(task, today) });
  }
  const lines = [...byPerson.values()].map((line) => {
    // Each stacking level remembers the extents already placed on it; a stop goes on the
    // first level where its label overlaps nothing.
    const levels = [];
    line.stops.sort((a, b) => a.dayIndex - b.dayIndex || a.task.id - b.task.id);
    for (const stop of line.stops) {
      const [start, end] = labelExtent(stop.dayIndex);
      let level = levels.findIndex((placed) => placed.every(([from, to]) => end <= from || start >= to));
      if (level === -1) level = levels.push([]) - 1;
      levels[level].push([start, end]);
      stop.stack = level;
    }
    return { ...line, depth: Math.max(1, levels.length) };
  });
  lines.sort((a, b) => Number(b.isMe) - Number(a.isMe) || b.stops.length - a.stops.length || a.user.name.localeCompare(b.user.name));
  return { lines: lines.slice(0, MAX_LINES), hiddenPeople: Math.max(0, lines.length - MAX_LINES) };
}

function waitLabel(fromIso, now) {
  const hours = Math.max(0, Math.floor((now - new Date(fromIso)) / (60 * 60 * 1000)));
  if (hours < 24) return { value: `${Math.max(1, hours)}h`, label: 'waiting' };
  return { value: `${Math.floor(hours / 24)}d`, label: 'waiting' };
}

// The "Needs you" queue, most urgent first: late work, decisions waiting on you,
// work due today, work due in the next two days, then your requests decided recently.
export function buildFocusItems(summary, { userId, now = new Date() }) {
  const today = todayKey(now);
  const items = [];

  for (const task of summary.focusTasks || []) {
    const days = daysBetween(today, keyOf(task.dueDate));
    const mine = task.assignedTo === userId;
    const who = mine ? 'Assigned to you' : task.assignee?.name;
    if (days < 0) {
      items.push({ id: `task-${task.id}`, kind: 'late', rank: 0, order: days, title: task.title, detail: who, to: `/tasks/${task.id}`, stub: { value: `${-days}d`, label: 'late' } });
    } else if (days === 0) {
      items.push({ id: `task-${task.id}`, kind: 'today', rank: 2, order: 0, title: task.title, detail: who, to: `/tasks/${task.id}`, stub: { value: 'Today', label: '' } });
    } else {
      items.push({ id: `task-${task.id}`, kind: 'soon', rank: 3, order: days, title: task.title, detail: who, to: `/tasks/${task.id}`, stub: { value: `${days}d`, label: 'to go' } });
    }
  }

  for (const request of summary.approvalQueue || []) {
    items.push({
      id: `approval-${request.id}`,
      kind: 'approval',
      rank: 1,
      order: new Date(request.createdAt).getTime(),
      title: request.title,
      detail: request.requester?.name,
      cost: request.estimatedCost,
      to: `/requests/${request.id}`,
      stub: waitLabel(request.createdAt, now),
    });
  }

  for (const request of summary.requestLines || []) {
    const decidedRecently = request.reviewedAt && now - new Date(request.reviewedAt) < 3 * DAY_MS;
    if (request.requestedBy !== userId || !decidedRecently) continue;
    items.push({
      id: `decided-${request.id}`,
      kind: request.status === 'APPROVED' ? 'approved' : 'rejected',
      rank: 4,
      order: -new Date(request.reviewedAt).getTime(),
      title: request.title,
      detail: `${request.status === 'APPROVED' ? 'Approved' : 'Rejected'} by ${request.decidedBy?.name || 'your manager'}`,
      to: `/requests/${request.id}`,
      stub: { value: request.status === 'APPROVED' ? '✓' : '✕', label: request.status === 'APPROVED' ? 'approved' : 'rejected' },
    });
  }

  return items.sort((a, b) => a.rank - b.rank || a.order - b.order);
}

// Splits status counts into bar segments with shares that add up to 100.
export function toSegments(counts, order) {
  const total = order.reduce((sum, key) => sum + (counts?.[key] || 0), 0);
  return { total, segments: order.map((key) => ({ key, count: counts?.[key] || 0, share: total ? (counts?.[key] || 0) / total : 0 })) };
}

// 0–4 intensity for a heatmap cell, relative to the busiest day in view.
export function heatLevel(count, max) {
  if (!count || !max) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4)));
}
