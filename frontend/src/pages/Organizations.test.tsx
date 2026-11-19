import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Organization } from '../api/types';
import Organizations from './Organizations';

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

const orgs: Organization[] = [
  {
    id: 1,
    name: 'Acme',
    website: 'acme.example',
    industry: 'Manufacturing',
    notes: null,
    contact_count: 2,
    deal_count: 1,
  },
  {
    id: 2,
    name: 'Globex',
    website: null,
    industry: null,
    notes: 'Big account',
    contact_count: 0,
    deal_count: 0,
  },
];

type Handler = (method: string, path: string, body?: unknown) => unknown;

function stubFetch(handler: Handler) {
  const fetchMock = vi.fn((path: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    return Promise.resolve(handler(init?.method ?? 'GET', path, body));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage() {
  render(
    <MemoryRouter>
      <Organizations />
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('Organizations', () => {
  it('lists organizations with links, counts and blanks for missing values', async () => {
    stubFetch(() => jsonResponse(200, orgs));
    renderPage();
    const table = await screen.findByRole('table', { name: 'Organizations' });
    expect(within(table).getByRole('link', { name: 'Acme' })).toHaveAttribute(
      'href',
      '/organizations/1',
    );
    expect(within(table).getByText('Manufacturing')).toBeInTheDocument();
    expect(within(table).getByText('acme.example')).toBeInTheDocument();
    expect(within(table).getByRole('link', { name: 'Globex' })).toBeVisible();
  });

  it('shows a loading message until the list arrives', async () => {
    stubFetch(() => jsonResponse(200, orgs));
    renderPage();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    await screen.findByRole('table', { name: 'Organizations' });
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('shows the empty text when there are no organizations', async () => {
    stubFetch(() => jsonResponse(200, []));
    renderPage();
    expect(await screen.findByText('No organizations yet.')).toBeVisible();
  });

  it('shows the error and no table when loading fails', async () => {
    stubFetch(() => jsonResponse(500, { error: 'Database is down.' }));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Database is down.',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('filters the table with the search box', async () => {
    stubFetch(() => jsonResponse(200, orgs));
    renderPage();
    await screen.findByRole('table', { name: 'Organizations' });
    await userEvent.type(screen.getByLabelText('Search organizations'), 'glob');
    expect(
      screen.queryByRole('link', { name: 'Acme' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Globex' })).toBeVisible();
    await userEvent.clear(screen.getByLabelText('Search organizations'));
    await userEvent.type(screen.getByLabelText('Search organizations'), 'zzz');
    expect(screen.getByText('No matches for this search.')).toBeVisible();
  });

  it('creates an organization, trimming values and sending blanks as null', async () => {
    const fetchMock = stubFetch((method) =>
      jsonResponse(
        method === 'POST' ? 201 : 200,
        method === 'POST' ? {} : orgs,
      ),
    );
    renderPage();
    await screen.findByRole('table', { name: 'Organizations' });
    await userEvent.click(
      screen.getByRole('button', { name: 'Add organization' }),
    );
    await userEvent.type(screen.getByLabelText(/Name/), '  Initech ');
    await userEvent.type(screen.getByLabelText('Industry'), 'Software');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/organizations',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Initech',
            website: null,
            industry: 'Software',
            notes: null,
          }),
        }),
      ),
    );
    // The list is fetched again after saving.
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(
          ([, init]) => (init?.method ?? 'GET') === 'GET',
        ),
      ).toHaveLength(2),
    );
  });

  it('requires a name when creating', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, orgs));
    renderPage();
    await screen.findByRole('table', { name: 'Organizations' });
    await userEvent.click(
      screen.getByRole('button', { name: 'Add organization' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Name is required.')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('edits an organization with the current values filled in', async () => {
    const fetchMock = stubFetch((method) =>
      jsonResponse(200, method === 'PATCH' ? {} : orgs),
    );
    renderPage();
    const row = (await screen.findByRole('link', { name: 'Globex' })).closest(
      'tr',
    ) as HTMLElement;
    await userEvent.click(within(row).getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Notes')).toHaveValue('Big account');
    await userEvent.clear(screen.getByLabelText(/Name/));
    await userEvent.type(screen.getByLabelText(/Name/), 'Globex Corp');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/organizations/2',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            name: 'Globex Corp',
            website: null,
            industry: null,
            notes: 'Big account',
          }),
        }),
      ),
    );
  });

  it('shows the server error and keeps the form open when saving fails', async () => {
    stubFetch((method) =>
      method === 'POST'
        ? jsonResponse(422, { error: 'Name is taken.' })
        : jsonResponse(200, orgs),
    );
    renderPage();
    await screen.findByRole('table', { name: 'Organizations' });
    await userEvent.click(
      screen.getByRole('button', { name: 'Add organization' }),
    );
    await userEvent.type(screen.getByLabelText(/Name/), 'Acme');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Name is taken.',
    );
  });

  it('deletes an organization after confirmation', async () => {
    const fetchMock = stubFetch((method) =>
      method === 'DELETE' ? jsonResponse(204, null) : jsonResponse(200, orgs),
    );
    renderPage();
    const row = (await screen.findByRole('link', { name: 'Acme' })).closest(
      'tr',
    ) as HTMLElement;
    await userEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Delete Acme?')).toBeVisible();
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/organizations/1',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByText('Delete Acme?')).not.toBeInTheDocument(),
    );
  });

  it('explains why an organization with linked records cannot be deleted', async () => {
    stubFetch((method) =>
      method === 'DELETE'
        ? jsonResponse(409, {
            error: 'Acme still has records.',
            linked: { contacts: 2, deals: 1 },
          })
        : jsonResponse(200, orgs),
    );
    renderPage();
    const row = (await screen.findByRole('link', { name: 'Acme' })).closest(
      'tr',
    ) as HTMLElement;
    await userEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );
    expect(await screen.findByText('Acme still has records.')).toBeVisible();
    expect(screen.getByText('2 contacts')).toBeVisible();
    expect(screen.getByText('1 deal')).toBeVisible();
  });

  it('closes the delete dialog on cancel without deleting', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, orgs));
    renderPage();
    const row = (await screen.findByRole('link', { name: 'Acme' })).closest(
      'tr',
    ) as HTMLElement;
    await userEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Delete Acme?')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
