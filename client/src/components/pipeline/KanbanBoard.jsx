import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, GripVertical, IndianRupee, User } from 'lucide-react';
import PriorityBadge from '../common/PriorityBadge.jsx';
import ScoreBadge from '../common/ScoreBadge.jsx';
import { describeDueDate, formatCurrency, formatDate } from '../../utils/formatDate.js';

const STAGES = [
  { status: 'New', dot: 'bg-blue-500', ring: 'ring-blue-200 dark:ring-blue-900' },
  { status: 'Contacted', dot: 'bg-amber-500', ring: 'ring-amber-200 dark:ring-amber-900' },
  { status: 'Qualified', dot: 'bg-emerald-500', ring: 'ring-emerald-200 dark:ring-emerald-900' },
  { status: 'Lost', dot: 'bg-red-500', ring: 'ring-red-200 dark:ring-red-900' },
];

function PipelineCard({ lead, onDragStart, dragging }) {
  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', lead.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart(lead.id);
      }}
      className={`group cursor-grab rounded-lg border border-line bg-card p-3 shadow-card transition active:cursor-grabbing ${
        dragging ? 'opacity-50' : 'hover:border-brand-300 dark:hover:border-brand-700'
      }`}
      aria-label={`Lead ${lead.name}, ${lead.status}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to={`/leads/${lead.id}`}
            className="block truncate text-sm font-medium text-ink hover:text-brand-600 hover:underline"
          >
            {lead.name}
          </Link>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
            <User size={11} aria-hidden="true" />
            {lead.company}
          </p>
        </div>
        <GripVertical size={14} className="shrink-0 text-muted/60" aria-hidden="true" />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={lead.priority} />
        <ScoreBadge score={lead.score} band={lead.scoreBand} compact />
        {lead.estimatedValue > 0 ? (
          <span className="inline-flex items-center gap-0.5 text-xs text-muted">
            <IndianRupee size={11} />
            {formatCurrency(lead.estimatedValue).replace('₹', '')}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
        <span>{lead.source}</span>
        {lead.nextFollowUpAt ? (
          <span className="inline-flex items-center gap-1">
            <Clock size={11} />
            {describeDueDate(lead.nextFollowUpAt)}
          </span>
        ) : (
          <span>{formatDate(lead.createdAt)}</span>
        )}
      </div>
    </article>
  );
}

export default function KanbanBoard({ leads, onMove, movingId }) {
  const [dragId, setDragId] = useState(null);
  const [overStage, setOverStage] = useState(null);

  const handleDrop = (event, status) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || dragId;
    setOverStage(null);
    setDragId(null);
    if (id) onMove(id, status);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {STAGES.map((stage) => {
        const items = leads.filter((lead) => lead.status === stage.status);
        const value = items.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0);

        return (
          <section
            key={stage.status}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setOverStage(stage.status);
            }}
            onDragLeave={() => setOverStage((current) => (current === stage.status ? null : current))}
            onDrop={(event) => handleDrop(event, stage.status)}
            className={`flex min-h-[220px] flex-col rounded-xl border bg-surface/60 p-3 transition-colors ${
              overStage === stage.status
                ? 'border-brand-500 bg-brand-50/60 dark:bg-slate-800/60'
                : 'border-line'
            }`}
            aria-label={`${stage.status} column, ${items.length} leads`}
          >
            <header className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${stage.dot}`} aria-hidden="true" />
                <h3 className="text-sm font-semibold text-ink">{stage.status}</h3>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {items.length}
                </span>
              </div>
              <span className="text-[11px] text-muted">{formatCurrency(value)}</span>
            </header>

            <div className="flex-1 space-y-2.5">
              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-xs text-muted">
                  Drop a lead here
                </p>
              ) : (
                items.map((lead) => (
                  <PipelineCard
                    key={lead.id}
                    lead={lead}
                    dragging={dragId === lead.id || movingId === lead.id}
                    onDragStart={setDragId}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
