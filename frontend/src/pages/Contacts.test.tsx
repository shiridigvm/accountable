import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Contact, Organization } from '../api/types';
import Contacts from './Contacts';

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

const orgs: Organization[] = [
  {
    id: 7,
    name: 'Acme',
    website: null,
    industry: null,
    notes: null,
    contact_count: 1,
    deal_count: 0,
    created_by: 'ana@example.com',
    updated_by: 'ben@example.com',
  },
];

const contacts: Contact[] = [
  {
    id: 1,
    name: 'Ana Silva',
    email: 'ana@example.com',
    phone: '555-0100',
    job_title: 'CTO',
    status: 'lead',
    organization_id: 7,
    organization_name: 'Acme',
    created_by: 'ana@example.com',
    updated_by: 'ben@example.com',
  },
  {
    id: 2,
    name: 'Ben Okoro',
    email: null,
    phone: null,
    job_title: null,
    status: 'customer',
    organization_id: null,
    organization_name: null,
    created_by: 'ana@example.com',
    updated_by: 'ben@example.com',
  },
];

type Handler = (method: string, path: string) => unknown;

// Answers the organizations list, and defers everything else to the test.
function stubFetch(handler: Handler) {
  const fetchMock = vi.fn((path: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'GET' && path === '/api/organizations')
      return Promise.resolve(jsonResponse(200, orgs));
    return Promise.resolve(handler(method, path));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage() {
  render(
    <MemoryRouter>
      <Contacts />
    </MemoryRouter>,
  );
}

function rowFor(name: string) {
  return screen.getByRole('link', { name }).closest('tr') as HTMLElement;
}

afterEach(() => vi.unstubAllGlobals());

describe('Contacts', () => {
  it('lists contacts with links, status labels and blanks for missing values', async () => {
    stubFetch(() => jsonResponse(200, contacts));
    renderPage();
    const table = await screen.findByRole('table', { name: 'Contacts' });
    expect(
      within(table).getByRole('link', { name: 'Ana Silva' }),
    ).toHaveAttribute('href', '/contacts/1');
    expect(within(rowFor('Ana Silva')).getByText('Lead')).toBeVisible();
    expect(within(rowFor('Ana Silva')).getByText('Acme')).toBeVisible();
    expect(within(rowFor('Ben Okoro')).getByText('Customer')).toBeVisible();
  });

  it('shows a loading message until data arrives', async () => {
    stubFetch(() => jsonResponse(200, contacts));
    renderPage();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    await screen.findByRole('table', { name: 'Contacts' });
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('shows the error and no table when contacts fail to load', async () => {
    stubFetch(() => jsonResponse(500, { error: 'Contacts are unavailable.' }));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Contacts are unavailable.',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the empty text when there are no contacts', async () => {
    stubFetch(() => jsonResponse(200, []));
    renderPage();
    expect(
      await screen.findByText('No contacts match this filter.'),
    ).toBeVisible();
  });

  it('searches across columns, including the organization name', async () => {
    stubFetch(() => jsonResponse(200, contacts));
    renderPage();
    await screen.findByRole('table', { name: 'Contacts' });
    await userEvent.type(screen.getByLabelText('Search contacts'), 'acme');
    expect(screen.getByRole('link', { name: 'Ana Silva' })).toBeVisible();
    expect(
      screen.queryByRole('link', { name: 'Ben Okoro' }),
    ).not.toBeInTheDocument();
  });

  it('asks the server for the chosen status', async () => {
    const fetchMock = stubFetch((_method, path) =>
      jsonResponse(
        200,
        path === '/api/contacts?status=customer' ? [contacts[1]] : contacts,
      ),
    );
    renderPage();
    await screen.findByRole('table', { name: 'Contacts' });
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'customer');
    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: 'Ana Silva' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('link', { name: 'Ben Okoro' })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/contacts?status=customer',
      expect.anything(),
    );
  });

  it('creates a contact, cleaning values and converting the organization id', async () => {
    const fetchMock = stubFetch((method) =>
      jsonResponse(
        method === 'POST' ? 201 : 200,
        method === 'POST' ? {} : contacts,
      ),
    );
    renderPage();
    await screen.findByRole('table', { name: 'Contacts' });
    await userEvent.click(screen.getByRole('button', { name: 'Add contact' }));
    await userEvent.type(screen.getByLabelText(/Name/), ' Cy Young ');
    await userEvent.type(screen.getByLabelText('Email'), 'cy@example.com');
    await userEvent.selectOptions(screen.getByLabelText('Organization'), '7');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/contacts',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Cy Young',
            email: 'cy@example.com',
            phone: null,
            job_title: null,
            status: 'lead',
            organization_id: 7,
          }),
        }),
      ),
    );
  });

  it('requires a name and a valid email before saving', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, contacts));
    renderPage();
    await screen.findByRole('table', { name: 'Contacts' });
    await userEvent.click(screen.getByRole('button', { name: 'Add contact' }));
    await userEvent.type(screen.getByLabelText('Email'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Name is required.')).toBeVisible();
    expect(screen.getByText(/Enter an email address/)).toBeVisible();
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
    ).toBe(false);
  });

  it('edits a contact with its current values filled in', async () => {
    const fetchMock = stubFetch((method) =>
      jsonResponse(200, method === 'PATCH' ? {} : contacts),
    );
    renderPage();
    await screen.findByRole('table', { name: 'Contacts' });
    await userEvent.click(
      within(rowFor('Ana Silva')).getByRole('button', { name: 'Edit' }),
    );
    expect(screen.getByLabelText(/Name/)).toHaveValue('Ana Silva');
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Organization')).toHaveValue('7');
    await userEvent.selectOptions(
      within(dialog).getByLabelText(/Status/),
      'qualified',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/contacts/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            name: 'Ana Silva',
            email: 'ana@example.com',
            phone: '555-0100',
            job_title: 'CTO',
            status: 'qualified',
            organization_id: 7,
          }),
        }),
      ),
    );
  });

  it('shows the server error and keeps the form open when saving fails', async () => {
    stubFetch((method) =>
      method === 'POST'
        ? jsonResponse(422, { error: 'Email is taken.' })
        : jsonResponse(200, contacts),
    );
    renderPage();
    await screen.findByRole('table', { name: 'Contacts' });
    await userEvent.click(screen.getByRole('button', { name: 'Add contact' }));
    await userEvent.type(screen.getByLabelText(/Name/), 'Cy');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email is taken.',
    );
  });

  it('deletes a contact after confirmation', async () => {
    const fetchMock = stubFetch((method) =>
      method === 'DELETE'
        ? jsonResponse(204, null)
        : jsonResponse(200, contacts),
    );
    renderPage();
    await screen.findByRole('table', { name: 'Contacts' });
    await userEvent.click(
      within(rowFor('Ben Okoro')).getByRole('button', { name: 'Delete' }),
    );
    expect(screen.getByText('Delete Ben Okoro?')).toBeVisible();
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/contacts/2',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });

  it('explains why a contact with linked deals cannot be deleted', async () => {
    stubFetch((method) =>
      method === 'DELETE'
        ? jsonResponse(409, {
            error: 'Ana Silva is linked to other records.',
            linked: { 'deals as main contact': 1, activities: 3 },
          })
        : jsonResponse(200, contacts),
    );
    renderPage();
    await screen.findByRole('table', { name: 'Contacts' });
    await userEvent.click(
      within(rowFor('Ana Silva')).getByRole('button', { name: 'Delete' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );
    expect(
      await screen.findByText('Ana Silva is linked to other records.'),
    ).toBeVisible();
    expect(screen.getByText('1 deal as main contact')).toBeVisible();
    expect(screen.getByText('3 activities')).toBeVisible();
  });
});
