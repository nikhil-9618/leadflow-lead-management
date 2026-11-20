import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from './Pagination.jsx';

describe('Pagination', () => {
  it('summarises the visible range', () => {
    render(<Pagination page={2} limit={10} total={25} totalPages={3} onPageChange={() => {}} />);

    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('disables previous on the first page', () => {
    render(<Pagination page={1} limit={10} total={25} totalPages={3} onPageChange={() => {}} />);

    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next page/i })).toBeEnabled();
  });

  it('requests the page the user clicks', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={1} limit={10} total={25} totalPages={3} onPageChange={onPageChange} />);

    await user.click(screen.getByRole('button', { name: '3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('renders nothing without results', () => {
    const { container } = render(
      <Pagination page={1} limit={10} total={0} totalPages={1} onPageChange={() => {}} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
