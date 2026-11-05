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

export function isOverdue(task) {
  if (!task.dueDate || task.status === 'COMPLETED') return false;
  return task.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10);
}

export const requestCode = (id) => `REQ-${String(id).padStart(4, '0')}`;
