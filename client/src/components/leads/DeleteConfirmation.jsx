import ConfirmDialog from '../common/ConfirmDialog.jsx';

export default function DeleteConfirmation({ open, lead, onClose, onConfirm, submitting = false }) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      submitting={submitting}
      title="Delete lead"
      confirmLabel="Delete lead"
    >
      <p>
        This will permanently delete the lead <span className="font-semibold text-ink">{lead?.name}</span>
        {lead?.company ? <span className="text-ink"> ({lead.company})</span> : null}.
      </p>
      {lead?.email ? <p className="mt-1">{lead.email}</p> : null}
      <p className="mt-2">Its activity history is retained for the audit trail.</p>
    </ConfirmDialog>
  );
}
