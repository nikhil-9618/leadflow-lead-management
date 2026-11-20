import { useState } from 'react';
import { AlertCircle, CheckCircle2, FileUp, Loader2, RotateCcw, Upload } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import { importLeadsCsv, previewLeadImport } from '../../services/leadService.js';
import { getApiErrorMessage } from '../../services/api.js';
import { useToast } from '../common/Toast.jsx';

const MAX_BYTES = 2 * 1024 * 1024;

const statusStyles = {
  valid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  duplicate: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  invalid: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
};

export default function ImportModal({ open, onClose, onImported }) {
  const toast = useToast();
  const [fileName, setFileName] = useState('');
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFileName('');
    setCsv('');
    setPreview(null);
    setResult(null);
    setError('');
    setBusy(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setPreview(null);
    setResult(null);

    if (file.size > MAX_BYTES) {
      setError('The file is larger than 2 MB. Split it into smaller batches.');
      return;
    }

    const text = await file.text();
    setFileName(file.name);
    setCsv(text);

    setBusy(true);
    try {
      const data = await previewLeadImport(text);
      setPreview(data);
    } catch (previewError) {
      setError(getApiErrorMessage(previewError));
    } finally {
      setBusy(false);
    }
  };

  const confirmImport = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await importLeadsCsv(csv);
      setResult(response.data);
      toast.success(response.message || 'Import finished');
      if (response.data.imported > 0) onImported?.();
    } catch (importError) {
      setError(getApiErrorMessage(importError));
    } finally {
      setBusy(false);
    }
  };

  const footer = result ? (
    <div className="flex justify-end">
      <button type="button" className="btn-primary" onClick={close}>
        Done
      </button>
    </div>
  ) : (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" className="btn-secondary" onClick={close} disabled={busy}>
        Cancel
      </button>
      <button
        type="button"
        className="btn-primary"
        onClick={confirmImport}
        disabled={busy || !preview || preview.summary.valid === 0}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        {preview ? `Import ${preview.summary.valid} valid row${preview.summary.valid === 1 ? '' : 's'}` : 'Import'}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : close}
      title="Import leads from CSV"
      description="Headers are validated first, then every row is checked before anything is written."
      size="xl"
      footer={footer}
    >
      <div className="space-y-4">
        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {!result ? (
          <label
            htmlFor="csv-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface px-6 py-8 text-center transition hover:border-brand-500"
          >
            <FileUp size={22} className="text-muted" />
            <span className="text-sm font-medium text-ink">
              {fileName || 'Choose a CSV file (max 2 MB, up to 1000 rows)'}
            </span>
            <span className="text-xs text-muted">
              Required columns: name, email, phone, company, source
            </span>
            <input id="csv-file" type="file" accept=".csv,text/csv" onChange={handleFile} className="sr-only" />
          </label>
        ) : null}

        {busy && !preview ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" /> Validating rows…
          </div>
        ) : null}

        {preview && !result ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Rows', value: preview.summary.total, tone: 'text-ink' },
                { label: 'Valid', value: preview.summary.valid, tone: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Duplicates', value: preview.summary.duplicates, tone: 'text-amber-600 dark:text-amber-400' },
                { label: 'Invalid', value: preview.summary.invalid, tone: 'text-red-600 dark:text-red-400' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-line bg-surface px-3 py-2">
                  <p className="text-xs text-muted">{stat.label}</p>
                  <p className={`text-lg font-semibold ${stat.tone}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {preview.unknownColumns?.length ? (
              <p className="text-xs text-muted">
                Ignored columns: {preview.unknownColumns.join(', ')}
              </p>
            ) : null}

            <div className="scrollbar-thin max-h-64 overflow-auto rounded-lg border border-line">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="th">Row</th>
                    <th className="th">Name</th>
                    <th className="th">Email</th>
                    <th className="th">Status</th>
                    <th className="th">Problems</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {preview.rows.map((row) => (
                    <tr key={row.rowNumber}>
                      <td className="td text-muted">{row.rowNumber}</td>
                      <td className="td max-w-[140px] truncate">{row.values.name || '—'}</td>
                      <td className="td max-w-[180px] truncate">{row.values.email || '—'}</td>
                      <td className="td">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[row.status]}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="td max-w-[260px] whitespace-normal text-xs text-muted">
                        {row.errors.length ? row.errors.join('; ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {result ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{result.imported} leads imported</p>
                <p className="text-xs">
                  {result.skipped} duplicate{result.skipped === 1 ? '' : 's'} skipped ·{' '}
                  {result.failed.length} failed
                </p>
              </div>
            </div>

            {result.failed.length ? (
              <div className="rounded-lg border border-red-200 dark:border-red-900">
                <p className="border-b border-red-200 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900 dark:text-red-300">
                  Failed rows
                </p>
                <ul className="max-h-40 divide-y divide-red-100 overflow-auto text-xs dark:divide-red-900">
                  {result.failed.map((failure) => (
                    <li key={failure.rowNumber} className="px-3 py-2 text-muted">
                      Row {failure.rowNumber} ({failure.email}): {failure.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <button type="button" className="btn-secondary" onClick={reset}>
              <RotateCcw size={15} />
              Import another file
            </button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
