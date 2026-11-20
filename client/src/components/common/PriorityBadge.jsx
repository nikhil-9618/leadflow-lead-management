import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

const styles = {
  High: {
    className: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-900',
    icon: ArrowUp,
  },
  Medium: {
    className: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900',
    icon: Minus,
  },
  Low: {
    className: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
    icon: ArrowDown,
  },
};

export default function PriorityBadge({ priority = 'Medium', showIcon = true }) {
  const tone = styles[priority] || styles.Medium;
  const Icon = tone.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone.className}`}
    >
      {showIcon ? <Icon size={11} aria-hidden="true" /> : null}
      {priority}
    </span>
  );
}
