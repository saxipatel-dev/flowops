import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { SelectInput } from './FormField.jsx';
import Button from './Button.jsx';

const SEARCH_DELAY_MS = 300;

// Search box plus dropdown filters. `filters` is a list of { name, label, options }.
// The search applies automatically shortly after the user stops typing.
export default function FilterBar({ searchValue = '', onSearch, filters, values, onFilterChange, onClear, searchPlaceholder, resultLabel }) {
  const [search, setSearch] = useState(searchValue);

  // Keep the box in sync when the URL changes elsewhere, e.g. "Clear filters".
  useEffect(() => {
    setSearch(searchValue);
  }, [searchValue]);

  useEffect(() => {
    if (search.trim() === searchValue) return undefined;
    const timer = setTimeout(() => onSearch(search.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search, searchValue, onSearch]);

  const hasActiveFilters = Boolean(searchValue) || filters.some((filter) => values[filter.name]);

  return (
    <div className="flex flex-col gap-2.5 border-b border-line p-3 md:flex-row md:items-center">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(search.trim());
        }}
        className="relative flex-1"
        role="search"
      >
        <label htmlFor="search" className="sr-only">
          Search
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
        <input
          id="search"
          type="search"
          className="input pl-9"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </form>
      <div className="grid grid-cols-2 gap-2.5 md:flex">
        {filters.map((filter) => (
          <div key={filter.name} className="md:w-40">
            <label htmlFor={`filter-${filter.name}`} className="sr-only">
              {filter.label}
            </label>
            <SelectInput
              id={`filter-${filter.name}`}
              options={filter.options}
              placeholder={`All ${filter.label.toLowerCase()}`}
              value={values[filter.name] || ''}
              onChange={(event) => onFilterChange(filter.name, event.target.value)}
            />
          </div>
        ))}
      </div>
      {(resultLabel || hasActiveFilters) && (
        <div className="flex items-center justify-between gap-2 md:justify-end">
          {resultLabel && <span className="text-xs whitespace-nowrap text-muted tabular-nums" aria-live="polite">{resultLabel}</span>}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" icon={X} onClick={onClear}>
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
