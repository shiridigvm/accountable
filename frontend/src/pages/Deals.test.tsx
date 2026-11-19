import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../api/client';
import type { Contact, Deal, Organization } from '../api/types';
import Deals from './Deals';

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  api: vi.fn(),
}));

const deal = (over: Partial<Deal>): Deal => ({
  id: 1,
  name: 'Big deal',
  stage: 'New',
  value_cents: 1234500,
  probability: 10,
  expected_close: '2026-12-01',
  actual_close: null,
  organization_id: 10,
  organization_name: 'Acme',
  main_contact_id: null,
  main_contact_name: null,
  position: 0,
  expected_cents: 123450,
  late: false,
  ...over,
});

const orgs: Organization[] = [
  {
    id: 10,
    name: 'Acme',
    website: null,
    industry: null,
    notes: null,
    contact_count: 1,
    deal_count: 1,
  },
];
const contacts: Contact[] = [
  {
    id: 20,
    name: 'Ada',
    email: null,
    phone: null,
    job_title: null,
    status: 'Active',
    organization_id: 10,
    organization_name: 'Acme',
  },
];

let deals: Deal[];

function mockApi() {
  vi.mocked(api).mockImplementation((method: string, path: string) => {
    if (method === 'GET' && path === '/api/deals')
      return Promise.resolve(deals as never);
    if (method === 'GET' && path === '/api/organizations')
      return Promise.resolve(orgs as never);
    if (method === 'GET' && path === '/api/contacts')
      return Promise.resolve(contacts as never);
    return Promise.resolve(undefined as never);
  });
}

function renderPage() {
  render(
    <MemoryRouter>
      <Deals />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  deals = [
    deal({ id: 1, name: 'Big deal', late: true }),
    deal({
      id: 2,
      name: 'Small deal',
      stage: 'Won',
      value_cents: 5000,
      probability: 100,
      organization_id: null,
      organization_name: null,
      actual_close: '2026-11-02',
    }),
  ];
  mockApi();
});

afterEach(() => {
  vi.mocked(api).mockReset();
});

describe('Deals page', () => {
  it('lists deals with value, stage, late flag and links', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Deals' })).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: 'Big deal' });
    expect(link).toHaveAttribute('href', '/deals/1');
    const row = link.closest('tr')!;
    expect(within(row).getByText('Late')).toBeInTheDocument();
    expect(within(row).getByText('$12,345.00')).toBeInTheDocument();
    expect(within(row).getByText('10%')).toBeInTheDocument();
    expect(within(row).getByText('Dec 1, 2026')).toBeInTheDocument();
    expect(within(row).getByText('Acme')).toBeInTheDocument();
    const other = screen
      .getByRole('link', { name: 'Small deal' })
      .closest('tr')!;
    expect(within(other).queryByText('Late')).not.toBeInTheDocument();
    expect(within(other).getByText('Nov 2, 2026')).toBeInTheDocument();
  });

  it('shows the error when loading fails', async () => {
    vi.mocked(api).mockRejectedValue(new ApiError('Server is down.', 500));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Server is down.',
    );
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('shows a loading message until the data arrives', async () => {
    renderPage();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    await screen.findByRole('link', { name: 'Big deal' });
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('filters deals with the search box', async () => {
    renderPage();
    await screen.findByRole('link', { name: 'Big deal' });
    await userEvent.type(screen.getByLabelText('Search deals'), 'small');
    expect(screen.queryByRole('link', { name: 'Big deal' })).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Small deal' }),
    ).toBeInTheDocument();
  });

  it('adds a deal with the value converted to cents, then reloads', async () => {
    renderPage();
    await screen.findByRole('link', { name: 'Big deal' });
    await userEvent.click(screen.getByRole('button', { name: 'Add deal' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Name/), 'New one');
    await userEvent.type(within(dialog).getByLabelText(/Value/), '12.34');
    await userEvent.type(
      within(dialog).getByLabelText(/Expected close date/),
      '2026-12-31',
    );
    deals = [...deals, deal({ id: 3, name: 'New one' })];
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        'POST',
        '/api/deals',
        expect.objectContaining({
          name: 'New one',
          stage: 'New',
          value_cents: 1234,
          probability: null,
          expected_close: '2026-12-31',
          organization_id: null,
        }),
      ),
    );
    expect(
      await screen.findByRole('link', { name: 'New one' }),
    ).toBeInTheDocument();
  });

  it('requires a name before adding', async () => {
    renderPage();
    await screen.findByRole('link', { name: 'Big deal' });
    await userEvent.click(screen.getByRole('button', { name: 'Add deal' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    expect(
      await within(dialog).findByText('Name is required.'),
    ).toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith(
      'POST',
      expect.anything(),
      expect.anything(),
    );
  });

  it('edits a deal and sends only the changed fields', async () => {
    renderPage();
    await screen.findByRole('link', { name: 'Big deal' });
    const row = screen.getByRole('link', { name: 'Big deal' }).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { name: 'Edit deal' }),
    ).toBeInTheDocument();
    const name = within(dialog).getByLabelText(/Name/);
    expect(name).toHaveValue('Big deal');
    await userEvent.clear(name);
    await userEvent.type(name, 'Bigger deal');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('PATCH', '/api/deals/1', {
        name: 'Bigger deal',
      }),
    );
  });

  it('shows the server error in the dialog when saving fails', async () => {
    renderPage();
    await screen.findByRole('link', { name: 'Big deal' });
    const row = screen.getByRole('link', { name: 'Big deal' }).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    vi.mocked(api).mockRejectedValueOnce(new ApiError('Name is taken.', 409));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Name is taken.',
    );
  });

  it('deletes a deal after confirmation, then reloads', async () => {
    renderPage();
    await screen.findByRole('link', { name: 'Big deal' });
    const row = screen.getByRole('link', { name: 'Big deal' }).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { name: 'Delete Big deal?' }),
    ).toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith('DELETE', expect.anything());
    deals = deals.filter((d) => d.id !== 1);
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Delete' }),
    );
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('DELETE', '/api/deals/1'),
    );
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Big deal' })).toBeNull(),
    );
  });
});
