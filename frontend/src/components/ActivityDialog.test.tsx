import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../api/client';
import type { TimelineEntry } from '../api/types';
import { ActivityDialog } from './ActivityDialog';

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  api: vi.fn(),
}));

const entry: TimelineEntry = {
  kind: 'activity',
  id: 7,
  on: '2026-11-01',
  created_at: '2026-11-01T09:00:00',
  text: 'Sent a quote',
  type: 'email',
  follow_up_on: '2026-11-15',
};

beforeEach(() => {
  vi.mocked(api).mockResolvedValue(undefined);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 17, 12));
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(api).mockReset();
});

describe('ActivityDialog', () => {
  it('starts a new activity as a note dated today', () => {
    render(
      <ActivityDialog
        target={{ dealId: 3 }}
        entry={null}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Log activity' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Type/)).toHaveValue('note');
    expect(screen.getByLabelText(/Date/)).toHaveValue('2026-11-17');
    expect(screen.getByLabelText('Follow-up date')).toHaveValue('');
  });

  it('requires a description before logging', async () => {
    render(
      <ActivityDialog
        target={{ dealId: 3 }}
        entry={null}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Log' }));
    expect(
      await screen.findByText('What happened is required.'),
    ).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it('posts a new activity for the deal and closes', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    render(
      <ActivityDialog
        target={{ dealId: 3 }}
        entry={null}
        onClose={onClose}
        onSaved={onSaved}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText(/Type/), 'call');
    await userEvent.type(
      screen.getByLabelText(/What happened/),
      '  Left a voicemail  ',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Log' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api).toHaveBeenCalledWith('POST', '/api/activities', {
      type: 'call',
      description: 'Left a voicemail',
      occurred_on: '2026-11-17',
      follow_up_on: null,
      contact_id: null,
      deal_id: 3,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('posts against the contact when the target is a contact', async () => {
    const onSaved = vi.fn();
    render(
      <ActivityDialog
        target={{ contactId: 5 }}
        entry={null}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );
    await userEvent.type(screen.getByLabelText(/What happened/), 'Met');
    await userEvent.click(screen.getByRole('button', { name: 'Log' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api).toHaveBeenCalledWith(
      'POST',
      '/api/activities',
      expect.objectContaining({ contact_id: 5, deal_id: null }),
    );
  });

  it('fills the form from an existing entry and patches it', async () => {
    const onSaved = vi.fn();
    render(
      <ActivityDialog
        target={{ dealId: 3 }}
        entry={entry}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Edit activity' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Type/)).toHaveValue('email');
    expect(screen.getByLabelText(/What happened/)).toHaveValue('Sent a quote');
    expect(screen.getByLabelText(/Date/)).toHaveValue('2026-11-01');
    expect(screen.getByLabelText('Follow-up date')).toHaveValue('2026-11-15');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api).toHaveBeenCalledWith('PATCH', '/api/activities/7', {
      type: 'email',
      description: 'Sent a quote',
      occurred_on: '2026-11-01',
      follow_up_on: '2026-11-15',
    });
  });

  it('shows the server error and stays open when saving fails', async () => {
    vi.mocked(api).mockRejectedValue(new ApiError('Deal not found.', 404));
    const onClose = vi.fn();
    const onSaved = vi.fn();
    render(
      <ActivityDialog
        target={{ dealId: 3 }}
        entry={null}
        onClose={onClose}
        onSaved={onSaved}
      />,
    );
    await userEvent.type(screen.getByLabelText(/What happened/), 'Hello');
    await userEvent.click(screen.getByRole('button', { name: 'Log' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Deal not found.',
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
