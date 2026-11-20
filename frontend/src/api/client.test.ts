import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAccessToken,
  resetAuthForTests,
  startAuth,
  testSignIn,
} from '../lib/auth';
import { api } from './client';

const CONFIG = {
  supabase_url: '',
  supabase_publishable_key: '',
  test_sign_in: true,
};

let apiReply: { status: number; body: unknown };
const seen: RequestInit[] = [];

beforeEach(async () => {
  resetAuthForTests();
  localStorage.clear();
  seen.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string, init?: RequestInit) => {
      if (path === '/api/auth/config')
        return { ok: true, status: 200, json: async () => CONFIG };
      if (path === '/api/auth/test-sign-in')
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'test-tok',
            email: 'a@example.com',
          }),
        };
      seen.push(init ?? {});
      return {
        ok: apiReply.status < 400,
        status: apiReply.status,
        json: async () => apiReply.body,
      };
    }),
  );
  await startAuth();
  await testSignIn('a@example.com');
});

describe('api client', () => {
  it('sends the bearer token (R40)', async () => {
    apiReply = { status: 200, body: [] };
    await api('GET', '/api/deals');
    const headers = seen[0].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-tok');
  });

  it('ends the session on a 401 (R39)', async () => {
    apiReply = { status: 401, body: { error: 'Sign in to continue.' } };
    await expect(api('GET', '/api/deals')).rejects.toThrow(
      'Sign in to continue.',
    );
    expect(getAccessToken()).toBeNull();
  });

  it('passes on the sign-in service message on a 503', async () => {
    apiReply = {
      status: 503,
      body: { error: "Can't reach the sign-in service." },
    };
    await expect(api('GET', '/api/deals')).rejects.toThrow(
      "Can't reach the sign-in service.",
    );
    expect(getAccessToken()).toBe('test-tok');
  });
});
