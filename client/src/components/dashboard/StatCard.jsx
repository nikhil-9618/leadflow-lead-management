import { Link } from 'react-router-dom';

const accents = {
  brand: { icon: 'bg-brand-50 text-brand-600 dark:bg-slate-800 dark:text-brand-300', bar: 'bg-brand-600' },
  blue: { icon: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300', bar: 'bg-blue-500' },
  orange: { icon: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300', bar: 'bg-amber-500' },
  green: { icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300', bar: 'bg-emerald-500' },
  red: { icon: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300', bar: 'bg-red-500' },
  violet: { icon: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300', bar: 'bg-violet-500' },
};

export default function StatCard({ label, value, icon: Icon, accent = 'brand', to, loading = false, hint }) {
  const tone = accents[accent] || accents.brand;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted">{label}</p>
          {loading ? (
            <div className="skeleton mt-2 h-8 w-16" />
          ) : (
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
          )}
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}>
          <Icon size={18} strokeWidth={2.2} />
        </span>
      </div>
      {hint ? <p className="mt-3 text-xs text-muted">{hint}</p> : null}
    </>
  );

  const classes = 'card block p-5 transition-colors';

  if (!to) return <div className={classes}>{content}</div>;

  return (
    <Link to={to} className={`${classes} hover:border-brand-200 dark:hover:border-brand-700`}>
      {content}
    </Link>
  );
}
