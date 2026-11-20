import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Layout } from './Layout';

vi.mock('../lib/auth', () => ({
  useSession: () => ({
    email: 'ana@example.com',
    accessToken: 't',
    kind: 'test',
  }),
  signOut: vi.fn(),
}));

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="deals" element={<p>Deals page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('Layout', () => {
  it('links to every section and renders the routed page', () => {
    renderAt('/deals');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const links = Array.from(nav.querySelectorAll('a')).map((a) => [
      a.textContent,
      a.getAttribute('href'),
    ]);
    expect(links).toEqual([
      ['Dashboard', '/dashboard'],
      ['Organizations', '/organizations'],
      ['Contacts', '/contacts'],
      ['Deals', '/deals'],
      ['Pipeline', '/pipeline'],
    ]);
    expect(screen.getByText('Deals page')).toBeInTheDocument();
  });

  it('marks only the current section as the active page', () => {
    renderAt('/deals');
    expect(screen.getByRole('link', { name: 'Deals' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Contacts' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('has a top bar with the search box and the user menu, and no theme toggle', () => {
    renderAt('/deals');
    const topbar = screen.getByRole('banner');
    expect(
      within(topbar).getByRole('combobox', { name: 'Search' }),
    ).toBeInTheDocument();
    expect(
      within(topbar).getByRole('button', {
        name: 'Account menu for ana@example.com',
      }),
    ).toHaveTextContent('A');
    expect(
      screen.queryByRole('button', { name: 'Dark mode' }),
    ).not.toBeInTheDocument();
    const sidebar = screen.getByRole('complementary');
    expect(within(sidebar).queryByRole('button')).not.toBeInTheDocument();
  });
});
