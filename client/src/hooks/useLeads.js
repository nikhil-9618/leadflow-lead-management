import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchLeads } from '../services/leadService';
import { getApiErrorMessage } from '../services/api';

const emptyPagination = { total: 0, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPrevPage: false };

/**
 * Owns the leads list state: fetching, pagination metadata, loading and errors.
 * Requests are cancelled when filters change so stale responses never win.
 */
export default function useLeads(filters, { enabled = true } = {}) {
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const controllerRef = useRef(null);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    if (!enabled) return undefined;

    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;

    let active = true;
    setLoading(true);
    setError(null);

    fetchLeads(JSON.parse(filterKey), { signal: controller.signal })
      .then((response) => {
        if (!active) return;
        setLeads(response.data || []);
        setPagination(response.pagination || emptyPagination);
      })
      .catch((err) => {
        if (!active || err.code === 'ERR_CANCELED') return;
        setError(getApiErrorMessage(err));
        setLeads([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [filterKey, reloadToken, enabled]);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  return { leads, pagination, loading, error, refetch };
}
