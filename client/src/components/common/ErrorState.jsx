import { AlertCircle, RefreshCw } from 'lucide-react';

/** Consistent inline error panel with a retry action. */
export default function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
        <AlertCircle size={20} />
      </span>
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        {message ? <p className="mt-1 max-w-sm text-sm text-muted">{message}</p> : null}
      </div>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn-secondary">
          <RefreshCw size={15} />
          Try again
        </button>
      ) : null}
    </div>
  );
}
