import { Link } from 'react-router-dom';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import StatusBadge from '../common/StatusBadge.jsx';
import PriorityBadge from '../common/PriorityBadge.jsx';
import ScoreBadge from '../common/ScoreBadge.jsx';
import { formatDate } from '../../utils/formatDate.js';

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

export default function LeadTable({
  leads,
  onEdit,
  onDelete,
  busy = false,
  selected = [],
  onToggleSelect,
  onToggleAll,
}) {
  const allSelected = leads.length > 0 && leads.every((lead) => selected.includes(lead.id));

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead className="bg-slate-50/80 dark:bg-slate-900/60">
          <tr className="border-b border-line">
            {onToggleSelect ? (
              <th scope="col" className="th w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onToggleAll(leads.map((lead) => lead.id))}
                  aria-label="Select all leads on this page"
                  className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-600"
                />
              </th>
            ) : null}
            <th scope="col" className="th">Lead</th>
            <th scope="col" className="th hidden md:table-cell">Company</th>
            <th scope="col" className="th">Status</th>
            <th scope="col" className="th hidden lg:table-cell">Priority</th>
            <th scope="col" className="th hidden lg:table-cell">Score</th>
            <th scope="col" className="th hidden 2xl:table-cell">Source</th>
            <th scope="col" className="th hidden xl:table-cell">Created</th>
            <th scope="col" className="th text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {leads.map((lead) => (
            <tr key={lead.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
              {onToggleSelect ? (
                <td className="td">
                  <input
                    type="checkbox"
                    checked={selected.includes(lead.id)}
                    onChange={() => onToggleSelect(lead.id)}
                    aria-label={`Select lead ${lead.name}`}
                    className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-600"
                  />
                </td>
              ) : null}
              <td className="td">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-slate-800 dark:text-brand-200">
                    {initials(lead.name)}
                  </span>
                  <div className="min-w-0">
                    <Link
                      to={`/leads/${lead.id}`}
                      className="block truncate font-medium text-ink hover:text-brand-600 hover:underline"
                    >
                      {lead.name}
                    </Link>
                    <span className="block max-w-[180px] truncate text-xs text-muted" title={lead.email}>
                      {lead.email}
                    </span>
                  </div>
                </div>
              </td>
              <td className="td hidden md:table-cell">
                <span className="block max-w-[150px] truncate" title={lead.company}>
                  {lead.company}
                </span>
              </td>
              <td className="td">
                <StatusBadge status={lead.status} />
              </td>
              <td className="td hidden lg:table-cell">
                <PriorityBadge priority={lead.priority} />
              </td>
              <td className="td hidden lg:table-cell">
                <ScoreBadge score={lead.score} band={lead.scoreBand} compact />
              </td>
              <td className="td hidden 2xl:table-cell">
                <span className="chip">{lead.source}</span>
              </td>
              <td className="td hidden text-muted xl:table-cell">{formatDate(lead.createdAt)}</td>
              <td className="td">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    to={`/leads/${lead.id}`}
                    className="rounded-lg p-2 text-muted transition hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-800"
                    aria-label={`View lead ${lead.name}`}
                    title="View details"
                  >
                    <Eye size={16} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => onEdit(lead)}
                    disabled={busy}
                    className="rounded-lg p-2 text-muted transition hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50 dark:hover:bg-slate-800"
                    aria-label={`Edit lead ${lead.name}`}
                    title="Edit lead"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(lead)}
                    disabled={busy}
                    className="rounded-lg p-2 text-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950"
                    aria-label={`Delete lead ${lead.name}`}
                    title="Delete lead"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
