// A compact label/value list for detail page side panels.
export default function DetailList({ children }) {
  return <dl className="divide-y divide-line-soft">{children}</dl>;
}

export function DetailItem({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-ink">{children}</dd>
    </div>
  );
}
