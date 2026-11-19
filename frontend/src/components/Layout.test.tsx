import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Layout } from './Layout';

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
});
