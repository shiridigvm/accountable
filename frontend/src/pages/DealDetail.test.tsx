import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Deal, TimelineEntry } from '../api/types';
import DealDetail from './DealDetail';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status < 400,
    status,
    json: async () => body,
  };
}

const deal: Deal = {
  id: 7,
  name: 'Big renewal',
  stage: 'Proposal',
  value_cents: 500000,
  probability: 50,
  expected_close: '2026-12-01',
  actual_close: null,
  organization_id: 3,
  organization_name: 'Acme',
  main_contact_id: 4,
  main_contact_name: 'Ana Lopez',
  position: 0,
  expected_cents: 250000,
  late: false,
};

const entries: TimelineEntry[] = [
  {
    kind: 'activity',
    id: 11,
    on: '2026-11-10',
    created_at: '2026-11-10T10:00:00',
    text: 'Called about pricing',
    type: 'call',
    follow_up_on: '2026-11-20',
    done: false,
  },
];

type Handler = (
  method: string,
  path: string,
) => ReturnType<typeof jsonResponse>;

function stubFetch(handler: Handler) {
  const fetchMock = vi.fn((path: string, init?: RequestInit) =>
    Promise.resolve(handler(init?.method ?? 'GET', path)),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function handlerWith(d: Deal, timeline: TimelineEntry[] = entries): Handler {
  return (_method, path) => {
    if (path === '/api/deals/7') return jsonResponse(200, d);
    if (path === '/api/deals/7/timeline') return jsonResponse(200, timeline);
    return jsonResponse(200, {});
  };
}

function renderDetail() {
  render(
    <MemoryRouter initialEntries={['/deals/7']}>
      <Routes>
        <Route path="/deals/:id" element={<DealDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

function calls(fetchMock: ReturnType<typeof stubFetch>, method: string) {
  return fetchMock.mock.calls.filter(
    ([, init]) => (init as RequestInit | undefined)?.method === method,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('DealDetail', () => {
  it('shows the deal facts and links', async () => {
    stubFetch(handlerWith(deal));
    renderDetail();
    expect(
      await screen.findByRole('heading', { name: 'Big renewal' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Proposal · $5,000.00')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    expect(screen.getByText('Dec 1, 2026')).toBeInTheDocument();
    expect(screen.queryByText('Late')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Acme' })).toHaveAttribute(
      'href',
      '/organizations/3',
    );
    expect(screen.getByRole('link', { name: 'Ana Lopez' })).toHaveAttribute(
      'href',
      '/contacts/4',
    );
    expect(screen.getByText('Called about pricing')).toBeInTheDocument();
  });

  it('shows the Late tag and dashes for missing links and close date', async () => {
    stubFetch(
      handlerWith({
        ...deal,
        late: true,
        organization_id: null,
        organization_name: null,
        main_contact_id: null,
        main_contact_name: null,
      }),
    );
    renderDetail();
    expect(await screen.findByText('Late')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Acme' }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('shows the load error', async () => {
    stubFetch((_method, path) =>
      path === '/api/deals/7'
        ? jsonResponse(404, { error: 'Deal not found.' })
        : jsonResponse(200, []),
    );
    renderDetail();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Deal not found.',
    );
  });

  it('shows a loading message while the deal loads', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    renderDetail();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows a timeline error without hiding the deal', async () => {
    stubFetch((_method, path) =>
      path === '/api/deals/7/timeline'
        ? jsonResponse(500, { error: 'Timeline broke.' })
        : handlerWith(deal)(_method, path),
    );
    renderDetail();
    expect(await screen.findByText('Timeline broke.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Big renewal' })).toBeVisible();
  });

  it('marks a follow-up done and reloads the timeline', async () => {
    const fetchMock = stubFetch(handlerWith(deal));
    renderDetail();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Mark done' }),
    );
    await waitFor(() => expect(calls(fetchMock, 'PATCH')).toHaveLength(1));
    expect(calls(fetchMock, 'PATCH')[0][0]).toBe('/api/activities/11');
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(
          ([path]) => path === '/api/deals/7/timeline',
        ),
      ).toHaveLength(2),
    );
  });

  it('shows an error when marking done fails', async () => {
    stubFetch((method, path) =>
      method === 'PATCH'
        ? jsonResponse(500, { error: 'Could not update.' })
        : handlerWith(deal)(method, path),
    );
    renderDetail();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Mark done' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not update.',
    );
  });

  it('logs a new activity for the deal', async () => {
    const fetchMock = stubFetch(handlerWith(deal));
    renderDetail();
    await screen.findByText('Called about pricing');
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Log activity' })[0],
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(
      within(dialog).getByLabelText(/What happened/),
      'Sent the quote',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Log' }));
    await waitFor(() => expect(calls(fetchMock, 'POST')).toHaveLength(1));
    const [path, init] = calls(fetchMock, 'POST')[0];
    expect(path).toBe('/api/activities');
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      description: 'Sent the quote',
      deal_id: 7,
      contact_id: null,
    });
  });

  it('edits an activity', async () => {
    const fetchMock = stubFetch(handlerWith(deal));
    renderDetail();
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/What happened/)).toHaveValue(
      'Called about pricing',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(calls(fetchMock, 'PATCH')).toHaveLength(1));
    expect(calls(fetchMock, 'PATCH')[0][0]).toBe('/api/activities/11');
  });

  it('deletes an activity after confirmation', async () => {
    const fetchMock = stubFetch(handlerWith(deal));
    renderDetail();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete' }),
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: /Delete/ }),
    );
    await waitFor(() => expect(calls(fetchMock, 'DELETE')).toHaveLength(1));
    expect(calls(fetchMock, 'DELETE')[0][0]).toBe('/api/activities/11');
  });
});
