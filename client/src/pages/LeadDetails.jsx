import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRightLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  Building2,
  Briefcase,
  IndianRupee,
  ListPlus,
  Loader2,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Gauge,
  Send,
  Tag,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';

import StatusBadge from '../components/common/StatusBadge.jsx';
import PriorityBadge from '../components/common/PriorityBadge.jsx';
import ScoreBadge from '../components/common/ScoreBadge.jsx';
import LoadingSkeleton from '../components/common/LoadingSkeleton.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import LeadForm from '../components/leads/LeadForm.jsx';
import TaskForm from '../components/tasks/TaskForm.jsx';
import TaskItem from '../components/tasks/TaskItem.jsx';
import { useToast } from '../components/common/Toast.jsx';
import useLeadDetails from '../hooks/useLeadDetails.js';
import {
  addLeadNote,
  deleteLead,
  fetchLeads,
  updateLead,
} from '../services/leadService.js';
import { completeTask, createTask, fetchTasks } from '../services/taskService.js';
import { getApiErrorMessage } from '../services/api.js';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  toDateInput,
} from '../utils/formatDate.js';

const ACTION_META = {
  created: { icon: UserPlus, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300' },
  updated: { icon: Pencil, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  status_changed: { icon: ArrowRightLeft, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300' },
  deleted: { icon: Trash2, tone: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300' },
  note_added: { icon: MessageSquare, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300' },
  followup_scheduled: { icon: CalendarClock, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' },
  imported: { icon: Upload, tone: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300' },
  task_created: { icon: ListPlus, tone: 'bg-brand-50 text-brand-600 dark:bg-slate-800 dark:text-brand-300' },
  task_completed: { icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' },
};

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <div className="break-words text-sm text-ink">{children || '—'}</div>
      </div>
    </div>
  );
}

export default function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { lead, activities, loading, error, refetch } = useLeadDetails(id);

  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [followUpBusy, setFollowUpBusy] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [leadOptions, setLeadOptions] = useState([]);
  const [taskBusyId, setTaskBusyId] = useState(null);

  useEffect(() => {
    setFollowUp(lead ? toDateInput(lead.nextFollowUpAt) : '');
  }, [lead]);

  const loadTasks = useCallback(async () => {
    if (!id) return;
    try {
      const response = await fetchTasks({ lead: id, limit: 20 });
      setTasks(response.data || []);
    } catch {
      setTasks([]);
    }
  }, [id]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    fetchLeads({ limit: 100, sort: 'newest' })
      .then((response) => setLeadOptions(response.data || []))
      .catch(() => setLeadOptions([]));
  }, []);

  const handleEdit = async (payload) => {
    await updateLead(id, payload);
    setEditing(false);
    toast.success('Lead updated');
    refetch();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteLead(id);
      toast.success(`“${lead.name}” was deleted`);
      navigate('/leads');
    } catch (deleteError) {
      toast.error(getApiErrorMessage(deleteError));
      setDeleting(false);
    }
  };

  const handleAddNote = async (event) => {
    event.preventDefault();
    if (!noteText.trim() || noteBusy) return;
    setNoteBusy(true);
    try {
      await addLeadNote(id, noteText.trim());
      setNoteText('');
      toast.success('Note added');
      refetch();
    } catch (noteError) {
      toast.error(getApiErrorMessage(noteError));
    } finally {
      setNoteBusy(false);
    }
  };

  const handleFollowUp = async () => {
    setFollowUpBusy(true);
    try {
      await updateLead(id, {
        nextFollowUpAt: followUp ? new Date(`${followUp}T00:00:00.000Z`).toISOString() : null,
      });
      toast.success(followUp ? 'Follow-up scheduled' : 'Follow-up cleared');
      refetch();
    } catch (followUpError) {
      toast.error(getApiErrorMessage(followUpError));
    } finally {
      setFollowUpBusy(false);
    }
  };

  const handleCreateTask = async (payload) => {
    await createTask({ ...payload, lead: payload.lead || id });
    setTaskFormOpen(false);
    toast.success('Task created');
    loadTasks();
    refetch();
  };

  const handleToggleTask = async (task, completed) => {
    setTaskBusyId(task.id);
    try {
      await completeTask(task.id, completed ?? task.status !== 'Completed');
      loadTasks();
      refetch();
    } catch (taskError) {
      toast.error(getApiErrorMessage(taskError));
    } finally {
      setTaskBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card p-5 lg:col-span-2">
            <LoadingSkeleton variant="list" rows={5} />
          </div>
          <div className="card p-5">
            <LoadingSkeleton variant="list" rows={4} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="card">
        <ErrorState
          title="Couldn’t load this lead"
          message={error || 'This lead may have been deleted.'}
          onRetry={refetch}
        />
        <div className="flex justify-center pb-8">
          <Link to="/leads" className="btn-secondary">
            <ArrowLeft size={15} />
            Back to leads
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            to="/leads"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink"
          >
            <ArrowLeft size={13} />
            All leads
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-semibold tracking-tight text-ink sm:text-2xl">{lead.name}</h2>
            <StatusBadge status={lead.status} />
            <PriorityBadge priority={lead.priority} />
            <ScoreBadge score={lead.score} band={lead.scoreBand} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {lead.jobTitle ? `${lead.jobTitle} · ` : ''}
            {lead.company}
          </p>
        </div>

        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
            <Pencil size={15} />
            Edit
          </button>
          <button type="button" className="btn-danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="card p-5" aria-labelledby="contact-heading">
            <h3 id="contact-heading" className="text-sm font-semibold text-ink">
              Contact information
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-x-6 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
              <div>
                <InfoRow icon={Mail} label="Email">
                  <a href={`mailto:${lead.email}`} className="text-brand-600 hover:underline">
                    {lead.email}
                  </a>
                </InfoRow>
                <InfoRow icon={Phone} label="Phone">
                  <a href={`tel:${lead.phone}`} className="hover:underline">
                    {lead.phone}
                  </a>
                </InfoRow>
                <InfoRow icon={Building2} label="Company">
                  {lead.company}
                </InfoRow>
                <InfoRow icon={Briefcase} label="Job title">
                  {lead.jobTitle}
                </InfoRow>
              </div>
              <div>
                <InfoRow icon={Tag} label="Source">
                  {lead.source}
                </InfoRow>
                <InfoRow icon={IndianRupee} label="Estimated value">
                  {formatCurrency(lead.estimatedValue)}
                </InfoRow>
                <InfoRow icon={Clock} label="Last contacted">
                  {formatDate(lead.lastContactedAt)}
                </InfoRow>
                <InfoRow icon={CalendarClock} label="Created / updated">
                  {formatDate(lead.createdAt)} · {formatDate(lead.updatedAt)}
                </InfoRow>
              </div>
            </div>

            {lead.description ? (
              <div className="mt-3 border-t border-line pt-3">
                <p className="text-xs text-muted">Description</p>
                <p className="mt-1 whitespace-pre-line text-sm text-ink">{lead.description}</p>
              </div>
            ) : null}

            {lead.tags?.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                {lead.tags.map((tag) => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="card p-5" aria-labelledby="followup-heading">
            <h3 id="followup-heading" className="text-sm font-semibold text-ink">
              Follow-up
            </h3>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="follow-up-date" className="label">
                  Next follow-up date
                </label>
                <input
                  id="follow-up-date"
                  type="date"
                  value={followUp}
                  onChange={(event) => setFollowUp(event.target.value)}
                  className="input"
                />
              </div>
              <button type="button" className="btn-primary" onClick={handleFollowUp} disabled={followUpBusy}>
                {followUpBusy ? <Loader2 size={15} className="animate-spin" /> : null}
                Save follow-up
              </button>
              <button type="button" className="btn-secondary" onClick={() => setTaskFormOpen(true)}>
                <Plus size={15} />
                Add task
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Scheduling a follow-up is recorded in the activity timeline below.
            </p>
          </section>

          <section className="card" aria-labelledby="notes-heading">
            <div className="border-b border-line px-5 py-4">
              <h3 id="notes-heading" className="text-sm font-semibold text-ink">
                Notes ({lead.notes?.length || 0})
              </h3>
            </div>

            <div className="px-5 py-4">
              <form onSubmit={handleAddNote} className="flex flex-col gap-2 sm:flex-row">
                <label className="sr-only" htmlFor="note-input">
                  Add a note
                </label>
                <input
                  id="note-input"
                  type="text"
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  placeholder="Add a note about this lead…"
                  className="input flex-1"
                  maxLength={2000}
                />
                <button type="submit" className="btn-primary" disabled={noteBusy || !noteText.trim()}>
                  {noteBusy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Add note
                </button>
              </form>

              {lead.notes?.length ? (
                <ul className="mt-4 space-y-3">
                  {[...lead.notes].reverse().map((note) => (
                    <li key={note._id || note.id} className="rounded-lg border border-line bg-surface px-3 py-2.5">
                      <p className="text-sm text-ink">{note.text}</p>
                      <p className="mt-1 text-[11px] text-muted">{formatDateTime(note.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted">No notes yet.</p>
              )}
            </div>
          </section>

          <section className="card" aria-labelledby="tasks-heading">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 id="tasks-heading" className="text-sm font-semibold text-ink">
                Tasks ({tasks.length})
              </h3>
              <button
                type="button"
                onClick={() => setTaskFormOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
              >
                <Plus size={13} />
                Add task
              </button>
            </div>

            {tasks.length === 0 ? (
              <EmptyState
                icon={ListPlus}
                title="No tasks for this lead"
                description="Schedule a follow-up task to keep this opportunity moving."
              />
            ) : (
              <ul className="divide-y divide-line">
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    busy={taskBusyId === task.id}
                    onToggleComplete={handleToggleTask}
                    onEdit={() => setTaskFormOpen(true)}
                    onDelete={() => toast.info('Delete tasks from the Tasks page')}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="card p-5" aria-labelledby="score-heading">
            <div className="flex items-center justify-between">
              <h3 id="score-heading" className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <Gauge size={15} />
                Lead score
              </h3>
              <ScoreBadge score={lead.score} band={lead.scoreBand} />
            </div>
            <p className="mt-1 text-xs text-muted">
              Rule-based score out of 100 — not a machine-learning prediction.
            </p>
            <ul className="mt-3 space-y-2">
              {(lead.scoreBreakdown || []).map((rule) => (
                <li key={rule.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className={rule.earned ? 'text-ink' : 'text-muted'}>
                    {rule.label}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      rule.earned ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted'
                    }`}
                  >
                    {rule.earned ? `+${rule.points}` : '0'}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card" aria-labelledby="activity-heading">
            <div className="border-b border-line px-5 py-4">
              <h3 id="activity-heading" className="text-sm font-semibold text-ink">
                Activity history
              </h3>
              <p className="mt-0.5 text-xs text-muted">Append-only audit trail</p>
            </div>

            {activities.length === 0 ? (
              <EmptyState icon={Clock} title="No activity yet" />
            ) : (
              <ol className="max-h-[560px] overflow-y-auto px-5 py-4">
                {activities.map((activity, index) => {
                  const meta = ACTION_META[activity.action] || ACTION_META.updated;
                  const Icon = meta.icon;
                  return (
                    <li key={activity.id} className="relative flex gap-3 pb-4">
                      {index < activities.length - 1 ? (
                        <span
                          className="absolute left-[15px] top-8 h-full w-px bg-line"
                          aria-hidden="true"
                        />
                      ) : null}
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm text-ink">{activity.description}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {formatDateTime(activity.createdAt)} · {activity.actor || 'system'}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>

      <LeadForm
        open={editing}
        mode="edit"
        lead={lead}
        onClose={() => setEditing(false)}
        onSubmit={handleEdit}
      />

      <TaskForm
        open={taskFormOpen}
        mode="create"
        leads={leadOptions}
        defaultLeadId={lead.id}
        onClose={() => setTaskFormOpen(false)}
        onSubmit={handleCreateTask}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete lead"
        confirmLabel="Delete lead"
        submitting={deleting}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        description={`This will permanently delete ${lead.name} (${lead.company}).`}
      />
    </div>
  );
}
