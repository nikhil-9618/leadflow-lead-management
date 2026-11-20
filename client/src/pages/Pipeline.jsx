import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Columns3, FilterX, Plus, RefreshCw } from 'lucide-react';

import KanbanBoard from '../components/pipeline/KanbanBoard.jsx';
import SearchBar from '../components/common/SearchBar.jsx';
import LoadingSkeleton from '../components/common/LoadingSkeleton.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useToast } from '../components/common/Toast.jsx';
import useLeads from '../hooks/useLeads.js';
import { updateLeadStatus } from '../services/leadService.js';
import { getApiErrorMessage } from '../services/api.js';
import { PRIORITIES, SOURCES } from '../validations/leadSchema.js';

export default function Pipeline() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [source, setSource] = useState('');
  const [priority, setPriority] = useState('');
  const [movingId, setMovingId] = useState(null);

  // Optimistic status overrides, cleared once the server confirms.
  const [overrides, setOverrides] = useState({});

  const filters = useMemo(
    () => ({ limit: 100, sort: 'newest', search: debounced, source, priority }),
    [debounced, source, priority]
  );

  const { leads, loading, error, refetch } = useLeads(filters);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const displayed = leads.map((lead) => ({ ...lead, status: overrides[lead.id] || lead.status }));
  const hasFilters = Boolean(search || source || priority);

  const handleMove = async (id, status) => {
    const lead = leads.find((item) => item.id === id);
    if (!lead || (overrides[id] || lead.status) === status) return;

    setOverrides((current) => ({ ...current, [id]: status }));
    setMovingId(id);

    try {
      await updateLeadStatus(id, status);
      toast.success(`“${lead.name}” moved to ${status}`);
      // Keep the override until the refetched list arrives, then drop it.
      refetch();
      setTimeout(() => {
        setOverrides((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
      }, 600);
    } catch (moveError) {
      setOverrides((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      toast.error(getApiErrorMessage(moveError));
    } finally {
      setMovingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Pipeline</h2>
          <p className="mt-1 text-sm text-muted">
            Drag a card to another stage to update its status and record the change.
          </p>
        </div>
        <Link to="/leads?new=1" className="btn-primary w-full sm:w-auto">
          <Plus size={16} />
          Add Lead
        </Link>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="sm:col-span-2">
            <SearchBar
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Search pipeline by name, email, phone, company…"
              label="Search pipeline"
            />
          </div>

          <select
            aria-label="Filter pipeline by source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="input py-2.5"
          >
            <option value="">All sources</option>
            {SOURCES.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter pipeline by priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="input py-2.5"
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>

        {hasFilters ? (
          <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-xs text-muted">
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSource('');
                setPriority('');
              }}
              className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"
            >
              <FilterX size={13} />
              Clear filters
            </button>
            <span>Showing {displayed.length} matching leads</span>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <AlertCircle size={18} className="shrink-0" />
          <p className="flex-1">{error}</p>
          <button type="button" onClick={refetch} className="btn-secondary shrink-0 py-2">
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <LoadingSkeleton variant="kanban" />
      ) : displayed.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Columns3}
            title={hasFilters ? 'No leads match these filters' : 'Your pipeline is empty'}
            description={
              hasFilters
                ? 'Clear the filters to see every stage again.'
                : 'Add a lead to see it appear in the New stage.'
            }
            action={
              hasFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setSource('');
                    setPriority('');
                  }}
                  className="btn-secondary"
                >
                  <FilterX size={15} />
                  Clear filters
                </button>
              ) : (
                <Link to="/leads?new=1" className="btn-primary">
                  <Plus size={16} />
                  Add your first lead
                </Link>
              )
            }
          />
        </div>
      ) : (
        <KanbanBoard leads={displayed} onMove={handleMove} movingId={movingId} />
      )}

      <p className="text-xs text-muted">
        Showing up to 100 leads. Use the leads table for full search, filters and pagination.
      </p>
    </div>
  );
}
