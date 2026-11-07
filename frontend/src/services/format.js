export const taskStatusLabels = { TODO: 'To Do', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed' };
export const requestStatusLabels = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' };
export const priorityLabels = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };
export const roleLabels = { EMPLOYEE: 'Employee', MANAGER: 'Manager', ADMIN: 'Administrator' };
export const categoryLabels = {
  EQUIPMENT: 'Equipment',
  PURCHASE: 'Purchase',
  IT_SUPPORT: 'IT Support',
  GENERAL_OPERATIONS: 'General Operations',
};

// Turns { KEY: 'Label' } into options for a <select>.
export const toOptions = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }));

// Due dates are stored as UTC midnight, so format them in UTC to avoid showing the previous day.
export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '—';
  return Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function toDateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

// The user's own calendar day as YYYY-MM-DD. Due dates are calendar days, so they are
// compared with this, never with the UTC date.
export function localDayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isOverdue(task, now = new Date()) {
  if (!task.dueDate || task.status === 'COMPLETED') return false;
  return task.dueDate.slice(0, 10) < localDayKey(now);
}

export const requestCode = (id) => `REQ-${String(id).padStart(4, '0')}`;

const DAY_MS = 24 * 60 * 60 * 1000;

// "Overdue by 2 days", "Due today", "Due in 3 days", counted from the user's own today.
export function formatDueLabel(value, now = new Date()) {
  const due = Date.parse(String(value).slice(0, 10));
  const today = Date.parse(localDayKey(now));
  const days = Math.round((due - today) / DAY_MS);
  if (days < 0) return `Overdue by ${-days} ${-days === 1 ? 'day' : 'days'}`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

// "Just now", "5m ago", "3h ago", "Yesterday", "4 days ago", then the date.
export function formatTimeAgo(value, now = new Date()) {
  const minutes = Math.floor((now - new Date(value)) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ago`;
  const days = Math.floor(minutes / (24 * 60));
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(value) {
  return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// Groups items (newest first) into [{ label: 'Today' | 'Yesterday' | 'Monday, Nov 2', items }].
export function groupByDay(items, now = new Date()) {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const groups = [];
  for (const item of items) {
    const date = new Date(item.createdAt);
    const key = dayKey(date);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      let label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      if (key === dayKey(now)) label = 'Today';
      else if (key === dayKey(yesterday)) label = 'Yesterday';
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

// "3 days, 4 hours", "5 hours", "12 minutes": the time between two moments.
export function formatDuration(from, to = new Date()) {
  const minutes = Math.max(0, Math.round((new Date(to) - new Date(from)) / 60000));
  if (minutes < 1) return 'less than a minute';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const plural = (count, unit) => `${count} ${unit}${count === 1 ? '' : 's'}`;
  if (days > 0) return hours > 0 ? `${plural(days, 'day')}, ${plural(hours, 'hour')}` : plural(days, 'day');
  if (hours > 0) return plural(hours, 'hour');
  return plural(minutes, 'minute');
}
