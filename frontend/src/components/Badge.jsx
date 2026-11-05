import { priorityLabels, requestStatusLabels, taskStatusLabels } from '../services/format.js';

const colors = {
  TODO: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-sky-50 text-sky-700',
  HIGH: 'bg-orange-50 text-orange-700',
};

const labels = { ...taskStatusLabels, ...requestStatusLabels, ...priorityLabels };

export default function Badge({ value }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${colors[value] || colors.TODO}`}>
      {labels[value] || value}
    </span>
  );
}
