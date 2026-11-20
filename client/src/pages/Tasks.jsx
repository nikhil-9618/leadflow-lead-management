import { useCallback, useMemo, useState } from 'react';
import { CalendarCheck2, ListChecks, Plus } from 'lucide-react';

import TaskForm from '../components/tasks/TaskForm.jsx';
import TaskItem from '../components/tasks/TaskItem.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import LoadingSkeleton from '../components/common/LoadingSkeleton.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import { useToast } from '../components/common/Toast.jsx';
import useTasks from '../hooks/useTasks.js';
import { fetchLeads } from '../services/leadService.js';
import { completeTask, createTask, deleteTask, updateTask } from '../services/taskService.js';
import { getApiErrorMessage } from '../services/api.js';
import { useEffect } from 'react';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'open', label: 'Open' },
];

export default function Tasks() {
  const toast = useToast();
  const [scope, setScope] = useState('all');
  const [formState, setFormState] = useState({ open: false, task: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [leadOptions, setLeadOptions] = useState([]);

  const params = useMemo(() => ({ scope, limit: 50 }), [scope]);
  const { tasks, counts, loading, error, refetch } = useTasks(params);

  // Lead options for the "related lead" select.
  const loadLeads = useCallback(async () => {
    try {
      const response = await fetchLeads({ limit: 100, sort: 'newest' });
      setLeadOptions(response.data || []);
    } catch {
      setLeadOptions([]);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleSubmit = async (payload) => {
    const editing = formState.task;
    if (editing) {
      await updateTask(editing.id, payload);
      toast.success('Task updated');
    } else {
      await createTask(payload);
      toast.success('Task created');
    }
    setFormState({ open: false, task: null });
    refetch();
  };

  const handleToggleComplete = async (task, completed) => {
    setBusyId(task.id);
    try {
      await completeTask(task.id, completed ?? task.status !== 'Completed');
      toast.success(completed === false || task.status === 'Completed' ? 'Task reopened' : 'Task completed');
      refetch();
    } catch (toggleError) {
      toast.error(getApiErrorMessage(toggleError));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTask(deleteTarget.id);
      toast.success('Task deleted');
      setDeleteTarget(null);
      refetch();
    } catch (deleteError) {
      toast.error(getApiErrorMessage(deleteError));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Tasks &amp; follow-ups</h2>
          <p className="mt-1 text-sm text-muted">Track what needs to happen next, tied to your leads.</p>
        </div>
        <button
          type="button"
          onClick={() => setFormState({ open: true, task: null })}
          className="btn-primary w-full sm:w-auto"
        >
          <Plus size={16} />
          New task
        </button>
      </div>

      <div className="card p-2">
        <div className="scrollbar-thin flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            // "All" has no meaningful badge; the scoped tabs show their own counts.
            const count = counts[tab.key];
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setScope(tab.key)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  scope === tab.key
                    ? 'bg-brand-600 text-white'
                    : 'text-muted hover:bg-slate-50 hover:text-ink dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
                {typeof count === 'number' ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                      scope === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <h3 className="text-sm font-semibold text-ink">
            {TABS.find((tab) => tab.key === scope)?.label} tasks
          </h3>
          <span className="text-xs text-muted">{loading ? 'Loading…' : `${tasks.length} shown`}</span>
        </div>

        {loading ? (
          <LoadingSkeleton variant="list" rows={5} />
        ) : error ? (
          <ErrorState title="Couldn’t load tasks" message={error} onRetry={refetch} />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={scope === 'today' ? CalendarCheck2 : ListChecks}
            title={scope === 'all' ? 'No tasks yet' : `No ${scope} tasks`}
            description="Create a follow-up task and keep your pipeline moving."
            action={
              <button type="button" onClick={() => setFormState({ open: true, task: null })} className="btn-primary">
                <Plus size={16} />
                New task
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                busy={busyId === task.id}
                onToggleComplete={handleToggleComplete}
                onEdit={(entry) => setFormState({ open: true, task: entry })}
                onDelete={setDeleteTarget}
              />
            ))}
          </ul>
        )}
      </div>

      <TaskForm
        open={formState.open}
        mode={formState.task ? 'edit' : 'create'}
        task={formState.task}
        leads={leadOptions}
        onClose={() => setFormState({ open: false, task: null })}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete task"
        confirmLabel="Delete task"
        submitting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        description={`Delete “${deleteTarget?.title || ''}”?`}
      />
    </div>
  );
}
