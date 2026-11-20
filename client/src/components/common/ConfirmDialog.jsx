import { AlertTriangle, Loader2 } from 'lucide-react';
import Modal from './Modal.jsx';

/** Shared destructive-action confirmation dialog. */
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  submitting = false,
  onClose,
  onConfirm,
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={submitting}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {submitting ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
          <AlertTriangle size={20} />
        </span>
        <div className="text-sm text-muted">
          {description ? <p>{description}</p> : null}
          {children}
          <p className="mt-2 font-medium text-red-600 dark:text-red-400">This action cannot be undone.</p>
        </div>
      </div>
    </Modal>
  );
}
