// A table on wider screens and a stacked card list on phones, so columns are never squeezed.
// `columns` is a list of { key, header, cell(row), className }. Wide tables can switch to
// cards up to the `lg` breakpoint instead of `md`.
const breakpoints = {
  md: { table: 'hidden md:block', cards: 'md:hidden' },
  lg: { table: 'hidden lg:block', cards: 'lg:hidden' },
};

export default function DataTable({ columns, rows, getKey = (row) => row.id, renderCard, label, busy = false, stackBelow = 'md' }) {
  const layout = breakpoints[stackBelow];
  return (
    <div className={`transition-opacity ${busy ? 'opacity-60' : ''}`} aria-busy={busy}>
      <div className={`overflow-x-auto ${layout.table}`}>
        <table className="table-basic">
          {label && <caption className="sr-only">{label}</caption>}
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={column.className}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getKey(row)} className="hover:bg-sunken">
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className={`divide-y divide-line-soft ${layout.cards}`} aria-label={label}>
        {rows.map((row) => (
          <li key={getKey(row)} className="px-4 py-3">
            {renderCard(row)}
          </li>
        ))}
      </ul>
    </div>
  );
}
