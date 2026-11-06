import { priorityLabels, requestStatusLabels, roleLabels, taskStatusLabels } from '../services/format.js';

// Status-like values: [pill colours, dot colour]
const tones = {
  TODO: ['bg-info-soft text-info', 'bg-info'],
  IN_PROGRESS: ['bg-accent-soft text-accent', 'bg-accent'],
  COMPLETED: ['bg-ok-soft text-ok', 'bg-ok'],
  PENDING: ['bg-warn-soft text-warn', 'bg-warn'],
  APPROVED: ['bg-ok-soft text-ok', 'bg-ok'],
  REJECTED: ['bg-bad-soft text-bad', 'bg-bad'],
  EMPLOYEE: ['bg-hover text-ink-2', 'bg-faint'],
  MANAGER: ['bg-info-soft text-info', 'bg-info'],
  ADMIN: ['bg-accent-soft text-accent', 'bg-accent'],
  ACTIVE: ['bg-ok-soft text-ok', 'bg-ok'],
  INACTIVE: ['bg-hover text-muted', 'bg-faint'],
};

// Priorities are drawn as signal bars: one, two or three lit.
const priorityLevels = { LOW: [1, 'bg-faint'], MEDIUM: [2, 'bg-warn'], HIGH: [3, 'bg-bad'] };

const labels = { ...taskStatusLabels, ...requestStatusLabels, ...priorityLabels, ...roleLabels, ACTIVE: 'Active', INACTIVE: 'Inactive' };

export function PriorityBars({ value, className = '' }) {
  const [lit, color] = priorityLevels[value] || priorityLevels.LOW;
  return (
    <span className={`inline-flex h-2.5 items-end gap-[2px] ${className}`} aria-hidden="true">
      {[4, 7, 10].map((height, index) => (
        <span key={height} className={`w-[3px] rounded-[1px] ${index < lit ? color : 'bg-line'}`} style={{ height }} />
      ))}
    </span>
  );
}

export default function Badge({ value }) {
  const label = labels[value] || value;
  if (priorityLevels[value]) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-ink-2">
        <PriorityBars value={value} />
        {label}
      </span>
    );
  }
  const [colors, dot] = tones[value] || tones.TODO;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${colors}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
