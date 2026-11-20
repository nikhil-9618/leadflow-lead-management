import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeadForm from './LeadForm.jsx';

const renderForm = (props = {}) =>
  render(<LeadForm open mode="create" lead={null} onClose={() => {}} onSubmit={vi.fn()} {...props} />);

describe('LeadForm', () => {
  it('shows validation errors and never submits an invalid form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await user.click(screen.getByRole('button', { name: /create lead/i }));

    expect(await screen.findByText('Full name is required')).toBeInTheDocument();
    expect(screen.getByText('Email address is required')).toBeInTheDocument();
    expect(screen.getByText('Phone number is required')).toBeInTheDocument();
    expect(screen.getByText('Company name is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates email and phone formats', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/full name/i), 'Nikhil Sharma');
    await user.type(screen.getByLabelText(/email address/i), 'bad-email');
    await user.type(screen.getByLabelText(/phone number/i), '123');
    await user.type(screen.getByLabelText(/company/i), 'Meru');
    await user.click(screen.getByRole('button', { name: /create lead/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/10-digit/i)).toBeInTheDocument();
  });

  it('submits a normalised payload', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });

    await user.type(screen.getByLabelText(/full name/i), '  Nikhil Sharma  ');
    await user.type(screen.getByLabelText(/email address/i), 'Nikhil@Example.COM');
    await user.type(screen.getByLabelText(/phone number/i), '9876543210');
    await user.type(screen.getByLabelText(/company/i), 'Meru Technosoft');
    await user.type(screen.getByLabelText(/tags/i), 'enterprise, demo');
    await user.selectOptions(screen.getByLabelText(/^priority$/i), 'High');

    await user.click(screen.getByRole('button', { name: /create lead/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nikhil Sharma',
        email: 'nikhil@example.com',
        phone: '9876543210',
        company: 'Meru Technosoft',
        tags: ['enterprise', 'demo'],
        priority: 'High',
        status: 'New',
        source: 'Website',
      })
    );
  });

  it('prefills an existing lead when editing', () => {
    render(
      <LeadForm
        open
        mode="edit"
        lead={{
          name: 'Anita Desai',
          email: 'anita@example.com',
          phone: '9876543210',
          company: 'Acme Corp',
          source: 'Referral',
          status: 'Qualified',
          priority: 'High',
          tags: ['vip'],
          estimatedValue: 50000,
          nextFollowUpAt: '2026-03-01T00:00:00.000Z',
        }}
        onClose={() => {}}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/full name/i)).toHaveValue('Anita Desai');
    expect(screen.getByLabelText(/company/i)).toHaveValue('Acme Corp');
    expect(screen.getByLabelText(/tags/i)).toHaveValue('vip');
    expect(screen.getByLabelText(/next follow-up/i)).toHaveValue('2026-03-01');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('surfaces an API error without closing the dialog', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue({
      response: { status: 409, data: { message: 'A lead with this email address already exists' } },
    });
    renderForm({ onSubmit });

    await user.type(screen.getByLabelText(/full name/i), 'Nikhil Sharma');
    await user.type(screen.getByLabelText(/email address/i), 'nikhil@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '9876543210');
    await user.type(screen.getByLabelText(/company/i), 'Meru Technosoft');
    await user.click(screen.getByRole('button', { name: /create lead/i }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
