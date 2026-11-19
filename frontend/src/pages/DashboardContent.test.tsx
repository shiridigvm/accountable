import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Board, Dashboard as DashboardData } from '../api/types';
import Dashboard from './Dashboard';

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

const dashboardData: DashboardData = {
  today: '2026-11-17',
  stats: {
    won_year_count: 4,
    won_year_cents: 1200000,
    open_count: 6,
    open_cents: 900000,
    expected_cents: 300000,
    late_count: 0,
  },
  monthly: [
    {
      month: '2026-10',
      won_count: 2,
      won_cents: 500000,
      expected_count: 0,
      expected_cents: 0,
    },
    {
      month: '2026-11',
      won_count: 1,
      won_cents: 200000,
      expected_count: 1,
      expected_cents: 100000,
    },
  ],
  follow_ups: [
    {
      id: 1,
      text: 'Call Ana back',
      who: 'Ana Lopez',
      due: '2026-11-10',
      status: 'overdue',
    },
    {
      id: 2,
      text: 'Send quote',
      who: 'Ben Ito',
      due: '2026-11-20',
      status: 'upcoming',
    },
  ],
  recent: [
    {
      kind: 'activity',
      id: 9,
      on: '2026-11-16',
      created_at: '2026-11-16T09:00:00',
      text: 'Left a voicemail',
      type: 'call',
    },
  ],
};

function column(
  stage: Board['columns'][number]['stage'],
  value_cents: number,
  open: boolean,
): Board['columns'][number] {
  return {
    stage,
    probability: 10,
    open,
    count: 1,
    value_cents,
    expected_cents: open ? value_cents / 2 : null,
    deals: [],
  };
}

const board: Board = {
  open_value_cents: 900000,
  open_expected_cents: 300000,
  columns: [
    column('New', 600000, true),
    column('Proposal', 300000, true),
    column('Won', 700000, false),
  ],
};

function stubFetch(
  overrides: Record<string, ReturnType<typeof jsonResponse>> = {},
) {
  const fetchMock = vi.fn((path: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${path}`;
    if (key in overrides) return Promise.resolve(overrides[key]);
    if (path === '/api/dashboard')
      return Promise.resolve(jsonResponse(200, dashboardData));
    if (path === '/api/pipeline')
      return Promise.resolve(jsonResponse(200, board));
    return Promise.resolve(jsonResponse(200, {}));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderDashboard() {
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('Dashboard content', () => {
  it('shows a loading message until both requests finish', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    renderDashboard();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows the date and the four headline figures', async () => {
    stubFetch();
    renderDashboard();
    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Tuesday, Nov 17, 2026')).toBeInTheDocument();
    const kpis = screen.getByRole('region', { name: 'Headline figures' });
    expect(within(kpis).getByText('4')).toBeInTheDocument();
    expect(within(kpis).getByText('$12,000.00')).toBeInTheDocument();
    expect(within(kpis).getByText('$9,000.00')).toBeInTheDocument();
    expect(within(kpis).getByText('6 open deals')).toBeInTheDocument();
    expect(within(kpis).getByText('$3,000.00')).toBeInTheDocument();
  });

  it('lists open stages only in the pipeline table', async () => {
    stubFetch();
    renderDashboard();
    await screen.findByText('Open pipeline', { selector: 'h2' });
    const table = screen.getByRole('table');
    expect(within(table).getByText('New')).toBeInTheDocument();
    expect(within(table).getByText('Proposal')).toBeInTheDocument();
    expect(within(table).queryByText('Won')).not.toBeInTheDocument();
    expect(within(table).getByText('$6,000.00')).toBeInTheDocument();
    expect(within(table).getByText('$3,000.00 exp.')).toBeInTheDocument();
  });

  it('lists follow-ups with overdue and upcoming tags', async () => {
    stubFetch();
    renderDashboard();
    expect(await screen.findByText('Call Ana back')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Ana Lopez · Nov 10, 2026')).toBeInTheDocument();
  });

  it('shows an empty message when there are no follow-ups', async () => {
    stubFetch({
      'GET /api/dashboard': jsonResponse(200, {
        ...dashboardData,
        follow_ups: [],
      }),
    });
    renderDashboard();
    expect(
      await screen.findByText('No follow-ups due in the next 14 days.'),
    ).toBeInTheDocument();
  });

  it('shows recent activity and a link to the pipeline', async () => {
    stubFetch();
    renderDashboard();
    expect(await screen.findByText('Left a voicemail')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open the pipeline' }),
    ).toHaveAttribute('href', '/pipeline');
  });

  it('marks a follow-up done and reloads the dashboard', async () => {
    const fetchMock = stubFetch();
    renderDashboard();
    const buttons = await screen.findAllByRole('button', { name: 'Mark done' });
    await userEvent.click(buttons[0]);
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(([path]) => path === '/api/dashboard'),
      ).toHaveLength(2),
    );
    const patch = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === 'PATCH',
    );
    expect(patch?.[0]).toBe('/api/activities/1');
  });

  it('shows an error when marking done fails and keeps the page', async () => {
    stubFetch({
      'PATCH /api/activities/1': jsonResponse(500, { error: 'Not saved.' }),
    });
    renderDashboard();
    const buttons = await screen.findAllByRole('button', { name: 'Mark done' });
    await userEvent.click(buttons[0]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Not saved.');
    expect(screen.getByText('Call Ana back')).toBeInTheDocument();
  });

  it('shows the error when the dashboard request fails', async () => {
    stubFetch({
      'GET /api/dashboard': jsonResponse(500, { error: 'Dashboard is down.' }),
    });
    renderDashboard();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Dashboard is down.',
    );
  });
});
