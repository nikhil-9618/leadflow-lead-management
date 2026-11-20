import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteConfirmation from './DeleteConfirmation.jsx';

const lead = { id: '1', name: 'Anita Desai', company: 'Acme Corp', email: 'anita@example.com' };

describe('DeleteConfirmation', () => {
  it('names the lead that will be deleted', () => {
    render(<DeleteConfirmation open lead={lead} onClose={() => {}} onConfirm={() => {}} />);

    expect(screen.getByRole('heading', { name: /delete lead/i })).toBeInTheDocument();
    expect(screen.getByText('Anita Desai')).toBeInTheDocument();
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it('only deletes after confirmation', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<DeleteConfirmation open lead={lead} onClose={onClose} onConfirm={onConfirm} />);

    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^delete lead$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a progress label while deleting', () => {
    render(<DeleteConfirmation open lead={lead} submitting onClose={() => {}} onConfirm={() => {}} />);

    expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
  });
});
