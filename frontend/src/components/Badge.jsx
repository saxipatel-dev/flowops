import { priorityLabels, requestStatusLabels, roleLabels, taskStatusLabels } from '../services/format.js';

// [badge colors, dot color]
const tones = {
  TODO: ['bg-slate-100 text-slate-700 ring-slate-200', 'bg-slate-400'],
  IN_PROGRESS: ['bg-blue-50 text-blue-700 ring-blue-200', 'bg-blue-500'],
  COMPLETED: ['bg-emerald-50 text-emerald-700 ring-emerald-200', 'bg-emerald-500'],
  PENDING: ['bg-amber-50 text-amber-800 ring-amber-200', 'bg-amber-500'],
  APPROVED: ['bg-emerald-50 text-emerald-700 ring-emerald-200', 'bg-emerald-500'],
  REJECTED: ['bg-red-50 text-red-700 ring-red-200', 'bg-red-500'],
  LOW: ['bg-white text-slate-600 ring-slate-200', 'bg-slate-400'],
  MEDIUM: ['bg-white text-slate-700 ring-slate-200', 'bg-sky-500'],
  HIGH: ['bg-white text-slate-800 ring-slate-200', 'bg-orange-500'],
  EMPLOYEE: ['bg-slate-50 text-slate-700 ring-slate-200', 'bg-slate-400'],
  MANAGER: ['bg-blue-50 text-blue-700 ring-blue-200', 'bg-blue-500'],
  ADMIN: ['bg-violet-50 text-violet-700 ring-violet-200', 'bg-violet-500'],
  ACTIVE: ['bg-emerald-50 text-emerald-700 ring-emerald-200', 'bg-emerald-500'],
  INACTIVE: ['bg-slate-100 text-slate-600 ring-slate-200', 'bg-slate-400'],
};

const labels = { ...taskStatusLabels, ...requestStatusLabels, ...priorityLabels, ...roleLabels, ACTIVE: 'Active', INACTIVE: 'Inactive' };

export default function Badge({ value }) {
  const [colors, dot] = tones[value] || tones.TODO;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${colors}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {labels[value] || value}
    </span>
  );
}
