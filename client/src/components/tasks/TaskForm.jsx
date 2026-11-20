import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import {
  PRIORITIES,
  TASK_STATUSES,
  emptyTask,
  validateTask,
} from '../../validations/leadSchema.js';
import { getApiErrorMessage } from '../../services/api.js';
import { toDateInput } from '../../utils/formatDate.js';

const fromTask = (task) => ({
  title: task.title || '',
  description: task.description || '',
  lead: task.lead?.id || task.lead || '',
  dueDate: toDateInput(task.dueDate),
  dueTime: task.dueTime || '',
  priority: task.priority || 'Medium',
  status: task.status || 'Pending',
});

export default function TaskForm({ open, mode = 'create', task, leads = [], defaultLeadId = '', onClose, onSubmit }) {
  const [values, setValues] = useState(emptyTask);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(task ? fromTask(task) : { ...emptyTask, lead: defaultLeadId, dueDate: toDateInput(new Date()) });
    setErrors({});
    setFormError('');
    setSubmitting(false);
  }, [open, task, defaultLeadId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validateTask(values);
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      lead: values.lead || null,
      dueDate: new Date(`${values.dueDate}T00:00:00.000Z`).toISOString(),
      dueTime: values.dueTime || '',
      priority: values.priority,
      status: values.status,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
      setSubmitting(false);
    }
  };

  const isEdit = mode === 'edit';

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={isEdit ? 'Edit task' : 'New follow-up task'}
      description="Tasks are stored in MongoDB and linked to a lead when selected."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" form="task-form" className="btn-primary" disabled={submitting}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create task'}
          </button>
        </div>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>{formError}</p>
          </div>
        ) : null}

        <div>
          <label htmlFor="task-title" className="label">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="task-title"
            name="title"
            type="text"
            autoFocus
            value={values.title}
            onChange={handleChange}
            placeholder="Call back about pricing"
            className={`input ${errors.title ? 'input-error' : ''}`}
            aria-invalid={Boolean(errors.title)}
            maxLength={120}
          />
          {errors.title ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.title}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="task-dueDate" className="label">
              Due date <span className="text-red-500">*</span>
            </label>
            <input
              id="task-dueDate"
              name="dueDate"
              type="date"
              value={values.dueDate}
              onChange={handleChange}
              className={`input ${errors.dueDate ? 'input-error' : ''}`}
            />
            {errors.dueDate ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.dueDate}</p> : null}
          </div>

          <div>
            <label htmlFor="task-dueTime" className="label">
              Due time
            </label>
            <input
              id="task-dueTime"
              name="dueTime"
              type="time"
              value={values.dueTime}
              onChange={handleChange}
              className={`input ${errors.dueTime ? 'input-error' : ''}`}
            />
            {errors.dueTime ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.dueTime}</p> : null}
          </div>

          <div>
            <label htmlFor="task-priority" className="label">
              Priority
            </label>
            <select
              id="task-priority"
              name="priority"
              value={values.priority}
              onChange={handleChange}
              className="input"
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="task-lead" className="label">
              Related lead
            </label>
            <select id="task-lead" name="lead" value={values.lead} onChange={handleChange} className="input">
              <option value="">No lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name} — {lead.company}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="task-status" className="label">
              Status
            </label>
            <select id="task-status" name="status" value={values.status} onChange={handleChange} className="input">
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="task-description" className="label">
            Description
          </label>
          <textarea
            id="task-description"
            name="description"
            rows={3}
            value={values.description}
            onChange={handleChange}
            placeholder="What needs to happen?"
            className={`input ${errors.description ? 'input-error' : ''}`}
            maxLength={1000}
          />
          {errors.description ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.description}</p>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
