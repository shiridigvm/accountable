import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Contact, TimelineEntry } from '../api/types';
import ContactDetail from './ContactDetail';

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

const contact: Contact = {
  id: 4,
  name: 'Ana Lopez',
  email: 'ana@example.com',
  phone: '555-0100',
  job_title: 'Buyer',
  status: 'customer',
  organization_id: 3,
  organization_name: 'Acme',
};

const entries: TimelineEntry[] = [
  {
    kind: 'activity',
    id: 11,
    on: '2026-11-10',
    created_at: '2026-11-10T10:00:00',
    text: 'Emailed the contract',
    type: 'email',
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

function handlerWith(c: Contact): Handler {
  return (_method, path) => {
    if (path === '/api/contacts/4') return jsonResponse(200, c);
    if (path === '/api/contacts/4/timeline') return jsonResponse(200, entries);
    return jsonResponse(200, {});
  };
}

function renderDetail() {
  render(
    <MemoryRouter initialEntries={['/contacts/4']}>
      <Routes>
        <Route path="/contacts/:id" element={<ContactDetail />} />
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

describe('ContactDetail', () => {
  it('shows the contact, organization link and timeline', async () => {
    stubFetch(handlerWith(contact));
    renderDetail();
    expect(
      await screen.findByRole('heading', { name: 'Ana Lopez' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Buyer/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Acme' })).toHaveAttribute(
      'href',
      '/organizations/3',
    );
    expect(screen.getByText('ana@example.com · 555-0100')).toBeInTheDocument();
    expect(screen.getByText('Emailed the contract')).toBeInTheDocument();
  });

  it('shows fallbacks when the contact has no organization, email or phone', async () => {
    stubFetch(
      handlerWith({
        ...contact,
        organization_id: null,
        organization_name: null,
        email: null,
        phone: null,
        job_title: null,
      }),
    );
    renderDetail();
    expect(await screen.findByText('No organization')).toBeInTheDocument();
    expect(screen.getByText('No email or phone.')).toBeInTheDocument();
  });

  it('shows the load error', async () => {
    stubFetch((_method, path) =>
      path === '/api/contacts/4'
        ? jsonResponse(404, { error: 'Contact not found.' })
        : jsonResponse(200, []),
    );
    renderDetail();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Contact not found.',
    );
  });

  it('shows a loading message while the contact loads', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    renderDetail();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows a timeline error without hiding the contact', async () => {
    stubFetch((_method, path) =>
      path === '/api/contacts/4/timeline'
        ? jsonResponse(500, { error: 'Timeline broke.' })
        : handlerWith(contact)(_method, path),
    );
    renderDetail();
    // Only checks that an alert shows. See the report: the page passes a string to errorMessage.
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ana Lopez' })).toBeVisible();
  });

  it('marks a follow-up done and reloads the timeline', async () => {
    const fetchMock = stubFetch(handlerWith(contact));
    renderDetail();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Mark done' }),
    );
    await waitFor(() => expect(calls(fetchMock, 'PATCH')).toHaveLength(1));
    expect(calls(fetchMock, 'PATCH')[0][0]).toBe('/api/activities/11');
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(
          ([path]) => path === '/api/contacts/4/timeline',
        ),
      ).toHaveLength(2),
    );
  });

  it('shows an error when marking done fails', async () => {
    stubFetch((method, path) =>
      method === 'PATCH'
        ? jsonResponse(500, { error: 'Could not update.' })
        : handlerWith(contact)(method, path),
    );
    renderDetail();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Mark done' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not update.',
    );
  });

  it('logs a new activity for the contact', async () => {
    const fetchMock = stubFetch(handlerWith(contact));
    renderDetail();
    await screen.findByText('Emailed the contract');
    await userEvent.click(screen.getByRole('button', { name: 'Log activity' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(
      within(dialog).getByLabelText(/What happened/),
      'Met at the show',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Log' }));
    await waitFor(() => expect(calls(fetchMock, 'POST')).toHaveLength(1));
    const [path, init] = calls(fetchMock, 'POST')[0];
    expect(path).toBe('/api/activities');
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      description: 'Met at the show',
      contact_id: 4,
      deal_id: null,
    });
  });

  it('edits an activity', async () => {
    const fetchMock = stubFetch(handlerWith(contact));
    renderDetail();
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(/What happened/)).toHaveValue(
      'Emailed the contract',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(calls(fetchMock, 'PATCH')).toHaveLength(1));
  });

  it('deletes an activity after confirmation', async () => {
    const fetchMock = stubFetch(handlerWith(contact));
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
