import { useState } from 'react';
import { SelectInput } from './FormField.jsx';

// Search box plus dropdown filters. `filters` is a list of { name, label, options }.
export default function FilterBar({ searchValue, onSearch, filters, values, onFilterChange, searchPlaceholder }) {
  const [search, setSearch] = useState(searchValue || '');

  function handleSubmit(event) {
    event.preventDefault();
    onSearch(search.trim());
  }

  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center">
      <form onSubmit={handleSubmit} className="flex flex-1 gap-2" role="search">
        <label htmlFor="search" className="sr-only">
          Search
        </label>
        <input
          id="search"
          type="search"
          className="input"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button type="submit" className="rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50">
          Search
        </button>
      </form>
      {filters.map((filter) => (
        <div key={filter.name} className="md:w-44">
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
  );
}
