import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../api/client';
import type { Proposal } from '../api/copilot';
import { notifyDataChanged } from '../api/useResource';
import { ProposalCard } from './ProposalCard';

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  api: vi.fn(),
}));
vi.mock('../api/useResource', () => ({ notifyDataChanged: vi.fn() }));

const apiMock = vi.mocked(api);

const update: Proposal = {
  kind: 'deal',
  action: 'update',
  id: 4,
  name: 'Kestrel Freight audit',
  fields: { stage: 'Negotiation', value_cents: 4000000 },
  current: { stage: 'New', value_cents: 3200000 },
};

const create: Proposal = {
  kind: 'activity',
  action: 'create',
  id: null,
  name: 'Called Priya',
  fields: { type: 'call', description: 'Called Priya', contact_id: 2 },
  current: null,
};

function renderCard(proposal: Proposal) {
  render(
    <MemoryRouter>
      <ProposalCard proposal={proposal} />
    </MemoryRouter>,
  );
  return screen.getByRole('region', {
    name: proposal.action === 'create' ? 'Create activity' : 'Update deal',
  });
}

afterEach(() => {
  apiMock.mockReset();
  vi.mocked(notifyDataChanged).mockReset();
});

describe('ProposalCard', () => {
  it('shows each field with the current value next to the new one for an update', () => {
    const card = renderCard(update);
    expect(card).toHaveTextContent('Update deal');
    expect(card).toHaveTextContent('Kestrel Freight audit');
    const stage = within(card).getByText('Stage').parentElement!;
    expect(stage).toHaveTextContent('New → changes to Negotiation');
    const value = within(card).getByText('Value').parentElement!;
    expect(value).toHaveTextContent('$32,000.00 → changes to $40,000.00');
  });

  it('shows only the new values for a create', () => {
    const card = renderCard(create);
    expect(card).toHaveTextContent('Create activity');
    expect(within(card).getByText('Type').parentElement).toHaveTextContent(
      'TypeCall',
    );
    expect(card).not.toHaveTextContent('changes to');
  });

  it('Confirm sends the request once, shows Saved with a link, and reloads the page data', async () => {
    let finish: (value: unknown) => void = () => {};
    apiMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const card = renderCard(update);
    const confirm = within(card).getByRole('button', { name: 'Confirm' });
    await userEvent.click(confirm);
    expect(confirm).toBeDisabled();
    await userEvent.click(confirm);
    finish({ id: 4, name: 'Kestrel Freight audit' });

    expect(await within(card).findByText(/Saved/)).toBeInTheDocument();
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(apiMock).toHaveBeenCalledWith('PATCH', '/api/deals/4', {
      stage: 'Negotiation',
      value_cents: 4000000,
    });
    expect(
      within(card).getByRole('link', { name: 'Kestrel Freight audit' }),
    ).toHaveAttribute('href', '/deals/4');
    expect(notifyDataChanged).toHaveBeenCalledTimes(1);
    expect(within(card).getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('a saved activity links to its contact', async () => {
    apiMock.mockResolvedValue({
      id: 9,
      contact_id: 2,
      contact_name: 'Priya Nair',
    });
    const card = renderCard(create);
    await userEvent.click(
      within(card).getByRole('button', { name: 'Confirm' }),
    );
    expect(apiMock).toHaveBeenCalledWith(
      'POST',
      '/api/activities',
      create.fields,
    );
    expect(
      await within(card).findByRole('link', { name: 'Priya Nair' }),
    ).toHaveAttribute('href', '/contacts/2');
  });

  it('shows the API error message, and cannot be confirmed again', async () => {
    apiMock.mockRejectedValue(
      new ApiError('A won deal needs an actual close date.', 422),
    );
    const card = renderCard(update);
    await userEvent.click(
      within(card).getByRole('button', { name: 'Confirm' }),
    );
    expect(await within(card).findByRole('alert')).toHaveTextContent(
      'A won deal needs an actual close date.',
    );
    expect(
      within(card).getByRole('button', { name: 'Confirm' }),
    ).toBeDisabled();
    expect(notifyDataChanged).not.toHaveBeenCalled();
  });

  it('Cancel sends nothing and shows Cancelled', async () => {
    const card = renderCard(update);
    await userEvent.click(within(card).getByRole('button', { name: 'Cancel' }));
    expect(within(card).getByText('Cancelled')).toBeInTheDocument();
    expect(
      within(card).getByRole('button', { name: 'Confirm' }),
    ).toBeDisabled();
    expect(within(card).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await waitFor(() => expect(apiMock).not.toHaveBeenCalled());
  });
});
