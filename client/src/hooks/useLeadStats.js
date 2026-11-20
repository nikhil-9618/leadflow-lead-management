import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchLeadStats } from '../services/leadService';
import { getApiErrorMessage } from '../services/api';

export const emptyStats = {
  total: 0,
  new: 0,
  contacted: 0,
  qualified: 0,
  lost: 0,
  createdThisMonth: 0,
  conversionRate: 0,
  totalEstimatedValue: 0,
  charts: { byStatus: [], bySource: [], byPriority: [], dailyTrend: [], monthlyTrend: [] },
  recentLeads: [],
};

/** Loads dashboard statistics (optionally date-filtered) from the API. */
export default function useLeadStats(params = {}) {
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const controllerRef = useRef(null);
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;

    let active = true;
    setLoading(true);
    setError(null);

    fetchLeadStats(JSON.parse(paramsKey), { signal: controller.signal })
      .then((data) => {
        if (!active) return;
        setStats({
          ...emptyStats,
          ...data,
          charts: { ...emptyStats.charts, ...(data.charts || {}) },
        });
      })
      .catch((err) => {
        if (!active || err.code === 'ERR_CANCELED') return;
        setError(getApiErrorMessage(err));
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

  return { stats, loading, error, refetch };
}
