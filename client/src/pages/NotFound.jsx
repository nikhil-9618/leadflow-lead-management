import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-muted dark:bg-slate-800">
        <Compass size={22} />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-ink">Page not found</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">
        The page you are looking for doesn’t exist or has moved.
      </p>
      <Link to="/dashboard" className="btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
