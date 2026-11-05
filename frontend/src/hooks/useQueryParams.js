import { useSearchParams } from 'react-router';

// Keeps list filters in the URL so they survive a page refresh.
export function useQueryParams(defaults = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const values = { ...defaults, ...Object.fromEntries(searchParams.entries()) };

  function update(changes) {
    const next = { ...values, ...changes };
    if (!('page' in changes)) next.page = '1';
    const cleaned = Object.fromEntries(Object.entries(next).filter(([, value]) => value !== '' && value !== undefined));
    setSearchParams(cleaned);
  }

  return [values, update];
}
