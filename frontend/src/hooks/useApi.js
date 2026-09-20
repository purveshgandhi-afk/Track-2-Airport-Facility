/**
 * useApi — generic data-fetching hook.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi('/api/dashboard/summary');
 *   const { data } = useApi('/api/incidents', { status: 'OPEN', limit: 50 });
 *
 * @param {string}  endpoint       - API path, e.g. '/api/dashboard/summary'
 * @param {object}  [params]       - URL query params
 * @param {number}  [interval]     - Auto-refresh interval in ms (default: 30000)
 *                                   Pass 0 to disable polling.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';

const DEFAULT_INTERVAL = 30_000; // 30 seconds

export function useApi(endpoint, params = {}, interval = DEFAULT_INTERVAL) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const abortRef              = useRef(null);

  // Stable serialised params so the fetch effect reruns only when params change
  const paramsKey = JSON.stringify(params);

  const fetchData = useCallback(async (signal) => {
    try {
      const response = await api.get(endpoint, {
        params,
        signal,
      });
      setData(response.data);
      setError(null);
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, paramsKey]);

  const refetch = useCallback(() => {
    setLoading(true);
    const controller = new AbortController();
    fetchData(controller.signal);
  }, [fetchData]);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    fetchData(controller.signal);

    let timerId;
    if (interval > 0) {
      timerId = setInterval(() => {
        fetchData(controller.signal);
      }, interval);
    }

    return () => {
      controller.abort();
      if (timerId) clearInterval(timerId);
    };
  }, [fetchData, interval]);

  return { data, loading, error, refetch };
}
