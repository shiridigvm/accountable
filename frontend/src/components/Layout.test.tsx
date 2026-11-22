import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { sendChat } from '../api/copilot';
import { Layout } from './Layout';

vi.mock('../api/copilot', () => ({ sendChat: vi.fn() }));

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
          <Route
            path="deals"
            element={
              <>
                <p>Deals page</p>
                <Link to="/pipeline">Go to pipeline</Link>
              </>
            }
          />
          <Route path="pipeline" element={<p>Pipeline page</p>} />
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

  it('has the Copilot button in the top bar, left of the user menu (R58)', () => {
    renderAt('/deals');
    const buttons = within(screen.getByRole('banner')).getAllByRole('button');
    const names = buttons.map(
      (b) => b.getAttribute('aria-label') ?? b.textContent,
    );
    expect(names.slice(-2)).toEqual([
      'Copilot',
      'Account menu for ana@example.com',
    ]);
  });

  it('opens and closes the panel, and shows the button as pressed while open', async () => {
    renderAt('/deals');
    const button = screen.getByRole('button', { name: 'Copilot' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('complementary', { name: 'Copilot' })).toBeNull();

    await userEvent.click(button);
    const panel = screen.getByRole('complementary', { name: 'Copilot' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('aria-controls', panel.id);
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveFocus();

    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('complementary', { name: 'Copilot' })).toBeNull();
  });

  it('Escape and the close button close the panel and put focus back on the button', async () => {
    renderAt('/deals');
    const button = screen.getByRole('button', { name: 'Copilot' });
    await userEvent.click(button);
    await userEvent.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveFocus();

    // Escape works with focus outside the panel too.
    await userEvent.click(button);
    button.focus();
    await userEvent.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(button);
    await userEvent.click(
      screen.getByRole('button', { name: 'Close Copilot' }),
    );
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveFocus();
  });

  it('keeps the conversation when moving to another page and when the panel closes (R59)', async () => {
    vi.mocked(sendChat).mockResolvedValue({
      reply: 'Two deals close this month.',
      records: [],
      proposal: null,
    });
    renderAt('/deals');
    const button = screen.getByRole('button', { name: 'Copilot' });
    await userEvent.click(button);
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Message' }),
      'What closes soon?{Enter}',
    );
    await screen.findByText('Two deals close this month.');

    await userEvent.click(screen.getByRole('link', { name: 'Go to pipeline' }));
    expect(screen.getByText('Pipeline page')).toBeInTheDocument();
    expect(screen.getByText('Two deals close this month.')).toBeVisible();

    await userEvent.click(button);
    await userEvent.click(button);
    expect(screen.getByText('What closes soon?')).toBeVisible();
  });
});
