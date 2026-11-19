import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { TimelineEntry } from '../api/types';
import { Timeline } from './Timeline';

const call: TimelineEntry = {
  kind: 'activity',
  id: 1,
  on: '2026-11-10',
  created_at: '2026-11-10T09:00:00',
  text: 'Discussed pricing',
  type: 'call',
  follow_up_on: '2026-11-20',
  done: false,
  deal_name: 'Big deal',
  contact_name: 'Ada',
};

const stage: TimelineEntry = {
  kind: 'stage_change',
  id: 2,
  on: '2026-11-09',
  created_at: '2026-11-09T09:00:00',
  text: 'New to Qualified',
};

describe('Timeline', () => {
  it('says so when there is nothing to show', () => {
    render(<Timeline entries={[]} />);
    expect(screen.getByText('Nothing has happened yet.')).toBeInTheDocument();
  });

  it('shows activities and stage changes with their details', () => {
    render(<Timeline entries={[call, stage]} />);
    const [first, second] = screen.getAllByRole('listitem');
    expect(within(first).getByText('Call')).toBeInTheDocument();
    expect(within(first).getByText('Nov 10, 2026')).toBeInTheDocument();
    expect(within(first).getByText('· Big deal')).toBeInTheDocument();
    expect(within(first).getByText('· Ada')).toBeInTheDocument();
    expect(
      within(first).getByText('Follow up Nov 20, 2026'),
    ).toBeInTheDocument();
    expect(within(first).getByText('Discussed pricing')).toBeInTheDocument();
    expect(within(second).getByText('Stage')).toBeInTheDocument();
    expect(within(second).getByText('New to Qualified')).toBeInTheDocument();
  });

  it('labels notes and emails, and treats a missing type as a note', () => {
    const base = { ...call, follow_up_on: null };
    render(
      <Timeline
        entries={[
          { ...base, id: 3, type: 'email' },
          { ...base, id: 4, type: 'note' },
          { ...base, id: 5, type: undefined },
        ]}
      />,
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getAllByText('Note')).toHaveLength(2);
  });

  it('offers no actions on a stage change', () => {
    render(
      <Timeline
        entries={[stage]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMarkDone={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers no actions when no handlers are given', () => {
    render(<Timeline entries={[call]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls the handlers with the entry', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onMarkDone = vi.fn();
    render(
      <Timeline
        entries={[call]}
        onEdit={onEdit}
        onDelete={onDelete}
        onMarkDone={onMarkDone}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Mark done' }));
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onMarkDone).toHaveBeenCalledWith(call);
    expect(onEdit).toHaveBeenCalledWith(call);
    expect(onDelete).toHaveBeenCalledWith(call);
  });

  it('shows Done instead of a follow-up and hides Mark done once finished', () => {
    render(
      <Timeline
        entries={[{ ...call, done: true }]}
        onMarkDone={vi.fn()}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.queryByText(/Follow up/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Mark done' }),
    ).not.toBeInTheDocument();
  });

  it('hides Mark done when there is no follow-up date', () => {
    render(
      <Timeline
        entries={[{ ...call, follow_up_on: null }]}
        onMarkDone={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Mark done' }),
    ).not.toBeInTheDocument();
  });
});
