import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { resetAuthForTests, TEST_SESSION_KEY } from './lib/auth';

function renderApp(signedIn: boolean) {
  resetAuthForTests();
  localStorage.clear();
  if (signedIn)
    localStorage.setItem(
      TEST_SESSION_KEY,
      JSON.stringify({ access_token: 'test-t', email: 'ana@example.com' }),
    );
  // Config answers at once. Data requests stay pending: no server runs in unit tests.
  vi.stubGlobal(
    'fetch',
    vi.fn((path: string) =>
      path === '/api/auth/config'
        ? Promise.resolve({
            ok: true,
            json: async () => ({
              supabase_url: '',
              supabase_publishable_key: '',
              test_sign_in: true,
            }),
          })
        : new Promise(() => {}),
    ),
  );
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('App shell', () => {
  it('opens on the dashboard when signed in', async () => {
    renderApp(true);
    const link = await screen.findByRole('link', { name: 'Dashboard' });
    await waitFor(() => expect(link).toHaveClass('active'));
  });

  it('shows the sign-in screen when signed out (R37)', async () => {
    renderApp(false);
    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Dashboard' }),
    ).not.toBeInTheDocument();
  });
});
