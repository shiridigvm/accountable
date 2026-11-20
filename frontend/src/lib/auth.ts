// Who is signed in (R37 to R43). One small store shared by the whole app.
//
// Real sign-in goes through Supabase, which keeps the session in localStorage and
// renews the token before it expires. Test sign-in (R43) asks the backend for a
// token and keeps it in localStorage under TEST_SESSION_KEY. The backend checks
// every token itself, so nothing here decides what anyone may see.
import {
  createClient,
  isAuthApiError,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';

export type AuthConfig = {
  supabase_url: string;
  supabase_publishable_key: string;
  test_sign_in: boolean;
};

export type Session = {
  email: string;
  accessToken: string;
  kind: 'supabase' | 'test';
};

export type AuthState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'signed-out'; config: AuthConfig }
  | { status: 'signed-in'; config: AuthConfig; session: Session };

export const TEST_SESSION_KEY = 'accountable-test-session';
export const WRONG_PASSWORD = 'Email or password is wrong.';
export const SERVICE_UNREACHABLE =
  "Can't reach the sign-in service. Check your connection.";

let state: AuthState = { status: 'loading' };
let supabase: SupabaseClient | null = null;
let started: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: AuthState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, () => state);
}

/** The signed-in person. Only for components rendered behind AuthGate. */
export function useSession(): Session {
  const current = useAuth();
  if (current.status !== 'signed-in') throw new Error('Nobody is signed in.');
  return current.session;
}

export function getAccessToken(): string | null {
  return state.status === 'signed-in' ? state.session.accessToken : null;
}

function readTestSession(): Session | null {
  try {
    const saved = JSON.parse(localStorage.getItem(TEST_SESSION_KEY) ?? 'null');
    if (
      typeof saved?.access_token === 'string' &&
      typeof saved?.email === 'string'
    )
      return {
        email: saved.email,
        accessToken: saved.access_token,
        kind: 'test',
      };
  } catch {
    // Blocked storage or a damaged value: treat it as signed out.
  }
  return null;
}

function forgetTestSession() {
  try {
    localStorage.removeItem(TEST_SESSION_KEY);
  } catch {
    // Blocked storage: nothing was saved, so there is nothing to forget.
  }
}

function signedIn(config: AuthConfig, session: Session) {
  setState({ status: 'signed-in', config, session });
}

function signedOut(config: AuthConfig) {
  setState({ status: 'signed-out', config });
}

function connectSupabase(config: AuthConfig) {
  if (!config.supabase_url || !config.supabase_publishable_key) return null;
  const client = createClient(
    config.supabase_url,
    config.supabase_publishable_key,
  );
  // Keeps the token current when Supabase renews it, and notices a lost session.
  client.auth.onAuthStateChange((_event, session) => {
    if (state.status === 'signed-in' && state.session.kind === 'test') return;
    if (session?.user.email)
      signedIn(config, {
        email: session.user.email,
        accessToken: session.access_token,
        kind: 'supabase',
      });
    else if (state.status === 'signed-in') signedOut(config);
  });
  return client;
}

async function load() {
  let config: AuthConfig;
  try {
    const reply = await fetch('/api/auth/config');
    if (!reply.ok) throw new Error(String(reply.status));
    config = await reply.json();
  } catch {
    setState({ status: 'unavailable' });
    return;
  }
  supabase = connectSupabase(config);
  const test = config.test_sign_in ? readTestSession() : null;
  if (test) return signedIn(config, test);
  const { data } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } };
  const session = data.session;
  if (session?.user.email)
    return signedIn(config, {
      email: session.user.email,
      accessToken: session.access_token,
      kind: 'supabase',
    });
  signedOut(config);
}

/** Loads the config and any saved session. Safe to call more than once. */
export function startAuth(): Promise<void> {
  started ??= load();
  return started;
}

function configOf(current: AuthState): AuthConfig {
  if (current.status === 'signed-out' || current.status === 'signed-in')
    return current.config;
  throw new Error('Sign-in is not ready.');
}

/** Returns an error message for the sign-in screen, or null when signed in. */
export async function signIn(
  email: string,
  password: string,
): Promise<string | null> {
  const config = configOf(state);
  if (!supabase) return SERVICE_UNREACHABLE;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error)
      return isAuthApiError(error) ? WRONG_PASSWORD : SERVICE_UNREACHABLE;
    signedIn(config, {
      email: data.user.email ?? email,
      accessToken: data.session.access_token,
      kind: 'supabase',
    });
    return null;
  } catch {
    return SERVICE_UNREACHABLE;
  }
}

export async function testSignIn(email: string): Promise<string | null> {
  const config = configOf(state);
  try {
    const reply = await fetch('/api/auth/test-sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!reply.ok) return 'Test sign-in needs an email address.';
    const saved = await reply.json();
    try {
      localStorage.setItem(TEST_SESSION_KEY, JSON.stringify(saved));
    } catch {
      // Blocked storage: signed in for this page only.
    }
    signedIn(config, {
      email: saved.email,
      accessToken: saved.access_token,
      kind: 'test',
    });
    return null;
  } catch {
    return 'Cannot reach the Accountable server.';
  }
}

export async function signOut(): Promise<void> {
  if (state.status !== 'signed-in') return;
  const { config, session } = state;
  forgetTestSession();
  signedOut(config);
  if (session.kind === 'supabase' && supabase) {
    // Local scope: signing out here must work even when Supabase can't be reached.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  }
}

/** The backend refused the token, so the session is over (R39). */
export function sessionEnded(): void {
  void signOut();
}

/** Resets the store. For the unit tests only. */
export function resetAuthForTests(): void {
  state = { status: 'loading' };
  supabase = null;
  started = null;
}
