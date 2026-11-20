import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Returns a compact page window: 1 … 4 5 6 … 20 */
const getPageWindow = (page, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);

  const result = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push('…');
    result.push(value);
  });

  return result;
};

export default function Pagination({ page, limit, total, totalPages, onPageChange, label = 'leads' }) {
  if (!total) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const pages = getPageWindow(page, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted sm:text-sm">
        Showing <span className="font-medium text-ink">{from}</span>–
        <span className="font-medium text-ink">{to}</span> of <span className="font-medium text-ink">{total}</span>{' '}
        {label}
      </p>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn-secondary px-2.5 py-2"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((value, index) =>
          value === '…' ? (
            <span key={`gap-${index}`} className="px-2 text-sm text-muted">
              …
            </span>
          ) : (
            <button
              key={value}
              type="button"
              onClick={() => onPageChange(value)}
              aria-current={value === page ? 'page' : undefined}
              className={`min-w-[36px] rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                value === page
                  ? 'bg-brand-600 text-white'
                  : 'border border-line bg-card text-ink hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {value}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn-secondary px-2.5 py-2"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  );
}
