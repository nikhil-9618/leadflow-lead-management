import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  FilterX,
  Loader2,
  Plus,
  RefreshCw,
  SearchX,
  Upload,
  Users,
  X,
} from 'lucide-react';

import LeadTable from '../components/leads/LeadTable.jsx';
import LeadForm from '../components/leads/LeadForm.jsx';
import DeleteConfirmation from '../components/leads/DeleteConfirmation.jsx';
import ExportMenu from '../components/leads/ExportMenu.jsx';
import ImportModal from '../components/leads/ImportModal.jsx';
import SearchBar from '../components/common/SearchBar.jsx';
import Pagination from '../components/common/Pagination.jsx';
import LoadingSkeleton from '../components/common/LoadingSkeleton.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import { useToast } from '../components/common/Toast.jsx';
import useLeads from '../hooks/useLeads.js';
import {
  createLead,
  deleteLead,
  exportLeadsCsv,
  updateLead,
} from '../services/leadService.js';
import { getApiErrorMessage } from '../services/api.js';
import { PRIORITIES, SOURCES, STATUSES } from '../validations/leadSchema.js';

const LIMIT = 10;

export default function Leads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const filters = useMemo(
    () => ({
      search: searchParams.get('search') || '',
      status: searchParams.get('status') || '',
      source: searchParams.get('source') || '',
      priority: searchParams.get('priority') || '',
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
      sort: searchParams.get('sort') || 'newest',
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || LIMIT,
    }),
    [searchParams]
  );

  const { leads, pagination, loading, error, refetch } = useLeads(filters);

  const [searchInput, setSearchInput] = useState(filters.search);
  const [formState, setFormState] = useState({ open: false, lead: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const handledNewParam = useRef(false);

  const updateParams = useCallback(
    (patch) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === '' || value === null || value === undefined) next.delete(key);
        else next.set(key, String(value));
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    if (searchInput === filters.search) return undefined;
    const timer = setTimeout(() => {
      updateParams({ search: searchInput.trim(), page: null });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search, updateParams]);

  useEffect(() => {
    if (searchParams.get('new') === '1' && !handledNewParam.current) {
      handledNewParam.current = true;
      setFormState({ open: true, lead: null });
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Selection is page-scoped: changing filters clears it.
  useEffect(() => {
    setSelected([]);
  }, [filters.status, filters.source, filters.priority, filters.search, filters.page, filters.sort]);

  const hasActiveFilters =
    Boolean(filters.search || filters.status || filters.source || filters.priority || filters.dateFrom || filters.dateTo) ||
    filters.sort !== 'newest';

  const resetFilters = () => {
    setSearchInput('');
    setSearchParams({}, { replace: true });
  };

  const openCreate = () => setFormState({ open: true, lead: null });
  const openEdit = (lead) => setFormState({ open: true, lead });
  const closeForm = () => setFormState({ open: false, lead: null });

  const handleSubmit = async (payload) => {
    const editing = formState.lead;

    if (editing) {
      await updateLead(editing.id, payload);
      closeForm();
      toast.success(`“${payload.name}” was updated`);
    } else {
      await createLead(payload);
      closeForm();
      toast.success(`“${payload.name}” was added to your pipeline`);
      updateParams({ page: null });
    }

    refetch();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLead(deleteTarget.id);
      toast.success(`“${deleteTarget.name}” was deleted`);
      setDeleteTarget(null);
      if (leads.length === 1 && filters.page > 1) {
        updateParams({ page: filters.page - 1 });
      } else {
        refetch();
      }
    } catch (deleteError) {
      toast.error(getApiErrorMessage(deleteError));
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async (mode) => {
    try {
      const params =
        mode === 'selected'
          ? { ids: selected.join(',') }
          : mode === 'filtered'
            ? {
                search: filters.search,
                status: filters.status,
                source: filters.source,
                priority: filters.priority,
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
                sort: filters.sort,
              }
            : {};
      const count = await exportLeadsCsv(params);
      toast.success(`Exported ${count} lead${count === 1 ? '' : 's'} to CSV`);
    } catch (exportError) {
      toast.error(getApiErrorMessage(exportError));
    }
  };

  const toggleSelect = (id) => {
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  };

  const toggleAll = (ids) => {
    setSelected((current) => (ids.every((id) => current.includes(id)) ? [] : ids));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">All leads</h2>
          <p className="mt-1 text-sm text-muted">Search, filter and manage every contact in one place.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => setImportOpen(true)} className="btn-secondary w-full sm:w-auto">
            <Upload size={16} />
            Import CSV
          </button>
          <ExportMenu
            onExport={handleExport}
            selectedCount={selected.length}
            filteredCount={pagination.total}
          />
          <button type="button" onClick={openCreate} className="btn-primary w-full sm:w-auto">
            <Plus size={16} />
            Add Lead
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="sm:col-span-2">
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onClear={() => {
                setSearchInput('');
                updateParams({ search: null, page: null });
              }}
              placeholder="Search name, email, phone or company…"
              label="Search leads"
            />
          </div>

          <select
            aria-label="Filter by status"
            value={filters.status}
            onChange={(event) => updateParams({ status: event.target.value, page: null })}
            className="input py-2.5"
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by source"
            value={filters.source}
            onChange={(event) => updateParams({ source: event.target.value, page: null })}
            className="input py-2.5"
          >
            <option value="">All sources</option>
            {SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by priority"
            value={filters.priority}
            onChange={(event) => updateParams({ priority: event.target.value, page: null })}
            className="input py-2.5"
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort leads"
            value={filters.sort}
            onChange={(event) => updateParams({ sort: event.target.value, page: null })}
            className="input py-2.5"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="score">Highest score</option>
            <option value="name">Name A–Z</option>
          </select>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label htmlFor="filter-from" className="sr-only">
                Created from
              </label>
              <input
                id="filter-from"
                type="date"
                aria-label="Created from"
                value={filters.dateFrom}
                onChange={(event) => updateParams({ dateFrom: event.target.value, page: null })}
                className="input py-2.5 text-xs"
              />
            </div>
            <span className="text-xs text-muted">to</span>
            <div className="flex-1">
              <label htmlFor="filter-to" className="sr-only">
                Created to
              </label>
              <input
                id="filter-to"
                type="date"
                aria-label="Created to"
                value={filters.dateTo}
                onChange={(event) => updateParams({ dateTo: event.target.value, page: null })}
                className="input py-2.5 text-xs"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="btn-secondary py-2.5"
          >
            <FilterX size={15} />
            Reset filters
          </button>
        </div>

        {hasActiveFilters ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs text-muted">
            <span className="font-medium text-ink">Active filters:</span>
            {filters.search ? (
              <span className="rounded-md bg-brand-50 px-2 py-1 font-medium text-brand-700 dark:bg-slate-800 dark:text-brand-200">
                Search: “{filters.search}”
              </span>
            ) : null}
            {filters.status ? (
              <span className="rounded-md bg-brand-50 px-2 py-1 font-medium text-brand-700 dark:bg-slate-800 dark:text-brand-200">
                Status: {filters.status}
              </span>
            ) : null}
            {filters.source ? (
              <span className="rounded-md bg-brand-50 px-2 py-1 font-medium text-brand-700 dark:bg-slate-800 dark:text-brand-200">
                Source: {filters.source}
              </span>
            ) : null}
            {filters.priority ? (
              <span className="rounded-md bg-brand-50 px-2 py-1 font-medium text-brand-700 dark:bg-slate-800 dark:text-brand-200">
                Priority: {filters.priority}
              </span>
            ) : null}
            {filters.dateFrom || filters.dateTo ? (
              <span className="rounded-md bg-brand-50 px-2 py-1 font-medium text-brand-700 dark:bg-slate-800 dark:text-brand-200">
                Created: {filters.dateFrom || '…'} → {filters.dateTo || '…'}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-700 dark:border-brand-700 dark:bg-slate-800 dark:text-brand-200">
          <span className="font-medium">{selected.length} selected</span>
          <button type="button" onClick={() => handleExport('selected')} className="underline">
            Export selection
          </button>
          <button
            type="button"
            onClick={() => setSelected([])}
            className="ml-auto inline-flex items-center gap-1 text-xs"
          >
            <X size={13} /> Clear
          </button>
        </div>
      ) : null}

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <h3 className="text-sm font-semibold text-ink">Leads</h3>
          <span className="text-xs text-muted">
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin" /> Loading…
              </span>
            ) : (
              `${pagination.total} result${pagination.total === 1 ? '' : 's'}`
            )}
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton rows={6} />
        ) : error ? (
          <ErrorState title="Couldn’t load leads" message={error} onRetry={refetch} />
        ) : leads.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              icon={SearchX}
              title="No leads match your filters"
              description="Try a different search term or clear the filters to see everything."
              action={
                <button type="button" onClick={resetFilters} className="btn-secondary">
                  <FilterX size={15} />
                  Reset filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No leads yet"
              description="Add your first lead or import a CSV to get started."
              action={
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={openCreate} className="btn-primary">
                    <Plus size={16} />
                    Add your first lead
                  </button>
                  <button type="button" onClick={() => setImportOpen(true)} className="btn-secondary">
                    <Upload size={16} />
                    Import CSV
                  </button>
                </div>
              }
            />
          )
        ) : (
          <>
            <LeadTable
              leads={leads}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              busy={deleting}
              selected={selected}
              onToggleSelect={toggleSelect}
              onToggleAll={toggleAll}
            />
            <Pagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={(page) => updateParams({ page })}
            />
          </>
        )}
      </div>

      <LeadForm
        open={formState.open}
        mode={formState.lead ? 'edit' : 'create'}
        lead={formState.lead}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmation
        open={Boolean(deleteTarget)}
        lead={deleteTarget}
        submitting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          refetch();
          updateParams({ page: null });
        }}
      />
    </div>
  );
}
