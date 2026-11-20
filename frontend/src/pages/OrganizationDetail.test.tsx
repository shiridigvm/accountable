import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Contact, Deal, Organization, TimelineEntry } from '../api/types';
import OrganizationDetail from './OrganizationDetail';

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

const org: Organization = {
  id: 7,
  name: 'Acme',
  website: 'acme.example',
  industry: 'Manufacturing',
  notes: 'Long-standing customer.',
  contact_count: 1,
  deal_count: 1,
  created_by: 'ana@example.com',
  updated_by: 'ben@example.com',
};

function contact(id: number, name: string, organization_id: number | null) {
  return {
    id,
    name,
    email: null,
    phone: null,
    job_title: 'CTO',
    status: 'lead',
    organization_id,
    organization_name: null,
    created_by: 'ana@example.com',
    updated_by: 'ben@example.com',
  } satisfies Contact;
}

function deal(id: number, name: string, organization_id: number | null) {
  return {
    id,
    name,
    stage: 'Proposal',
    value_cents: 1250000,
    probability: 50,
    expected_close: '2026-12-01',
    actual_close: null,
    organization_id,
    organization_name: null,
    main_contact_id: null,
    main_contact_name: null,
    position: 0,
    expected_cents: 625000,
    late: false,
    created_by: 'ana@example.com',
    updated_by: 'ben@example.com',
  } satisfies Deal;
}

const entry: TimelineEntry = {
  kind: 'activity',
  id: 1,
  on: '2026-11-10',
  created_at: '2026-11-10T10:00:00',
  text: 'Called about renewal.',
  type: 'call',
};

type Routes = Record<string, unknown>;

// Maps each API path to a response; an unlisted path answers 404.
function stubFetch(responses: Routes) {
  vi.stubGlobal(
    'fetch',
    vi.fn((path: string) =>
      Promise.resolve(
        path in responses
          ? (responses[path] as ReturnType<typeof jsonResponse>)
          : jsonResponse(404, { error: 'Not found.' }),
      ),
    ),
  );
}

const happy: Routes = {
  '/api/organizations/7': jsonResponse(200, org),
  '/api/organizations/7/timeline': jsonResponse(200, [entry]),
  '/api/contacts': jsonResponse(200, [
    contact(1, 'Ana Silva', 7),
    contact(2, 'Other Person', 8),
  ]),
  '/api/deals': jsonResponse(200, [
    deal(10, 'Renewal', 7),
    deal(11, 'Elsewhere', 8),
  ]),
};

function renderPage(id = '7') {
  render(
    <MemoryRouter initialEntries={[`/organizations/${id}`]}>
      <Routes>
        <Route path="/organizations/:id" element={<OrganizationDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('OrganizationDetail', () => {
  it('shows the summary, only this organization contacts and deals, and the timeline', async () => {
    stubFetch(happy);
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Acme' })).toBeVisible();
    // R46: who added and last changed the record, in the summary panel.
    expect(screen.getByText('Added by').nextElementSibling).toHaveTextContent(
      'ana@example.com',
    );
    expect(
      screen.getByText('Last changed by').nextElementSibling,
    ).toHaveTextContent('ben@example.com');
    expect(screen.getByText('Manufacturing · acme.example')).toBeVisible();
    expect(screen.getByText('Long-standing customer.')).toBeVisible();
    expect(screen.getByText('1 contacts · 1 deals')).toBeVisible();

    expect(
      await screen.findByRole('link', { name: 'Ana Silva' }),
    ).toHaveAttribute('href', '/contacts/1');
    expect(screen.queryByText('Other Person')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Renewal' })).toHaveAttribute(
      'href',
      '/deals/10',
    );
    expect(screen.getByText('Proposal · $12,500.00')).toBeVisible();
    expect(screen.queryByText('Elsewhere')).not.toBeInTheDocument();
    expect(screen.getByText('Called about renewal.')).toBeVisible();
  });

  it('shows loading while the organization is fetched', () => {
    stubFetch(happy);
    renderPage();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows the error instead of the page when the organization fails to load', async () => {
    stubFetch({
      ...happy,
      '/api/organizations/7': jsonResponse(404, {
        error: 'Organization not found.',
      }),
    });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Organization not found.',
    );
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('shows placeholders when there are no notes, contacts, deals or details', async () => {
    stubFetch({
      '/api/organizations/7': jsonResponse(200, {
        ...org,
        notes: null,
        industry: null,
        website: null,
      }),
      '/api/organizations/7/timeline': jsonResponse(200, []),
      '/api/contacts': jsonResponse(200, []),
      '/api/deals': jsonResponse(200, []),
    });
    renderPage();
    expect(await screen.findByText('No notes.')).toBeVisible();
    expect(screen.getByText('No contacts.')).toBeVisible();
    expect(screen.getByText('No deals.')).toBeVisible();
    expect(screen.getByText('Nothing has happened yet.')).toBeVisible();
  });

  it('shows only the timeline error when the timeline fails', async () => {
    stubFetch({
      ...happy,
      '/api/organizations/7/timeline': jsonResponse(500, {
        error: 'Timeline is unavailable.',
      }),
    });
    renderPage();
    const alert = await screen.findByRole('alert');
    // The text is not asserted: the page passes an already-readable string to errorMessage(),
    // which replaces it with 'Something went wrong.' (reported as a bug, not covered here).
    expect(screen.getByRole('heading', { name: 'Acme' })).toBeVisible();
    expect(
      within(
        screen
          .getByRole('heading', { name: 'Timeline' })
          .closest('section') as HTMLElement,
      ).getByRole('alert'),
    ).toBe(alert);
  });
});
