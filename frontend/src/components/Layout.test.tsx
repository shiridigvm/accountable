import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY } from '../lib/theme';
import { Layout } from './Layout';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

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

describe('dark mode toggle', () => {
  function toggle() {
    return screen.getByRole('button', { name: 'Dark mode' });
  }

  it('sits in the sidebar after the section links, off by default', () => {
    renderAt('/deals');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav.nextElementSibling).toBe(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });

  it('switches to dark and back, saving each choice', async () => {
    const user = userEvent.setup();
    renderAt('/deals');

    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('starts pressed when the page already loaded in dark mode', () => {
    document.documentElement.dataset.theme = 'dark';
    renderAt('/deals');
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('still switches when the choice cannot be saved', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    const user = userEvent.setup();
    renderAt('/deals');

    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
});
