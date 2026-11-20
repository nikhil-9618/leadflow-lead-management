import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../components/common/Toast.jsx';
import Leads from './Leads.jsx';

const { fetchLeads } = vi.hoisted(() => ({ fetchLeads: vi.fn() }));

vi.mock('../services/leadService.js', () => ({
  fetchLeads: (...args) => fetchLeads(...args),
  createLead: vi.fn(),
  updateLead: vi.fn(),
  deleteLead: vi.fn(),
  exportLeadsCsv: vi.fn(),
  previewLeadImport: vi.fn(),
  importLeadsCsv: vi.fn(),
}));

const lead = {
  id: '64b64c1f1f1f1f1f1f1f1f1f',
  name: 'Anita Desai',
  email: 'anita@example.com',
  phone: '9876543210',
  company: 'Acme Corp',
  source: 'Referral',
  status: 'Qualified',
  priority: 'High',
  score: 65,
  scoreBand: 'Hot',
  createdAt: '2026-01-05T00:00:00.000Z',
};

const responseFor = (leads = [lead], total = leads.length) => ({
  data: leads,
  pagination: { total, page: 1, limit: 10, totalPages: Math.max(1, Math.ceil(total / 10)) },
});

const renderPage = () =>
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/leads']}>
        <Routes>
          <Route path="/leads" element={<Leads />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );

describe('Leads page', () => {
  beforeEach(() => {
    fetchLeads.mockReset();
    fetchLeads.mockResolvedValue(responseFor());
  });

  it('renders leads returned by the API', async () => {
    renderPage();

    expect(await screen.findByText('Anita Desai')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    // "Qualified" also exists as a filter option, so check the rendered set.
    expect(screen.getAllByText('Qualified').length).toBeGreaterThan(1);
    expect(screen.getByText('1 result')).toBeInTheDocument();
  });

  it('shows a loading skeleton, then the empty state', async () => {
    fetchLeads.mockResolvedValue(responseFor([], 0));
    renderPage();

    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);

    expect(await screen.findByText('No leads yet')).toBeInTheDocument();
  });

  it('debounces the search and sends it to the backend', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Anita Desai');

    await user.type(screen.getByLabelText('Search leads'), 'anita');

    await waitFor(
      () => {
        const lastCall = fetchLeads.mock.calls.at(-1)?.[0];
        expect(lastCall?.search).toBe('anita');
      },
      { timeout: 3000 }
    );
  });

  it('applies status and priority filters through the API', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Anita Desai');

    await user.selectOptions(screen.getByLabelText('Filter by status'), 'Qualified');

    await waitFor(() => {
      expect(fetchLeads.mock.calls.at(-1)?.[0]?.status).toBe('Qualified');
    });

    await user.selectOptions(screen.getByLabelText('Filter by priority'), 'High');

    await waitFor(() => {
      expect(fetchLeads.mock.calls.at(-1)?.[0]?.priority).toBe('High');
    });

    expect(await screen.findByText(/Active filters/i)).toBeInTheDocument();
  });

  it('sends the sort choice to the backend', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Anita Desai');

    await user.selectOptions(screen.getByLabelText('Sort leads'), 'oldest');

    await waitFor(() => {
      expect(fetchLeads.mock.calls.at(-1)?.[0]?.sort).toBe('oldest');
    });
  });

  it('renders an error state with a retry action', async () => {
    fetchLeads.mockRejectedValue({ response: { status: 500, data: {} } });
    renderPage();

    expect(await screen.findByText(/Couldn’t load leads/i)).toBeInTheDocument();

    fetchLeads.mockResolvedValue(responseFor());
    await userEvent.setup().click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Anita Desai')).toBeInTheDocument();
  });
});
