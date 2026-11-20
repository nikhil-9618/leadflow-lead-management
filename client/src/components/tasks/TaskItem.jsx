import { Link } from 'react-router-dom';
import { CalendarClock, Check, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import PriorityBadge from '../common/PriorityBadge.jsx';
import { describeDueDate, formatDate } from '../../utils/formatDate.js';

const statusStyles = {
  Pending: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'In Progress': 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  Completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export default function TaskItem({ task, onToggleComplete, onEdit, onDelete, busy = false }) {
  const isCompleted = task.status === 'Completed';
  const isOverdue = !isCompleted && task.status !== 'Cancelled' && new Date(task.dueDate) < new Date(new Date().toDateString());

  return (
    <li className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
      <button
        type="button"
        onClick={() => onToggleComplete(task)}
        disabled={busy}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
          isCompleted
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-line bg-card text-transparent hover:border-brand-500'
        } disabled:opacity-50`}
        aria-label={isCompleted ? `Reopen task ${task.title}` : `Complete task ${task.title}`}
      >
        {isCompleted ? <Check size={13} /> : <Check size={13} className="opacity-0" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-medium ${isCompleted ? 'text-muted line-through' : 'text-ink'}`}>
            {task.title}
          </p>
          <PriorityBadge priority={task.priority} showIcon={false} />
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyles[task.status] || ''}`}>
            {task.status}
          </span>
          {isOverdue ? (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
              Overdue
            </span>
          ) : null}
        </div>

        {task.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted">{task.description}</p>
        ) : null}

        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarClock size={12} />
            {formatDate(task.dueDate)}
            {task.dueTime ? ` · ${task.dueTime}` : ''}
            {!isCompleted ? ` (${describeDueDate(task.dueDate)})` : ''}
          </span>
          {task.lead ? (
            <Link to={`/leads/${task.lead.id || task.lead}`} className="text-brand-600 hover:underline">
              {task.lead.name || 'View lead'}
            </Link>
          ) : (
            <span className="text-muted/80">No lead</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onToggleComplete(task, !isCompleted)}
          disabled={busy}
          className="rounded-lg p-2 text-muted transition hover:bg-slate-100 hover:text-ink disabled:opacity-50 dark:hover:bg-slate-800"
          aria-label={isCompleted ? 'Reopen task' : 'Mark task complete'}
          title={isCompleted ? 'Reopen task' : 'Mark complete'}
        >
          {isCompleted ? <RotateCcw size={15} /> : <Check size={15} />}
        </button>
        <button
          type="button"
          onClick={() => onEdit(task)}
          disabled={busy}
          className="rounded-lg p-2 text-muted transition hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50 dark:hover:bg-slate-800"
          aria-label={`Edit task ${task.title}`}
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task)}
          disabled={busy}
          className="rounded-lg p-2 text-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950"
          aria-label={`Delete task ${task.title}`}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </li>
  );
}
