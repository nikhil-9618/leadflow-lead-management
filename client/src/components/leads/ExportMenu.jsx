import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, Loader2 } from 'lucide-react';

/** Dropdown that exports all, filtered or selected leads as CSV. */
export default function ExportMenu({ onExport, selectedCount = 0, filteredCount = 0, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const run = async (mode) => {
    setBusy(true);
    try {
      await onExport(mode);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled || busy}
        className="btn-secondary w-full sm:w-auto"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        Export
        <ChevronDown size={14} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-lg border border-line bg-card py-1 shadow-pop"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => run('all')}
            className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Export all leads
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => run('filtered')}
            disabled={filteredCount === 0}
            className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-slate-50 disabled:opacity-40 dark:hover:bg-slate-800"
          >
            Export filtered ({filteredCount})
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => run('selected')}
            disabled={selectedCount === 0}
            className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-slate-50 disabled:opacity-40 dark:hover:bg-slate-800"
          >
            Export selected ({selectedCount})
          </button>
        </div>
      ) : null}
    </div>
  );
}
