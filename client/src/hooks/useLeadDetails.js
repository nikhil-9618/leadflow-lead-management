import { useCallback, useEffect, useState } from 'react';
import { fetchLeadActivities, fetchLeadById } from '../services/leadService';
import { getApiErrorMessage } from '../services/api';

/** Loads one lead and its audit timeline together. */
export default function useLeadDetails(id) {
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!id) return undefined;
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchLeadById(id, { signal: controller.signal }),
      fetchLeadActivities(id, { signal: controller.signal }),
    ])
      .then(([leadData, activityData]) => {
        if (!active) return;
        setLead(leadData);
        setActivities(activityData);
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
  }, [id, reloadToken]);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  return { lead, activities, loading, error, refetch, setLead };
}
