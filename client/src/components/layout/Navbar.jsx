import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Plus, Search } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle.jsx';

const titles = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/pipeline': 'Pipeline',
  '/tasks': 'Tasks',
};

export default function Navbar({ onMenuClick }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [term, setTerm] = useState('');

  const title = pathname.startsWith('/leads/') ? 'Lead details' : titles[pathname] || 'LeadFlow';

  useEffect(() => {
    setTerm('');
  }, [pathname]);

  const handleSearch = (event) => {
    event.preventDefault();
    const value = term.trim();
    navigate(value ? `/leads?search=${encodeURIComponent(value)}` : '/leads');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-card/90 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-ink lg:hidden dark:hover:bg-slate-800"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      <h1 className="truncate text-base font-semibold text-ink sm:text-lg">{title}</h1>

      <form onSubmit={handleSearch} className="ml-auto hidden max-w-xs flex-1 sm:block" role="search">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search name, email, phone…"
            aria-label="Quick search leads"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted/80 focus:border-brand-600 focus:bg-card focus:ring-2 focus:ring-brand-600/20"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-1 sm:ml-0">
        <ThemeToggle />
        <Link to="/leads?new=1" className="btn-primary ml-1 shrink-0">
          <Plus size={16} />
          <span className="hidden sm:inline">Add Lead</span>
          <span className="sr-only sm:hidden">Add lead</span>
        </Link>
      </div>
    </header>
  );
}
