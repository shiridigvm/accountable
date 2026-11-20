import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAuthForTests, TEST_SESSION_KEY } from '../lib/auth';
import { AuthGate } from './AuthGate';

function stubServer(testSignIn: boolean | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string, init?: RequestInit) => {
      if (path === '/api/auth/config') {
        if (testSignIn === null) throw new TypeError('Failed to fetch');
        return {
          ok: true,
          json: async () => ({
            supabase_url: '',
            supabase_publishable_key: '',
            test_sign_in: testSignIn,
          }),
        };
      }
      const { email } = JSON.parse(String(init?.body));
      return {
        ok: true,
        json: async () => ({ access_token: 'test-t', email }),
      };
    }),
  );
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthGate>
        <Routes>
          <Route path="/deals/:id" element={<h1>Deal page</h1>} />
        </Routes>
      </AuthGate>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  resetAuthForTests();
  localStorage.clear();
});

describe('AuthGate', () => {
  it('shows the sign-in screen at the asked-for URL, then that page (R37, R39)', async () => {
    stubServer(true);
    renderAt('/deals/3');
    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Deal page')).not.toBeInTheDocument();

    const testForm = screen.getByRole('form', { name: 'Test sign-in' });
    await userEvent.type(
      testForm.querySelector('input') as HTMLInputElement,
      'ana@example.com',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Sign in for testing' }),
    );
    expect(await screen.findByText('Deal page')).toBeInTheDocument();
  });

  it('shows the page straight away with a saved session', async () => {
    localStorage.setItem(
      TEST_SESSION_KEY,
      JSON.stringify({ access_token: 'test-t', email: 'ana@example.com' }),
    );
    stubServer(true);
    renderAt('/deals/3');
    expect(await screen.findByText('Deal page')).toBeInTheDocument();
  });

  it('says so when the server cannot be reached', async () => {
    stubServer(null);
    renderAt('/deals/3');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot reach the Accountable server.',
    );
  });
});
