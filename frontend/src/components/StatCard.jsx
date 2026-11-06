import { Link } from 'react-router';

const iconTones = {
  brand: 'bg-accent-soft text-accent',
  blue: 'bg-info-soft text-info',
  amber: 'bg-warn-soft text-warn',
  emerald: 'bg-ok-soft text-ok',
};

// A compact metric tile. The whole card links to the matching list.
export default function StatCard({ label, value, hint, to, icon: Icon, tone = 'brand' }) {
  return (
    <Link
      to={to}
      className="card group flex min-w-0 items-start justify-between gap-3 p-3.5 sm:p-4 transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-raised"
    >
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
      {Icon && (
        <span className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:flex ${iconTones[tone]}`} aria-hidden="true">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      )}
    </Link>
  );
}
