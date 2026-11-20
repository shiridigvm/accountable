import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import {
  SERVICE_UNREACHABLE,
  TEST_SESSION_KEY,
  WRONG_PASSWORD,
  getAccessToken,
  resetAuthForTests,
  signIn,
  signOut,
  startAuth,
  testSignIn,
  useAuth,
} from './auth';
import { renderHook } from '@testing-library/react';

const fakeAuth = {
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
};

vi.mock('@supabase/supabase-js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@supabase/supabase-js')>();
  return { ...actual, createClient: vi.fn(() => ({ auth: fakeAuth })) };
});

const CONFIG = {
  supabase_url: 'https://project.supabase.co',
  supabase_publishable_key: 'sb_publishable_x',
  test_sign_in: true,
};

function stubServer(config: object | null = CONFIG) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string, init?: RequestInit) => {
      if (path === '/api/auth/config') {
        if (!config) throw new TypeError('Failed to fetch');
        return { ok: true, json: async () => config };
      }
      const { email } = JSON.parse(String(init?.body));
      return {
        ok: true,
        json: async () => ({ access_token: `test-${email}`, email }),
      };
    }),
  );
}

function current() {
  return renderHook(() => useAuth()).result.current;
}

beforeEach(() => {
  resetAuthForTests();
  localStorage.clear();
  vi.unstubAllGlobals();
  fakeAuth.getSession.mockResolvedValue({ data: { session: null } });
  fakeAuth.signOut.mockResolvedValue({ error: null });
  fakeAuth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe() {} } },
  });
});

describe('auth', () => {
  it('is signed out when nothing is saved', async () => {
    stubServer();
    await startAuth();
    expect(current().status).toBe('signed-out');
    expect(getAccessToken()).toBeNull();
  });

  it('keeps a test session across a reload (R39)', async () => {
    stubServer();
    await startAuth();
    expect(await testSignIn('ana@example.com')).toBeNull();
    expect(getAccessToken()).toBe('test-ana@example.com');

    resetAuthForTests();
    await startAuth();
    const after = current();
    expect(after.status).toBe('signed-in');
    if (after.status === 'signed-in')
      expect(after.session.email).toBe('ana@example.com');
  });

  it('ignores a saved test session while test sign-in is off', async () => {
    localStorage.setItem(
      TEST_SESSION_KEY,
      JSON.stringify({ access_token: 'test-x', email: 'x@example.com' }),
    );
    stubServer({ ...CONFIG, test_sign_in: false });
    await startAuth();
    expect(current().status).toBe('signed-out');
  });

  it('sign out forgets the session (R42)', async () => {
    stubServer();
    await startAuth();
    await testSignIn('ana@example.com');
    await signOut();
    expect(current().status).toBe('signed-out');
    expect(localStorage.getItem(TEST_SESSION_KEY)).toBeNull();
  });

  it('restores a Supabase session and signs out of it locally', async () => {
    fakeAuth.getSession.mockResolvedValue({
      data: {
        session: { access_token: 'jwt', user: { email: 'ana@example.com' } },
      },
    });
    stubServer();
    await startAuth();
    expect(getAccessToken()).toBe('jwt');
    await signOut();
    expect(fakeAuth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(current().status).toBe('signed-out');
  });

  it('signs in with a password', async () => {
    fakeAuth.signInWithPassword.mockResolvedValue({
      data: {
        user: { email: 'ana@example.com' },
        session: { access_token: 'jwt' },
      },
      error: null,
    });
    stubServer();
    await startAuth();
    expect(await signIn('ana@example.com', 'pw')).toBeNull();
    expect(getAccessToken()).toBe('jwt');
  });

  it('says the email or password is wrong when Supabase refuses', async () => {
    fakeAuth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError(
        'Invalid login credentials',
        400,
        'invalid_credentials',
      ),
    });
    stubServer();
    await startAuth();
    expect(await signIn('ana@example.com', 'bad')).toBe(WRONG_PASSWORD);
    expect(current().status).toBe('signed-out');
  });

  it('says Supabase cannot be reached on a network failure', async () => {
    fakeAuth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    });
    stubServer();
    await startAuth();
    expect(await signIn('ana@example.com', 'pw')).toBe(SERVICE_UNREACHABLE);

    fakeAuth.signInWithPassword.mockRejectedValue(new TypeError('offline'));
    expect(await signIn('ana@example.com', 'pw')).toBe(SERVICE_UNREACHABLE);
  });

  it('says Supabase cannot be reached when it is not set up', async () => {
    stubServer({ ...CONFIG, supabase_url: '', supabase_publishable_key: '' });
    await startAuth();
    expect(await signIn('ana@example.com', 'pw')).toBe(SERVICE_UNREACHABLE);
  });

  it('is unavailable when the backend cannot be reached', async () => {
    stubServer(null);
    await startAuth();
    expect(current().status).toBe('unavailable');
  });
});
