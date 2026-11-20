import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTasks } from '../services/taskService';
import { getApiErrorMessage } from '../services/api';

const emptyPagination = { total: 0, page: 1, limit: 25, totalPages: 1 };

/** Task list with per-scope counters (today / upcoming / overdue / open). */
export default function useTasks(params = {}) {
  const [tasks, setTasks] = useState([]);
  const [counts, setCounts] = useState({ today: 0, upcoming: 0, overdue: 0, open: 0 });
  const [pagination, setPagination] = useState(emptyPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);

    fetchTasks(JSON.parse(paramsKey), { signal: controller.signal })
      .then((response) => {
        if (!active) return;
        setTasks(response.data || []);
        setCounts(response.counts || { today: 0, upcoming: 0, overdue: 0, open: 0 });
        setPagination(response.pagination || emptyPagination);
      })
      .catch((err) => {
        if (!active || err.code === 'ERR_CANCELED') return;
        setError(getApiErrorMessage(err));
        setTasks([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [paramsKey, reloadToken]);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  return { tasks, counts, pagination, loading, error, refetch };
}
