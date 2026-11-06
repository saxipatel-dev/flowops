import { useCallback, useEffect, useRef, useState } from 'react';
import api, { getErrorMessage } from '../services/api.js';

// Loads data from a GET endpoint and reloads whenever the URL or params change.
// While reloading, the previous data stays available so lists don't flash empty.
export function useApi(url, params) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const paramsKey = JSON.stringify(params || {});
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    // Ignore responses that arrive after a newer request (for example while typing a search).
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError('');
    try {
      const response = await api.get(url, { params: JSON.parse(paramsKey) });
      if (requestId === latestRequest.current) setData(response.data);
    } catch (err) {
      if (requestId === latestRequest.current) setError(getErrorMessage(err));
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [url, paramsKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
