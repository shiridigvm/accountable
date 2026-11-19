import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { DeleteDialog } from './DeleteDialog';

describe('DeleteDialog', () => {
  it('asks before deleting', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <DeleteDialog
        name="Acme"
        kind="organization"
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Delete Acme?' }),
    ).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });

  it('lists linked records on a refusal and offers no delete button', async () => {
    const refusal = new ApiError(
      'This organization cannot be deleted yet. It has 3 contacts, 2 deals. Remove or move those first.',
      409,
      { contacts: 3, deals: 2 },
    );
    render(
      <DeleteDialog
        name="Acme"
        kind="organization"
        onConfirm={vi.fn().mockRejectedValue(refusal)}
        onClose={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(
      await screen.findByRole('heading', {
        name: 'This organization cannot be deleted',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('3 contacts')).toBeInTheDocument();
    expect(screen.getByText('2 deals')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
  });
});
