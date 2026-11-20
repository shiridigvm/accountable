import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chooseTheme, THEME_STORAGE_KEY } from '../lib/theme';
import { UserMenu } from './UserMenu';

const signOut = vi.fn();

vi.mock('../lib/auth', () => ({
  useSession: () => ({
    email: 'jane.doe@example.com',
    accessToken: 't',
    kind: 'test',
  }),
  signOut: () => signOut(),
}));

beforeEach(() => {
  signOut.mockReset();
  chooseTheme('system');
});

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

function menuButton() {
  return screen.getByRole('button', {
    name: 'Account menu for jane.doe@example.com',
  });
}

describe('UserMenu', () => {
  it('shows the initials on a closed button (R47)', () => {
    render(<UserMenu />);
    expect(menuButton()).toHaveTextContent('JD');
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('holds the email, three themes with the current one checked, and Sign out (R48)', async () => {
    render(<UserMenu />);
    await userEvent.click(menuButton());
    const menu = screen.getByRole('menu', { name: 'Account' });
    expect(menu).toHaveTextContent('jane.doe@example.com');
    const themes = screen.getAllByRole('menuitemradio');
    expect(themes.map((t) => t.textContent)).toEqual([
      'Light',
      'Dark',
      'System',
    ]);
    expect(
      screen.getByRole('menuitemradio', { name: 'System' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
  });

  it('picks a theme, saves it and closes (R33, R34)', async () => {
    render(<UserMenu />);
    await userEvent.click(menuButton());
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Dark' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await userEvent.click(menuButton());
    expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('signs out from the menu (R42)', async () => {
    render(<UserMenu />);
    await userEvent.click(menuButton());
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('works from the keyboard (R49)', async () => {
    render(<UserMenu />);
    menuButton().focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('menuitemradio', { name: 'Light' })).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: 'Light' })).toHaveFocus();
    await userEvent.keyboard('{End}{Home}{ArrowDown}');

    await userEvent.keyboard(' ');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(menuButton()).toHaveFocus();
  });

  it('opens with Space and closes with Escape, returning focus (R49)', async () => {
    render(<UserMenu />);
    menuButton().focus();
    await userEvent.keyboard(' ');
    expect(screen.getByRole('menu')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(menuButton()).toHaveFocus();
  });

  it('opens on the last item with the Up arrow', async () => {
    render(<UserMenu />);
    menuButton().focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus();
  });

  it('closes when focus leaves it', async () => {
    render(
      <>
        <UserMenu />
        <button type="button">Elsewhere</button>
      </>,
    );
    await userEvent.click(menuButton());
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
