import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../services/api.js';

// Loads data from a GET endpoint and reloads whenever the URL or params change.
export function useApi(url, params) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const paramsKey = JSON.stringify(params || {});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(url, { params: JSON.parse(paramsKey) });
      setData(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [url, paramsKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
