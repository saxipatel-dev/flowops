import { Link } from 'react-router';
import { Coffee } from 'lucide-react';
import { formatCurrency } from '../../services/format.js';

const kinds = {
  late: { label: 'Late task', text: 'text-bad' },
  approval: { label: 'Approval', text: 'text-warn' },
  today: { label: 'Due today', text: 'text-accent' },
  soon: { label: 'Due soon', text: 'text-info' },
  approved: { label: 'Request approved', text: 'text-ok' },
  rejected: { label: 'Request rejected', text: 'text-bad' },
};

function Ticket({ item }) {
  const kind = kinds[item.kind];
  const detail = [item.detail, item.cost ? formatCurrency(item.cost) : null].filter(Boolean).join(' · ');
  return (
    <Link
      to={item.to}
      className="ticket group grid min-h-[84px] grid-cols-[minmax(0,1fr)_68px] rounded-xl bg-raised transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-hover focus-visible:-translate-y-0.5"
      aria-label={`${kind.label}: ${item.title}. ${detail}. ${item.stub.value} ${item.stub.label}`}
    >
      <span className="flex min-w-0 flex-col gap-1 border-r-[1.5px] border-dashed border-line py-2.5 pr-3 pl-4">
        <span className={`font-mono text-[10px] font-medium tracking-[0.12em] uppercase ${kind.text}`}>{kind.label}</span>
        <span className="line-clamp-2 text-[13px] leading-snug font-medium text-ink">{item.title}</span>
        {detail && <span className="truncate text-xs text-faint">{detail}</span>}
      </span>
      <span className="flex flex-col items-center justify-center px-1.5 text-center transition-transform duration-200 group-hover:translate-x-0.5">
        <span className={`font-display text-lg leading-none font-bold ${kind.text}`}>{item.stub.value}</span>
        {item.stub.label && <span className="mt-1 text-[11px] text-faint">{item.stub.label}</span>}
      </span>
    </Link>
  );
}

// "Needs you": everything that is late, waiting on a decision or due soon, as tickets.
// A column on wide screens; a swipeable row on phones.
export default function FocusTickets({ items, limit = 5 }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-4 py-8 text-center">
        <Coffee className="h-5 w-5 text-ok" aria-hidden="true" />
        <p className="text-sm font-medium text-ink">Nothing needs you right now</p>
        <p className="text-xs text-faint">No late work, nothing due in the next two days, and no decisions waiting.</p>
      </div>
    );
  }

  const shown = items.slice(0, limit);
  return (
    <>
      <ul
        className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:snap-none lg:overflow-visible lg:px-0"
        aria-label="Needs you"
      >
        {shown.map((item) => (
          <li key={item.id} className="w-[264px] shrink-0 snap-start lg:w-auto">
            <Ticket item={item} />
          </li>
        ))}
      </ul>
      {items.length > limit && <p className="mt-2 text-xs text-faint">+{items.length - limit} more in your lists</p>}
    </>
  );
}
